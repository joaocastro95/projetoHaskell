{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE ScopedTypeVariables #-}

-- | Banco de dados local SQLite (arquivo perdazero.db na pasta do projeto).
-- Tabelas: usuarios, sessoes, lotes (de cada usuário) e movimentacoes.
module Banco
  ( abrirBanco,
    -- usuários e sessões
    criarUsuario,
    buscarUsuarioPorEmail,
    criarSessao,
    usuarioDaSessao,
    apagarSessao,
    -- lotes e movimentações (sempre do usuário logado)
    listarLotes,
    buscarLote,
    inserirLote,
    atualizarLote,
    atualizarValidade,
    apagarLote,
    contarMovimentacoes,
    registrarMovimentacao,
    movimentacoesDoMes,
  )
where

import Control.Exception (SomeException, try)
import Data.Text (Text)
import Data.Time (Day, UTCTime, addUTCTime, diffDays, getCurrentTime, nominalDay)
import Database.SQLite.Simple
import Regras (nivelAlerta)
import Tipos

-- | Linha da tabela lotes, antes de calcular os dias para vencer.
type LinhaLote = (Int, Text, Maybe Text, Text, Double, Double, Double, Day, Day)

paraLote :: Day -> LinhaLote -> Lote
paraLote hoje (i, p, c, u, qi, q, cu, v, r) =
  let d = fromIntegral (diffDays v hoje)
   in Lote i p c u qi q cu v r d (nivelAlerta d)

abrirBanco :: FilePath -> IO Connection
abrirBanco arquivo = do
  conn <- open arquivo
  execute_ conn "PRAGMA foreign_keys = ON"
  execute_
    conn
    "CREATE TABLE IF NOT EXISTS usuarios (\
    \ id INTEGER PRIMARY KEY AUTOINCREMENT,\
    \ email TEXT NOT NULL UNIQUE COLLATE NOCASE,\
    \ restaurante TEXT NOT NULL,\
    \ senha_hash TEXT NOT NULL,\
    \ criado_em TEXT NOT NULL)"
  execute_
    conn
    "CREATE TABLE IF NOT EXISTS sessoes (\
    \ token TEXT PRIMARY KEY,\
    \ usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,\
    \ expira_em TEXT NOT NULL)"
  execute_
    conn
    "CREATE TABLE IF NOT EXISTS lotes (\
    \ id INTEGER PRIMARY KEY AUTOINCREMENT,\
    \ usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,\
    \ produto TEXT NOT NULL,\
    \ codigo TEXT,\
    \ unidade TEXT NOT NULL,\
    \ quantidade_inicial REAL NOT NULL CHECK (quantidade_inicial > 0),\
    \ quantidade REAL NOT NULL CHECK (quantidade >= 0),\
    \ custo_unitario REAL NOT NULL CHECK (custo_unitario >= 0),\
    \ validade TEXT NOT NULL,\
    \ recebido_em TEXT NOT NULL)"
  -- Bancos criados antes do login não tinham usuario_id: acrescenta a coluna (ignora se já existe)
  _ <- try (execute_ conn "ALTER TABLE lotes ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE") :: IO (Either SomeException ())
  execute_
    conn
    "CREATE TABLE IF NOT EXISTS movimentacoes (\
    \ id INTEGER PRIMARY KEY AUTOINCREMENT,\
    \ lote_id INTEGER NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,\
    \ tipo TEXT NOT NULL CHECK (tipo IN ('uso','descarte')),\
    \ motivo TEXT,\
    \ destino TEXT,\
    \ quantidade REAL NOT NULL CHECK (quantidade > 0),\
    \ valor REAL NOT NULL,\
    \ data TEXT NOT NULL)"
  execute_ conn "DELETE FROM sessoes WHERE expira_em < datetime('now')"
  pure conn

-- ---------------------------------------------------------------- usuários

-- | Cria o usuário; Nothing se o e-mail já existe.
criarUsuario :: Connection -> Text -> Text -> Text -> IO (Maybe Int)
criarUsuario conn email restaurante senhaHash = do
  agora <- getCurrentTime
  r <- try (execute conn "INSERT INTO usuarios (email, restaurante, senha_hash, criado_em) VALUES (?,?,?,?)" (email, restaurante, senhaHash, agora))
  case r of
    Left (_ :: SQLError) -> pure Nothing
    Right () -> Just . fromIntegral <$> lastInsertRowId conn

-- | (usuário, hash da senha)
buscarUsuarioPorEmail :: Connection -> Text -> IO (Maybe (Usuario, Text))
buscarUsuarioPorEmail conn email = do
  rs <- query conn "SELECT id, email, restaurante, senha_hash FROM usuarios WHERE email = ?" (Only email)
  pure $ case rs of
    ((i, e, r, h) : _) -> Just (Usuario i e r, h)
    [] -> Nothing

-- | Sessão válida por 30 dias.
criarSessao :: Connection -> Text -> Int -> IO ()
criarSessao conn token uid = do
  agora <- getCurrentTime
  let expira = addUTCTime (30 * nominalDay) agora :: UTCTime
  execute conn "INSERT INTO sessoes (token, usuario_id, expira_em) VALUES (?,?,?)" (token, uid, expira)

usuarioDaSessao :: Connection -> Text -> IO (Maybe Usuario)
usuarioDaSessao conn token = do
  agora <- getCurrentTime
  rs <-
    query
      conn
      "SELECT u.id, u.email, u.restaurante FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id \
      \WHERE s.token = ? AND s.expira_em > ?"
      (token, agora)
  pure $ case rs of
    ((i, e, r) : _) -> Just (Usuario i e r)
    [] -> Nothing

apagarSessao :: Connection -> Text -> IO ()
apagarSessao conn token = execute conn "DELETE FROM sessoes WHERE token = ?" (Only token)

-- ---------------------------------------------------------------- lotes

colunasLote :: Query
colunasLote =
  "SELECT id, produto, codigo, unidade, quantidade_inicial, quantidade, custo_unitario, validade, recebido_em FROM lotes"

-- | Lotes com saldo do usuário, do que vence primeiro para o último.
listarLotes :: Connection -> Day -> Int -> IO [Lote]
listarLotes conn hoje uid =
  map (paraLote hoje)
    <$> query conn (colunasLote <> " WHERE usuario_id = ? AND quantidade > 0 ORDER BY validade, id") (Only uid)

buscarLote :: Connection -> Day -> Int -> Int -> IO (Maybe Lote)
buscarLote conn hoje uid i = do
  rs <- query conn (colunasLote <> " WHERE id = ? AND usuario_id = ?") (i, uid)
  pure $ case rs of
    (r : _) -> Just (paraLote hoje r)
    [] -> Nothing

custoUnitario :: NovoLote -> Double
custoUnitario nl = fromIntegral (round (nlCustoTotal nl / nlQuantidade nl * 10000) :: Integer) / 10000

inserirLote :: Connection -> Day -> Int -> NovoLote -> IO Int
inserirLote conn hoje uid nl = do
  execute
    conn
    "INSERT INTO lotes (usuario_id, produto, codigo, unidade, quantidade_inicial, quantidade, custo_unitario, validade, recebido_em) VALUES (?,?,?,?,?,?,?,?,?)"
    ( (uid, nlProduto nl, nlCodigo nl, nlUnidade nl, nlQuantidade nl)
        :. (nlQuantidade nl, custoUnitario nl, nlValidade nl, maybe hoje id (nlRecebidoEm nl))
    )
  fromIntegral <$> lastInsertRowId conn

-- | PUT: troca todos os dados do lote (o Main só permite sem movimentações).
atualizarLote :: Connection -> Day -> Int -> Int -> NovoLote -> IO ()
atualizarLote conn hoje uid i nl =
  execute
    conn
    "UPDATE lotes SET produto=?, codigo=?, unidade=?, quantidade_inicial=?, quantidade=?, custo_unitario=?, validade=?, recebido_em=? WHERE id=? AND usuario_id=?"
    ( (nlProduto nl, nlCodigo nl, nlUnidade nl, nlQuantidade nl, nlQuantidade nl)
        :. (custoUnitario nl, nlValidade nl, maybe hoje id (nlRecebidoEm nl), i, uid)
    )

-- | PATCH: muda só a validade.
atualizarValidade :: Connection -> Int -> Int -> Day -> IO ()
atualizarValidade conn uid i v = execute conn "UPDATE lotes SET validade=? WHERE id=? AND usuario_id=?" (v, i, uid)

apagarLote :: Connection -> Int -> Int -> IO ()
apagarLote conn uid i = execute conn "DELETE FROM lotes WHERE id=? AND usuario_id=?" (i, uid)

contarMovimentacoes :: Connection -> Int -> IO Int
contarMovimentacoes conn i = do
  rs <- query conn "SELECT COUNT(*) FROM movimentacoes WHERE lote_id=?" (Only i)
  pure $ case rs of
    [Only n] -> n
    _ -> 0

-- | Grava o uso/descarte e baixa o saldo do lote na mesma transação.
registrarMovimentacao :: Connection -> Day -> Lote -> NovaMovimentacao -> IO ()
registrarMovimentacao conn hoje l nm = withTransaction conn $ do
  let valor = fromIntegral (round (nmQuantidade nm * ltCustoUnitario l * 100) :: Integer) / 100 :: Double
      motivo = if nmTipo nm == "descarte" then nmMotivo nm else Nothing
      destino = if nmTipo nm == "uso" then nmDestino nm else Nothing
  execute
    conn
    "INSERT INTO movimentacoes (lote_id, tipo, motivo, destino, quantidade, valor, data) VALUES (?,?,?,?,?,?,?)"
    (ltId l, nmTipo nm, motivo, destino, nmQuantidade nm, valor, hoje)
  execute conn "UPDATE lotes SET quantidade = MAX(0, quantidade - ?) WHERE id = ?" (nmQuantidade nm, ltId l)

-- | Movimentações do usuário em um mês ("AAAA-MM"), mais recentes primeiro.
movimentacoesDoMes :: Connection -> Int -> Text -> IO [Movimentacao]
movimentacoesDoMes conn uid mes =
  map paraMov
    <$> query
      conn
      "SELECT m.id, m.lote_id, l.produto, l.unidade, m.tipo, m.motivo, m.destino, m.quantidade, m.valor, m.data \
      \FROM movimentacoes m JOIN lotes l ON l.id = m.lote_id \
      \WHERE l.usuario_id = ? AND substr(m.data, 1, 7) = ? ORDER BY m.data DESC, m.id DESC"
      (uid, mes)
  where
    paraMov (i, li, p, u, t, mo, de, q, v, d) = Movimentacao i li p u t mo de q v d
