'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { socket } from '@/services/socket';
import { Player, RoundResult, RoundStart } from '@/types';

export default function JogoPage() {
  const params = useParams();
  const router = useRouter();
  const code = String(params.code).toUpperCase();

  const [players, setPlayers] = useState<Player[]>([]);
  const [round, setRound] = useState<RoundStart | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [blocked, setBlocked] = useState(false);

  const playerId = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('playerId');
  }, []);

  const isHost = players.some((player) => player.id === playerId && player.isHost);

  useEffect(() => {
    if (!playerId) {
      localStorage.setItem('nextAction', `join-room:${code}`);
      router.push('/perfil');
      return;
    }

    if (!socket.connected) socket.connect();
    socket.emit('room:join', { roomCode: code, playerId });

    socket.on('room:players', (payload: { players: Player[] }) => setPlayers(payload.players));

    socket.on('round:start', (payload: RoundStart) => {
      setRound(payload);
      setResult(null);
      setAnswers({});
      setTimeLeft(payload.duration);
      setBlocked(false);
    });

    socket.on('round:end', () => setBlocked(true));

    socket.on('round:result', (payload: RoundResult) => {
      setResult(payload);
      setBlocked(true);
    });

    return () => {
      socket.off('room:players');
      socket.off('round:start');
      socket.off('round:end');
      socket.off('round:result');
    };
  }, [code, playerId, router]);

  useEffect(() => {
    if (!round || blocked || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          handleStop();
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [round, blocked, timeLeft]);

  function updateAnswer(category: string, value: string) {
    if (blocked) return;

    const nextAnswers = { ...answers, [category]: value };
    setAnswers(nextAnswers);

    if (round && playerId) {
      socket.emit('answer:submit', { roundId: round.roundId, playerId, answers: nextAnswers });
    }
  }

  function handleStop() {
    if (!round || !playerId || blocked) return;

    setBlocked(true);
    socket.emit('answer:submit', { roundId: round.roundId, playerId, answers });
    socket.emit('player:stop', { roomCode: code, roundId: round.roundId, playerId });
  }

  function nextRound() {
    if (!playerId) return;
    socket.emit('round:next', { roomCode: code, playerId });
  }

  function backToLobby() {
    router.push(`/sala/${code}`);
  }

  function shareResult() {
    if (!result) return;

    const winner = [...result.results].sort((a, b) => b.roundScore - a.roundScore)[0];
    const text = `🎮 Jogos da Galera\n\nRodada de Stop finalizada!\n\nLetra: ${result.letter}\nVencedor da rodada: ${winner.nickname}\nPontuação da rodada: ${winner.roundScore}\n\nEntre na sala e jogue também:\n${window.location.origin}/sala/${code}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  if (!round && !result) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
        <Card className="max-w-md text-center">
          <h1 className="text-3xl font-black">Aguardando rodada</h1>
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
              <h1 className="text-4xl font-black">Letra: <span className="text-purple-600">{round?.letter || result?.letter}</span></h1>
            </div>
            <div className="text-left md:text-right">
              <p className="font-bold text-zinc-500">Tempo</p>
              <p className="text-4xl font-black">{timeLeft}s</p>
            </div>
          </div>
        </div>

        {!result && round && (
          <div className="grid gap-6 md:grid-cols-[1fr_280px]">
            <Card>
              <h2 className="text-2xl font-black">Suas respostas</h2>
              <div className="mt-5 grid gap-4">
                {round.categories.map((category) => (
                  <div key={category}>
                    <label className="mb-2 block font-bold">{category}</label>
                    <Input disabled={blocked} placeholder={`${category} com ${round.letter}`} value={answers[category] || ''} onChange={(e) => updateAnswer(category, e.target.value)} />
                  </div>
                ))}
              </div>
              <div className="mt-6"><Button variant="danger" onClick={handleStop} disabled={blocked} className="w-full">STOP!</Button></div>
            </Card>

            <Card>
              <h2 className="text-xl font-black">Jogadores</h2>
              <div className="mt-4 grid gap-3">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center gap-3 rounded-xl bg-zinc-100 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl">{player.avatar || '🎮'}</div>
                    <div><p className="font-bold">{player.nickname}</p><p className="text-sm text-zinc-500">{player.score} pontos</p></div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {result && (
          <Card>
            <h2 className="text-2xl font-black">Resultado da rodada</h2>
            {result.stoppedBy && <p className="mt-2 text-zinc-600">{result.stoppedBy.nickname} clicou STOP.</p>}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th className="border-b p-3">Jogador</th>
                    {result.results[0]?.answers.map((answer) => <th key={answer.category} className="border-b p-3">{answer.category}</th>)}
                    <th className="border-b p-3">Rodada</th>
                    <th className="border-b p-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((player) => (
                    <tr key={player.playerId}>
                      <td className="border-b p-3 font-bold">{player.avatar || '🎮'} {player.nickname}</td>
                      {player.answers.map((answer) => (
                        <td key={answer.category} className="border-b p-3">
                          <div className="font-medium">{answer.value || '-'}</div>
                          <div className="text-sm font-bold text-purple-600">{answer.score} pts</div>
                        </td>
                      ))}
                      <td className="border-b p-3 font-black">{player.roundScore}</td>
                      <td className="border-b p-3 font-black text-purple-600">{player.totalScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex flex-col gap-3 md:flex-row">
              {isHost && <Button onClick={nextRound}>Nova rodada</Button>}
              <Button variant="secondary" onClick={shareResult}>Compartilhar no WhatsApp</Button>
              <Button variant="secondary" onClick={backToLobby}>Voltar para sala</Button>
            </div>
          </Card>
        )}
      </section>
    </main>
  );
}
