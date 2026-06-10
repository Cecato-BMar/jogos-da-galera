'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { socket } from '@/services/socket';
import { HangmanState, Player } from '@/types';

type HangmanGameProps = {
  code: string;
  playerId: string;
};

export function HangmanGame({ code, playerId }: HangmanGameProps) {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [state, setState] = useState<HangmanState | null>(null);
  const [guess, setGuess] = useState('');

  const isHost = players.some((player) => player.id === playerId && player.isHost);
  const wrongCount = state?.wrongGuesses.length || 0;
  const remaining = state ? Math.max(state.maxErrors - wrongCount, 0) : 0;

  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit('room:join', { roomCode: code, playerId });

    socket.on('room:players', (payload: { players: Player[] }) => setPlayers(payload.players));
    socket.on('hangman:state', (payload: HangmanState) => setState(payload));

    return () => {
      socket.off('room:players');
      socket.off('hangman:state');
    };
  }, [code, playerId]);

  function sendGuess() {
    if (!state || !guess.trim() || state.status === 'FINISHED') return;
    socket.emit('hangman:guess', { roomCode: code, sessionId: state.sessionId, playerId, guess });
    setGuess('');
  }

  function nextRound() {
    socket.emit('hangman:next', { roomCode: code, playerId });
  }

  function backToLobby() {
    router.push(`/sala/${code}`);
  }

  function shareResult() {
    if (!state || state.status !== 'FINISHED') return;
    const text = `Jogos da Galera\n\nForca finalizada!\n\nPalavra: ${state.word}\n${state.winnerNickname ? `Vencedor: ${state.winnerNickname}\n` : ''}\nEntre na sala e jogue tambem:\n${window.location.origin}/sala/${code}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  if (!state) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
        <Card className="max-w-md text-center">
          <h1 className="text-3xl font-black">Aguardando Forca</h1>
          <p className="mt-2 text-zinc-600">O dono da sala precisa iniciar a partida.</p>
          <div className="mt-6"><Button variant="secondary" onClick={backToLobby}>Voltar para sala</Button></div>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-6">
      <section className="mx-auto grid max-w-6xl gap-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-bold text-zinc-500">Sala {code}</p>
              <h1 className="text-4xl font-black">Forca Online</h1>
              {state.message && <p className="mt-2 font-bold text-purple-600">{state.message}</p>}
            </div>
            <div className="text-left md:text-right">
              <p className="font-bold text-zinc-500">Tentativas restantes</p>
              <p className="text-4xl font-black">{remaining}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_300px]">
          <Card>
            <div className="flex min-h-28 flex-wrap items-center justify-center gap-3 rounded-2xl bg-zinc-100 p-5">
              {state.maskedWord.map((letter, index) => (
                <span key={`${letter}-${index}`} className="flex h-14 w-11 items-center justify-center rounded-xl bg-white text-3xl font-black text-purple-600">
                  {letter}
                </span>
              ))}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
              <Input
                disabled={state.status === 'FINISHED'}
                placeholder="Digite uma letra ou chute a palavra"
                value={guess}
                onChange={(event) => setGuess(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') sendGuess();
                }}
              />
              <Button onClick={sendGuess} disabled={state.status === 'FINISHED'}>Enviar</Button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-green-50 p-4">
                <p className="font-black text-green-700">Letras certas</p>
                <p className="mt-2 text-xl font-black">{state.guessedLetters.join(' ') || '-'}</p>
              </div>
              <div className="rounded-2xl bg-red-50 p-4">
                <p className="font-black text-red-700">Tentativas erradas</p>
                <p className="mt-2 text-xl font-black">{state.wrongGuesses.join(' ') || '-'}</p>
              </div>
            </div>

            {state.status === 'FINISHED' && (
              <div className="mt-6 rounded-2xl bg-yellow-100 p-5">
                <p className="font-black">Palavra: {state.word}</p>
                {state.winnerNickname && <p className="mt-1 text-zinc-700">Vencedor: {state.winnerNickname}</p>}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 md:flex-row">
              {isHost && state.status === 'FINISHED' && <Button onClick={nextRound}>Nova palavra</Button>}
              {state.status === 'FINISHED' && <Button variant="secondary" onClick={shareResult}>Compartilhar no WhatsApp</Button>}
              <Button variant="secondary" onClick={backToLobby}>Voltar para sala</Button>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-black">Placar</h2>
            <div className="mt-4 grid gap-3">
              {players.map((player) => (
                <div key={player.id} className="flex items-center justify-between rounded-xl bg-zinc-100 p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{player.avatar || '🎮'}</span>
                    <span className="font-bold">{player.nickname}</span>
                  </div>
                  <span className="font-black text-purple-600">{player.score}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
