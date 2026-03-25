import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

interface GoogleUser {
  googleId: string;
  email: string;
  name?: string;
  avatar?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async validateGoogleUser(googleUser: GoogleUser) {
    let isNew = false;
    const existing = await this.prisma.user.findUnique({
      where: { googleId: googleUser.googleId },
    });
    if (!existing) isNew = true;

    const user = await this.prisma.user.upsert({
      where: { googleId: googleUser.googleId },
      update: {
        name: googleUser.name,
        avatar: googleUser.avatar,
      },
      create: {
        googleId: googleUser.googleId,
        email: googleUser.email,
        name: googleUser.name,
        avatar: googleUser.avatar,
      },
    });

    if (isNew) {
      await this.prisma.shelf.create({
        data: { name: 'My books shelf', position: 0, userId: user.id },
      });
    }

    return user;
  }

  generateJwt(user: { id: string; email: string; name?: string | null }) {
    return this.jwt.sign({
      sub: user.id,
      email: user.email,
      name: user.name ?? undefined,
    });
  }
}
