{-# LANGUAGE DeriveGeneric #-}

-- | Tipos do PerdaZero e como eles viram JSON.
-- Cada record usa um prefixo nos campos (ex.: ltProduto) para não repetir nomes;
-- no JSON o prefixo some (ex.: "produto").
module Tipos where

import Data.Aeson
import Data.Char (toLower)
import Data.Text (Text)
import Data.Map.Strict (Map)
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
    ltNivel :: Text, -- "vencido" | "hoje" | "3dias" | "7dias" | "ok"
    ltMovimentacoes :: Int -- quantos usos/descartes o lote já teve
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

-- | Corpo do POST /cadastro e do POST /login
data Credenciais = Credenciais
  { crEmail :: Text,
    crSenha :: Text,
    crRestaurante :: Maybe Text -- só no cadastro
  }
  deriving (Show, Generic)

instance FromJSON Credenciais where parseJSON = genericParseJSON (opcoes 2)

-- | Resposta do login/cadastro: o token vai no cabeçalho "Authorization: Bearer <token>"
data Sessao = Sessao
  { ssToken :: Text,
    ssEmail :: Text,
    ssRestaurante :: Text
  }
  deriving (Show, Generic)

instance ToJSON Sessao where toJSON = genericToJSON (opcoes 2)

-- | Usuário logado (GET /eu)
data Usuario = Usuario
  { usId :: Int,
    usEmail :: Text,
    usRestaurante :: Text
  }
  deriving (Show, Generic)

instance ToJSON Usuario where toJSON = genericToJSON (opcoes 2)

-- ---------------------------------------------------------------- resumo / indicadores

-- | Totais de um mês ("AAAA-MM"): perda por motivo, uso e valor salvo por destino.
data TotaisMes = TotaisMes
  { tmMes :: Text,
    tmPerda :: Double,
    tmUsado :: Double, -- todo uso (inclui uso normal)
    tmSalvo :: Double, -- prato do dia + promoção + doação
    tmDoado :: Double,
    tmMotivos :: Map Text Double,
    tmDestinos :: Map Text Double
  }
  deriving (Show, Generic)

instance ToJSON TotaisMes where toJSON = genericToJSON (opcoes 2)

-- | Uso e perda numa janela de dias (aproveitamento em 30 dias).
data Janela = Janela {jaUsado :: Double, jaPerda :: Double}
  deriving (Show, Generic)

instance ToJSON Janela where toJSON = genericToJSON (opcoes 2)

-- | Resposta do GET /resumo
data Resumo = Resumo
  { rsMeses :: [TotaisMes], -- últimos 6 meses, do mais antigo ao atual
    rsUltimos30 :: Janela,
    rsAnteriores30 :: Janela
  }
  deriving (Show, Generic)

instance ToJSON Resumo where toJSON = genericToJSON (opcoes 2)

-- | Produto já cadastrado (sugere unidade e prazo de validade na entrada)
data ProdutoConhecido = ProdutoConhecido
  { pcProduto :: Text,
    pcUnidade :: Text,
    pcCustoUnitario :: Double,
    pcVida :: Int -- dias entre recebimento e validade na última entrada
  }
  deriving (Show, Generic)

instance ToJSON ProdutoConhecido where toJSON = genericToJSON (opcoes 2)

-- | Corpo do PATCH /lote/:id/dados (corrige nome, código e datas mesmo com histórico)
data DadosLote = DadosLote
  { ddProduto :: Text,
    ddCodigo :: Maybe Text,
    ddValidade :: Day,
    ddRecebidoEm :: Day
  }
  deriving (Show, Generic)

instance FromJSON DadosLote where parseJSON = genericParseJSON (opcoes 2)

-- ---------------------------------------------------------------- conta

newtype AtualizarPerfil = AtualizarPerfil {apRestaurante :: Text}
  deriving (Show, Generic)

instance FromJSON AtualizarPerfil where parseJSON = genericParseJSON (opcoes 2)

data TrocarSenha = TrocarSenha {tsSenhaAtual :: Text, tsSenhaNova :: Text}
  deriving (Show, Generic)

instance FromJSON TrocarSenha where parseJSON = genericParseJSON (opcoes 2)

-- ---------------------------------------------------------------- dados de demonstração

-- | Lote gerado pelo front; "chave" liga o lote às movimentações antes de existir id no banco.
data DemoLote = DemoLote
  { dlChave :: Text,
    dlProduto :: Text,
    dlCodigo :: Maybe Text,
    dlUnidade :: Text,
    dlQuantidadeInicial :: Double,
    dlQuantidade :: Double,
    dlCustoUnitario :: Double,
    dlValidade :: Day,
    dlRecebidoEm :: Day
  }
  deriving (Show, Generic)

instance FromJSON DemoLote where parseJSON = genericParseJSON (opcoes 2)

data DemoMov = DemoMov
  { dmChave :: Text,
    dmTipo :: Text,
    dmMotivo :: Maybe Text,
    dmDestino :: Maybe Text,
    dmQuantidade :: Double,
    dmValor :: Double,
    dmData :: Day
  }
  deriving (Show, Generic)

instance FromJSON DemoMov where parseJSON = genericParseJSON (opcoes 2)

data Demo = Demo
  { deLotes :: [DemoLote],
    deMovimentacoes :: [DemoMov],
    deConfirmar :: Bool -- obrigatório se a conta já tiver dados
  }
  deriving (Show, Generic)

instance FromJSON Demo where parseJSON = genericParseJSON (opcoes 2)
