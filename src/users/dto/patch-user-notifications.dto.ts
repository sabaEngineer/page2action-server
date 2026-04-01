import { InsightStyle } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class PatchUserNotificationsDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  deliveryTimeZone?: string;

  @IsOptional()
  @IsEnum(InsightStyle)
  style?: InsightStyle;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  localHour?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  localMinute?: number;
}
