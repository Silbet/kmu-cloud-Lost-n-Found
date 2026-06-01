import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CancelPickupDto } from './dto/cancel-pickup.dto';
import { VerifyPickupDto } from './dto/verify-pickup.dto';
import { PickupsService } from './pickups.service';

@Controller('pickups')
export class PickupsController {
  constructor(private readonly pickups: PickupsService) {}

  @Get('waiting')
  @UseGuards(JwtAuthGuard)
  waiting() {
    return this.pickups.waiting();
  }

  @Get('by-report/:reportId')
  @UseGuards(JwtAuthGuard)
  byReport(@Param('reportId') reportId: string) {
    return this.pickups.byReport(reportId);
  }

  @Get(':pickupId')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('pickupId') pickupId: string) {
    return this.pickups.findOne(pickupId);
  }

  @Post(':pickupId/verify')
  @UseGuards(JwtAuthGuard)
  verify(@Param('pickupId') pickupId: string, @Body() dto: VerifyPickupDto) {
    return this.pickups.verify(pickupId, dto);
  }

  @Post(':pickupId/complete')
  @UseGuards(JwtAuthGuard)
  complete(@Req() req: AuthenticatedRequest, @Param('pickupId') pickupId: string) {
    return this.pickups.complete(pickupId, req.user.sub);
  }

  @Post(':pickupId/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(@Param('pickupId') pickupId: string, @Body() dto: CancelPickupDto) {
    return this.pickups.cancel(pickupId, dto.reason);
  }
}
