{-# LANGUAGE DeriveGeneric #-}

-- | Tipos do PerdaZero e como eles viram JSON.
-- Cada record usa um prefixo nos campos (ex.: ltProduto) para não repetir nomes;
-- no JSON o prefixo some (ex.: "produto").
module Tipos where

import Data.Aeson
import Data.Char (toLower)
import Data.Text (Text)
import Data.Time (Day)
import GHC.Generics (Generic)

-- | Tira o prefixo de N letras e deixa a primeira minúscula: ltProduto -> produto
opcoes :: Int -> Options
opcoes n = defaultOptions {fieldLabelModifier = minuscula . drop n, omitNothingFields = False}
  where
    minuscula (c : cs) = toLower c : cs
    minuscula [] = []

-- | Lote de um insumo, como devolvido pela API (com os dias para vencer já calculados).
data Lote = Lote
  { ltId :: Int,
    ltProduto :: Text,
    ltCodigo :: Maybe Text,
    ltUnidade :: Text,
    ltQuantidadeInicial :: Double,
    ltQuantidade :: Double,
    ltCustoUnitario :: Double,
    ltValidade :: Day,
    ltRecebidoEm :: Day,
    ltDiasParaVencer :: Int,
    ltNivel :: Text -- "vencido" | "hoje" | "3dias" | "7dias" | "ok"
  }
  deriving (Show, Generic)

instance ToJSON Lote where toJSON = genericToJSON (opcoes 2)

-- | Corpo do POST /lote e do PUT /lote/:id
data NovoLote = NovoLote
  { nlProduto :: Text,
    nlCodigo :: Maybe Text,
    nlUnidade :: Text,
    nlQuantidade :: Double,
    nlCustoTotal :: Double,
    nlValidade :: Day,
    nlRecebidoEm :: Maybe Day
  }
  deriving (Show, Generic)

instance FromJSON NovoLote where parseJSON = genericParseJSON (opcoes 2)

-- | Corpo do PATCH /lote/:id/validade (atualiza só um campo)
newtype NovaValidade = NovaValidade {nvValidade :: Day}
  deriving (Show, Generic)

instance FromJSON NovaValidade where parseJSON = genericParseJSON (opcoes 2)

-- | Uso ou descarte registrado
data Movimentacao = Movimentacao
  { mvId :: Int,
    mvLoteId :: Int,
    mvProduto :: Text,
    mvUnidade :: Text,
    mvTipo :: Text, -- "uso" | "descarte"
    mvMotivo :: Maybe Text, -- descarte: "vencido" | "estragado" | "sobra"
    mvDestino :: Maybe Text, -- uso: "uso_normal" | "prato_do_dia" | "promocao" | "doacao"
    mvQuantidade :: Double,
    mvValor :: Double,
    mvData :: Day
  }
  deriving (Show, Generic)

instance ToJSON Movimentacao where toJSON = genericToJSON (opcoes 2)

-- | Corpo do POST /lote/:id/movimentacao
data NovaMovimentacao = NovaMovimentacao
  { nmTipo :: Text,
    nmMotivo :: Maybe Text,
    nmDestino :: Maybe Text,
    nmQuantidade :: Double
  }
  deriving (Show, Generic)

instance FromJSON NovaMovimentacao where parseJSON = genericParseJSON (opcoes 2)

-- | Uma linha do ranking de insumos que mais geram perda
data ItemRanking = ItemRanking
  { irProduto :: Text,
    irValor :: Double,
    irVezes :: Int
  }
  deriving (Show, Generic)

instance ToJSON ItemRanking where toJSON = genericToJSON (opcoes 2)

-- | Resposta do GET /relatorio?mes=AAAA-MM
data Relatorio = Relatorio
  { rlMes :: Text,
    rlPerdido :: Double,
    rlSalvo :: Double, -- prato do dia + promoção + doação
    rlDoado :: Double,
    rlUsado :: Double, -- todo uso (inclui uso normal)
    rlAproveitamento :: Maybe Double, -- usado / (usado + perdido)
    rlPorMotivo :: [(Text, Double)],
    rlRanking :: [ItemRanking],
    rlMovimentacoes :: [Movimentacao]
  }
  deriving (Show, Generic)

instance ToJSON Relatorio where toJSON = genericToJSON (opcoes 2)

-- | Mensagem de erro em JSON: {"erro": "..."}
newtype Erro = Erro {erErro :: Text} deriving (Show, Generic)

instance ToJSON Erro where toJSON = genericToJSON (opcoes 2)
