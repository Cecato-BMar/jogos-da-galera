import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlayerDto } from './dto/create-player.dto';

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreatePlayerDto) {
    return this.prisma.player.create({
      data: {
        nickname: dto.nickname.trim(),
        avatar: dto.avatar ?? '🎮',
      },
    });
  }
}
