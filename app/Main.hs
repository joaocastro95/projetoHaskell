-- back-end: Servant
-- PerdaZero: controle de validade e desperdício para pequenos restaurantes.
-- Para rodar:  cabal run  (API em http://localhost:8081) e, em outro terminal,
--               cd frontend && npm run dev  (site em http://localhost:8080)
--
-- Organização (pasta src/):
--   Api.hs      -> contrato das rotas (tipos do Servant)
--   App.hs      -> ambiente (Env) e mônada App = ReaderT Env Handler
--   Handlers.hs -> implementação das rotas (HTTP)
--   Regras.hs   -> regras de negócio puras (testadas em test/)
--   Banco.hs    -> SQLite
--   Auth.hs     -> hash de senha e token
--   Tipos.hs    -> records e JSON
module Main where

import App (novoEnv)
import Banco (abrirBanco)
import Handlers (app)
import Network.Wai.Handler.Warp (run)
import System.IO (BufferMode (LineBuffering), hSetBuffering, stdout)

main :: IO ()
main = do
  -- Mostra cada linha na hora, mesmo quando a saída não é um terminal
  -- (ex.: rodando pelo "npm run dev", que junta a saída da API e do site).
  hSetBuffering stdout LineBuffering
  conn <- abrirBanco "perdazero.db"
  env <- novoEnv conn
  putStrLn "API do PerdaZero em http://localhost:8081 (o site fica em http://localhost:8080)"
  run 8081 (app env)
