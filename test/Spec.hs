module Main (main) where

import qualified RegrasSpec
import Test.Hspec

main :: IO ()
main = hspec RegrasSpec.spec
