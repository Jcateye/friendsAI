import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ConnectorsService } from './connectors.service';
import { FeishuOAuthService } from './feishu-oauth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User as RequestUser } from '../entities/user.entity';
import { Public } from '../auth/public.decorator';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

class FeishuTokensDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  tokenType: string;

  @ApiProperty()
  expiresIn: number;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt: Date;

  @ApiPropertyOptional()
  scope?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, unknown>;
}

class FeishuOAuthTokenRequestDto {
  @ApiProperty()
  code: string;

  @ApiPropertyOptional()
  state?: string;
}

class FeishuOAuthRefreshRequestDto {
  @ApiProperty()
  refreshToken: string;
}

class FeishuAuthorizeResultDto {
  @ApiProperty()
  configured: boolean;

  @ApiPropertyOptional({ nullable: true })
  authorizeUrl: string | null;

  @ApiProperty({ type: [String] })
  missing: string[];
}

class FeishuAuthorizeMeResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  authorizeUrl: string;
}

class FeishuOAuthResultDto {
  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional()
  userId?: string;

  @ApiPropertyOptional({ type: FeishuTokensDto })
  tokens?: FeishuTokensDto;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  userInfo?: Record<string, unknown>;

  @ApiPropertyOptional()
  error?: string;
}

class FeishuTokenActionResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional({ type: FeishuTokensDto })
  tokens?: FeishuTokensDto;

  @ApiPropertyOptional()
  error?: string;
}

class FeishuMyTokenResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional({ type: FeishuTokensDto })
  tokens?: FeishuTokensDto;

  @ApiPropertyOptional()
  valid?: boolean;
}

class FeishuTokenValidityResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  valid: boolean;
}

class FeishuTokenDeleteResponseDto {
  @ApiProperty()
  success: boolean;
}

@ApiTags('connectors-feishu-oauth')
@Controller('connectors/feishu/oauth')
export class ConnectorsController {
  constructor(
    private readonly connectorsService: ConnectorsService,
    private readonly feishuOAuthService: FeishuOAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('authorize')
  @Public()
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
    type: FeishuAuthorizeResultDto,
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
    type: FeishuAuthorizeMeResponseDto,
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
  @Public()
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
    status: 302,
    description: '重定向回前端设置页并附带授权结果参数',
  })
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const frontendBaseUrl = this.configService.get<string>('WEB_APP_URL') ?? 'http://localhost:5173';
    const base = frontendBaseUrl.replace(/\/$/, '');
    const redirectUrl = new URL('/settings', base);

    if (error) {
      redirectUrl.searchParams.set('feishu_oauth', 'error');
      redirectUrl.searchParams.set('reason', error === 'access_denied' ? 'oauth_denied' : 'oauth_failed');
      return res.redirect(302, redirectUrl.toString());
    }

    if (!code) {
      redirectUrl.searchParams.set('feishu_oauth', 'error');
      redirectUrl.searchParams.set('reason', 'missing_code');
      return res.redirect(302, redirectUrl.toString());
    }

    const result = await this.feishuOAuthService.handleCallback(code, state);
    if (result.success) {
      redirectUrl.searchParams.set('feishu_oauth', 'success');
      return res.redirect(302, redirectUrl.toString());
    }

    redirectUrl.searchParams.set('feishu_oauth', 'error');
    redirectUrl.searchParams.set('reason', 'oauth_failed');
    return res.redirect(302, redirectUrl.toString());
  }

  @Post('token')
  @ApiOperation({
    summary: '使用授权 code 交换访问 token',
    description:
      '使用飞书返回的授权 code 交换访问 token 和刷新 token。建议使用 callback 端点自动完成此流程。',
  })
  @ApiResponse({
    status: 400,
    description: '授权码无效或已过期',
  })
  @ApiBody({ type: FeishuOAuthTokenRequestDto })
  @ApiResponse({
    status: 200,
    description: '成功返回 token 信息',
    type: FeishuTokenActionResponseDto,
  })
  async exchangeToken(@Body() body: FeishuOAuthTokenRequestDto): Promise<FeishuTokenActionResponseDto> {
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
    status: 400,
    description: '刷新 token 无效',
  })
  @ApiBody({ type: FeishuOAuthRefreshRequestDto })
  @ApiResponse({
    status: 200,
    description: '成功返回新的 token 信息',
    type: FeishuTokenActionResponseDto,
  })
  async refreshToken(@Body() body: FeishuOAuthRefreshRequestDto): Promise<FeishuTokenActionResponseDto> {
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
    status: 401,
    description: '未认证',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回 token 信息',
    type: FeishuMyTokenResponseDto,
  })
  async getMyToken(@Req() req: { user: RequestUser }): Promise<FeishuMyTokenResponseDto> {
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
    type: FeishuTokenValidityResponseDto,
  })
  async isMyTokenValid(@Req() req: { user: RequestUser }): Promise<FeishuTokenValidityResponseDto> {
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
    type: FeishuTokenDeleteResponseDto,
  })
  async deleteMyToken(@Req() req: { user: RequestUser }): Promise<FeishuTokenDeleteResponseDto> {
    const userId = req.user.id;
    await this.feishuOAuthService.deleteUserToken(userId);
    return {
      success: true,
    };
  }
}
