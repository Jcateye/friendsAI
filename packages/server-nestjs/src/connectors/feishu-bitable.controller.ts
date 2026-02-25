import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User as RequestUser } from '../entities/user.entity';
import {
  BitableRecordResponseDto,
  BitableSearchRequestDto,
  BitableSearchResponseDto,
  BitableUpdateRecordRequestDto,
} from './dto/feishu-bitable.dto';
import { FeishuBitableService } from './feishu-bitable.service';

@ApiTags('connectors-feishu-bitable')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
@Controller('connectors/feishu/bitable')
export class FeishuBitableController {
  constructor(private readonly feishuBitableService: FeishuBitableService) {}

  @Post('apps/:appToken/tables/:tableId/records/search')
  @ApiOperation({ summary: '搜索飞书多维表记录' })
  @ApiParam({ name: 'appToken', description: '飞书 Bitable app token' })
  @ApiParam({ name: 'tableId', description: '飞书 Bitable table id' })
  @ApiBody({ type: BitableSearchRequestDto, required: false })
  @ApiResponse({ status: 200, description: '搜索成功', type: BitableSearchResponseDto })
  @ApiBadRequestResponse({ description: '参数校验失败' })
  @ApiUnauthorizedResponse({ description: '未认证' })
  @ApiResponse({ status: 502, description: '上游 Feishu 服务异常' })
  searchRecords(
    @Req() req: { user: RequestUser },
    @Param('appToken') appToken: string,
    @Param('tableId') tableId: string,
    @Body() body: BitableSearchRequestDto,
  ): Promise<BitableSearchResponseDto> {
    return this.feishuBitableService.searchRecords(req.user.id, appToken, tableId, body ?? {});
  }

  @Get('apps/:appToken/tables/:tableId/records/:recordId')
  @ApiOperation({ summary: '获取飞书多维表单条记录' })
  @ApiParam({ name: 'appToken', description: '飞书 Bitable app token' })
  @ApiParam({ name: 'tableId', description: '飞书 Bitable table id' })
  @ApiParam({ name: 'recordId', description: '飞书 Bitable record id' })
  @ApiResponse({ status: 200, description: '获取成功', type: BitableRecordResponseDto })
  @ApiBadRequestResponse({ description: '参数校验失败' })
  @ApiUnauthorizedResponse({ description: '未认证' })
  @ApiResponse({ status: 502, description: '上游 Feishu 服务异常' })
  getRecord(
    @Req() req: { user: RequestUser },
    @Param('appToken') appToken: string,
    @Param('tableId') tableId: string,
    @Param('recordId') recordId: string,
  ): Promise<BitableRecordResponseDto> {
    return this.feishuBitableService.getRecord(req.user.id, appToken, tableId, recordId);
  }

  @Patch('apps/:appToken/tables/:tableId/records/:recordId')
  @ApiOperation({ summary: '更新飞书多维表单条记录' })
  @ApiParam({ name: 'appToken', description: '飞书 Bitable app token' })
  @ApiParam({ name: 'tableId', description: '飞书 Bitable table id' })
  @ApiParam({ name: 'recordId', description: '飞书 Bitable record id' })
  @ApiBody({ type: BitableUpdateRecordRequestDto })
  @ApiResponse({ status: 200, description: '更新成功', type: BitableRecordResponseDto })
  @ApiBadRequestResponse({ description: '参数校验失败' })
  @ApiUnauthorizedResponse({ description: '未认证' })
  @ApiResponse({ status: 502, description: '上游 Feishu 服务异常' })
  updateRecord(
    @Req() req: { user: RequestUser },
    @Param('appToken') appToken: string,
    @Param('tableId') tableId: string,
    @Param('recordId') recordId: string,
    @Body() body: BitableUpdateRecordRequestDto,
  ): Promise<BitableRecordResponseDto> {
    return this.feishuBitableService.updateRecord(req.user.id, appToken, tableId, recordId, body);
  }
}
