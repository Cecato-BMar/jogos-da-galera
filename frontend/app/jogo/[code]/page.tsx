'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/Card';
import { HangmanGame } from '@/components/games/HangmanGame';
import { StopGame } from '@/components/games/StopGame';
import { TicTacToeGame } from '@/components/games/TicTacToeGame';
import { api } from '@/services/api';
import { GameType, Room } from '@/types';

export default function JogoPage() {
  const params = useParams();
  const router = useRouter();
  const code = String(params.code).toUpperCase();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameType, setGameType] = useState<GameType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedPlayerId = localStorage.getItem('playerId');

    if (!storedPlayerId) {
      localStorage.setItem('nextAction', `join-room:${code}`);
      router.push('/perfil');
      return;
    }

    setPlayerId(storedPlayerId);

    async function loadRoom() {
      try {
        const response = await api.get<Room>(`/rooms/${code}`);
        setGameType(response.data.gameType || 'STOP');
      } catch {
        router.push('/');
      } finally {
        setLoading(false);
      }
    }

    loadRoom();
  }, [code, router]);

  if (loading || !playerId || !gameType) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
        <Card className="max-w-md text-center">
          <h1 className="text-2xl font-black">Carregando jogo...</h1>
        </Card>
      </main>
    );
  }

  if (gameType === 'HANGMAN') return <HangmanGame code={code} playerId={playerId} />;
  if (gameType === 'TICTACTOE') return <TicTacToeGame code={code} playerId={playerId} />;
  return <StopGame code={code} playerId={playerId} />;
}
