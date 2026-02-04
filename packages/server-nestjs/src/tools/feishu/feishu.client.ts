import { BadGatewayException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface FeishuTokenResponse {
  code: number;
  msg: string;
  tenant_access_token?: string;
  expire?: number;
}

@Injectable()
export class FeishuClient {
  private readonly baseUrl: string;
  private tenantAccessToken?: string;
  private tokenExpiresAt?: number;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('FEISHU_BASE_URL') ?? 'https://open.feishu.cn';
  }

  private get appId(): string {
    const appId = this.configService.get<string>('FEISHU_APP_ID');
    if (!appId) {
      throw new InternalServerErrorException('FEISHU_APP_ID is not configured.');
    }
    return appId;
  }

  private get appSecret(): string {
    const appSecret = this.configService.get<string>('FEISHU_APP_SECRET');
    if (!appSecret) {
      throw new InternalServerErrorException('FEISHU_APP_SECRET is not configured.');
    }
    return appSecret;
  }

  private isTokenValid(): boolean {
    if (!this.tenantAccessToken || !this.tokenExpiresAt) {
      return false;
    }
    return Date.now() < this.tokenExpiresAt;
  }

  async getTenantAccessToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.isTokenValid()) {
      return this.tenantAccessToken as string;
    }

    const response = await fetch(`${this.baseUrl}/open-apis/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: this.appId,
        app_secret: this.appSecret,
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new BadGatewayException(`Feishu token request failed: ${response.status} ${message}`);
    }

    const data = (await response.json()) as FeishuTokenResponse;
    if (data.code !== 0 || !data.tenant_access_token || !data.expire) {
      throw new BadGatewayException(`Feishu token response error: ${data.msg || 'unknown error'}`);
    }

    this.tenantAccessToken = data.tenant_access_token;
    this.tokenExpiresAt = Date.now() + (data.expire - 60) * 1000;
    return data.tenant_access_token;
  }

  async request<T>(
    path: string,
    init: RequestInit = {},
    options: { useTenantToken?: boolean } = {},
  ): Promise<T> {
    const { useTenantToken = true } = options;
    const headers = new Headers(init.headers);
    if (useTenantToken) {
      const token = await this.getTenantAccessToken();
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`, {
      ...init,
      headers,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new BadGatewayException(`Feishu API request failed: ${response.status} ${message}`);
    }

    return (await response.json()) as T;
  }

  async listContacts(params?: { department_id?: string; page_size?: number; page_token?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.department_id) {
      searchParams.set('department_id', params.department_id);
    }
    if (params?.page_size) {
      searchParams.set('page_size', params.page_size.toString());
    }
    if (params?.page_token) {
      searchParams.set('page_token', params.page_token);
    }
    const query = searchParams.toString();
    const path = `/open-apis/contact/v3/users${query ? `?${query}` : ''}`;
    return this.request(path);
  }
}
