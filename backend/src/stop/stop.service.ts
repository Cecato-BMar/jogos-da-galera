import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ROUND_DURATION_SECONDS, STOP_CATEGORIES, STOP_LETTERS } from './stop.constants';

@Injectable()
export class StopService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoomPlayers(roomCode: string) {
    const room = await this.prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: {
        players: {
          include: { player: true },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!room) throw new NotFoundException('Sala não encontrada');

    return room.players.map((rp) => ({
      id: rp.playerId,
      nickname: rp.player.nickname,
      avatar: rp.player.avatar,
      score: rp.score,
      isHost: rp.isHost,
    }));
  }

  async getPlayer(roomCode: string, playerId: string) {
    const room = await this.prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: { players: { include: { player: true } } },
    });

    if (!room) throw new NotFoundException('Sala não encontrada');

    const roomPlayer = room.players.find((rp) => rp.playerId === playerId);
    if (!roomPlayer) throw new NotFoundException('Jogador não está na sala');

    return {
      id: roomPlayer.playerId,
      nickname: roomPlayer.player.nickname,
      avatar: roomPlayer.player.avatar,
      score: roomPlayer.score,
      isHost: roomPlayer.isHost,
    };
  }

  async getCurrentRound(roomCode: string) {
    const room = await this.prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: {
        rounds: {
          where: { status: 'RUNNING' },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!room || !room.currentRoundId || room.rounds.length === 0) return null;

    const round = room.rounds[0];
    const elapsedSeconds = Math.floor((Date.now() - round.startedAt.getTime()) / 1000);
    const timeLeft = Math.max(ROUND_DURATION_SECONDS - elapsedSeconds, 0);

    return {
      roundId: round.id,
      letter: round.letter,
      duration: timeLeft,
      categories: STOP_CATEGORIES,
    };
  }

  async startRound(roomCode: string, playerId: string) {
    const room = await this.prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: { players: true },
    });

    if (!room) throw new NotFoundException('Sala não encontrada');
    if (room.hostId !== playerId) throw new ForbiddenException('Apenas o dono da sala pode iniciar');

    const letter = STOP_LETTERS[Math.floor(Math.random() * STOP_LETTERS.length)];

    const round = await this.prisma.round.create({
      data: { roomId: room.id, letter },
    });

    await this.prisma.room.update({
      where: { id: room.id },
      data: { status: 'PLAYING', currentRoundId: round.id },
    });

    return {
      roundId: round.id,
      letter,
      duration: ROUND_DURATION_SECONDS,
      categories: STOP_CATEGORIES,
    };
  }

  async submitAnswers(roundId: string, playerId: string, answers: Record<string, string>) {
    const round = await this.prisma.round.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundException('Rodada não encontrada');
    if (round.status !== 'RUNNING') return { success: false, message: 'Rodada encerrada' };

    const operations = Object.entries(answers)
      .filter(([category]) => STOP_CATEGORIES.includes(category))
      .map(([category, value]) =>
        this.prisma.answer.upsert({
          where: { roundId_playerId_category: { roundId, playerId, category } },
          update: { value: value?.trim() || '' },
          create: { roundId, playerId, category, value: value?.trim() || '' },
        }),
      );

    if (operations.length > 0) await this.prisma.$transaction(operations);
    return { success: true };
  }

  async finishRound(roomCode: string, roundId: string, stoppedByPlayerId?: string) {
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      include: { room: true },
    });

    if (!round) throw new NotFoundException('Rodada não encontrada');

    if (round.status === 'FINISHED') return this.buildRoundResult(round.id);
    if (round.room.code !== roomCode.toUpperCase()) throw new ForbiddenException('Rodada não pertence a esta sala');

    await this.prisma.round.update({
      where: { id: roundId },
      data: { status: 'FINISHED', endedAt: new Date() },
    });

    await this.prisma.room.update({
      where: { id: round.room.id },
      data: { currentRoundId: null, status: 'WAITING' },
    });

    await this.calculateScores(roundId);
    const result = await this.buildRoundResult(roundId);

    const stoppedBy = stoppedByPlayerId
      ? await this.prisma.player.findUnique({ where: { id: stoppedByPlayerId } })
      : null;

    return {
      ...result,
      stoppedBy: stoppedBy ? { playerId: stoppedBy.id, nickname: stoppedBy.nickname } : null,
    };
  }

  private isValidAnswer(answer: string, letter: string) {
    if (!answer) return false;
    return answer.trim().toLowerCase().startsWith(letter.toLowerCase());
  }

  private normalizeAnswer(answer: string) {
    return answer.trim().toLowerCase();
  }

  private async calculateScores(roundId: string) {
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      include: { answers: true },
    });

    if (!round) throw new NotFoundException('Rodada não encontrada');

    for (const category of STOP_CATEGORIES) {
      const categoryAnswers = round.answers.filter((answer) => answer.category === category);
      const validAnswers = categoryAnswers.filter((answer) => this.isValidAnswer(answer.value, round.letter));
      const answerCount = new Map<string, number>();

      for (const answer of validAnswers) {
        const normalized = this.normalizeAnswer(answer.value);
        answerCount.set(normalized, (answerCount.get(normalized) || 0) + 1);
      }

      for (const answer of categoryAnswers) {
        let score = 0;

        if (this.isValidAnswer(answer.value, round.letter)) {
          const normalized = this.normalizeAnswer(answer.value);
          score = (answerCount.get(normalized) || 0) > 1 ? 5 : 10;
        }

        await this.prisma.answer.update({ where: { id: answer.id }, data: { score } });
      }
    }

    const updatedAnswers = await this.prisma.answer.findMany({ where: { roundId } });
    const scoreByPlayer = new Map<string, number>();

    for (const answer of updatedAnswers) {
      scoreByPlayer.set(answer.playerId, (scoreByPlayer.get(answer.playerId) || 0) + answer.score);
    }

    for (const [playerId, roundScore] of scoreByPlayer.entries()) {
      await this.prisma.roomPlayer.updateMany({
        where: { roomId: round.roomId, playerId },
        data: { score: { increment: roundScore } },
      });
    }
  }

  private async buildRoundResult(roundId: string) {
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      include: {
        room: {
          include: {
            players: {
              include: { player: true },
              orderBy: { score: 'desc' },
            },
          },
        },
        answers: true,
      },
    });

    if (!round) throw new NotFoundException('Rodada não encontrada');

    const results = round.room.players.map((rp) => {
      const playerAnswers = STOP_CATEGORIES.map((category) => {
        const answer = round.answers.find((a) => a.playerId === rp.playerId && a.category === category);
        return { category, value: answer?.value || '', score: answer?.score || 0 };
      });

      const roundScore = playerAnswers.reduce((total, answer) => total + answer.score, 0);

      return {
        playerId: rp.playerId,
        nickname: rp.player.nickname,
        avatar: rp.player.avatar,
        answers: playerAnswers,
        roundScore,
        totalScore: rp.score,
      };
    });

    return { roundId: round.id, letter: round.letter, results };
  }
}
