import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateReportDto) {
    return this.reports.create(req.user.sub, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  findMine(@Req() req: AuthenticatedRequest) {
    return this.reports.findMine(req.user.sub);
  }

  @Get(':reportId')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('reportId') reportId: string) {
    return this.reports.findOne(reportId);
  }

  @Patch(':reportId')
  @UseGuards(JwtAuthGuard)
  update(
    @Req() req: AuthenticatedRequest,
    @Param('reportId') reportId: string,
    @Body() dto: UpdateReportDto,
  ) {
    return this.reports.update(req.user.sub, reportId, dto);
  }

  @Delete(':reportId')
  @UseGuards(JwtAuthGuard)
  remove(@Req() req: AuthenticatedRequest, @Param('reportId') reportId: string) {
    return this.reports.delete(req.user.sub, reportId);
  }

  @Post(':reportId/finalize')
  @UseGuards(JwtAuthGuard)
  finalize(@Param('reportId') reportId: string) {
    return this.reports.finalize(reportId);
  }
}
