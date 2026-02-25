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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User as RequestUser } from '../entities/user.entity';
import { FeishuTemplateService } from './feishu-template.service';
import type { FeishuTemplateStatus } from '../v3-entities';

class FeishuTemplateDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiPropertyOptional({ type: [String], nullable: true })
  variables?: string[] | null;

  @ApiProperty({ enum: ['active', 'disabled', 'archived'] })
  status: FeishuTemplateStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

class CreateFeishuTemplateInputDto {
  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiPropertyOptional({ type: [String] })
  variables?: string[];

  @ApiPropertyOptional({ enum: ['active', 'disabled', 'archived'] })
  status?: FeishuTemplateStatus;
}

class UpdateFeishuTemplateInputDto {
  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  content?: string;

  @ApiPropertyOptional({ type: [String] })
  variables?: string[];

  @ApiPropertyOptional({ enum: ['active', 'disabled', 'archived'] })
  status?: FeishuTemplateStatus;
}

class SendByTemplateInputDto {
  @ApiProperty()
  templateId: string;

  @ApiProperty()
  recipientOpenId: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'string' } })
  variables?: Record<string, string>;

  @ApiPropertyOptional()
  conversationId?: string;

  @ApiPropertyOptional()
  archiveId?: string;

  @ApiPropertyOptional()
  toolConfirmationId?: string;
}

class SendByTemplateResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  deliveryId: string;

  @ApiPropertyOptional()
  messageId?: string;

  @ApiProperty({ enum: ['pending', 'sent', 'delivered', 'read', 'failed'] })
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

  @ApiProperty()
  retryable: boolean;

  @ApiPropertyOptional()
  errorCode?: string;

  @ApiPropertyOptional()
  error?: string;
}

class DeleteTemplateResponseDto {
  @ApiProperty()
  success: boolean;
}

@ApiTags('connectors-feishu-template')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('connectors/feishu')
export class FeishuTemplateController {
  constructor(private readonly feishuTemplateService: FeishuTemplateService) {}

  @Get('templates')
  @ApiOperation({ summary: '获取飞书消息模板列表' })
  @ApiResponse({ status: 200, description: '返回当前用户模板列表', type: [FeishuTemplateDto] })
  listTemplates(@Req() req: { user: RequestUser }) {
    return this.feishuTemplateService.listTemplates(req.user.id);
  }

  @Post('templates')
  @ApiOperation({ summary: '创建飞书消息模板' })
  @ApiBody({ type: CreateFeishuTemplateInputDto })
  @ApiResponse({ status: 201, description: '创建成功', type: FeishuTemplateDto })
  createTemplate(@Req() req: { user: RequestUser }, @Body() body: CreateFeishuTemplateInputDto) {
    return this.feishuTemplateService.createTemplate(req.user.id, body);
  }

  @Patch('templates/:id')
  @ApiOperation({ summary: '更新飞书消息模板' })
  @ApiBody({ type: UpdateFeishuTemplateInputDto })
  @ApiResponse({ status: 200, description: '更新成功', type: FeishuTemplateDto })
  updateTemplate(
    @Req() req: { user: RequestUser },
    @Param('id') id: string,
    @Body() body: UpdateFeishuTemplateInputDto,
  ) {
    return this.feishuTemplateService.updateTemplate(req.user.id, id, body);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: '删除飞书消息模板' })
  @ApiResponse({ status: 200, description: '删除成功', type: DeleteTemplateResponseDto })
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
  @ApiBody({ type: SendByTemplateInputDto })
  @ApiResponse({ status: 200, description: '返回发送结果及 trace 字段', type: SendByTemplateResponseDto })
  sendByTemplate(@Req() req: { user: RequestUser }, @Body() body: SendByTemplateInputDto) {
    return this.feishuTemplateService.sendByTemplate(req.user.id, body);
  }
}
