import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDetailDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @IsEnum(['EXAMPLE', 'STORY', 'NOTE'])
  type: 'EXAMPLE' | 'STORY' | 'NOTE';
}
