import { Controller, Get, Post, Param, Request, UseGuards } from '@nestjs/common';
import { BriefingService, BriefSnapshot } from '../briefing/briefing.service';
// import { AuthGuard } from '../../auth/auth.guard'; // 假设认证守卫存在

@Controller('contacts')
export class BriefingsController {
  constructor(private readonly briefingService: BriefingService) {}

  @Get(':contactId/brief')
  // @UseGuards(AuthGuard)
  async getBriefing(
    @Request() req: any,
    @Param('contactId') contactId: string
  ): Promise<BriefSnapshot | null> {
    const userId = req.user?.id || 'mock-user-id';
    return this.briefingService.getBriefing(contactId, userId);
  }

  @Post(':contactId/brief')
  // @UseGuards(AuthGuard)
  async refreshBriefing(
    @Request() req: any,
    @Param('contactId') contactId: string
  ): Promise<BriefSnapshot> {
    const userId = req.user?.id || 'mock-user-id';
    return this.briefingService.refreshBriefing(contactId, userId);
  }

  @Post(':contactId/brief/refresh')
  // @UseGuards(AuthGuard)
  async refreshBriefingExplicit(
    @Request() req: any,
    @Param('contactId') contactId: string
  ): Promise<BriefSnapshot> {
    const userId = req.user?.id || 'mock-user-id';
    return this.briefingService.refreshBriefing(contactId, userId);
  }
}
