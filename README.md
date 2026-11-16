# PerdaZero em Haskell (Servant) + Next.js

Controle de validade e desperdício para pequenos restaurantes.

- **Back-end:** Haskell + Servant (pasta `app/`), com as regras de negócio, login e relatórios.
- **Banco de dados:** SQLite local (arquivo `perdazero.db`), sem servidor nem conta externa.
- **Front-end:** Next.js + TypeScript (pasta `frontend/`), as mesmas telas do PerdaZero, chamando a API Haskell com `fetch`.

Tudo roda no computador (localhost).

## Como rodar

São dois terminais:

```bash
# 1) API Haskell em http://localhost:8081
cabal update
cabal run
```

```bash
# 2) Site em http://localhost:8080
cd frontend
npm install
npm run dev
```

Abra **http://localhost:8080**, clique em **Criar conta grátis** e, para ver tudo preenchido,
vá em **Conta → Carregar dados de demonstração**.

O front encontra a API pela variável `API_URL` (padrão `http://localhost:8081`, veja `frontend/.env.example`).
As chamadas saem do servidor do Next para a API, então não há CORS e o token de login fica num
cookie httpOnly, fora do JavaScript do navegador.

## Banco de dados local

O banco é o arquivo `perdazero.db`, criado sozinho na pasta do projeto na primeira execução da API.
Para começar do zero, pare a API e apague o arquivo.

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

## Endpoints

Mesmo padrão dos exemplos de aula (`/clientes`, `/cliente/:id`), trocando cliente por **lote**
(cada entrada de mercadoria com validade).

| Método | Rota | Login? | O que faz |
|---|---|---|---|
| POST | `/cadastro` | não | Cria a conta (`email`, `senha`, `restaurante`) e devolve a sessão |
| POST | `/login` | não | Entra (`email`, `senha`) e devolve a sessão |
| POST | `/logout` | sim | Invalida o token |
| GET | `/eu` | sim | Usuário logado |
| PATCH | `/eu` | sim | Muda o nome do restaurante |
| PUT | `/eu/senha` | sim | Troca a senha (pede a atual) |
| GET | `/lotes` | sim | Lotes com saldo, do que vence primeiro ao último, com `diasParaVencer`, `nivel` e nº de movimentações |
| GET | `/lotes/alertas` | sim | Só o que vence em até 7 dias (inclui vencidos) |
| GET | `/lotes/contagem` | sim | Quantos lotes já foram cadastrados (0 = primeiro acesso) |
| GET | `/lote/:id` | sim | Um lote |
| POST | `/lote` | sim | Cadastra uma entrada |
| PUT | `/lote/:id` | sim | Troca todos os dados (só se o lote ainda não teve uso/descarte) |
| PATCH | `/lote/:id/validade` | sim | Corrige só a validade |
| PATCH | `/lote/:id/dados` | sim | Corrige nome, código e datas (vale mesmo com histórico) |
| DELETE | `/lote/:id` | sim | Exclui o lote e o histórico dele |
| POST | `/lote/:id/movimentacao` | sim | Registra uso (com destino) ou descarte (com motivo) e baixa o saldo |
| GET | `/relatorio?mes=AAAA-MM` | sim | Perdido, salvo, aproveitamento, perdas por motivo, ranking e movimentações do mês |
| GET | `/resumo` | sim | Totais dos últimos 6 meses e aproveitamento em 30 dias (gráficos) |
| GET | `/produtos` | sim | Produtos já cadastrados (sugestões na entrada) |
| DELETE | `/meus-dados` | sim | Apaga todos os lotes e movimentações do usuário |
| POST | `/demo` | sim | Troca os dados pelos de demonstração (gerados pelo front) |

Erros voltam com status 400/401/404/409 e o corpo `{"erro": "mensagem"}`.

### Exemplos (curl)

```bash
# Criar conta (copie o token da resposta)
curl -X POST localhost:8081/cadastro -H "Content-Type: application/json" \
  -d '{"email":"eu@exemplo.com","senha":"segredo1","restaurante":"Cantina"}'

TOKEN=cole-o-token-aqui

# Cadastrar um lote
curl -X POST localhost:8081/lote -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"produto":"Peito de frango","codigo":null,"unidade":"kg","quantidade":5,"custoTotal":90,"validade":"2026-11-20","recebidoEm":null}'

# Listar
curl -H "Authorization: Bearer $TOKEN" localhost:8081/lotes

# Descartar 2 kg estragados do lote 1
curl -X POST localhost:8081/lote/1/movimentacao -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"tipo":"descarte","motivo":"estragado","destino":null,"quantidade":2}'

# Relatório do mês
curl -H "Authorization: Bearer $TOKEN" "localhost:8081/relatorio?mes=2026-11"
```

## Regras de negócio (app/Regras.hs)

- Alertas: vencido, vence hoje, até 3 dias, até 7 dias.
- Unidades contáveis (un, cx, pct, dz, g, mL) só aceitam números inteiros.
- Validade não pode ser antes do recebimento; recebimento não pode ser no futuro; lote não pode entrar já vencido.
- Lote vencido não pode ser usado nem doado (RDC 216/2004): só descartado.
- Motivo "vencido" só vale se a validade já passou.
- Uso/descarte não pode passar do saldo; grava e baixa o saldo na mesma transação.
- Aproveitamento = usado ÷ (usado + perdido).

## Estrutura

```
app/Main.hs       API (tipo Servant), login e handlers
app/Auth.hs       Hash de senha (PBKDF2) e geração de token
app/Tipos.hs      Records e conversão para JSON (aeson)
app/Regras.hs     Regras de negócio puras (validações, alertas, relatório, resumo)
app/Banco.hs      SQLite: usuarios, sessoes, lotes e movimentacoes
frontend/         Next.js + TypeScript (telas)
frontend/src/lib/api.ts   Cliente da API Haskell (fetch + cookie de sessão)
```

> No Windows o executável precisa do runtime `-threaded` (já configurado no `.cabal`);
> sem ele o Warp trava quando chegam conexões simultâneas.
