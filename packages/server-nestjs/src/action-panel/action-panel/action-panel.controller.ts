import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ActionPanelService } from './action-panel.service';
// import { AuthGuard } from '../../auth/auth.guard'; // 假设认证守卫存在

@Controller('action-panel')
export class ActionPanelController {
  constructor(private readonly actionPanelService: ActionPanelService) {}

  @Get('dashboard')
  // @UseGuards(AuthGuard)
  async getDashboard(@Request() req: any) {
    const userId = req.user?.id || 'mock-user-id';
    
    const followUps = await this.actionPanelService.getFollowUps(userId);
    const recommendedContacts = await this.actionPanelService.getRecommendedContacts(userId);

    return {
      followUps,
      recommendedContacts,
    };
  }
}
