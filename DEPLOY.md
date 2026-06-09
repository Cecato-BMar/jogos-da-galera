# Deploy - Jogos da Galera

## Supabase

1. Crie um projeto Supabase.
2. Copie a connection string PostgreSQL.
3. Use essa string no Render como `DATABASE_URL`.

## Render backend

- Root Directory: `backend`
- Build Command: `npm install && npx prisma generate && npm run build`
- Start Command: `npx prisma migrate deploy && npm run start:prod`

Variaveis:

- `DATABASE_URL`: connection string PostgreSQL do Supabase
- `FRONTEND_URL`: URL final da Vercel, sem barra no final
- `PORT`: `3001`

Tambem existe `render.yaml` na raiz para Blueprint.

## Vercel frontend

- Root Directory: `frontend`
- Framework: Next.js

Variaveis:

- `NEXT_PUBLIC_API_URL`: URL final do backend no Render
- `NEXT_PUBLIC_SOCKET_URL`: URL final do backend no Render

## Teste final

- Criar sala
- Entrar com segundo jogador
- Iniciar jogo
- Preencher respostas
- Clicar STOP
- Ver resultado
- Compartilhar no WhatsApp
