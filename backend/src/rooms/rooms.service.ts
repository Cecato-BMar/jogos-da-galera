import { Injectable, NotFoundException } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoomDto) {
    const code = nanoid();

    return this.prisma.room.create({
      data: {
        code,
        hostId: dto.hostId,
        players: {
          create: {
            playerId: dto.hostId,
            isHost: true,
          },
        },
      },
      include: {
        players: { include: { player: true } },
      },
    });
  }

  async findByCode(code: string) {
    const room = await this.prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        players: {
          include: { player: true },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!room) throw new NotFoundException('Sala não encontrada');
    return room;
  }

  async join(code: string, dto: JoinRoomDto) {
    const room = await this.findByCode(code);

    return this.prisma.roomPlayer.upsert({
      where: {
        roomId_playerId: {
          roomId: room.id,
          playerId: dto.playerId,
        },
      },
      update: {},
      create: {
        roomId: room.id,
        playerId: dto.playerId,
        isHost: room.hostId === dto.playerId,
      },
      include: { player: true },
    });
  }

  async ranking(code: string) {
    const room = await this.findByCode(code);

    return room.players
      .map((rp) => ({
        playerId: rp.playerId,
        nickname: rp.player.nickname,
        avatar: rp.player.avatar,
        score: rp.score,
        isHost: rp.isHost,
      }))
      .sort((a, b) => b.score - a.score);
  }
}
