{-# LANGUAGE OverloadedStrings #-}

-- | Testes das regras de negócio. Como "Regras" só tem funções puras,
-- não precisa de banco nem de servidor: é só chamar a função e comparar.
module RegrasSpec (spec) where

import Data.Either (isLeft, isRight)
import Data.Text (Text)
import Data.Time (Day, fromGregorian)
import Regras
import Test.Hspec
import Tipos

hoje :: Day
hoje = fromGregorian 2026 11 16

-- | Um lote válido para usar de base nos testes.
loteNovo :: NovoLote
loteNovo =
  NovoLote
    { nlProduto = "  Tomate  ",
      nlCodigo = Nothing,
      nlUnidade = "kg",
      nlQuantidade = 2.5,
      nlCustoTotal = 20,
      nlValidade = fromGregorian 2026 11 20,
      nlRecebidoEm = Nothing
    }

-- | Um lote já cadastrado, com 10 unidades e `dias` para vencer.
lote :: Int -> Lote
lote dias =
  Lote
    { ltId = 1,
      ltProduto = "Leite",
      ltCodigo = Nothing,
      ltUnidade = "un",
      ltQuantidadeInicial = 10,
      ltQuantidade = 10,
      ltCustoUnitario = 5,
      ltValidade = fromGregorian 2026 11 20,
      ltRecebidoEm = fromGregorian 2026 11 10,
      ltDiasParaVencer = dias,
      ltNivel = nivelAlerta dias,
      ltMovimentacoes = 0
    }

uso :: Text -> Double -> NovaMovimentacao
uso destino q = NovaMovimentacao "uso" Nothing (Just destino) q

descarte :: Text -> Double -> NovaMovimentacao
descarte motivo q = NovaMovimentacao "descarte" (Just motivo) Nothing q

mov :: Text -> Maybe Text -> Maybe Text -> Text -> Double -> Movimentacao
mov tipo motivo destino produto valor =
  Movimentacao 1 1 produto "kg" tipo motivo destino 1 valor hoje

spec :: Spec
spec = do
  describe "nivelAlerta" $ do
    it "classifica cada faixa de dias" $
      map nivelAlerta [-1, 0, 1, 3, 4, 7, 8]
        `shouldBe` ["vencido", "hoje", "3dias", "3dias", "7dias", "7dias", "ok"]

  describe "validarNovoLote" $ do
    it "aceita um lote válido, tira espaços do nome e usa hoje como recebimento" $
      fmap (\l -> (nlProduto l, nlRecebidoEm l)) (validarNovoLote hoje loteNovo)
        `shouldBe` Right ("Tomate", Just hoje)
    it "recusa nome vazio" $
      validarNovoLote hoje loteNovo {nlProduto = "   "} `shouldSatisfy` isLeft
    it "recusa unidade desconhecida" $
      validarNovoLote hoje loteNovo {nlUnidade = "tonelada"} `shouldSatisfy` isLeft
    it "recusa quantidade zero" $
      validarNovoLote hoje loteNovo {nlQuantidade = 0} `shouldSatisfy` isLeft
    it "recusa fração em unidade inteira (meia caixa)" $
      validarNovoLote hoje loteNovo {nlUnidade = "cx", nlQuantidade = 1.5} `shouldSatisfy` isLeft
    it "recusa recebimento no futuro" $
      validarNovoLote hoje loteNovo {nlRecebidoEm = Just (fromGregorian 2026 11 17)} `shouldSatisfy` isLeft
    it "recusa validade antes do recebimento" $
      validarNovoLote hoje loteNovo {nlValidade = fromGregorian 2026 11 1} `shouldSatisfy` isLeft

  describe "validarMovimentacao" $ do
    it "aceita uso com destino válido" $
      validarMovimentacao (lote 5) (uso "prato_do_dia" 3) `shouldSatisfy` isRight
    it "recusa quantidade maior que o saldo" $
      validarMovimentacao (lote 5) (uso "uso_normal" 11) `shouldSatisfy` isLeft
    it "recusa fração de unidade" $
      validarMovimentacao (lote 5) (uso "uso_normal" 0.5) `shouldSatisfy` isLeft
    it "não deixa usar lote vencido (RDC 216/2004)" $
      validarMovimentacao (lote (-1)) (uso "doacao" 1) `shouldSatisfy` isLeft
    it "deixa descartar lote vencido como 'vencido'" $
      validarMovimentacao (lote (-1)) (descarte "vencido" 1) `shouldSatisfy` isRight
    it "não aceita motivo 'vencido' se a validade não passou" $
      validarMovimentacao (lote 2) (descarte "vencido" 1) `shouldSatisfy` isLeft
    it "exige motivo conhecido no descarte" $
      validarMovimentacao (lote 2) (descarte "perdi" 1) `shouldSatisfy` isLeft

  describe "montarRelatorio" $ do
    let movs =
          [ mov "descarte" (Just "vencido") Nothing "Leite" 30,
            mov "descarte" (Just "sobra") Nothing "Arroz" 10,
            mov "descarte" (Just "estragado") Nothing "Leite" 20,
            mov "uso" Nothing (Just "uso_normal") "Arroz" 100,
            mov "uso" Nothing (Just "doacao") "Pão" 15,
            mov "uso" Nothing (Just "promocao") "Tomate" 5
          ]
        r = montarRelatorio "2026-11" movs
    it "soma perdido, usado, salvo e doado" $
      (rlPerdido r, rlUsado r, rlSalvo r, rlDoado r) `shouldBe` (60, 120, 20, 15)
    it "calcula o aproveitamento (usado / (usado + perdido))" $
      rlAproveitamento r `shouldBe` Just (120 / 180)
    it "ordena o ranking pelo valor perdido" $
      map (\i -> (irProduto i, irValor i, irVezes i)) (rlRanking r)
        `shouldBe` [("Leite", 50, 2), ("Arroz", 10, 1)]
    it "não tem aproveitamento num mês sem movimentações" $
      rlAproveitamento (montarRelatorio "2026-10" []) `shouldBe` Nothing
