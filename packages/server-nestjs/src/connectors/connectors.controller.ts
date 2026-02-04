import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ConnectorsService } from './connectors.service';

interface FeishuOAuthTokenRequest {
  code: string;
}

interface FeishuOAuthRefreshRequest {
  refreshToken: string;
}

@Controller('connectors/feishu/oauth')
export class ConnectorsController {
  constructor(private readonly connectorsService: ConnectorsService) {}

  @Get('authorize')
  authorize(
    @Query('redirect_uri') redirectUri?: string,
    @Query('state') state?: string,
    @Query('scope') scope?: string,
  ) {
    return this.connectorsService.buildFeishuAuthorizeUrl({ redirectUri, state, scope });
  }

  @Get('callback')
  callback(@Query('code') code?: string, @Query('state') state?: string) {
    return {
      success: Boolean(code),
      code: code ?? null,
      state: state ?? null,
    };
  }

  @Post('token')
  exchangeToken(@Body() body: FeishuOAuthTokenRequest) {
    return {
      success: false,
      message: 'Feishu OAuth token exchange is not implemented yet.',
      code: body?.code ?? null,
    };
  }

  @Post('refresh')
  refreshToken(@Body() body: FeishuOAuthRefreshRequest) {
    return {
      success: false,
      message: 'Feishu OAuth token refresh is not implemented yet.',
      refreshToken: body?.refreshToken ?? null,
    };
  }
}
