import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DigestModule } from '../digest/digest.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule, DigestModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
