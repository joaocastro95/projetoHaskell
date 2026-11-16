# PerdaZero em Haskell (Servant)

Controle de validade e desperdício para pequenos restaurantes, com back-end em **Haskell + Servant**,
banco de dados local **SQLite** e front em **HTML + JavaScript (fetch)**. Roda só no computador (localhost).

## Como rodar

```bash
cabal update
cabal run
```

Abra **http://localhost:8080**, clique em **Criar conta** e cadastre o seu restaurante.

## Banco de dados local

O banco é o arquivo `perdazero.db`, criado sozinho na pasta do projeto na primeira execução
(não precisa instalar servidor de banco). Para começar do zero, pare o servidor e apague o arquivo.

| Tabela | Conteúdo |
|---|---|
| `usuarios` | e-mail, nome do restaurante e **hash** da senha (PBKDF2-HMAC-SHA256 com sal; a senha nunca é guardada) |
| `sessoes` | token de login de cada usuário, válido por 30 dias |
| `lotes` | entradas de mercadoria de cada usuário (`usuario_id`) |
| `movimentacoes` | usos e descartes de cada lote |

Cada usuário só enxerga e altera os próprios lotes.

## Login

1. `POST /cadastro` ou `POST /login` devolve um **token**.
2. As outras rotas exigem o cabeçalho `Authorization: Bearer <token>`; sem ele, a resposta é **401**.
3. `POST /logout` invalida o token.

O front guarda o token no navegador e volta para a tela de login se a sessão expirar.

## Endpoints

Mesmo padrão dos exemplos de aula (`/clientes`, `/cliente/:id`), trocando cliente por **lote**
(cada entrada de mercadoria com validade).

| Método | Rota | Login? | O que faz |
|---|---|---|---|
| POST | `/cadastro` | não | Cria a conta (`email`, `senha`, `restaurante`) e já devolve a sessão |
| POST | `/login` | não | Entra (`email`, `senha`) e devolve a sessão |
| POST | `/logout` | sim | Invalida o token |
| GET | `/eu` | sim | Usuário logado |
| GET | `/lotes` | sim | Lotes com saldo, do que vence primeiro ao último, com `diasParaVencer` e `nivel` |
| GET | `/lotes/alertas` | sim | Só o que vence em até 7 dias (inclui vencidos) |
| GET | `/lote/:id` | sim | Um lote |
| POST | `/lote` | sim | Cadastra uma entrada |
| PUT | `/lote/:id` | sim | Troca todos os dados (só se o lote ainda não teve uso/descarte) |
| PATCH | `/lote/:id/validade` | sim | Corrige só a validade |
| DELETE | `/lote/:id` | sim | Exclui o lote e o histórico dele |
| POST | `/lote/:id/movimentacao` | sim | Registra uso (com destino) ou descarte (com motivo) e baixa o saldo |
| GET | `/relatorio?mes=AAAA-MM` | sim | Perdido, salvo, aproveitamento, perdas por motivo, ranking e movimentações |

Erros voltam com status 400/401/404/409 e o corpo `{"erro": "mensagem"}`.

### Exemplos (curl)

```bash
# Criar conta e guardar o token
curl -X POST localhost:8080/cadastro -H "Content-Type: application/json" \
  -d '{"email":"eu@exemplo.com","senha":"segredo1","restaurante":"Cantina"}'

TOKEN=cole-o-token-aqui

# Cadastrar um lote
curl -X POST localhost:8080/lote -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"produto":"Peito de frango","codigo":null,"unidade":"kg","quantidade":5,"custoTotal":90,"validade":"2026-11-20","recebidoEm":null}'

# Listar
curl -H "Authorization: Bearer $TOKEN" localhost:8080/lotes

# Descartar 2 kg estragados do lote 1
curl -X POST localhost:8080/lote/1/movimentacao -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"tipo":"descarte","motivo":"estragado","destino":null,"quantidade":2}'

# Corrigir só a validade
curl -X PATCH localhost:8080/lote/1/validade -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"validade":"2026-11-22"}'

# Relatório do mês
curl -H "Authorization: Bearer $TOKEN" "localhost:8080/relatorio?mes=2026-11"
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
app/Main.hs     API (tipo Servant), login e handlers
app/Auth.hs     Hash de senha (PBKDF2) e geração de token
app/Tipos.hs    Records e conversão para JSON (aeson)
app/Regras.hs   Regras de negócio puras (validações, alertas, relatório)
app/Banco.hs    SQLite: usuarios, sessoes, lotes e movimentacoes
static/         index.html, estilo.css, app.js (front com fetch)
```

> No Windows o executável precisa do runtime `-threaded` (já configurado no `.cabal`);
> sem ele o Warp trava quando o navegador mantém conexões abertas.
