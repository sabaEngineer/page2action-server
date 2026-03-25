import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateDetailDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsEnum(['EXAMPLE', 'STORY', 'NOTE'])
  type?: 'EXAMPLE' | 'STORY' | 'NOTE';
}
