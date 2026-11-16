{-# LANGUAGE OverloadedStrings #-}

-- | Implementação das rotas declaradas em "Api" (a camada que fala HTTP).
-- Cada handler: confere o login, valida com as funções puras de "Regras",
-- lê/grava pelo "Banco" e devolve a resposta.
module Handlers
  ( app,
    server,
  )
where

import Api
import App
import Auth
import Banco
import Control.Monad (unless, when)
import Control.Monad.Except (throwError)
import Control.Monad.IO.Class (liftIO)
import Data.Aeson (encode)
import Data.Maybe (fromMaybe)
import Data.Proxy
import Data.Text (Text)
import qualified Data.Text as T
import Data.Time (addDays, addGregorianMonthsClip)
import Regras
import Servant hiding (throwError)
import Tipos

-- | Responde com erro e uma mensagem em JSON: {"erro": "..."}
falhar :: ServerError -> Text -> App a
falhar e msg =
  throwError e {errBody = encode (Erro msg), errHeaders = [("Content-Type", "application/json; charset=utf-8")]}

-- | Todas as rotas, rodando na mônada 'App' (ReaderT Env Handler).
-- O banco e a data de hoje vêm do 'Env' (veja "App"), não de argumentos.
server :: ServerT API App
server = publica :<|> protegida
  where
    -- "Bearer <token>" -> usuário logado, ou 401
    autenticar :: Maybe Text -> App Usuario
    autenticar cab = do
      let token = T.strip . T.drop 7 <$> mfilter' (T.isPrefixOf "Bearer ") cab
      case token of
        Nothing -> falhar err401 "Faça login para continuar."
        Just t -> comBanco (`usuarioDaSessao` t) >>= maybe (falhar err401 "Sessão expirada. Entre de novo.") pure
    mfilter' p = maybe Nothing (\x -> if p x then Just x else Nothing)

    abrirSessao :: Usuario -> App Sessao
    abrirSessao u = do
      token <- liftIO gerarToken
      comBanco (\c -> criarSessao c token (usId u))
      pure (Sessao token (usEmail u) (usRestaurante u))

    -- ------------------------------------------------ públicas
    publica = cadastro :<|> login

    cadastro cr = do
      let email = T.toLower (T.strip (crEmail cr))
          restaurante = T.strip (fromMaybe "" (crRestaurante cr))
      unless ("@" `T.isInfixOf` email && "." `T.isInfixOf` email) $ falhar err400 "E-mail inválido."
      when (T.length (crSenha cr) < 6) $ falhar err400 "A senha precisa ter pelo menos 6 caracteres."
      when (T.null restaurante) $ falhar err400 "Informe o nome do restaurante."
      senhaHash <- liftIO (gerarHash (crSenha cr))
      criado <- comBanco (\c -> criarUsuario c email restaurante senhaHash)
      case criado of
        Nothing -> falhar err409 "Este e-mail já tem conta. Use Entrar."
        Just uid -> abrirSessao (Usuario uid email restaurante)

    login cr = do
      achado <- comBanco (`buscarUsuarioPorEmail` T.toLower (T.strip (crEmail cr)))
      case achado of
        Just (u, h) | conferirSenha (crSenha cr) h -> abrirSessao u
        _ -> falhar err401 "E-mail ou senha inválidos."

    -- ------------------------------------------------ protegidas
    protegida =
      logout
        :<|> eu
        :<|> listar
        :<|> alertas
        :<|> pegar
        :<|> cadastrar
        :<|> substituir
        :<|> mudarValidade
        :<|> apagar
        :<|> movimentar
        :<|> relatorio
        :<|> resumo
        :<|> contagem
        :<|> mudarDados
        :<|> produtos
        :<|> mudarPerfil
        :<|> mudarSenha
        :<|> apagarTudo
        :<|> demo

    resumo cab = do
      u <- autenticar cab
      d <- hoje
      -- desde o início do mês de 5 meses atrás (ou 60 dias, o que for antes)
      movs <- comBanco (\c -> movimentacoesPeriodo c (usId u) (min (addDays (-60) d) (addGregorianMonthsClip (-6) d)) d)
      pure (montarResumo d movs)

    contagem cab = autenticar cab >>= \u -> comBanco (`contarLotes` usId u)

    mudarDados i cab dd = do
      u <- autenticar cab
      _ <- acharOu404 (usId u) i
      d <- hoje
      let produto = T.strip (ddProduto dd)
      when (T.null produto) $ falhar err400 "Informe o nome do insumo."
      when (ddRecebidoEm dd > d) $ falhar err400 "A data de recebimento não pode ser no futuro."
      when (ddValidade dd < ddRecebidoEm dd) $ falhar err400 "A validade não pode ser antes da data de recebimento."
      comBanco (\c -> atualizarDados c (usId u) i dd {ddProduto = produto})
      acharOu404 (usId u) i

    produtos cab = autenticar cab >>= \u -> comBanco (`produtosConhecidos` usId u)

    mudarPerfil cab (AtualizarPerfil r) = do
      u <- autenticar cab
      let nome = T.take 60 (T.strip r)
      when (T.null nome) $ falhar err400 "Informe o nome do restaurante."
      comBanco (\c -> atualizarRestaurante c (usId u) nome)
      pure u {usRestaurante = nome}

    mudarSenha cab ts = do
      u <- autenticar cab
      atual <- comBanco (`senhaHashDe` usId u)
      unless (maybe False (conferirSenha (tsSenhaAtual ts)) atual) $ falhar err400 "A senha atual não confere."
      when (T.length (tsSenhaNova ts) < 6) $ falhar err400 "A senha nova precisa ter pelo menos 6 caracteres."
      when (tsSenhaNova ts == tsSenhaAtual ts) $ falhar err400 "A senha nova precisa ser diferente da atual."
      h <- liftIO (gerarHash (tsSenhaNova ts))
      comBanco (\c -> atualizarSenhaHash c (usId u) h)
      pure NoContent

    apagarTudo cab = do
      u <- autenticar cab
      comBanco (`apagarDadosUsuario` usId u)
      pure NoContent

    demo cab de = do
      u <- autenticar cab
      n <- comBanco (`contarLotes` usId u)
      when (n > 0 && not (deConfirmar de)) $
        falhar err409 "Marque a confirmação para substituir os dados atuais."
      comBanco (\c -> importarDemo c (usId u) (deLotes de) (deMovimentacoes de))
      pure NoContent

    logout cab = do
      _ <- autenticar cab
      maybe (pure ()) (\t -> comBanco (`apagarSessao` T.strip (T.drop 7 t))) cab
      pure NoContent

    eu = autenticar

    acharOu404 :: Int -> Int -> App Lote
    acharOu404 uid i = do
      d <- hoje
      comBanco (\c -> buscarLote c d uid i) >>= maybe (falhar err404 "Lote não encontrado.") pure

    listar cab = do
      u <- autenticar cab
      d <- hoje
      comBanco (\c -> listarLotes c d (usId u))

    alertas cab = filter ((<= 7) . ltDiasParaVencer) <$> listar cab

    pegar i cab = autenticar cab >>= \u -> acharOu404 (usId u) i

    cadastrar cab nl = do
      u <- autenticar cab
      d <- hoje
      ok <- either (falhar err400) pure (validarNovoLote d nl)
      when (nlValidade ok < d) $
        falhar err400 "Esse lote já está vencido. Não use insumo vencido (RDC 216/2004): devolva ao fornecedor."
      novoId <- comBanco (\c -> inserirLote c d (usId u) ok)
      acharOu404 (usId u) novoId

    substituir i cab nl = do
      u <- autenticar cab
      _ <- acharOu404 (usId u) i
      d <- hoje
      ok <- either (falhar err400) pure (validarNovoLote d nl)
      n <- comBanco (`contarMovimentacoes` i)
      when (n > 0) $
        falhar
          err409
          "Este lote já tem usos ou descartes: só dá para corrigir a validade (PATCH). Para o resto, exclua e cadastre de novo."
      comBanco (\c -> atualizarLote c d (usId u) i ok)
      acharOu404 (usId u) i

    mudarValidade i cab (NovaValidade v) = do
      u <- autenticar cab
      l <- acharOu404 (usId u) i
      when (v < ltRecebidoEm l) $ falhar err400 "A validade não pode ser antes da data de recebimento."
      comBanco (\c -> atualizarValidade c (usId u) i v)
      acharOu404 (usId u) i

    apagar i cab = do
      u <- autenticar cab
      _ <- acharOu404 (usId u) i
      comBanco (\c -> apagarLote c (usId u) i)
      pure NoContent

    movimentar i cab nm = do
      u <- autenticar cab
      l <- acharOu404 (usId u) i
      either (falhar err400) pure (validarMovimentacao l nm)
      d <- hoje
      comBanco (\c -> registrarMovimentacao c d l nm)
      acharOu404 (usId u) i

    relatorio cab mesParam = do
      u <- autenticar cab
      d <- hoje
      let mes = fromMaybe (T.pack (take 7 (show d))) mesParam
      movs <- comBanco (\c -> movimentacoesDoMes c (usId u) mes)
      pure (montarRelatorio mes movs)

-- | A aplicação WAI: o Servant roda cada handler 'App' convertendo-o com 'rodarApp'.
app :: Env -> Application
app env = serve api (hoistServer api (rodarApp env) server)
  where
    api = Proxy :: Proxy API
