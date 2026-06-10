'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { api } from '@/services/api';
import { GameType } from '@/types';

const avatars = ['😎', '🤠', '🤓', '😂', '🔥', '🎮', '👑', '🐱'];

export default function PerfilPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState(avatars[0]);

  async function continueFlow() {
    if (nickname.trim().length < 2) return;

    const response = await api.post('/players', { nickname, avatar });

    localStorage.setItem('playerId', response.data.id);
    localStorage.setItem('nickname', response.data.nickname);
    localStorage.setItem('avatar', response.data.avatar);

    const nextAction = localStorage.getItem('nextAction');

    if (nextAction === 'create-room' || nextAction?.startsWith('create-room:')) {
      const gameType = (nextAction.split(':')[1] || 'STOP') as GameType;
      localStorage.removeItem('nextAction');
      const room = await api.post('/rooms', { hostId: response.data.id, gameType });
      router.push(`/sala/${room.data.code}`);
      return;
    }

    if (nextAction?.startsWith('join-room:')) {
      const code = nextAction.split(':')[1];
      localStorage.removeItem('nextAction');
      router.push(`/sala/${code.toUpperCase()}`);
      return;
    }

    router.push('/');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-700 via-purple-600 to-zinc-950 p-6">
      <section className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h1 className="text-3xl font-black">Escolha seu apelido</h1>
        <p className="mt-2 text-zinc-600">E assim que a galera vai te ver na sala.</p>

        <div className="mt-6">
          <label className="mb-2 block font-bold">Avatar</label>
          <div className="grid grid-cols-4 gap-3">
            {avatars.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setAvatar(item)}
                className={`rounded-2xl border p-4 text-3xl transition ${avatar === item ? 'border-purple-600 bg-purple-100' : 'border-zinc-200 bg-zinc-50'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <Input placeholder="Seu apelido" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={18} />
          <Button onClick={continueFlow}>Continuar</Button>
        </div>
      </section>
    </main>
  );
}
