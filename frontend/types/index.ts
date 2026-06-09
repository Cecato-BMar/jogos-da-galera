export type Player = {
  id: string;
  nickname: string;
  avatar?: string;
  score: number;
  isHost: boolean;
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
