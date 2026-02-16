import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User as RequestUser } from '../entities/user.entity';
import {
  FeishuTemplateService,
  type CreateFeishuTemplateInput,
  type SendByTemplateInput,
  type UpdateFeishuTemplateInput,
} from './feishu-template.service';

@ApiTags('connectors-feishu-template')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('connectors/feishu')
export class FeishuTemplateController {
  constructor(private readonly feishuTemplateService: FeishuTemplateService) {}

  @Get('templates')
  @ApiOperation({ summary: '获取飞书消息模板列表' })
  @ApiResponse({ status: 200, description: '返回当前用户模板列表' })
  listTemplates(@Req() req: { user: RequestUser }) {
    return this.feishuTemplateService.listTemplates(req.user.id);
  }

  @Post('templates')
  @ApiOperation({ summary: '创建飞书消息模板' })
  @ApiResponse({ status: 201, description: '创建成功' })
  createTemplate(@Req() req: { user: RequestUser }, @Body() body: CreateFeishuTemplateInput) {
    return this.feishuTemplateService.createTemplate(req.user.id, body);
  }

  @Patch('templates/:id')
  @ApiOperation({ summary: '更新飞书消息模板' })
  @ApiResponse({ status: 200, description: '更新成功' })
  updateTemplate(
    @Req() req: { user: RequestUser },
    @Param('id') id: string,
    @Body() body: UpdateFeishuTemplateInput,
  ) {
    return this.feishuTemplateService.updateTemplate(req.user.id, id, body);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: '删除飞书消息模板' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteTemplate(@Req() req: { user: RequestUser }, @Param('id') id: string) {
    await this.feishuTemplateService.deleteTemplate(req.user.id, id);
    return {
      success: true,
    };
  }

  @Post('messages/template-send')
  @ApiOperation({
    summary: '按模板发送飞书消息',
    description: '发送后返回 deliveryId/messageId，用于后续状态回流与审计。',
  })
  @ApiResponse({ status: 200, description: '返回发送结果及 trace 字段' })
  sendByTemplate(@Req() req: { user: RequestUser }, @Body() body: SendByTemplateInput) {
    return this.feishuTemplateService.sendByTemplate(req.user.id, body);
  }
}
