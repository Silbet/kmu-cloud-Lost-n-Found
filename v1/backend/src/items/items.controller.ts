import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateItemDto } from './dto/create-item.dto';
import { SetStatusDto } from './dto/set-status.dto';
import { SetStorageDto } from './dto/set-storage.dto';
import { ItemsService } from './items.service';

@Controller('items')
export class ItemsController {
  constructor(private readonly items: ItemsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateItemDto) {
    return this.items.create(req.user.sub, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  findMine(@Req() req: AuthenticatedRequest) {
    return this.items.findMine(req.user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.items.findAll();
  }

  @Delete(':itemId')
  @UseGuards(JwtAuthGuard)
  remove(@Param('itemId') itemId: string) {
    return this.items.remove(itemId);
  }

  @Patch(':itemId/storage')
  @UseGuards(JwtAuthGuard)
  setStorage(@Param('itemId') itemId: string, @Body() dto: SetStorageDto) {
    return this.items.setStorage(itemId, dto);
  }

  @Patch(':itemId/status')
  @UseGuards(JwtAuthGuard)
  setStatus(@Param('itemId') itemId: string, @Body() dto: SetStatusDto) {
    return this.items.setStatus(itemId, dto.status);
  }
}
