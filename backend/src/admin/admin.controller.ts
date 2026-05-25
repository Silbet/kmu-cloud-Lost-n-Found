import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateConfigDto } from './dto/update-config.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('reports')
  reports() {
    return this.admin.reports();
  }

  @Get('items')
  items() {
    return this.admin.items();
  }

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('unclaimed')
  unclaimed() {
    return this.admin.unclaimed();
  }

  @Get('config')
  getConfig() {
    return this.admin.getConfig();
  }

  @Patch('config')
  updateConfig(@Body() dto: UpdateConfigDto) {
    return this.admin.updateConfig(dto);
  }

  @Get('pending-managers')
  pendingManagers() {
    return this.admin.pendingManagers();
  }

  @Post('approve-manager/:userId')
  approveManager(@Param('userId') userId: string) {
    return this.admin.approveManager(userId);
  }

  @Delete('reject-manager/:userId')
  rejectManager(@Param('userId') userId: string) {
    return this.admin.rejectManager(userId);
  }

  @Post('create-admin')
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.admin.createAdmin(dto);
  }
}
