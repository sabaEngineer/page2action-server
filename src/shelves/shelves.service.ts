import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShelfDto } from './dto/create-shelf.dto';
import { UpdateShelfDto } from './dto/update-shelf.dto';

function generateSlug() {
  return randomBytes(6).toString('base64url');
}

@Injectable()
export class ShelvesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateShelfDto) {
    const position =
      dto.position ??
      (await this.prisma.shelf.count({ where: { userId } }));
    return this.prisma.shelf.create({
      data: {
        name: dto.name.trim(),
        position,
        userId,
      },
    });
  }

  async findAllForUser(userId: string) {
    const shelves = await this.prisma.shelf.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
      include: {
        books: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (shelves.length === 0) {
      const shelf = await this.prisma.shelf.create({
        data: { name: 'My books shelf', position: 0, userId },
        include: { books: true },
      });
      return [shelf];
    }

    return shelves;
  }

  async findOneForUser(userId: string, id: string) {
    const shelf = await this.prisma.shelf.findUnique({
      where: { id },
      include: { books: { orderBy: { createdAt: 'asc' } } },
    });
    if (!shelf) throw new NotFoundException('Shelf not found');
    if (shelf.userId !== userId) throw new ForbiddenException();
    return shelf;
  }

  async update(userId: string, id: string, dto: UpdateShelfDto) {
    await this.findOneForUser(userId, id);
    return this.prisma.shelf.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.position !== undefined && { position: dto.position }),
      },
      include: { books: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOneForUser(userId, id);
    await this.prisma.shelf.delete({ where: { id } });
  }

  /* ── Sharing ──────────────────────────────────────────────────── */

  async toggleShelfPublic(userId: string, id: string) {
    const shelf = await this.findOneForUser(userId, id);
    const isPublic = !shelf.isPublic;
    const shareSlug = isPublic && !shelf.shareSlug ? generateSlug() : shelf.shareSlug;
    return this.prisma.shelf.update({
      where: { id },
      data: { isPublic, shareSlug },
      include: { books: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async toggleAllPublic(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const allPublic = !user.allPublic;
    const shareSlug = allPublic && !user.shareSlug ? generateSlug() : user.shareSlug;
    return this.prisma.user.update({
      where: { id: userId },
      data: { allPublic, shareSlug },
      select: { allPublic: true, shareSlug: true },
    });
  }

  async getShareStatus(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { allPublic: true, shareSlug: true },
    });
    return user;
  }

  /* ── Public (no auth) ─────────────────────────────────────────── */

  async findPublicShelf(slug: string) {
    const shelf = await this.prisma.shelf.findUnique({
      where: { shareSlug: slug },
      include: {
        books: { orderBy: { createdAt: 'asc' } },
        user: { select: { name: true, email: true } },
      },
    });
    if (!shelf || !shelf.isPublic) throw new NotFoundException('Shelf not found');
    return shelf;
  }

  async findPublicBookshelf(slug: string) {
    const user = await this.prisma.user.findUnique({
      where: { shareSlug: slug },
      select: {
        name: true,
        email: true,
        allPublic: true,
        shelves: {
          orderBy: { position: 'asc' },
          include: { books: { orderBy: { createdAt: 'asc' } } },
        },
      },
    });
    if (!user || !user.allPublic) throw new NotFoundException('Bookshelf not found');
    return user;
  }
}
