import { IsString } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  hostId: string;
}
