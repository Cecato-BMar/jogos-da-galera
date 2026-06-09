import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StopGateway } from './stop.gateway';
import { StopService } from './stop.service';

@Module({
  imports: [PrismaModule],
  providers: [StopGateway, StopService],
})
export class StopModule {}
