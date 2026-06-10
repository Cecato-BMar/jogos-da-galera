import { GameType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  hostId: string;

  @IsOptional()
  @IsEnum(GameType)
  gameType?: GameType;
}
