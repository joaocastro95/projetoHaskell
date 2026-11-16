# PerdaZero — telas (Next.js + TypeScript)

Front-end do PerdaZero. Os dados vêm da API Haskell da pasta acima (`cabal run`, porta 8081),
que guarda tudo no banco SQLite local. Não usa Supabase nem serviço externo.

```bash
npm install
npm run dev   # http://localhost:8080
```

`src/lib/api.ts` é o único ponto que conversa com a API (via `fetch`, no servidor do Next).
Veja o README da raiz para os endpoints e o banco de dados.
