'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { games } from '@/lib/games';
import { api } from '@/services/api';
import { GameType } from '@/types';

export default function Home() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [selectedGame, setSelectedGame] = useState<GameType>('STOP');

  async function createRoom() {
    const playerId = localStorage.getItem('playerId');

    if (!playerId) {
      localStorage.setItem('nextAction', `create-room:${selectedGame}`);
      router.push('/perfil');
      return;
    }

    const response = await api.post('/rooms', { hostId: playerId, gameType: selectedGame });
    router.push(`/sala/${response.data.code}`);
  }

  function joinRoom() {
    if (!roomCode.trim()) return;
    const playerId = localStorage.getItem('playerId');

    if (!playerId) {
      localStorage.setItem('nextAction', `join-room:${roomCode}`);
      router.push('/perfil');
      return;
    }

    router.push(`/sala/${roomCode.toUpperCase()}`);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-600 to-zinc-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-10">
        <header className="mb-10 flex items-center justify-between">
          <div className="text-2xl font-black">Jogos da Galera</div>
          <span className="rounded-full bg-yellow-300 px-4 py-2 text-sm font-black text-zinc-950">MVP Beta</span>
        </header>

        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <div className="mb-5 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold">
              Party games online para jogar com amigos
            </div>
            <h1 className="text-5xl font-black leading-tight md:text-7xl">Chame a galera e escolha o jogo.</h1>
            <p className="mt-6 max-w-xl text-lg text-purple-100">
              Crie uma sala, compartilhe o link e jogue Stop, Forca ou Jogo da Velha em tempo real. Sem instalacao. Sem complicacao.
            </p>

            <div className="mt-7 grid gap-3">
              {games.map((game) => (
                <button
                  key={game.type}
                  type="button"
                  onClick={() => setSelectedGame(game.type)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selectedGame === game.type
                      ? 'border-yellow-300 bg-yellow-300 text-zinc-950'
                      : 'border-white/15 bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  <div className="font-black">{game.name}</div>
                  <div className={`mt-1 text-sm ${selectedGame === game.type ? 'text-zinc-700' : 'text-purple-100'}`}>
                    {game.description}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button onClick={createRoom} className="bg-yellow-300 text-zinc-950 hover:bg-yellow-400">
                Criar sala gratis
              </Button>
              <Button
                variant="secondary"
                onClick={() => document.getElementById('entrar')?.scrollIntoView()}
                className="bg-white/10 hover:bg-white/20"
              >
                Entrar com codigo
              </Button>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-2xl font-black">1</p>
                <p className="text-sm text-purple-100">Crie a sala</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-2xl font-black">2</p>
                <p className="text-sm text-purple-100">Mande o link</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-2xl font-black">3</p>
                <p className="text-sm text-purple-100">Jogue online</p>
              </div>
            </div>
          </div>

          <div id="entrar" className="rounded-3xl bg-white p-6 text-zinc-950 shadow-2xl">
            <h2 className="text-2xl font-black">Entrar em uma sala</h2>
            <p className="mt-2 text-zinc-600">Digite o codigo enviado por um amigo.</p>
            <div className="mt-6 grid gap-4">
              <Input
                placeholder="Ex: ABCD12"
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                maxLength={6}
                className="text-center text-xl font-black uppercase"
              />
              <Button onClick={joinRoom}>Entrar na sala</Button>
            </div>
            <div className="mt-6 rounded-2xl bg-zinc-100 p-4">
              <p className="font-black">Jogos disponiveis</p>
              <p className="mt-2 text-sm text-zinc-600">Stop, Forca e Jogo da Velha.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
