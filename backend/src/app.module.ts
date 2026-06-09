import { Module } from '@nestjs/common';
import { PlayersModule } from './players/players.module';
import { PrismaModule } from './prisma/prisma.module';
import { RoomsModule } from './rooms/rooms.module';
import { StopModule } from './stop/stop.module';

@Module({
  imports: [PrismaModule, PlayersModule, RoomsModule, StopModule],
})
export class AppModule {}
