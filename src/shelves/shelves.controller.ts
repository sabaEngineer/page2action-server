import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ShelvesService } from './shelves.service';
import { CreateShelfDto } from './dto/create-shelf.dto';
import { UpdateShelfDto } from './dto/update-shelf.dto';

@Controller('shelves')
export class ShelvesController {
  constructor(private readonly shelvesService: ShelvesService) {}

  /* ── Authenticated ────────────────────────────────────────────── */

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateShelfDto) {
    return this.shelvesService.create(user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() user: AuthUser) {
    return this.shelvesService.findAllForUser(user.id);
  }

  @Get('share-status')
  @UseGuards(JwtAuthGuard)
  getShareStatus(@CurrentUser() user: AuthUser) {
    return this.shelvesService.getShareStatus(user.id);
  }

  @Post('toggle-all-public')
  @UseGuards(JwtAuthGuard)
  toggleAllPublic(@CurrentUser() user: AuthUser) {
    return this.shelvesService.toggleAllPublic(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.shelvesService.findOneForUser(user.id, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateShelfDto,
  ) {
    return this.shelvesService.update(user.id, id, dto);
  }

  @Post(':id/toggle-public')
  @UseGuards(JwtAuthGuard)
  togglePublic(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.shelvesService.toggleShelfPublic(user.id, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.shelvesService.remove(user.id, id);
  }

  /* ── Public (no auth) ─────────────────────────────────────────── */

  @Get('public/shelf/:slug')
  findPublicShelf(@Param('slug') slug: string) {
    return this.shelvesService.findPublicShelf(slug);
  }

  @Get('public/bookshelf/:slug')
  findPublicBookshelf(@Param('slug') slug: string) {
    return this.shelvesService.findPublicBookshelf(slug);
  }
}
