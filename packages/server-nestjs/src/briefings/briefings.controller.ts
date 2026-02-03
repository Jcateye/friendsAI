import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { BriefingsService } from './briefings.service';
import { AuthGuard } from '../auth/auth.guard';

interface RequestWithUser extends Request {
  user: { id: string };
}

@UseGuards(AuthGuard)
@Controller('contacts')
export class BriefingsController {
  constructor(private readonly briefingsService: BriefingsService) {}

  @Get(':id/briefing')
  async getBriefing(
    @Req() req: RequestWithUser,
    @Param('id') contactId: string,
  ) {
    return this.briefingsService.generateBriefing(req.user.id, contactId);
  }
}
