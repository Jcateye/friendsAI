import { Body, Controller, Get, Param, Post, Query, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ToolConfirmationsService } from './tool-confirmations.service';
import type { ToolConfirmationStatus } from '../entities';

interface CreateToolConfirmationDto {
  toolName: string;
  payload?: Record<string, any>;
  conversationId?: string;
}

interface ConfirmToolDto {
  payload?: Record<string, any>;
}

interface RejectToolDto {
  reason?: string;
}

interface BatchConfirmToolDto {
  items: Array<{
    id: string;
    payload?: Record<string, any>;
  }>;
}

interface BatchRejectToolDto {
  templateReason?: string;
  items: Array<{
    id: string;
    reason?: string;
  }>;
}

@ApiTags('tool-confirmations')
@ApiBearerAuth()
@Controller('tool-confirmations')
export class ToolConfirmationsController {
  constructor(private readonly toolConfirmationsService: ToolConfirmationsService) {}

  @Post()
  @ApiOperation({
    summary: '创建一个需要用户确认的工具操作记录',
    description:
      '用于记录 AI / 后端发起的「需要用户确认」的工具调用请求，例如删除数据、发送消息等高风险操作。',
  })
  @ApiResponse({
    status: 201,
    description: '成功创建工具确认记录',
  })
  create(@Request() req: any, @Body() body: CreateToolConfirmationDto) {
    const userId = req.user?.id;
    return this.toolConfirmationsService.create({
      toolName: body.toolName,
      payload: body.payload,
      conversationId: body.conversationId,
      userId,
    });
  }

  @Get()
  @ApiOperation({
    summary: '查询当前用户的工具确认记录列表',
    description: '支持按状态、用户、会话维度筛选待确认 / 已确认 / 已拒绝的工具操作。',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: '工具确认的状态（pending/confirmed/rejected 等）',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: '用户 ID；默认取当前请求上下文中的用户 ID',
  })
  @ApiQuery({
    name: 'conversationId',
    required: false,
    description: '所属会话 ID，用于筛选某个会话中的工具确认记录',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回工具确认记录列表',
  })
  findAll(
    @Request() req: any,
    @Query('status') status?: ToolConfirmationStatus,
    @Query('userId') userId?: string,
    @Query('conversationId') conversationId?: string,
  ) {
    const resolvedUserId = userId ?? req.user?.id;
    return this.toolConfirmationsService.findAll(status, resolvedUserId, conversationId);
  }

  @Get(':id')
  @ApiOperation({
    summary: '根据 ID 获取单个工具确认记录',
  })
  @ApiParam({ name: 'id', description: '工具确认记录 ID', type: String })
  @ApiResponse({
    status: 200,
    description: '成功返回工具确认记录',
  })
  findOne(@Param('id') id: string) {
    return this.toolConfirmationsService.findOne(id);
  }

  @Post(':id/confirm')
  @ApiOperation({
    summary: '确认某个工具操作',
    description: '用户在前端确认之后调用此接口，后端会据此继续执行工具操作。',
  })
  @ApiParam({ name: 'id', description: '工具确认记录 ID', type: String })
  @ApiResponse({
    status: 200,
    description: '工具操作已确认并进入后续执行流程',
  })
  @HttpCode(HttpStatus.OK)
  confirm(@Request() req: any, @Param('id') id: string, @Body() body: ConfirmToolDto = {}) {
    const userId = req.user?.id;
    return this.toolConfirmationsService.confirm(id, body.payload, userId);
  }

  @Post(':id/reject')
  @ApiOperation({
    summary: '拒绝某个工具操作',
    description: '用户在前端拒绝之后调用此接口，可携带拒绝原因，后端会记录并终止该工具操作。',
  })
  @ApiParam({ name: 'id', description: '工具确认记录 ID', type: String })
  @ApiResponse({
    status: 200,
    description: '工具操作已被拒绝',
  })
  @HttpCode(HttpStatus.OK)
  reject(@Request() req: any, @Param('id') id: string, @Body() body: RejectToolDto = {}) {
    const userId = req.user?.id;
    return this.toolConfirmationsService.reject(id, body.reason, userId);
  }

  @Post('batch/confirm')
  @ApiOperation({
    summary: '批量确认工具执行',
    description: '按条执行批量确认，允许部分成功并返回每条结果。',
  })
  @ApiResponse({
    status: 200,
    description: '返回批量执行结果（总数、成功数、失败数、逐条结果）',
  })
  @HttpCode(HttpStatus.OK)
  batchConfirm(@Request() req: any, @Body() body: BatchConfirmToolDto) {
    const userId = req.user?.id;
    return this.toolConfirmationsService.batchConfirm(userId, body.items ?? []);
  }

  @Post('batch/reject')
  @ApiOperation({
    summary: '批量拒绝工具执行',
    description: '支持模板化拒绝理由，按条执行并返回逐条结果。',
  })
  @ApiResponse({
    status: 200,
    description: '返回批量执行结果（总数、成功数、失败数、逐条结果）',
  })
  @HttpCode(HttpStatus.OK)
  batchReject(@Request() req: any, @Body() body: BatchRejectToolDto) {
    const userId = req.user?.id;
    return this.toolConfirmationsService.batchReject(userId, body.templateReason, body.items ?? []);
  }
}
