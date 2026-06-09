import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  create(@Body() dto: CreateRoomDto) {
    return this.roomsService.create(dto);
  }

  @Get(':code')
  findByCode(@Param('code') code: string) {
    return this.roomsService.findByCode(code);
  }

  @Post(':code/join')
  join(@Param('code') code: string, @Body() dto: JoinRoomDto) {
    return this.roomsService.join(code, dto);
  }

  @Get(':code/ranking')
  ranking(@Param('code') code: string) {
    return this.roomsService.ranking(code);
  }
}
