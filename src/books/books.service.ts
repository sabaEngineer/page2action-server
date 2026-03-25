import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@Injectable()
export class BooksService {
  constructor(private prisma: PrismaService) {}

  create(userId: string, dto: CreateBookDto) {
    return this.prisma.book.create({
      data: {
        title: dto.title.trim(),
        author: dto.author?.trim() || null,
        shelfId: dto.shelfId ?? null,
        userId,
      },
    });
  }

  findAllForUser(userId: string) {
    return this.prisma.book.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOneForUser(userId: string, id: string) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('Book not found');
    if (book.userId !== userId) throw new ForbiddenException();
    return book;
  }

  async update(userId: string, id: string, dto: UpdateBookDto) {
    await this.findOneForUser(userId, id);
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.author !== undefined) {
      data.author = dto.author === null ? null : dto.author.trim() || null;
    }
    if (dto.shelfId !== undefined) data.shelfId = dto.shelfId || null;
    if (Object.keys(data).length === 0) {
      return this.prisma.book.findUniqueOrThrow({ where: { id } });
    }
    return this.prisma.book.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    await this.findOneForUser(userId, id);
    await this.prisma.book.delete({ where: { id } });
  }
}
