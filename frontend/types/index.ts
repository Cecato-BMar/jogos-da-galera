export type GameType = 'STOP' | 'HANGMAN' | 'TICTACTOE';

export type Player = {
  id: string;
  nickname: string;
  avatar?: string;
  score: number;
  isHost: boolean;
};

export type Room = {
  id: string;
  code: string;
  gameType: GameType;
  status: string;
  hostId: string;
  players: Array<{
    playerId: string;
    score: number;
    isHost: boolean;
    player: {
      nickname: string;
      avatar?: string;
    };
  }>;
};

export type RoundStart = {
  roundId: string;
  letter: string;
  duration: number;
  categories: string[];
};

export type AnswerResult = {
  category: string;
  value: string;
  score: number;
};

export type PlayerResult = {
  playerId: string;
  nickname: string;
  avatar?: string;
  answers: AnswerResult[];
  roundScore: number;
  totalScore: number;
};

export type RoundResult = {
  roundId: string;
  letter: string;
  results: PlayerResult[];
  stoppedBy?: { playerId: string; nickname: string } | null;
};

export type HangmanState = {
  sessionId: string;
  maskedWord: string[];
  word: string | null;
  guessedLetters: string[];
  wrongGuesses: string[];
  maxErrors: number;
  status: 'PLAYING' | 'FINISHED';
  winnerPlayerId?: string;
  winnerNickname?: string;
  message?: string;
  players: Player[];
};

export type TicTacToeState = {
  sessionId: string;
  board: Array<string | null>;
  activePlayers: Array<{
    id: string;
    nickname: string;
    avatar?: string;
    symbol: 'X' | 'O';
  }>;
  symbols: Record<string, 'X' | 'O'>;
  currentPlayerId: string;
  status: 'PLAYING' | 'FINISHED';
  winnerPlayerId?: string;
  winnerNickname?: string;
  winningLine?: number[];
  draw?: boolean;
  message?: string;
  players: Player[];
};
