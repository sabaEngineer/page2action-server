import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const INSIGHT_STYLES = [
  'MORNING_BOOST',
  'APPLY_TODAY',
  'DO_IT_NOW',
  'SPREAD_THE_IDEA',
  'TODAYS_TAKEAWAY',
] as const;

export class UpdateInsightDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content?: string;

  @IsOptional()
  @IsEnum(INSIGHT_STYLES)
  style?: (typeof INSIGHT_STYLES)[number] | null;
}
