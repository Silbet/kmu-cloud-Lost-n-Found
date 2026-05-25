import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClaimItemDto } from './dto/claim-item.dto';
import { RejectMatchDto } from './dto/reject-match.dto';
import { MatchesService } from './matches.service';

@Controller()
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Get('reports/:reportId/matches')
  @UseGuards(JwtAuthGuard)
  listForReport(@Param('reportId') reportId: string) {
    return this.matches.listForReport(reportId);
  }

  @Get('matches/pending')
  @UseGuards(JwtAuthGuard)
  listPending() {
    return this.matches.listPending();
  }

  @Post('matches/:matchId/confirm')
  @UseGuards(JwtAuthGuard)
  confirm(@Req() req: AuthenticatedRequest, @Param('matchId') matchId: string) {
    return this.matches.confirm(req.user.sub, matchId);
  }

  @Post('matches/:matchId/approve')
  @UseGuards(JwtAuthGuard)
  approve(@Param('matchId') matchId: string) {
    return this.matches.approve(matchId);
  }

  @Post('matches/:matchId/reject')
  @UseGuards(JwtAuthGuard)
  reject(@Param('matchId') matchId: string, @Body() dto: RejectMatchDto) {
    return this.matches.reject(matchId, dto.reason);
  }

  @Post('items/:itemId/claim')
  @UseGuards(JwtAuthGuard)
  claim(
    @Req() req: AuthenticatedRequest,
    @Param('itemId') itemId: string,
    @Body() dto: ClaimItemDto,
  ) {
    return this.matches.claim(req.user.sub, itemId, dto.reportId);
  }
}
