import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { getAllowedOrigins } from '../config/cors';
import { GamesService } from '../games/games.service';
import {
  HangmanGuessPayload,
  JoinRoomPayload,
  NextRoundPayload,
  PlayerStopPayload,
  RoomMessagePayload,
  StartGamePayload,
  SubmitAnswerPayload,
  TicTacToeMovePayload,
} from './dto/socket-events.dto';
import { StopService } from './stop.service';

@WebSocketGateway({
  cors: {
    origin: getAllowedOrigins(),
    credentials: true,
  },
})
export class StopGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly stopService: StopService,
    private readonly gamesService: GamesService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Socket conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Socket desconectado: ${client.id}`);
  }

  @SubscribeMessage('room:join')
  async handleRoomJoin(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinRoomPayload) {
    const roomCode = payload.roomCode.toUpperCase();
    client.join(roomCode);

    const players = await this.stopService.getRoomPlayers(roomCode);
    this.server.to(roomCode).emit('room:players', { players });

    const currentRound = await this.stopService.getCurrentRound(roomCode);
    if (currentRound) client.emit('round:start', currentRound);

    const currentGame = await this.gamesService.getCurrentGame(roomCode);
    if (currentGame?.gameType === 'HANGMAN') {
      client.emit('game:started', { gameType: 'HANGMAN' });
      client.emit('hangman:state', currentGame.state);
    }
    if (currentGame?.gameType === 'TICTACTOE') {
      client.emit('game:started', { gameType: 'TICTACTOE' });
      client.emit('tictactoe:state', currentGame.state);
    }

    return { success: true };
  }

  @SubscribeMessage('room:message')
  async handleRoomMessage(@MessageBody() payload: RoomMessagePayload) {
    const roomCode = payload.roomCode.toUpperCase();
    const player = await this.stopService.getPlayer(roomCode, payload.playerId);

    this.server.to(roomCode).emit('room:message:new', {
      playerId: player.id,
      nickname: player.nickname,
      avatar: player.avatar,
      message: payload.message,
      createdAt: new Date().toISOString(),
    });

    return { success: true };
  }

  @SubscribeMessage('game:start')
  async handleGameStart(@MessageBody() payload: StartGamePayload) {
    const roomCode = payload.roomCode.toUpperCase();
    const gameType = await this.gamesService.getRoomGameType(roomCode);

    if (gameType === 'HANGMAN') {
      const state = await this.gamesService.startHangman(roomCode, payload.playerId);
      this.server.to(roomCode).emit('game:started', { gameType });
      this.server.to(roomCode).emit('hangman:state', state);
      return { success: true, state };
    }

    if (gameType === 'TICTACTOE') {
      const state = await this.gamesService.startTicTacToe(roomCode, payload.playerId);
      this.server.to(roomCode).emit('game:started', { gameType });
      this.server.to(roomCode).emit('tictactoe:state', state);
      return { success: true, state };
    }

    const round = await this.stopService.startRound(roomCode, payload.playerId);
    this.server.to(roomCode).emit('game:started', { gameType });
    this.server.to(roomCode).emit('round:start', round);
    return { success: true, round };
  }

  @SubscribeMessage('answer:submit')
  async handleAnswerSubmit(@MessageBody() payload: SubmitAnswerPayload) {
    return this.stopService.submitAnswers(payload.roundId, payload.playerId, payload.answers);
  }

  @SubscribeMessage('player:stop')
  async handlePlayerStop(@MessageBody() payload: PlayerStopPayload) {
    const roomCode = payload.roomCode.toUpperCase();
    const result = await this.stopService.finishRound(roomCode, payload.roundId, payload.playerId);
    const stoppedBy = 'stoppedBy' in result ? result.stoppedBy : null;

    this.server.to(roomCode).emit('round:end', {
      roundId: payload.roundId,
      stoppedBy,
    });

    this.server.to(roomCode).emit('round:result', result);
    return { success: true };
  }

  @SubscribeMessage('round:next')
  async handleNextRound(@MessageBody() payload: NextRoundPayload) {
    const roomCode = payload.roomCode.toUpperCase();
    const round = await this.stopService.startRound(roomCode, payload.playerId);
    this.server.to(roomCode).emit('round:start', round);
    return { success: true, round };
  }

  @SubscribeMessage('hangman:guess')
  async handleHangmanGuess(@MessageBody() payload: HangmanGuessPayload) {
    const roomCode = payload.roomCode.toUpperCase();
    const state = await this.gamesService.guessHangman(roomCode, payload.sessionId, payload.playerId, payload.guess);
    this.server.to(roomCode).emit('hangman:state', state);
    this.server.to(roomCode).emit('room:players', { players: await this.stopService.getRoomPlayers(roomCode) });
    return { success: true, state };
  }

  @SubscribeMessage('hangman:next')
  async handleHangmanNext(@MessageBody() payload: NextRoundPayload) {
    const roomCode = payload.roomCode.toUpperCase();
    const state = await this.gamesService.startHangman(roomCode, payload.playerId);
    this.server.to(roomCode).emit('hangman:state', state);
    return { success: true, state };
  }

  @SubscribeMessage('tictactoe:move')
  async handleTicTacToeMove(@MessageBody() payload: TicTacToeMovePayload) {
    const roomCode = payload.roomCode.toUpperCase();
    const state = await this.gamesService.moveTicTacToe(roomCode, payload.sessionId, payload.playerId, payload.index);
    this.server.to(roomCode).emit('tictactoe:state', state);
    this.server.to(roomCode).emit('room:players', { players: await this.stopService.getRoomPlayers(roomCode) });
    return { success: true, state };
  }

  @SubscribeMessage('tictactoe:next')
  async handleTicTacToeNext(@MessageBody() payload: NextRoundPayload) {
    const roomCode = payload.roomCode.toUpperCase();
    const state = await this.gamesService.startTicTacToe(roomCode, payload.playerId);
    this.server.to(roomCode).emit('tictactoe:state', state);
    return { success: true, state };
  }
}
