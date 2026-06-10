'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { getGame } from '@/lib/games';
import { api } from '@/services/api';
import { socket } from '@/services/socket';
import { GameType, Player, Room } from '@/types';

type ChatMessage = {
  playerId: string;
  nickname: string;
  avatar?: string;
  message: string;
  createdAt: string;
};

export default function SalaPage() {
  const params = useParams();
  const router = useRouter();
  const code = String(params.code).toUpperCase();

  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [gameType, setGameType] = useState<GameType>('STOP');

  const playerId = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('playerId');
  }, []);

  const game = getGame(gameType);
  const isHost = players.some((player) => player.id === playerId && player.isHost);
  const needsSecondPlayer = gameType === 'TICTACTOE' && players.length < 2;

  useEffect(() => {
    if (!playerId) {
      localStorage.setItem('nextAction', `join-room:${code}`);
      router.push('/perfil');
      return;
    }

    async function initRoom() {
      try {
        const roomResponse = await api.get<Room>(`/rooms/${code}`);
        setGameType(roomResponse.data.gameType || 'STOP');

        await api.post(`/rooms/${code}/join`, { playerId });
        if (!socket.connected) socket.connect();
        socket.emit('room:join', { roomCode: code, playerId });
        setLoading(false);
      } catch {
        alert('Sala nao encontrada ou indisponivel.');
        router.push('/');
      }
    }

    initRoom();

    socket.on('room:players', (payload: { players: Player[] }) => setPlayers(payload.players));
    socket.on('room:message:new', (payload: ChatMessage) => setMessages((current) => [...current, payload]));
    socket.on('game:started', () => router.push(`/jogo/${code}`));
    socket.on('round:start', () => router.push(`/jogo/${code}`));

    return () => {
      socket.off('room:players');
      socket.off('room:message:new');
      socket.off('game:started');
      socket.off('round:start');
    };
  }, [code, playerId, router]);

  function copyInviteLink() {
    const link = `${window.location.origin}/sala/${code}`;
    navigator.clipboard.writeText(link);
    alert('Link copiado!');
  }

  function shareInviteOnWhatsApp() {
    const link = `${window.location.origin}/sala/${code}`;
    const text = `Jogue ${game.name} comigo no Jogos da Galera!\n\nSala ${code}: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }

  function sendMessage() {
    if (!message.trim() || !playerId) return;
    socket.emit('room:message', { roomCode: code, playerId, message });
    setMessage('');
  }

  function startGame() {
    if (!playerId || needsSecondPlayer) return;
    socket.emit('game:start', { roomCode: code, playerId });
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-zinc-100"><p className="font-bold text-zinc-700">Carregando sala...</p></main>;
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-6">
      <section className="mx-auto grid max-w-5xl gap-6">
        <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-bold text-purple-600">{game.name}</p>
            <h1 className="text-3xl font-black">Sala {code}</h1>
            <p className="text-zinc-600">Compartilhe o codigo ou link com seus amigos.</p>
            {needsSecondPlayer && <p className="mt-2 text-sm font-bold text-red-600">Jogo da Velha precisa de pelo menos 2 jogadores.</p>}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" onClick={copyInviteLink}>Copiar link</Button>
            <Button variant="secondary" onClick={shareInviteOnWhatsApp}>Enviar WhatsApp</Button>
            {isHost && (
              <Button onClick={startGame} disabled={needsSecondPlayer}>
                Comecar {game.shortName}
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <h2 className="text-xl font-black">Jogadores</h2>
            <div className="mt-4 grid gap-3">
              {players.map((player) => (
                <div key={player.id} className="flex items-center justify-between rounded-xl bg-zinc-100 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl">{player.avatar || '🎮'}</div>
                    <div>
                      <p className="font-bold">{player.nickname}</p>
                      <p className="text-sm text-zinc-500">{player.isHost ? 'Dono da sala' : 'Jogador'}</p>
                    </div>
                  </div>
                  <span className="font-black text-purple-600">{player.score}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-black">Chat da sala</h2>
            <div className="mt-4 h-72 overflow-y-auto rounded-xl bg-zinc-100 p-3">
              {messages.length === 0 && <p className="text-sm text-zinc-500">Nenhuma mensagem ainda.</p>}
              {messages.map((msg, index) => (
                <div key={`${msg.playerId}-${index}`} className="mb-3">
                  <p className="text-sm font-bold">{msg.avatar || '🎮'} {msg.nickname}</p>
                  <p className="text-sm text-zinc-700">{msg.message}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Input
                placeholder="Digite uma mensagem"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') sendMessage();
                }}
              />
              <Button onClick={sendMessage}>Enviar</Button>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
