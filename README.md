# Jogos da Galera

MVP de plataforma para jogar party games online com amigos em tempo real.

Jogos disponiveis:

- Stop Online
- Forca Online
- Jogo da Velha

## Stack

- Frontend: Next.js, TypeScript, TailwindCSS, Socket.IO Client
- Backend: NestJS, Prisma, PostgreSQL, Socket.IO
- Hospedagem sugerida: Vercel + Render + Supabase

## Como rodar localmente

### Backend

```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Acesse: http://localhost:3000
