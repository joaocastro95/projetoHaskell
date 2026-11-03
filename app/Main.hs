{-# LANGUAGE DataKinds #-}
{-# LANGUAGE TypeOperators #-}

-- back-end: Servant
module Main where

type API = "hello" :> GET '[JSON] String

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

