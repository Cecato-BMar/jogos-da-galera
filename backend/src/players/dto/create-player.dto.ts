import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePlayerDto {
  @IsString()
  @MinLength(2)
  nickname: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}
