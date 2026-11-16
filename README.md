# PerdaZero em Haskell (Servant)

Controle de validade e desperdício para pequenos restaurantes, com back-end em **Haskell + Servant**,
banco **SQLite** (arquivo local) e front em **HTML + JavaScript (fetch)**. Roda só no computador (localhost).

## Como rodar

```bash
cabal update
cabal run
```

Abra **http://localhost:8080**. O banco `perdazero.db` é criado sozinho na pasta do projeto
na primeira execução (para começar do zero, é só apagar esse arquivo).

## Endpoints

Mesmo padrão dos exemplos de aula (`/clientes`, `/cliente/:id`), trocando cliente por **lote**
(cada entrada de mercadoria com validade).

| Método | Rota | O que faz |
|---|---|---|
| GET | `/lotes` | Lista os lotes com saldo, do que vence primeiro ao último, com `diasParaVencer` e `nivel` |
| GET | `/lotes/alertas` | Só o que vence em até 7 dias (inclui vencidos) |
| GET | `/lote/:id` | Um lote |
| POST | `/lote` | Cadastra uma entrada |
| PUT | `/lote/:id` | Troca todos os dados (só se o lote ainda não teve uso/descarte) |
| PATCH | `/lote/:id/validade` | Corrige só a validade |
| DELETE | `/lote/:id` | Exclui o lote e o histórico dele |
| POST | `/lote/:id/movimentacao` | Registra uso (com destino) ou descarte (com motivo) e baixa o saldo |
| GET | `/relatorio?mes=AAAA-MM` | Perdido, salvo, aproveitamento, perdas por motivo, ranking e movimentações do mês |

Erros voltam com status 400/404/409 e o corpo `{"erro": "mensagem"}`.

### Exemplos (curl)

```bash
# Cadastrar
curl -X POST localhost:8080/lote -H "Content-Type: application/json" \
  -d '{"produto":"Peito de frango","codigo":null,"unidade":"kg","quantidade":5,"custoTotal":90,"validade":"2026-11-20","recebidoEm":null}'

# Listar
curl localhost:8080/lotes

# Descartar 2 kg estragados do lote 1
curl -X POST localhost:8080/lote/1/movimentacao -H "Content-Type: application/json" \
  -d '{"tipo":"descarte","motivo":"estragado","destino":null,"quantidade":2}'

# Corrigir só a validade
curl -X PATCH localhost:8080/lote/1/validade -H "Content-Type: application/json" -d '{"validade":"2026-11-22"}'

# Relatório do mês
curl "localhost:8080/relatorio?mes=2026-11"
```

## Regras de negócio (app/Regras.hs)

- Alertas: vencido, vence hoje, até 3 dias, até 7 dias.
- Unidades contáveis (un, cx, pct, dz, g, mL) só aceitam números inteiros.
- Validade não pode ser antes do recebimento; recebimento não pode ser no futuro.
- Lote vencido não pode ser usado nem doado (RDC 216/2004): só descartado.
- Motivo "vencido" só vale se a validade já passou.
- Uso/descarte não pode passar do saldo; grava e baixa o saldo na mesma transação.
- Aproveitamento = usado ÷ (usado + perdido).

## Estrutura

```
app/Main.hs     API (tipo Servant) e handlers
app/Tipos.hs    Records e conversão para JSON (aeson)
app/Regras.hs   Regras de negócio puras (validações, alertas, relatório)
app/Banco.hs    SQLite: tabelas lotes e movimentacoes
static/         index.html, estilo.css, app.js (front com fetch)
```
