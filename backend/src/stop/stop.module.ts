import { Module } from '@nestjs/common';
import { GamesService } from '../games/games.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StopGateway } from './stop.gateway';
import { StopService } from './stop.service';

@Module({
  imports: [PrismaModule],
  providers: [StopGateway, StopService, GamesService],
})
export class StopModule {}
