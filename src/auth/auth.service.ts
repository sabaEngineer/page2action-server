import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { seedUserNotificationSchedules } from '../users/notification-schedule.seed';
import { EmailService } from '../email/email.service';

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
    private email: EmailService,
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

      await seedUserNotificationSchedules(this.prisma, user.id);

      void this.email.send(
        user.email,
        'Welcome to Page2Action',
        welcomeEmailHtml(user.name ?? 'there'),
      );
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

function welcomeEmailHtml(name: string): string {
  return `
    <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #3b3225;">
      <h1 style="font-size: 22px; font-weight: 600; margin-bottom: 24px;">Welcome to Page2Action</h1>
      <p style="font-size: 16px; line-height: 1.6;">Hey ${name},</p>
      <p style="font-size: 16px; line-height: 1.6;">
        Books don't change your life. Actions do.
      </p>
      <p style="font-size: 16px; line-height: 1.6;">
        Save the ideas that matter, and we'll help you turn them into action — at the right time, in the right moment.
      </p>
      <p style="font-size: 16px; line-height: 1.6;">
        Start by adding a book and writing your first insight.
      </p>
      <p style="font-size: 14px; color: #8a7e6b; margin-top: 32px;">— Page2Action</p>
    </div>
  `;
}
