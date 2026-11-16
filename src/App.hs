-- | O "ambiente" da aplicação (ReaderT Pattern).
--
-- Em vez de passar o banco como argumento para cada handler, guardamos tudo o que
-- os handlers precisam num registro 'Env' e rodamos os handlers na mônada
-- 'App' = @ReaderT Env Handler@. Qualquer handler pega o que precisa com 'asks'.
module App
  ( Env (..),
    App,
    novoEnv,
    rodarApp,
    comBanco,
    hoje,
  )
where

import Control.Concurrent.MVar (MVar, newMVar, withMVar)
import Control.Monad.IO.Class (liftIO)
import Control.Monad.Reader (ReaderT, asks, runReaderT)
import Data.Time (Day, getZonedTime, localDay, zonedTimeToLocalTime)
import Database.SQLite.Simple (Connection)
import Servant (Handler)

-- | Tudo o que os handlers usam do "mundo de fora".
data Env = Env
  { -- | Conexão com o SQLite. O MVar garante um acesso por vez
    -- (o SQLite não gosta de escritas simultâneas).
    envBanco :: MVar Connection,
    -- | Como saber a data de hoje. Fica aqui para poder ser trocada (ex.: data fixa em testes).
    envHoje :: IO Day
  }

-- | A mônada dos handlers: lê o 'Env' e pode responder erros HTTP (Handler do Servant).
type App = ReaderT Env Handler

-- | Monta o ambiente de produção: a conexão aberta e a data do relógio do computador.
novoEnv :: Connection -> IO Env
novoEnv conn = do
  banco <- newMVar conn
  pure Env {envBanco = banco, envHoje = localDay . zonedTimeToLocalTime <$> getZonedTime}

-- | Converte um handler 'App' no 'Handler' que o Servant sabe rodar.
rodarApp :: Env -> App a -> Handler a
rodarApp env acao = runReaderT acao env

-- | Executa uma operação do "Banco" (um acesso por vez).
comBanco :: (Connection -> IO a) -> App a
comBanco f = do
  banco <- asks envBanco
  liftIO (withMVar banco f)

-- | A data de hoje, vinda do 'Env'.
hoje :: App Day
hoje = asks envHoje >>= liftIO
