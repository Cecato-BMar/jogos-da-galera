'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { socket } from '@/services/socket';
import { Player, TicTacToeState } from '@/types';

type TicTacToeGameProps = {
  code: string;
  playerId: string;
};

export function TicTacToeGame({ code, playerId }: TicTacToeGameProps) {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [state, setState] = useState<TicTacToeState | null>(null);

  const isHost = players.some((player) => player.id === playerId && player.isHost);
  const activePlayer = state?.activePlayers.find((player) => player.id === playerId);
  const currentPlayer = state?.activePlayers.find((player) => player.id === state.currentPlayerId);
  const canPlay = Boolean(state && activePlayer && state.currentPlayerId === playerId && state.status === 'PLAYING');

  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit('room:join', { roomCode: code, playerId });

    socket.on('room:players', (payload: { players: Player[] }) => setPlayers(payload.players));
    socket.on('tictactoe:state', (payload: TicTacToeState) => setState(payload));

    return () => {
      socket.off('room:players');
      socket.off('tictactoe:state');
    };
  }, [code, playerId]);

  function makeMove(index: number) {
    if (!state || !canPlay) return;
    socket.emit('tictactoe:move', { roomCode: code, sessionId: state.sessionId, playerId, index });
  }

  function nextRound() {
    socket.emit('tictactoe:next', { roomCode: code, playerId });
  }

  function backToLobby() {
    router.push(`/sala/${code}`);
  }

  function shareResult() {
    if (!state || state.status !== 'FINISHED') return;
    const result = state.draw ? 'Deu velha!' : `${state.winnerNickname} venceu!`;
    const text = `Jogos da Galera\n\nJogo da Velha finalizado!\n\n${result}\n\nEntre na sala e jogue tambem:\n${window.location.origin}/sala/${code}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  if (!state) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
        <Card className="max-w-md text-center">
          <h1 className="text-3xl font-black">Aguardando Jogo da Velha</h1>
          <p className="mt-2 text-zinc-600">O dono da sala precisa iniciar a partida com 2 jogadores.</p>
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
              <h1 className="text-4xl font-black">Jogo da Velha</h1>
              {state.message && <p className="mt-2 font-bold text-purple-600">{state.message}</p>}
            </div>
            <div className="text-left md:text-right">
              <p className="font-bold text-zinc-500">Vez</p>
              <p className="text-2xl font-black">{state.status === 'PLAYING' ? currentPlayer?.nickname : 'Fim'}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          <Card>
            <div className="mx-auto grid max-w-md grid-cols-3 gap-3">
              {state.board.map((cell, index) => {
                const symbol = cell ? state.symbols[cell] : '';
                const isWinning = state.winningLine?.includes(index);

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => makeMove(index)}
                    disabled={!canPlay || Boolean(cell)}
                    className={`aspect-square rounded-2xl border text-5xl font-black transition ${
                      isWinning
                        ? 'border-yellow-300 bg-yellow-200 text-zinc-950'
                        : 'border-zinc-200 bg-zinc-100 text-purple-600 hover:bg-zinc-200'
                    } disabled:cursor-not-allowed`}
                  >
                    {symbol}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid gap-3 rounded-2xl bg-zinc-100 p-4 md:grid-cols-2">
              {state.activePlayers.map((player) => (
                <div key={player.id} className="rounded-xl bg-white p-4">
                  <p className="text-sm font-bold text-zinc-500">{player.symbol}</p>
                  <p className="text-lg font-black">{player.avatar || '🎮'} {player.nickname}</p>
                </div>
              ))}
            </div>

            {!activePlayer && <p className="mt-4 rounded-2xl bg-purple-50 p-4 font-bold text-purple-700">Voce esta assistindo esta partida.</p>}

            <div className="mt-6 flex flex-col gap-3 md:flex-row">
              {isHost && state.status === 'FINISHED' && <Button onClick={nextRound}>Nova partida</Button>}
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
