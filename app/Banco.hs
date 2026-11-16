{-# LANGUAGE OverloadedStrings #-}

-- | Acesso ao banco SQLite (arquivo perdazero.db na pasta do projeto).
module Banco
  ( abrirBanco,
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

import Data.Text (Text)
import Data.Time (Day, diffDays)
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
    "CREATE TABLE IF NOT EXISTS lotes (\
    \ id INTEGER PRIMARY KEY AUTOINCREMENT,\
    \ produto TEXT NOT NULL,\
    \ codigo TEXT,\
    \ unidade TEXT NOT NULL,\
    \ quantidade_inicial REAL NOT NULL CHECK (quantidade_inicial > 0),\
    \ quantidade REAL NOT NULL CHECK (quantidade >= 0),\
    \ custo_unitario REAL NOT NULL CHECK (custo_unitario >= 0),\
    \ validade TEXT NOT NULL,\
    \ recebido_em TEXT NOT NULL)"
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
  pure conn

colunasLote :: Query
colunasLote =
  "SELECT id, produto, codigo, unidade, quantidade_inicial, quantidade, custo_unitario, validade, recebido_em FROM lotes"

-- | Lotes com saldo, do que vence primeiro para o último (primeiro que vence, primeiro que sai).
listarLotes :: Connection -> Day -> IO [Lote]
listarLotes conn hoje =
  map (paraLote hoje) <$> query_ conn (colunasLote <> " WHERE quantidade > 0 ORDER BY validade, id")

buscarLote :: Connection -> Day -> Int -> IO (Maybe Lote)
buscarLote conn hoje i = do
  rs <- query conn (colunasLote <> " WHERE id = ?") (Only i)
  pure $ case rs of
    (r : _) -> Just (paraLote hoje r)
    [] -> Nothing

custoUnitario :: NovoLote -> Double
custoUnitario nl = fromIntegral (round (nlCustoTotal nl / nlQuantidade nl * 10000) :: Integer) / 10000

inserirLote :: Connection -> Day -> NovoLote -> IO Int
inserirLote conn hoje nl = do
  execute
    conn
    "INSERT INTO lotes (produto, codigo, unidade, quantidade_inicial, quantidade, custo_unitario, validade, recebido_em) VALUES (?,?,?,?,?,?,?,?)"
    ( nlProduto nl,
      nlCodigo nl,
      nlUnidade nl,
      nlQuantidade nl,
      nlQuantidade nl,
      custoUnitario nl,
      nlValidade nl,
      maybe hoje id (nlRecebidoEm nl)
    )
  fromIntegral <$> lastInsertRowId conn

-- | PUT: troca todos os dados do lote. Só é permitido sem movimentações (checado no Main).
atualizarLote :: Connection -> Day -> Int -> NovoLote -> IO ()
atualizarLote conn hoje i nl =
  execute
    conn
    "UPDATE lotes SET produto=?, codigo=?, unidade=?, quantidade_inicial=?, quantidade=?, custo_unitario=?, validade=?, recebido_em=? WHERE id=?"
    ( (nlProduto nl, nlCodigo nl, nlUnidade nl, nlQuantidade nl, nlQuantidade nl)
        :. (custoUnitario nl, nlValidade nl, maybe hoje id (nlRecebidoEm nl), i)
    )

-- | PATCH: muda só a validade.
atualizarValidade :: Connection -> Int -> Day -> IO ()
atualizarValidade conn i v = execute conn "UPDATE lotes SET validade=? WHERE id=?" (v, i)

apagarLote :: Connection -> Int -> IO ()
apagarLote conn i = execute conn "DELETE FROM lotes WHERE id=?" (Only i)

contarMovimentacoes :: Connection -> Int -> IO Int
contarMovimentacoes conn i = do
  [Only n] <- query conn "SELECT COUNT(*) FROM movimentacoes WHERE lote_id=?" (Only i)
  pure n

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

-- | Movimentações de um mês ("AAAA-MM"), mais recentes primeiro.
movimentacoesDoMes :: Connection -> Text -> IO [Movimentacao]
movimentacoesDoMes conn mes =
  map paraMov
    <$> query
      conn
      "SELECT m.id, m.lote_id, l.produto, l.unidade, m.tipo, m.motivo, m.destino, m.quantidade, m.valor, m.data \
      \FROM movimentacoes m JOIN lotes l ON l.id = m.lote_id \
      \WHERE substr(m.data, 1, 7) = ? ORDER BY m.data DESC, m.id DESC"
      (Only mes)
  where
    paraMov (i, li, p, u, t, mo, de, q, v, d) = Movimentacao i li p u t mo de q v d
