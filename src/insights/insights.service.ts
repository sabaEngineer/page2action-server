import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  sharePathSegmentFromUser,
  slugifyBookTitle,
} from '../common/share-slug';
import { PrismaService } from '../prisma/prisma.service';
import { InsightClassifierService } from './insight-classifier.service';
import { InsightEditorService } from './insight-editor.service';
import { AiEditInsightDto } from './dto/ai-edit-insight.dto';
import { CreateInsightDto } from './dto/create-insight.dto';
import { UpdateInsightDto } from './dto/update-insight.dto';
import { CreateDetailDto } from './dto/create-detail.dto';
import { UpdateDetailDto } from './dto/update-detail.dto';

export type InsightSharePath = { ownerSlug: string; bookSlug: string; page: number };

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

  private async attachSharePaths<
    T extends { id: string; bookId: string; position: number; isShared: boolean },
  >(userId: string, insights: T[]): Promise<(T & { sharePath: InsightSharePath | null })[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profileSlug: true },
    });
    const ownerSlug = user?.profileSlug ?? null;
    const bookIds = [...new Set(insights.map((i) => i.bookId))];
    const books = await this.prisma.book.findMany({
      where: { id: { in: bookIds } },
      select: { id: true, publicSlug: true },
    });
    const bookSlugById = new Map(books.map((b) => [b.id, b.publicSlug]));

    const byBook = new Map<string, T[]>();
    for (const ins of insights) {
      const arr = byBook.get(ins.bookId) ?? [];
      arr.push(ins);
      byBook.set(ins.bookId, arr);
    }
    for (const arr of byBook.values()) {
      arr.sort((a, b) => a.position - b.position);
    }

    return insights.map((ins) => {
      const bookSlug = bookSlugById.get(ins.bookId) ?? null;
      if (!ins.isShared || !ownerSlug || !bookSlug) {
        return { ...ins, sharePath: null };
      }
      const ordered = byBook.get(ins.bookId)!;
      const page = ordered.findIndex((x) => x.id === ins.id) + 1;
      return { ...ins, sharePath: { ownerSlug, bookSlug, page } };
    });
  }

  async findAllForBook(userId: string, bookId: string) {
    const rows = await this.prisma.insight.findMany({
      where: { bookId, userId },
      include: { details: { orderBy: { position: 'asc' } } },
      orderBy: { position: 'asc' },
    });
    return this.attachSharePaths(userId, rows);
  }

  async findAllForUser(userId: string) {
    const rows = await this.prisma.insight.findMany({
      where: { userId },
      include: {
        book: { select: { id: true, title: true, author: true, publicSlug: true } },
        details: { orderBy: { position: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.attachSharePaths(userId, rows);
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

  // ── Public share (single insight page) ──

  private generateShareToken(): string {
    return randomBytes(12).toString('hex');
  }

  private async ensureUserProfileSlug(
    userId: string,
    name: string | null,
    email: string,
  ): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.profileSlug) return user.profileSlug;

    let base = sharePathSegmentFromUser(name, email);
    let candidate = base;
    let n = 0;
    for (;;) {
      const taken = await this.prisma.user.findFirst({
        where: { profileSlug: candidate, NOT: { id: userId } },
      });
      if (!taken) break;
      n += 1;
      candidate = `${base}-${n}`;
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { profileSlug: candidate },
    });
    return candidate;
  }

  private async ensureBookPublicSlug(userId: string, bookId: string, title: string): Promise<string> {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Book not found');
    if (book.publicSlug) return book.publicSlug;

    let base = slugifyBookTitle(title);
    let candidate = base;
    let n = 0;
    for (;;) {
      const taken = await this.prisma.book.findFirst({
        where: {
          userId,
          publicSlug: candidate,
          NOT: { id: bookId },
        },
      });
      if (!taken) break;
      n += 1;
      candidate = `${base}-${n}`;
    }
    await this.prisma.book.update({
      where: { id: bookId },
      data: { publicSlug: candidate },
    });
    return candidate;
  }

  /** 1-based page index among insights ordered by position (same as app). */
  private async pageNumberForInsight(bookId: string, insightId: string): Promise<number> {
    const rows = await this.prisma.insight.findMany({
      where: { bookId },
      orderBy: { position: 'asc' },
      select: { id: true },
    });
    const idx = rows.findIndex((r) => r.id === insightId);
    if (idx < 0) throw new NotFoundException('Insight not found');
    return idx + 1;
  }

  async enableShare(userId: string, insightId: string) {
    const insight = await this.prisma.insight.findUnique({
      where: { id: insightId },
      include: { book: true, user: true },
    });
    if (!insight) throw new NotFoundException('Insight not found');
    if (insight.userId !== userId) throw new ForbiddenException();

    const ownerSlug = await this.ensureUserProfileSlug(
      userId,
      insight.user.name,
      insight.user.email,
    );
    const bookSlug = await this.ensureBookPublicSlug(
      userId,
      insight.bookId,
      insight.book.title,
    );
    const page = await this.pageNumberForInsight(insight.bookId, insightId);

    const shareSlug = insight.shareSlug ?? this.generateShareToken();

    const updated = await this.prisma.insight.update({
      where: { id: insightId },
      data: { isShared: true, shareSlug },
      include: { details: { orderBy: { position: 'asc' } } },
    });

    return {
      ...updated,
      sharePath: { ownerSlug, bookSlug, page } satisfies InsightSharePath,
    };
  }

  async disableShare(userId: string, insightId: string) {
    const insight = await this.prisma.insight.findUnique({ where: { id: insightId } });
    if (!insight) throw new NotFoundException('Insight not found');
    if (insight.userId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.insight.update({
      where: { id: insightId },
      data: { isShared: false },
      include: { details: { orderBy: { position: 'asc' } } },
    });
    return { ...updated, sharePath: null };
  }

  async findPublicSharedPage(ownerSlug: string, bookSlug: string, page: number) {
    if (!Number.isFinite(page) || page < 1) {
      throw new NotFoundException('Page not found');
    }

    const user = await this.prisma.user.findFirst({
      where: { profileSlug: ownerSlug },
    });
    if (!user) throw new NotFoundException('Page not found');

    const book = await this.prisma.book.findFirst({
      where: { userId: user.id, publicSlug: bookSlug },
    });
    if (!book) throw new NotFoundException('Page not found');

    const insights = await this.prisma.insight.findMany({
      where: { bookId: book.id },
      orderBy: { position: 'asc' },
      include: {
        details: { orderBy: { position: 'asc' } },
      },
    });

    if (page > insights.length) throw new NotFoundException('Page not found');

    const row = insights[page - 1];
    if (!row.isShared) throw new NotFoundException('Page not found');

    return {
      content: row.content,
      style: row.style,
      details: row.details.map((d) => ({
        content: d.content,
        type: d.type,
      })),
      bookTitle: book.title,
      bookAuthor: book.author,
      authorName: user.name,
      page,
      /** Matches in-app footer: existing pages + one “new page” slot. */
      totalPages: insights.length + 1,
    };
  }
}
