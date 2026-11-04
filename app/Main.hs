{-# LANGUAGE DataKinds #-}
{-# LANGUAGE TypeOperators #-}

-- back-end: Servant
module Main where

import Data.Proxy
import Network.Wai.Handler.Warp
import Servant

type API = "hello" :> Get '[JSON] String

helloFunc :: Server API
helloFunc = pure "Hello, world!"

app :: Application
app = serve (Proxy :: Proxy API) helloFunc



--cabal repl
--cabal update
main :: IO ()
main = do
    print "Serving on port 8080"
    run 8080 app

