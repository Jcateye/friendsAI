import { Controller, Get, Post, Param, Request, UseGuards } from '@nestjs/common';
import { BriefingService } from '../briefing/briefing.service';
// import { AuthGuard } from '../../auth/auth.guard'; // 假设认证守卫存在

@Controller('briefings')
export class BriefingsController {
  constructor(private readonly briefingService: BriefingService) {}

  @Get('contact/:contactId')
  // @UseGuards(AuthGuard)
  async generateBriefing(@Request() req: any, @Param('contactId') contactId: string): Promise<string> {
    const userId = req.user?.id || 'mock-user-id';
    return this.briefingService.generateBriefing(contactId, userId);
  }

  @Post('contact/:contactId/refresh')
  // @UseGuards(AuthGuard)
  async refreshBriefing(@Request() req: any, @Param('contactId') contactId: string): Promise<string> {
    const userId = req.user?.id || 'mock-user-id';
    return this.briefingService.refreshBriefing(contactId, userId);
  }
}
