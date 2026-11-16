{-# LANGUAGE DataKinds #-}
{-# LANGUAGE TypeOperators #-}

-- | O contrato da API do PerdaZero: só os tipos das rotas, sem implementação.
-- A implementação de cada rota fica em "Handlers".
module Api
  ( API,
    Publica,
    Protegida,
    Token,
  )
where

import Data.Text (Text)
import Servant
import Tipos

-- | Cabeçalho com o token de sessão: "Authorization: Bearer <token>"
type Token = Header "Authorization" Text

-- | Rotas públicas: criar conta, entrar.
type Publica =
  -- POST /cadastro : cria a conta e já devolve a sessão
  "cadastro" :> ReqBody '[JSON] Credenciais :> Post '[JSON] Sessao
    -- POST /login
    :<|> "login" :> ReqBody '[JSON] Credenciais :> Post '[JSON] Sessao

-- | Rotas que exigem login. Mesmo padrão dos exemplos (GET /clientes, POST /cliente,
-- PUT/PATCH/DELETE /cliente/:id), trocando "cliente" por "lote".
type Protegida =
  -- POST /logout
  "logout" :> Token :> PostNoContent
    -- GET /eu : quem está logado
    :<|> "eu" :> Token :> Get '[JSON] Usuario
    -- GET /lotes : lotes com saldo (com dias para vencer e nível de alerta)
    :<|> "lotes" :> Token :> Get '[JSON] [Lote]
    -- GET /lotes/alertas : só o que vence em até 7 dias (inclui vencidos)
    :<|> "lotes" :> "alertas" :> Token :> Get '[JSON] [Lote]
    -- GET /lote/:id
    :<|> "lote" :> Capture "id" Int :> Token :> Get '[JSON] Lote
    -- POST /lote : cadastra uma entrada
    :<|> "lote" :> Token :> ReqBody '[JSON] NovoLote :> Post '[JSON] Lote
    -- PUT /lote/:id : troca todos os dados (só se o lote ainda não teve uso/descarte)
    :<|> "lote" :> Capture "id" Int :> Token :> ReqBody '[JSON] NovoLote :> Put '[JSON] Lote
    -- PATCH /lote/:id/validade : corrige só a validade
    :<|> "lote" :> Capture "id" Int :> "validade" :> Token :> ReqBody '[JSON] NovaValidade :> Patch '[JSON] Lote
    -- DELETE /lote/:id
    :<|> "lote" :> Capture "id" Int :> Token :> DeleteNoContent
    -- POST /lote/:id/movimentacao : registra uso (com destino) ou descarte (com motivo)
    :<|> "lote" :> Capture "id" Int :> "movimentacao" :> Token :> ReqBody '[JSON] NovaMovimentacao :> Post '[JSON] Lote
    -- GET /relatorio?mes=2026-11 : perdas e valor salvo do mês
    :<|> "relatorio" :> Token :> QueryParam "mes" Text :> Get '[JSON] Relatorio
    -- GET /resumo : últimos 6 meses + aproveitamento em 30 dias (gráficos)
    :<|> "resumo" :> Token :> Get '[JSON] Resumo
    -- GET /lotes/contagem : quantos lotes já foram cadastrados (0 = primeiro acesso)
    :<|> "lotes" :> "contagem" :> Token :> Get '[JSON] Int
    -- PATCH /lote/:id/dados : corrige nome, código e datas (vale mesmo com histórico)
    :<|> "lote" :> Capture "id" Int :> "dados" :> Token :> ReqBody '[JSON] DadosLote :> Patch '[JSON] Lote
    -- GET /produtos : produtos já cadastrados (sugestões na entrada)
    :<|> "produtos" :> Token :> Get '[JSON] [ProdutoConhecido]
    -- PATCH /eu : muda o nome do restaurante
    :<|> "eu" :> Token :> ReqBody '[JSON] AtualizarPerfil :> Patch '[JSON] Usuario
    -- PUT /eu/senha : troca a senha (pede a atual)
    :<|> "eu" :> "senha" :> Token :> ReqBody '[JSON] TrocarSenha :> PutNoContent
    -- DELETE /meus-dados : apaga todos os lotes e movimentações do usuário
    :<|> "meus-dados" :> Token :> DeleteNoContent
    -- POST /demo : troca os dados pelos de demonstração
    :<|> "demo" :> Token :> ReqBody '[JSON] Demo :> PostNoContent

-- | A API inteira. O front (Next.js, pasta frontend/) roda à parte em localhost:8080.
type API = Publica :<|> Protegida
