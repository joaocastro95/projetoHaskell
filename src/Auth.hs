{-# LANGUAGE OverloadedStrings #-}

-- | Senhas e tokens de sessão.
-- A senha nunca é guardada: guardamos um hash PBKDF2-HMAC-SHA256 com sal aleatório.
module Auth (gerarHash, conferirSenha, gerarToken) where

import qualified Crypto.Hash.SHA256 as SHA256
import Data.Bits (xor, (.|.))
import qualified Data.ByteString as B
import qualified Data.ByteString.Base16 as B16
import Data.Text (Text)
import qualified Data.Text as T
import qualified Data.Text.Encoding as TE
import System.Entropy (getEntropy)

iteracoes :: Int
iteracoes = 60000

-- | PBKDF2-HMAC-SHA256 com saída de 32 bytes (um bloco).
pbkdf2 :: B.ByteString -> B.ByteString -> Int -> B.ByteString
pbkdf2 senha sal n = snd (foldl' passo (u1, u1) [2 .. n])
  where
    u1 = SHA256.hmac senha (sal <> B.pack [0, 0, 0, 1])
    passo (u, acc) _ = let u' = SHA256.hmac senha u in (u', B.pack (B.zipWith xor acc u'))

hex :: B.ByteString -> Text
hex = TE.decodeUtf8 . B16.encode

-- | "pbkdf2$60000$<sal em hex>$<hash em hex>"
gerarHash :: Text -> IO Text
gerarHash senha = do
  sal <- getEntropy 16
  let h = pbkdf2 (TE.encodeUtf8 senha) sal iteracoes
  pure (T.intercalate "$" ["pbkdf2", T.pack (show iteracoes), hex sal, hex h])

-- | Confere a senha digitada com o hash guardado (comparação em tempo constante).
conferirSenha :: Text -> Text -> Bool
conferirSenha senha guardado =
  case T.splitOn "$" guardado of
    ["pbkdf2", nTxt, salHex, hashHex]
      | Right sal <- B16.decode (TE.encodeUtf8 salHex),
        Right esperado <- B16.decode (TE.encodeUtf8 hashHex),
        [(n, "")] <- reads (T.unpack nTxt) ->
          iguais esperado (pbkdf2 (TE.encodeUtf8 senha) sal n)
    _ -> False
  where
    iguais a b = B.length a == B.length b && foldl' (.|.) 0 (B.zipWith xor a b) == 0

-- | Token de sessão aleatório (32 bytes, em hex).
gerarToken :: IO Text
gerarToken = hex <$> getEntropy 32
