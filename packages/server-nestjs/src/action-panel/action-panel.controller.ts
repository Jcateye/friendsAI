import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { ActionPanelService } from './action-panel.service';
import { AuthGuard } from '../auth/auth.guard';

interface RequestWithUser extends Request {
  user: { id: string };
}

@UseGuards(AuthGuard)
@Controller('actions')
export class ActionPanelController {
  constructor(private readonly actionPanelService: ActionPanelService) {}

  @Get('dashboard')
  async getDashboard(@Req() req: RequestWithUser) {
    return this.actionPanelService.generateDashboard(req.user.id);
  }

  @Get('follow-ups')
  async getFollowUps(@Req() req: RequestWithUser) {
    return this.actionPanelService.getFollowUps(req.user.id);
  }

  @Get('suggestions')
  async getSuggestions(@Req() req: RequestWithUser) {
    return this.actionPanelService.getSuggestions(req.user.id);
  }
}
