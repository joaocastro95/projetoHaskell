{-# LANGUAGE DataKinds #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE TypeOperators #-}

-- back-end: Servant
-- PerdaZero: controle de validade e desperdício para pequenos restaurantes.
-- Para rodar:  cabal run   e abra http://localhost:8080
module Main where

import Banco
import Control.Concurrent.MVar
import Control.Monad.IO.Class (liftIO)
import Data.Aeson (encode)
import Data.Maybe (fromMaybe)
import Data.Proxy
import Data.Text (Text)
import qualified Data.Text as T
import Data.Time (Day, getZonedTime, localDay, zonedTimeToLocalTime)
import Database.SQLite.Simple (Connection)
import Network.Wai.Handler.Warp
import Regras
import Servant
import Tipos

-- | Endpoints no mesmo padrão dos exemplos (GET /clientes, POST /cliente, PUT/PATCH/DELETE /cliente/:id),
-- trocando "cliente" por "lote" (cada entrada de mercadoria com validade).
type API =
  -- GET /lotes : lista os lotes com saldo (com dias para vencer e nível de alerta)
  "lotes" :> Get '[JSON] [Lote]
    -- GET /lotes/alertas : só o que vence em até 7 dias (inclui vencidos)
    :<|> "lotes" :> "alertas" :> Get '[JSON] [Lote]
    -- GET /lote/:id
    :<|> "lote" :> Capture "id" Int :> Get '[JSON] Lote
    -- POST /lote : cadastra uma entrada
    :<|> "lote" :> ReqBody '[JSON] NovoLote :> Post '[JSON] Lote
    -- PUT /lote/:id : troca todos os dados (só se o lote ainda não teve uso/descarte)
    :<|> "lote" :> Capture "id" Int :> ReqBody '[JSON] NovoLote :> Put '[JSON] Lote
    -- PATCH /lote/:id/validade : corrige só a validade
    :<|> "lote" :> Capture "id" Int :> "validade" :> ReqBody '[JSON] NovaValidade :> Patch '[JSON] Lote
    -- DELETE /lote/:id
    :<|> "lote" :> Capture "id" Int :> DeleteNoContent
    -- POST /lote/:id/movimentacao : registra uso (com destino) ou descarte (com motivo)
    :<|> "lote" :> Capture "id" Int :> "movimentacao" :> ReqBody '[JSON] NovaMovimentacao :> Post '[JSON] Lote
    -- GET /relatorio?mes=2026-11 : perdas e valor salvo do mês
    :<|> "relatorio" :> QueryParam "mes" Text :> Get '[JSON] Relatorio
    -- Todo o resto: as páginas (HTML + JS) da pasta static
    :<|> Raw

-- | Data de hoje no fuso do computador.
hojeLocal :: IO Day
hojeLocal = localDay . zonedTimeToLocalTime <$> getZonedTime

-- | Responde com erro e uma mensagem em JSON: {"erro": "..."}
falhar :: ServerError -> Text -> Handler a
falhar e msg =
  throwError e {errBody = encode (Erro msg), errHeaders = [("Content-Type", "application/json; charset=utf-8")]}

server :: MVar Connection -> Server API
server banco =
  listar
    :<|> alertas
    :<|> pegar
    :<|> cadastrar
    :<|> substituir
    :<|> mudarValidade
    :<|> apagar
    :<|> movimentar
    :<|> relatorio
    :<|> serveDirectoryFileServer "static"
  where
    -- Um acesso ao banco por vez (o SQLite não gosta de escritas simultâneas)
    comBanco :: (Connection -> Day -> IO a) -> Handler a
    comBanco f = liftIO $ withMVar banco $ \conn -> hojeLocal >>= f conn

    acharOu404 :: Int -> Handler Lote
    acharOu404 i = comBanco (\c h -> buscarLote c h i) >>= maybe (falhar err404 "Lote não encontrado.") pure

    listar = comBanco listarLotes

    alertas = filter ((<= 7) . ltDiasParaVencer) <$> comBanco listarLotes

    pegar = acharOu404

    cadastrar nl = do
      hoje <- liftIO hojeLocal
      ok <- either (falhar err400) pure (validarNovoLote hoje nl)
      novoId <- comBanco (\c h -> inserirLote c h ok)
      acharOu404 novoId

    substituir i nl = do
      _ <- acharOu404 i
      hoje <- liftIO hojeLocal
      ok <- either (falhar err400) pure (validarNovoLote hoje nl)
      n <- comBanco (\c _ -> contarMovimentacoes c i)
      if n > 0
        then
          falhar
            err409
            "Este lote já tem usos ou descartes: só dá para corrigir a validade (PATCH). Para o resto, exclua e cadastre de novo."
        else comBanco (\c h -> atualizarLote c h i ok) >> acharOu404 i

    mudarValidade i (NovaValidade v) = do
      l <- acharOu404 i
      if v < ltRecebidoEm l
        then falhar err400 "A validade não pode ser antes da data de recebimento."
        else comBanco (\c _ -> atualizarValidade c i v) >> acharOu404 i

    apagar i = do
      _ <- acharOu404 i
      comBanco (\c _ -> apagarLote c i)
      pure NoContent

    movimentar i nm = do
      l <- acharOu404 i
      either (falhar err400) pure (validarMovimentacao l nm)
      comBanco (\c h -> registrarMovimentacao c h l nm)
      acharOu404 i

    relatorio mesParam = do
      hoje <- liftIO hojeLocal
      let mes = fromMaybe (T.pack (take 7 (show hoje))) mesParam
      movs <- comBanco (\c _ -> movimentacoesDoMes c mes)
      pure (montarRelatorio mes movs)

app :: MVar Connection -> Application
app banco = serve (Proxy :: Proxy API) (server banco)

--cabal repl
--cabal update
main :: IO ()
main = do
  conn <- abrirBanco "perdazero.db"
  banco <- newMVar conn
  putStrLn "PerdaZero rodando em http://localhost:8080"
  run 8080 (app banco)
