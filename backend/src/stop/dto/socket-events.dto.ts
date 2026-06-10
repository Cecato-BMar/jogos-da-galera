export type JoinRoomPayload = { roomCode: string; playerId: string };
export type RoomMessagePayload = { roomCode: string; playerId: string; message: string };
export type StartGamePayload = { roomCode: string; playerId: string };
export type SubmitAnswerPayload = { roundId: string; playerId: string; answers: Record<string, string> };
export type PlayerStopPayload = { roomCode: string; roundId: string; playerId: string };
export type NextRoundPayload = { roomCode: string; playerId: string };
export type HangmanGuessPayload = { roomCode: string; sessionId: string; playerId: string; guess: string };
export type TicTacToeMovePayload = { roomCode: string; sessionId: string; playerId: string; index: number };
