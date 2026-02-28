import { Controller, Get, Query, Request, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkillsService } from './skills.service';

@ApiTags('chat-skills')
@ApiBearerAuth()
@Controller('chat/skills')
export class ChatSkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get('catalog')
  @ApiOperation({ summary: '获取聊天输入区可见的 skills catalog' })
  @ApiQuery({ name: 'agentScope', required: false, type: String })
  @ApiQuery({ name: 'capability', required: false, type: String })
  @ApiResponse({ status: 200, description: '返回仅用于 chat 的技能清单' })
  async getCatalog(
    @Request() req: any,
    @Query('agentScope') agentScope?: string,
    @Query('capability') capability?: string,
  ) {
    const tenantId = req.user?.id;
    if (!tenantId) {
      throw new UnauthorizedException('User not found');
    }

    return this.skillsService.getCatalog(tenantId, {
      agentScope,
      capability,
    });
  }
}
