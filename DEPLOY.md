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
4. No Render Free, use a `Session pooler`, porque a conexao direta do Supabase usa IPv6.
5. Formato esperado:
   `postgresql://postgres.pilkxchbymfpoyakwxit:SENHA_DO_BANCO@aws-0-us-west-2.pooler.supabase.com:5432/postgres`

## Render backend

- Blueprint: https://dashboard.render.com/blueprint/new?repo=https://github.com/Cecato-BMar/jogos-da-galera
- Service name: `jogos-da-galera-backend`
- Root Directory: `backend`
- Build Command: `npm install --include=dev && npx prisma generate && npm run build`
- Start Command: `npx prisma migrate deploy && npm run start:prod`

Variaveis:

- `DATABASE_URL`: Session pooler do Supabase
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
- Testar Stop
- Testar Forca
- Testar Jogo da Velha
- Ver resultado
- Compartilhar no WhatsApp
