import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { GameType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HANGMAN_MAX_ERRORS, HANGMAN_WORDS, TIC_TAC_TOE_WINNING_LINES } from './games.constants';

type RoomPlayerView = {
  id: string;
  nickname: string;
  avatar?: string | null;
  score: number;
  isHost: boolean;
};

type HangmanState = {
  word: string;
  guessedLetters: string[];
  wrongGuesses: string[];
  maxErrors: number;
  status: 'PLAYING' | 'FINISHED';
  winnerPlayerId?: string;
  winnerNickname?: string;
  message?: string;
};

type TicTacToeState = {
  board: Array<string | null>;
  activePlayerIds: string[];
  symbols: Record<string, 'X' | 'O'>;
  currentPlayerId: string;
  status: 'PLAYING' | 'FINISHED';
  winnerPlayerId?: string;
  winnerNickname?: string;
  winningLine?: number[];
  draw?: boolean;
  message?: string;
};

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoomGameType(roomCode: string) {
    const room = await this.prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      select: { gameType: true },
    });

    if (!room) throw new NotFoundException('Sala nao encontrada');
    return room.gameType;
  }

  async getCurrentGame(roomCode: string) {
    const room = await this.prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: {
        players: {
          include: { player: true },
          orderBy: { joinedAt: 'asc' },
        },
        gameSessions: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!room) throw new NotFoundException('Sala nao encontrada');
    if (room.gameType === 'STOP' || room.gameSessions.length === 0) return null;

    const players = this.serializePlayers(room.players);
    const session = room.gameSessions[0];

    return {
      gameType: room.gameType,
      state:
        room.gameType === 'HANGMAN'
          ? this.serializeHangman(session.id, session.state as HangmanState, players)
          : this.serializeTicTacToe(session.id, session.state as TicTacToeState, players),
    };
  }

  async startHangman(roomCode: string, playerId: string) {
    const room = await this.getRoomWithPlayers(roomCode);
    this.assertHost(room.hostId, playerId);

    await this.finishRunningSessions(room.id, 'HANGMAN');

    const word = HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)];
    const state: HangmanState = {
      word,
      guessedLetters: [],
      wrongGuesses: [],
      maxErrors: HANGMAN_MAX_ERRORS,
      status: 'PLAYING',
      message: 'Nova palavra sorteada.',
    };

    const session = await this.prisma.gameSession.create({
      data: { roomId: room.id, gameType: 'HANGMAN', state },
    });

    await this.prisma.room.update({
      where: { id: room.id },
      data: { status: 'PLAYING', currentRoundId: null },
    });

    return this.serializeHangman(session.id, state, this.serializePlayers(room.players));
  }

  async guessHangman(roomCode: string, sessionId: string, playerId: string, guess: string) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        room: {
          include: {
            players: {
              include: { player: true },
              orderBy: { joinedAt: 'asc' },
            },
          },
        },
      },
    });

    if (!session || session.room.code !== roomCode.toUpperCase()) throw new NotFoundException('Jogo nao encontrado');
    this.assertPlayerInRoom(session.room.players, playerId);

    const players = this.serializePlayers(session.room.players);
    const state = session.state as HangmanState;
    const normalizedGuess = this.normalizeGuess(guess);

    if (session.status === 'FINISHED' || state.status === 'FINISHED') {
      return this.serializeHangman(session.id, state, players);
    }

    if (!normalizedGuess) {
      state.message = 'Digite uma letra ou uma palavra.';
      return this.serializeHangman(session.id, state, players);
    }

    if (normalizedGuess.length === 1) {
      await this.applyHangmanLetter(session.roomId, state, playerId, normalizedGuess);
    } else {
      await this.applyHangmanWord(session.roomId, state, playerId, normalizedGuess);
    }

    const finished = (state as HangmanState).status === 'FINISHED';

    await this.prisma.gameSession.update({
      where: { id: session.id },
      data: {
        state,
        status: finished ? 'FINISHED' : 'RUNNING',
        endedAt: finished ? new Date() : null,
      },
    });

    if (finished) {
      await this.prisma.room.update({
        where: { id: session.roomId },
        data: { status: 'WAITING' },
      });
    }

    return this.serializeHangman(session.id, state, players);
  }

  async startTicTacToe(roomCode: string, playerId: string) {
    const room = await this.getRoomWithPlayers(roomCode);
    this.assertHost(room.hostId, playerId);

    if (room.players.length < 2) {
      throw new ForbiddenException('Jogo da Velha precisa de pelo menos 2 jogadores');
    }

    await this.finishRunningSessions(room.id, 'TICTACTOE');

    const activePlayers = room.players.slice(0, 2).map((rp) => rp.playerId);
    const state: TicTacToeState = {
      board: Array(9).fill(null),
      activePlayerIds: activePlayers,
      symbols: {
        [activePlayers[0]]: 'X',
        [activePlayers[1]]: 'O',
      },
      currentPlayerId: activePlayers[0],
      status: 'PLAYING',
      message: 'Partida iniciada.',
    };

    const session = await this.prisma.gameSession.create({
      data: { roomId: room.id, gameType: 'TICTACTOE', state },
    });

    await this.prisma.room.update({
      where: { id: room.id },
      data: { status: 'PLAYING', currentRoundId: null },
    });

    return this.serializeTicTacToe(session.id, state, this.serializePlayers(room.players));
  }

  async moveTicTacToe(roomCode: string, sessionId: string, playerId: string, index: number) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        room: {
          include: {
            players: {
              include: { player: true },
              orderBy: { joinedAt: 'asc' },
            },
          },
        },
      },
    });

    if (!session || session.room.code !== roomCode.toUpperCase()) throw new NotFoundException('Jogo nao encontrado');

    const players = this.serializePlayers(session.room.players);
    const state = session.state as TicTacToeState;

    if (session.status === 'FINISHED' || state.status === 'FINISHED') {
      return this.serializeTicTacToe(session.id, state, players);
    }

    if (!state.activePlayerIds.includes(playerId)) {
      state.message = 'Voce esta assistindo esta partida.';
      return this.serializeTicTacToe(session.id, state, players);
    }

    if (state.currentPlayerId !== playerId) {
      state.message = 'Aguarde sua vez.';
      return this.serializeTicTacToe(session.id, state, players);
    }

    if (!Number.isInteger(index) || index < 0 || index > 8 || state.board[index]) {
      state.message = 'Escolha uma casa vazia.';
      return this.serializeTicTacToe(session.id, state, players);
    }

    state.board[index] = playerId;

    const winningLine = this.findWinningLine(state.board, playerId);
    if (winningLine) {
      const winner = players.find((p) => p.id === playerId);
      state.status = 'FINISHED';
      state.winnerPlayerId = playerId;
      state.winnerNickname = winner?.nickname;
      state.winningLine = winningLine;
      state.message = `${winner?.nickname || 'Jogador'} venceu a partida.`;
      await this.incrementScore(session.roomId, playerId, 10);
    } else if (state.board.every(Boolean)) {
      state.status = 'FINISHED';
      state.draw = true;
      state.message = 'Deu velha.';
    } else {
      state.currentPlayerId = state.activePlayerIds.find((id) => id !== playerId) || playerId;
      const nextPlayer = players.find((p) => p.id === state.currentPlayerId);
      state.message = `Vez de ${nextPlayer?.nickname || 'outro jogador'}.`;
    }

    const finished = state.status === 'FINISHED';

    await this.prisma.gameSession.update({
      where: { id: session.id },
      data: {
        state,
        status: finished ? 'FINISHED' : 'RUNNING',
        endedAt: finished ? new Date() : null,
      },
    });

    if (finished) {
      await this.prisma.room.update({
        where: { id: session.roomId },
        data: { status: 'WAITING' },
      });
    }

    return this.serializeTicTacToe(session.id, state, players);
  }

  private async applyHangmanLetter(roomId: string, state: HangmanState, playerId: string, letter: string) {
    if (state.guessedLetters.includes(letter) || state.wrongGuesses.includes(letter)) {
      state.message = `A letra ${letter} ja foi tentada.`;
      return;
    }

    if (state.word.includes(letter)) {
      state.guessedLetters.push(letter);
      state.message = `Boa! A palavra tem ${letter}.`;
      await this.incrementScore(roomId, playerId, 2);
    } else {
      state.wrongGuesses.push(letter);
      state.message = `Nao tem ${letter}.`;
    }

    this.finishHangmanIfNeeded(state, playerId);
  }

  private async applyHangmanWord(roomId: string, state: HangmanState, playerId: string, guess: string) {
    if (guess === state.word) {
      state.guessedLetters = Array.from(new Set(state.word.split('')));
      state.status = 'FINISHED';
      state.winnerPlayerId = playerId;
      state.message = 'Palavra correta!';
      await this.incrementScore(roomId, playerId, 10);
      return;
    }

    if (!state.wrongGuesses.includes(guess)) state.wrongGuesses.push(guess);
    state.message = 'Palavra incorreta.';
    this.finishHangmanIfNeeded(state, playerId);
  }

  private finishHangmanIfNeeded(state: HangmanState, playerId: string) {
    const completed = state.word.split('').every((letter) => state.guessedLetters.includes(letter));

    if (completed) {
      state.status = 'FINISHED';
      state.winnerPlayerId = playerId;
      state.message = 'A palavra foi descoberta.';
      return;
    }

    if (state.wrongGuesses.length >= state.maxErrors) {
      state.status = 'FINISHED';
      state.message = 'As tentativas acabaram.';
    }
  }

  private serializeHangman(sessionId: string, state: HangmanState, players: RoomPlayerView[]) {
    const maskedWord = state.word
      .split('')
      .map((letter) => (state.guessedLetters.includes(letter) || state.status === 'FINISHED' ? letter : '_'));

    const winner = state.winnerPlayerId ? players.find((p) => p.id === state.winnerPlayerId) : null;

    return {
      sessionId,
      maskedWord,
      word: state.status === 'FINISHED' ? state.word : null,
      guessedLetters: state.guessedLetters,
      wrongGuesses: state.wrongGuesses,
      maxErrors: state.maxErrors,
      status: state.status,
      winnerPlayerId: state.winnerPlayerId,
      winnerNickname: state.winnerNickname || winner?.nickname,
      message: state.message,
      players,
    };
  }

  private serializeTicTacToe(sessionId: string, state: TicTacToeState, players: RoomPlayerView[]) {
    const activePlayers = state.activePlayerIds.map((id) => {
      const player = players.find((item) => item.id === id);
      return {
        id,
        nickname: player?.nickname || 'Jogador',
        avatar: player?.avatar,
        symbol: state.symbols[id],
      };
    });

    return {
      sessionId,
      board: state.board,
      activePlayers,
      symbols: state.symbols,
      currentPlayerId: state.currentPlayerId,
      status: state.status,
      winnerPlayerId: state.winnerPlayerId,
      winnerNickname: state.winnerNickname,
      winningLine: state.winningLine,
      draw: state.draw,
      message: state.message,
      players,
    };
  }

  private async getRoomWithPlayers(roomCode: string) {
    const room = await this.prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: {
        players: {
          include: { player: true },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!room) throw new NotFoundException('Sala nao encontrada');
    return room;
  }

  private async finishRunningSessions(roomId: string, gameType: GameType) {
    await this.prisma.gameSession.updateMany({
      where: { roomId, gameType, status: 'RUNNING' },
      data: { status: 'FINISHED', endedAt: new Date() },
    });
  }

  private assertHost(hostId: string, playerId: string) {
    if (hostId !== playerId) throw new ForbiddenException('Apenas o dono da sala pode iniciar');
  }

  private assertPlayerInRoom(players: Array<{ playerId: string }>, playerId: string) {
    if (!players.some((player) => player.playerId === playerId)) {
      throw new NotFoundException('Jogador nao esta na sala');
    }
  }

  private normalizeGuess(value: string) {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z]/g, '')
      .toUpperCase();
  }

  private serializePlayers(players: Array<{ playerId: string; score: number; isHost: boolean; player: { nickname: string; avatar: string | null } }>) {
    return players.map((rp) => ({
      id: rp.playerId,
      nickname: rp.player.nickname,
      avatar: rp.player.avatar,
      score: rp.score,
      isHost: rp.isHost,
    }));
  }

  private async incrementScore(roomId: string, playerId: string, score: number) {
    await this.prisma.roomPlayer.updateMany({
      where: { roomId, playerId },
      data: { score: { increment: score } },
    });
  }

  private findWinningLine(board: Array<string | null>, playerId: string) {
    return TIC_TAC_TOE_WINNING_LINES.find((line) => line.every((index) => board[index] === playerId));
  }
}
