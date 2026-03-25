import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { InsightsService } from './insights.service';
import { CreateInsightDto } from './dto/create-insight.dto';
import { UpdateInsightDto } from './dto/update-insight.dto';
import { AiEditInsightDto } from './dto/ai-edit-insight.dto';
import { CreateDetailDto } from './dto/create-detail.dto';
import { UpdateDetailDto } from './dto/update-detail.dto';

@Controller('insights')
@UseGuards(JwtAuthGuard)
export class InsightsController {
  constructor(private readonly svc: InsightsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInsightDto) {
    return this.svc.create(user.id, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('bookId') bookId?: string,
  ) {
    if (bookId) return this.svc.findAllForBook(user.id, bookId);
    return this.svc.findAllForUser(user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateInsightDto,
  ) {
    return this.svc.update(user.id, id, dto);
  }

  @Post(':id/ai-edit')
  aiEdit(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AiEditInsightDto,
  ) {
    return this.svc.aiEdit(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.remove(user.id, id);
  }

  // ── Details ──

  @Post(':insightId/details')
  addDetail(
    @CurrentUser() user: AuthUser,
    @Param('insightId') insightId: string,
    @Body() dto: CreateDetailDto,
  ) {
    return this.svc.addDetail(user.id, insightId, dto);
  }

  @Patch('details/:detailId')
  updateDetail(
    @CurrentUser() user: AuthUser,
    @Param('detailId') detailId: string,
    @Body() dto: UpdateDetailDto,
  ) {
    return this.svc.updateDetail(user.id, detailId, dto);
  }

  @Delete('details/:detailId')
  @HttpCode(204)
  removeDetail(
    @CurrentUser() user: AuthUser,
    @Param('detailId') detailId: string,
  ) {
    return this.svc.removeDetail(user.id, detailId);
  }
}
