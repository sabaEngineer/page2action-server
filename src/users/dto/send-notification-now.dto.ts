import { InsightStyle } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class SendNotificationNowDto {
  @IsEnum(InsightStyle)
  style!: InsightStyle;
}
