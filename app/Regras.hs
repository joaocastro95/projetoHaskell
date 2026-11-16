{-# LANGUAGE OverloadedStrings #-}

-- | Regras de negócio do PerdaZero (funções puras, fáceis de testar no cabal repl).
module Regras
  ( nivelAlerta,
    unidadeInteira,
    validarNovoLote,
    validarMovimentacao,
    montarRelatorio,
    motivos,
    destinos,
  )
where

import Data.List (sortBy)
import qualified Data.Map.Strict as M
import Data.Ord (Down (..), comparing)
import Data.Text (Text)
import qualified Data.Text as T
import Data.Time (Day)
import Tipos

motivos, destinos, unidades :: [Text]
motivos = ["vencido", "estragado", "sobra"]
destinos = ["uso_normal", "prato_do_dia", "promocao", "doacao"]
unidades = ["kg", "g", "L", "mL", "un", "cx", "pct", "dz"]

-- | Faixas de alerta do fluxograma: vencido, vence hoje, até 3 e até 7 dias.
nivelAlerta :: Int -> Text
nivelAlerta d
  | d < 0 = "vencido"
  | d == 0 = "hoje"
  | d <= 3 = "3dias"
  | d <= 7 = "7dias"
  | otherwise = "ok"

-- | Unidades que não existem fracionadas (não há meia caixa).
unidadeInteira :: Text -> Bool
unidadeInteira u = u `elem` ["un", "cx", "pct", "dz", "g", "mL"]

ehInteiro :: Double -> Bool
ehInteiro x = x == fromIntegral (round x :: Integer)

-- | Valida um lote novo (ou editado). `hoje` vem de fora para a função continuar pura.
validarNovoLote :: Day -> NovoLote -> Either Text NovoLote
validarNovoLote hoje nl
  | T.null produto = Left "Informe o nome do insumo."
  | nlUnidade nl `notElem` unidades = Left "Unidade inválida."
  | nlQuantidade nl <= 0 = Left "Quantidade deve ser maior que zero."
  | unidadeInteira (nlUnidade nl) && not (ehInteiro (nlQuantidade nl)) =
      Left ("Use um número inteiro: não existe fração de " <> nlUnidade nl <> ".")
  | nlCustoTotal nl < 0 = Left "Custo inválido."
  | recebido > hoje = Left "A data de recebimento não pode ser no futuro."
  | nlValidade nl < recebido = Left "A validade não pode ser antes da data de recebimento."
  | otherwise = Right nl {nlProduto = produto, nlRecebidoEm = Just recebido}
  where
    produto = T.strip (nlProduto nl)
    recebido = maybe hoje id (nlRecebidoEm nl)

-- | Valida um uso/descarte contra o lote atual.
validarMovimentacao :: Lote -> NovaMovimentacao -> Either Text ()
validarMovimentacao l nm
  | nmTipo nm `notElem` ["uso", "descarte"] = Left "Tipo deve ser 'uso' ou 'descarte'."
  | nmQuantidade nm <= 0 = Left "Quantidade deve ser maior que zero."
  | nmQuantidade nm > ltQuantidade l + 1e-9 = Left "Quantidade maior que o saldo do lote."
  | unidadeInteira (ltUnidade l) && not (ehInteiro (nmQuantidade nm)) =
      Left ("Use um número inteiro: não existe fração de " <> ltUnidade l <> ".")
  | nmTipo nm == "uso" && vencido =
      Left "Lote vencido não pode ser usado nem doado (RDC 216/2004). Registre o descarte."
  | nmTipo nm == "uso" && maybe True (`notElem` destinos) (nmDestino nm) = Left "Escolha o destino do uso."
  | nmTipo nm == "descarte" && maybe True (`notElem` motivos) (nmMotivo nm) = Left "Escolha o motivo do descarte."
  | nmTipo nm == "descarte" && nmMotivo nm == Just "vencido" && not vencido =
      Left "A validade ainda não passou: escolha 'estragado' ou 'sobra'."
  | otherwise = Right ()
  where
    vencido = ltDiasParaVencer l < 0

-- | Monta o relatório do mês a partir das movimentações daquele mês.
montarRelatorio :: Text -> [Movimentacao] -> Relatorio
montarRelatorio mes movs =
  Relatorio
    { rlMes = mes,
      rlPerdido = perdido,
      rlSalvo = soma [m | m <- usos, mvDestino m `elem` map Just ["prato_do_dia", "promocao", "doacao"]],
      rlDoado = soma [m | m <- usos, mvDestino m == Just "doacao"],
      rlUsado = usado,
      rlAproveitamento = if usado + perdido > 0 then Just (usado / (usado + perdido)) else Nothing,
      rlPorMotivo = [(mo, soma [m | m <- descartes, mvMotivo m == Just mo]) | mo <- motivos],
      rlRanking = take 5 ranking,
      rlMovimentacoes = movs
    }
  where
    descartes = filter ((== "descarte") . mvTipo) movs
    usos = filter ((== "uso") . mvTipo) movs
    soma = sum . map mvValor
    perdido = soma descartes
    usado = soma usos
    porProduto = M.fromListWith somar [(mvProduto m, (mvValor m, 1 :: Int)) | m <- descartes]
    somar (a, b) (c, d) = (a + c, b + d)
    ranking =
      sortBy (comparing (Down . irValor)) [ItemRanking p v n | (p, (v, n)) <- M.toList porProduto]
