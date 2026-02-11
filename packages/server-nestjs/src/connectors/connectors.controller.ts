import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ConnectorsService } from './connectors.service';
import { FeishuOAuthService, FeishuOAuthResult } from './feishu-oauth.service';
import type { FeishuTokens } from './feishu-oauth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User as RequestUser } from '../entities/user.entity';

interface FeishuOAuthTokenRequest {
  code: string;
  state?: string;
}

interface FeishuOAuthRefreshRequest {
  refreshToken: string;
}

@ApiTags('connectors-feishu-oauth')
@Controller('connectors/feishu/oauth')
export class ConnectorsController {
  constructor(
    private readonly connectorsService: ConnectorsService,
    private readonly feishuOAuthService: FeishuOAuthService,
  ) {}

  @Get('authorize')
  @ApiOperation({
    summary: '构建飞书 OAuth 授权链接',
    description:
      '用于前端跳转到飞书的 OAuth 授权页面，支持自定义 redirect_uri / state / scope 等参数。',
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
    return this.connectorsService.buildFeishuAuthorizeUrl({
      redirectUri,
      state,
      scope,
    });
  }

  /**
   * 获取当前用户的飞书授权 URL
   * 需要认证，自动在 state 中包含用户 ID
   */
  @Get('authorize/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '获取当前用户的飞书 OAuth 授权链接',
    description: '需要认证，自动在 state 中包含当前用户 ID，授权完成后可直接关联到当前用户。',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回可用于跳转的授权链接信息',
  })
  authorizeForMe(@Req() req: { user: RequestUser }) {
    const userId = req.user.id;
    const authorizeUrl = this.feishuOAuthService.getAuthorizeUrl(userId);
    return {
      success: true,
      authorizeUrl,
    };
  }

  @Get('callback')
  @ApiOperation({
    summary: '飞书 OAuth 授权回调',
    description:
      '飞书在用户完成授权后回调到该地址，自动完成 token 交换和用户关联。支持两种模式：\n' +
      '1. 有 state：使用 state 中的用户 ID 存储 token\n' +
      '2. 无 state：根据飞书返回的用户信息查找或创建用户',
  })
  @ApiQuery({ name: 'code', required: false, description: '飞书返回的授权 code' })
  @ApiQuery({ name: 'state', required: false, description: '前端在 authorize 阶段传入的 state' })
  @ApiQuery({
    name: 'error',
    required: false,
    description: '用户拒绝授权时的错误码',
  })
  @ApiQuery({
    name: 'error_description',
    required: false,
    description: '用户拒绝授权时的错误描述',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回授权结果，包含 token 信息和用户信息',
  })
  async callback(
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
    @Query('error_description') errorDescription?: string,
  ): Promise<FeishuOAuthResult> {
    // 处理用户拒绝授权的情况
    if (error) {
      return {
        success: false,
        error: errorDescription || error,
      };
    }

    if (!code) {
      return {
        success: false,
        error: 'Authorization code is missing',
      };
    }

    return this.feishuOAuthService.handleCallback(code, state);
  }

  @Post('token')
  @ApiOperation({
    summary: '使用授权 code 交换访问 token',
    description:
      '使用飞书返回的授权 code 交换访问 token 和刷新 token。建议使用 callback 端点自动完成此流程。',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回 token 信息',
  })
  @ApiResponse({
    status: 400,
    description: '授权码无效或已过期',
  })
  async exchangeToken(@Body() body: FeishuOAuthTokenRequest): Promise<{
    success: boolean;
    tokens?: FeishuTokens;
    error?: string;
  }> {
    if (!body.code) {
      return {
        success: false,
        error: 'Authorization code is required',
      };
    }

    try {
      const tokens = await this.feishuOAuthService.exchangeToken(body.code);
      return {
        success: true,
        tokens,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Post('refresh')
  @ApiOperation({
    summary: '刷新访问 token',
    description:
      '使用 refresh_token 获取新的 access_token。建议使用 getUserToken 自动刷新功能。',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回新的 token 信息',
  })
  @ApiResponse({
    status: 400,
    description: '刷新 token 无效',
  })
  async refreshToken(@Body() body: FeishuOAuthRefreshRequest): Promise<{
    success: boolean;
    tokens?: FeishuTokens;
    error?: string;
  }> {
    if (!body.refreshToken) {
      return {
        success: false,
        error: 'Refresh token is required',
      };
    }

    try {
      const tokens = await this.feishuOAuthService.refreshAccessToken(
        body.refreshToken,
      );
      return {
        success: true,
        tokens,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取当前用户的飞书 token
   * 自动处理过期刷新
   */
  @Get('token/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '获取当前用户的飞书 token',
    description: '获取当前用户存储的飞书 token，如果 token 即将过期会自动刷新。',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回 token 信息',
  })
  @ApiResponse({
    status: 401,
    description: '未认证',
  })
  async getMyToken(@Req() req: { user: RequestUser }): Promise<{
    success: boolean;
    tokens?: FeishuTokens;
    valid?: boolean;
  }> {
    const userId = req.user.id;
    const tokens = await this.feishuOAuthService.getUserToken(userId);

    if (!tokens) {
      return {
        success: false,
        valid: false,
      };
    }

    return {
      success: true,
      tokens,
      valid: await this.feishuOAuthService.isTokenValid(userId),
    };
  }

  /**
   * 验证当前用户的飞书 token 是否有效
   */
  @Get('token/me/valid')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '验证当前用户的飞书 token 是否有效',
    description: '检查当前用户的飞书 access_token 是否过期。',
  })
  @ApiResponse({
    status: 200,
    description: '返回 token 有效性状态',
  })
  async isMyTokenValid(@Req() req: { user: RequestUser }): Promise<{
    success: boolean;
    valid: boolean;
  }> {
    const userId = req.user.id;
    const valid = await this.feishuOAuthService.isTokenValid(userId);
    return {
      success: true,
      valid,
    };
  }

  /**
   * 删除当前用户的飞书 token（解除授权）
   */
  @Post('token/me/delete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '删除当前用户的飞书 token',
    description: '删除当前用户存储的飞书 token，解除飞书授权。',
  })
  @ApiResponse({
    status: 200,
    description: '成功删除 token',
  })
  async deleteMyToken(@Req() req: { user: RequestUser }): Promise<{
    success: boolean;
  }> {
    const userId = req.user.id;
    await this.feishuOAuthService.deleteUserToken(userId);
    return {
      success: true,
    };
  }
}
