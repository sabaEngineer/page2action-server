import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InsightClassifierService } from './insight-classifier.service';
import { InsightEditorService } from './insight-editor.service';
import { AiEditInsightDto } from './dto/ai-edit-insight.dto';
import { CreateInsightDto } from './dto/create-insight.dto';
import { UpdateInsightDto } from './dto/update-insight.dto';
import { CreateDetailDto } from './dto/create-detail.dto';
import { UpdateDetailDto } from './dto/update-detail.dto';

@Injectable()
export class InsightsService {
  constructor(
    private prisma: PrismaService,
    private classifier: InsightClassifierService,
    private editor: InsightEditorService,
  ) {}

  async create(userId: string, dto: CreateInsightDto) {
    const book = await this.prisma.book.findUnique({
      where: { id: dto.bookId },
    });
    if (!book) throw new NotFoundException('Book not found');
    if (book.userId !== userId) throw new ForbiddenException();

    const maxPos = await this.prisma.insight.aggregate({
      where: { bookId: dto.bookId },
      _max: { position: true },
    });

    const insight = await this.prisma.insight.create({
      data: {
        content: dto.content.trim(),
        bookId: dto.bookId,
        userId,
        position: (maxPos._max.position ?? -1) + 1,
      },
      include: { details: { orderBy: { position: 'asc' } } },
    });

    this.classifier.scheduleClassify(insight.id, insight.content, true);

    return insight;
  }

  findAllForBook(userId: string, bookId: string) {
    return this.prisma.insight.findMany({
      where: { bookId, userId },
      include: { details: { orderBy: { position: 'asc' } } },
      orderBy: { position: 'asc' },
    });
  }

  findAllForUser(userId: string) {
    return this.prisma.insight.findMany({
      where: { userId },
      include: {
        book: { select: { id: true, title: true, author: true } },
        details: { orderBy: { position: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(userId: string, id: string, dto: UpdateInsightDto) {
    const insight = await this.prisma.insight.findUnique({ where: { id } });
    if (!insight) throw new NotFoundException('Insight not found');
    if (insight.userId !== userId) throw new ForbiddenException();

    const data: Record<string, unknown> = {};
    if (dto.content !== undefined) data.content = dto.content.trim();
    if (dto.style !== undefined) data.style = dto.style;

    const updated = await this.prisma.insight.update({
      where: { id },
      data,
      include: { details: { orderBy: { position: 'asc' } } },
    });

    if (dto.content !== undefined && dto.style === undefined) {
      this.classifier.scheduleClassify(updated.id, updated.content);
    }

    return updated;
  }

  async aiEdit(userId: string, id: string, dto: AiEditInsightDto) {
    const insight = await this.prisma.insight.findUnique({ where: { id } });
    if (!insight) throw new NotFoundException('Insight not found');
    if (insight.userId !== userId) throw new ForbiddenException();

    const newContent = await this.editor.edit(insight.content, dto.action);
    if (!newContent) throw new InternalServerErrorException('AI edit failed');

    return { content: newContent };
  }

  async remove(userId: string, id: string) {
    const insight = await this.prisma.insight.findUnique({ where: { id } });
    if (!insight) throw new NotFoundException('Insight not found');
    if (insight.userId !== userId) throw new ForbiddenException();
    await this.prisma.insight.delete({ where: { id } });
  }

  // ── Details ──

  async addDetail(userId: string, insightId: string, dto: CreateDetailDto) {
    const insight = await this.prisma.insight.findUnique({
      where: { id: insightId },
    });
    if (!insight) throw new NotFoundException('Insight not found');
    if (insight.userId !== userId) throw new ForbiddenException();

    const maxPos = await this.prisma.insightDetail.aggregate({
      where: { insightId },
      _max: { position: true },
    });

    return this.prisma.insightDetail.create({
      data: {
        content: dto.content.trim(),
        type: dto.type,
        insightId,
        position: (maxPos._max.position ?? -1) + 1,
      },
    });
  }

  async updateDetail(userId: string, detailId: string, dto: UpdateDetailDto) {
    const detail = await this.prisma.insightDetail.findUnique({
      where: { id: detailId },
      include: { insight: true },
    });
    if (!detail) throw new NotFoundException('Detail not found');
    if (detail.insight.userId !== userId) throw new ForbiddenException();

    const data: Record<string, unknown> = {};
    if (dto.content !== undefined) data.content = dto.content.trim();
    if (dto.type !== undefined) data.type = dto.type;

    return this.prisma.insightDetail.update({
      where: { id: detailId },
      data,
    });
  }

  async removeDetail(userId: string, detailId: string) {
    const detail = await this.prisma.insightDetail.findUnique({
      where: { id: detailId },
      include: { insight: true },
    });
    if (!detail) throw new NotFoundException('Detail not found');
    if (detail.insight.userId !== userId) throw new ForbiddenException();
    await this.prisma.insightDetail.delete({ where: { id: detailId } });
  }
}
