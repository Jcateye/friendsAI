import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConnectorsService } from './connectors.service';

interface FeishuOAuthTokenRequest {
  code: string;
}

interface FeishuOAuthRefreshRequest {
  refreshToken: string;
}

@ApiTags('connectors-feishu-oauth')
@Controller('connectors/feishu/oauth')
export class ConnectorsController {
  constructor(private readonly connectorsService: ConnectorsService) {}

  @Get('authorize')
  @ApiOperation({
    summary: '构建飞书 OAuth 授权链接',
    description: '用于前端跳转到飞书的 OAuth 授权页面，支持自定义 redirect_uri / state / scope 等参数。',
  })
  @ApiQuery({
    name: 'redirect_uri',
    required: false,
    description: '授权完成后回调到的前端地址',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    description: '前端自定义的 state，用于防重放或透传上下文',
  })
  @ApiQuery({
    name: 'scope',
    required: false,
    description: '申请的权限范围，留空则使用默认配置',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回可用于跳转的授权链接信息',
  })
  authorize(
    @Query('redirect_uri') redirectUri?: string,
    @Query('state') state?: string,
    @Query('scope') scope?: string,
  ) {
    return this.connectorsService.buildFeishuAuthorizeUrl({ redirectUri, state, scope });
  }

  @Get('callback')
  @ApiOperation({
    summary: '飞书 OAuth 授权回调',
    description:
      '飞书在用户完成授权后回调到该地址，当前仅回显 code/state，便于前端拿到授权结果后再发起后续调用。',
  })
  @ApiQuery({ name: 'code', required: false, description: '飞书返回的授权 code' })
  @ApiQuery({ name: 'state', required: false, description: '前端在 authorize 阶段传入的 state' })
  @ApiResponse({
    status: 200,
    description: '成功返回授权结果的简单封装（success/code/state）',
  })
  callback(@Query('code') code?: string, @Query('state') state?: string) {
    return {
      success: Boolean(code),
      code: code ?? null,
      state: state ?? null,
    };
  }

  @Post('token')
  @ApiOperation({
    summary: '使用授权 code 交换访问 token（暂未实现）',
    description: '当前接口仅用于调试，返回固定的未实现提示。',
  })
  @ApiResponse({
    status: 200,
    description: '返回占位响应，标明功能未实现',
  })
  exchangeToken(@Body() body: FeishuOAuthTokenRequest) {
    return {
      success: false,
      message: 'Feishu OAuth token exchange is not implemented yet.',
      code: body?.code ?? null,
    };
  }

  @Post('refresh')
  @ApiOperation({
    summary: '刷新访问 token（暂未实现）',
    description: '当前接口仅用于调试，返回固定的未实现提示。',
  })
  @ApiResponse({
    status: 200,
    description: '返回占位响应，标明功能未实现',
  })
  refreshToken(@Body() body: FeishuOAuthRefreshRequest) {
    return {
      success: false,
      message: 'Feishu OAuth token refresh is not implemented yet.',
      refreshToken: body?.refreshToken ?? null,
    };
  }
}
