import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface FeishuAuthorizeOptions {
  redirectUri?: string;
  state?: string;
  scope?: string;
}

export interface FeishuAuthorizeResult {
  configured: boolean;
  authorizeUrl: string | null;
  missing: string[];
}

@Injectable()
export class ConnectorsService {
  constructor(private readonly configService: ConfigService) {}

  buildFeishuAuthorizeUrl(options: FeishuAuthorizeOptions = {}): FeishuAuthorizeResult {
    const appId = this.configService.get<string>('FEISHU_APP_ID');
    const baseUrl =
      this.configService.get<string>('FEISHU_OAUTH_AUTHORIZE_URL') ??
      'https://open.feishu.cn/open-apis/authen/v1/authorize';
    const redirectUri =
      options.redirectUri ?? this.configService.get<string>('FEISHU_OAUTH_REDIRECT_URI');
    const scope = options.scope ?? this.configService.get<string>('FEISHU_OAUTH_SCOPE');

    const missing: string[] = [];
    if (!appId) {
      missing.push('FEISHU_APP_ID');
    }
    if (!redirectUri) {
      missing.push('FEISHU_OAUTH_REDIRECT_URI');
    }

    if (missing.length > 0) {
      return {
        configured: false,
        authorizeUrl: null,
        missing,
      };
    }

    const params = new URLSearchParams({
      app_id: appId ?? '',
      redirect_uri: redirectUri ?? '',
    });

    if (options.state) {
      params.set('state', options.state);
    }

    if (scope) {
      params.set('scope', scope);
    }

    return {
      configured: true,
      authorizeUrl: `${baseUrl}?${params.toString()}`,
      missing: [],
    };
  }
}
