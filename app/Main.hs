{-# LANGUAGE DataKinds #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE TypeOperators #-}

-- back-end: Servant
-- PerdaZero: controle de validade e desperdício para pequenos restaurantes.
-- Para rodar:  cabal run  (API em http://localhost:8081) e, em outro terminal,
--               cd frontend && npm run dev  (site em http://localhost:8080)
module Main where

import Auth
import Banco
import Control.Concurrent.MVar
import Control.Monad (unless, when)
import Control.Monad.IO.Class (liftIO)
import Data.Aeson (encode)
import Data.Maybe (fromMaybe)
import Data.Proxy
import Data.Text (Text)
import qualified Data.Text as T
import Data.Time (Day, addDays, addGregorianMonthsClip, getZonedTime, localDay, zonedTimeToLocalTime)
import Database.SQLite.Simple (Connection)
import Network.Wai.Handler.Warp
import Regras
import Servant
import Tipos

-- | Cabeçalho com o token de sessão: "Authorization: Bearer <token>"
type Token = Header "Authorization" Text

-- | Rotas públicas: criar conta, entrar.
type Publica =
  -- POST /cadastro : cria a conta e já devolve a sessão
  "cadastro" :> ReqBody '[JSON] Credenciais :> Post '[JSON] Sessao
    -- POST /login
    :<|> "login" :> ReqBody '[JSON] Credenciais :> Post '[JSON] Sessao

-- | Rotas que exigem login. Mesmo padrão dos exemplos (GET /clientes, POST /cliente,
-- PUT/PATCH/DELETE /cliente/:id), trocando "cliente" por "lote".
type Protegida =
  -- POST /logout
  "logout" :> Token :> PostNoContent
    -- GET /eu : quem está logado
    :<|> "eu" :> Token :> Get '[JSON] Usuario
    -- GET /lotes : lotes com saldo (com dias para vencer e nível de alerta)
    :<|> "lotes" :> Token :> Get '[JSON] [Lote]
    -- GET /lotes/alertas : só o que vence em até 7 dias (inclui vencidos)
    :<|> "lotes" :> "alertas" :> Token :> Get '[JSON] [Lote]
    -- GET /lote/:id
    :<|> "lote" :> Capture "id" Int :> Token :> Get '[JSON] Lote
    -- POST /lote : cadastra uma entrada
    :<|> "lote" :> Token :> ReqBody '[JSON] NovoLote :> Post '[JSON] Lote
    -- PUT /lote/:id : troca todos os dados (só se o lote ainda não teve uso/descarte)
    :<|> "lote" :> Capture "id" Int :> Token :> ReqBody '[JSON] NovoLote :> Put '[JSON] Lote
    -- PATCH /lote/:id/validade : corrige só a validade
    :<|> "lote" :> Capture "id" Int :> "validade" :> Token :> ReqBody '[JSON] NovaValidade :> Patch '[JSON] Lote
    -- DELETE /lote/:id
    :<|> "lote" :> Capture "id" Int :> Token :> DeleteNoContent
    -- POST /lote/:id/movimentacao : registra uso (com destino) ou descarte (com motivo)
    :<|> "lote" :> Capture "id" Int :> "movimentacao" :> Token :> ReqBody '[JSON] NovaMovimentacao :> Post '[JSON] Lote
    -- GET /relatorio?mes=2026-11 : perdas e valor salvo do mês
    :<|> "relatorio" :> Token :> QueryParam "mes" Text :> Get '[JSON] Relatorio
    -- GET /resumo : últimos 6 meses + aproveitamento em 30 dias (gráficos)
    :<|> "resumo" :> Token :> Get '[JSON] Resumo
    -- GET /lotes/contagem : quantos lotes já foram cadastrados (0 = primeiro acesso)
    :<|> "lotes" :> "contagem" :> Token :> Get '[JSON] Int
    -- PATCH /lote/:id/dados : corrige nome, código e datas (vale mesmo com histórico)
    :<|> "lote" :> Capture "id" Int :> "dados" :> Token :> ReqBody '[JSON] DadosLote :> Patch '[JSON] Lote
    -- GET /produtos : produtos já cadastrados (sugestões na entrada)
    :<|> "produtos" :> Token :> Get '[JSON] [ProdutoConhecido]
    -- PATCH /eu : muda o nome do restaurante
    :<|> "eu" :> Token :> ReqBody '[JSON] AtualizarPerfil :> Patch '[JSON] Usuario
    -- PUT /eu/senha : troca a senha (pede a atual)
    :<|> "eu" :> "senha" :> Token :> ReqBody '[JSON] TrocarSenha :> PutNoContent
    -- DELETE /meus-dados : apaga todos os lotes e movimentações do usuário
    :<|> "meus-dados" :> Token :> DeleteNoContent
    -- POST /demo : troca os dados pelos de demonstração
    :<|> "demo" :> Token :> ReqBody '[JSON] Demo :> PostNoContent

-- | A API inteira. O front (Next.js, pasta frontend/) roda à parte em localhost:8080.
type API = Publica :<|> Protegida

-- | Data de hoje no fuso do computador.
hojeLocal :: IO Day
hojeLocal = localDay . zonedTimeToLocalTime <$> getZonedTime

-- | Responde com erro e uma mensagem em JSON: {"erro": "..."}
falhar :: ServerError -> Text -> Handler a
falhar e msg =
  throwError e {errBody = encode (Erro msg), errHeaders = [("Content-Type", "application/json; charset=utf-8")]}

server :: MVar Connection -> Server API
server banco = publica :<|> protegida
  where
    -- Um acesso ao banco por vez (o SQLite não gosta de escritas simultâneas)
    comBanco :: (Connection -> IO a) -> Handler a
    comBanco f = liftIO (withMVar banco f)

    hoje :: Handler Day
    hoje = liftIO hojeLocal

    -- "Bearer <token>" -> usuário logado, ou 401
    autenticar :: Maybe Text -> Handler Usuario
    autenticar cab = do
      let token = T.strip . T.drop 7 <$> mfilter' (T.isPrefixOf "Bearer ") cab
      case token of
        Nothing -> falhar err401 "Faça login para continuar."
        Just t -> comBanco (`usuarioDaSessao` t) >>= maybe (falhar err401 "Sessão expirada. Entre de novo.") pure
    mfilter' p = maybe Nothing (\x -> if p x then Just x else Nothing)

    abrirSessao :: Usuario -> Handler Sessao
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

    acharOu404 :: Int -> Int -> Handler Lote
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

app :: MVar Connection -> Application
app banco = serve (Proxy :: Proxy API) (server banco)

--cabal repl
--cabal update
main :: IO ()
main = do
  conn <- abrirBanco "perdazero.db"
  banco <- newMVar conn
  putStrLn "API do PerdaZero em http://localhost:8081 (o site fica em http://localhost:8080)"
  run 8081 (app banco)
