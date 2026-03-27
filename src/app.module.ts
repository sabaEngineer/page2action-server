import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BooksModule } from './books/books.module';
import { ShelvesModule } from './shelves/shelves.module';
import { InsightsModule } from './insights/insights.module';
import { EmailModule } from './email/email.module';
import { DigestModule } from './digest/digest.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    BooksModule,
    ShelvesModule,
    InsightsModule,
    EmailModule,
    DigestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
