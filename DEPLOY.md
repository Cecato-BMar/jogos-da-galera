# Deploy - Jogos da Galera

## Links atuais

- GitHub: https://github.com/Cecato-BMar/jogos-da-galera
- Frontend Vercel: https://jogos-da-galera.vercel.app
- Supabase: https://pilkxchbymfpoyakwxit.supabase.co
- Render Blueprint: https://dashboard.render.com/blueprint/new?repo=https://github.com/Cecato-BMar/jogos-da-galera
- Backend esperado: https://jogos-da-galera-backend.onrender.com

## Supabase

1. Use o projeto Supabase `Jogos da Galera`.
2. Copie a connection string PostgreSQL no painel do Supabase.
3. Use essa string no Render como `DATABASE_URL`.
4. Formato esperado:
   `postgresql://postgres:SENHA_DO_BANCO@db.pilkxchbymfpoyakwxit.supabase.co:5432/postgres?sslmode=require`

## Render backend

- Blueprint: https://dashboard.render.com/blueprint/new?repo=https://github.com/Cecato-BMar/jogos-da-galera
- Service name: `jogos-da-galera-backend`
- Root Directory: `backend`
- Build Command: `npm install && npx prisma generate && npm run build`
- Start Command: `npx prisma migrate deploy && npm run start:prod`

Variaveis:

- `DATABASE_URL`: connection string PostgreSQL do Supabase
- `FRONTEND_URL`: `https://jogos-da-galera.vercel.app`
- `PORT`: `3001`

O `render.yaml` na raiz ja configura o servico web e deixa `DATABASE_URL` e `FRONTEND_URL` para preenchimento seguro no painel do Render.

## Vercel frontend

- Root Directory: `frontend`
- Framework: Next.js

Variaveis:

- `NEXT_PUBLIC_API_URL`: `https://jogos-da-galera-backend.onrender.com`
- `NEXT_PUBLIC_SOCKET_URL`: `https://jogos-da-galera-backend.onrender.com`

## Teste final

- Criar sala
- Entrar com segundo jogador
- Iniciar jogo
- Preencher respostas
- Clicar STOP
- Ver resultado
- Compartilhar no WhatsApp
