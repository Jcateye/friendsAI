import { Injectable, BadRequestException, UnauthorizedException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConnectorToken } from '../entities/connector-token.entity';
import { User } from '../entities/user.entity';

/**
 * 飞书 OAuth Token 响应接口
 */
interface FeishuTokenResponse {
  code: number;
  msg: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

/**
 * 飞书用户信息响应接口
 */
interface FeishuUserInfoResponse {
  code: number;
  msg: string;
  data?: {
    name?: string;
    en_name?: string;
    avatar_url?: string;
    email?: string;
    mobile?: string;
    user_id?: string;
    union_id?: string;
    open_id?: string;
  };
}

/**
 * Token 存储接口
 */
export interface FeishuTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: Date;
  scope?: string;
  metadata?: Record<string, any>;
}

/**
 * 飞书 OAuth 回调结果
 */
export interface FeishuOAuthResult {
  success: boolean;
  userId?: string;
  tokens?: FeishuTokens;
  userInfo?: FeishuUserInfoResponse['data'];
  error?: string;
}

/**
 * 飞书 OAuth 服务
 *
 * 实现完整的飞书 OAuth 2.0 授权流程：
 * 1. 授权 - getAuthorizeUrl()
 * 2. 回调处理 - handleCallback()
 * 3. Token 交换 - exchangeToken()
 * 4. Token 刷新 - refreshAccessToken()
 * 5. Token 存储 - storeToken()
 * 6. 获取用户 Token - getUserToken()
 */
@Injectable()
export class FeishuOAuthService {
  private readonly logger = new Logger(FeishuOAuthService.name);
  private readonly baseUrl: string;
  private readonly connectorType = 'feishu';

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ConnectorToken)
    private readonly connectorTokenRepository: Repository<ConnectorToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    this.baseUrl = this.configService.get<string>('FEISHU_BASE_URL') ?? 'https://open.feishu.cn';
  }

  /**
   * 获取飞书配置
   */
  private get appId(): string {
    const appId = this.configService.get<string>('FEISHU_APP_ID');
    if (!appId) {
      throw new InternalServerErrorException('FEISHU_APP_ID is not configured');
    }
    return appId;
  }

  private get appSecret(): string {
    const appSecret = this.configService.get<string>('FEISHU_APP_SECRET');
    if (!appSecret) {
      throw new InternalServerErrorException('FEISHU_APP_SECRET is not configured');
    }
    return appSecret;
  }

  private get redirectUri(): string {
    const redirectUri = this.configService.get<string>('FEISHU_OAUTH_REDIRECT_URI');
    if (!redirectUri) {
      throw new InternalServerErrorException('FEISHU_OAUTH_REDIRECT_URI is not configured');
    }
    return redirectUri;
  }

  /**
   * 生成授权 URL
   * @param userId 用户 ID，用于 state 参数
   * @param redirectUri 自定义回调地址（可选）
   * @param state 自定义 state 参数（可选，默认使用 userId）
   * @param scope 授权范围（可选）
   */
  getAuthorizeUrl(
    userId: string,
    options: {
      redirectUri?: string;
      state?: string;
      scope?: string;
    } = {},
  ): string {
    const { redirectUri, state, scope } = options;

    const params = new URLSearchParams({
      app_id: this.appId,
      redirect_uri: redirectUri ?? this.redirectUri,
      state: state ?? userId,
    });

    if (scope) {
      params.set('scope', scope);
    }

    const baseUrl =
      this.configService.get<string>('FEISHU_OAUTH_AUTHORIZE_URL') ??
      'https://open.feishu.cn/open-apis/authen/v1/authorize';

    this.logger.log(`Generated authorize URL for user: ${userId}`);
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * 处理飞书 OAuth 回调
   * @param code 授权码
   * @param state 状态参数（包含用户 ID）
   * @returns OAuth 结果，包含 token 和用户信息
   */
  async handleCallback(code: string, state?: string): Promise<FeishuOAuthResult> {
    if (!code) {
      return {
        success: false,
        error: 'Authorization code is missing',
      };
    }

    try {
      // 1. 使用授权码交换 access token
      const tokens = await this.exchangeToken(code);

      // 2. 获取用户信息
      const userInfo = await this.getUserInfo(tokens.accessToken);

      // 3. 从 state 中获取用户 ID（state 格式：userId 或 userId:timestamp）
      let userId = state;
      if (state?.includes(':')) {
        userId = state.split(':')[0];
      }

      if (!userId) {
        // 如果没有 userId，根据飞书用户信息查找或创建用户
        userId = await this.findOrCreateUserByFeishuInfo(userInfo);
      }

      // 4. 存储 token
      await this.storeToken(userId, tokens, userInfo);

      this.logger.log(`Successfully completed OAuth flow for user: ${userId}`);

      return {
        success: true,
        userId,
        tokens,
        userInfo,
      };
    } catch (error) {
      this.logger.error(`OAuth callback failed: ${error}`, error.stack);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 使用授权码交换访问令牌
   * @param code 授权码
   * @returns Token 信息
   */
  async exchangeToken(code: string): Promise<FeishuTokens> {
    const url = `${this.baseUrl}/open-apis/authen/v1/oidc/access_token`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: this.appId,
        client_secret: this.appSecret,
        code,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new BadRequestException(
        `Feishu token exchange failed: ${response.status} ${errorText}`,
      );
    }

    const data = (await response.json()) as FeishuTokenResponse;

    if (data.code !== 0 || !data.access_token) {
      throw new UnauthorizedException(
        `Feishu token exchange error: ${data.msg || 'Unknown error'}`,
      );
    }

    const expiresIn = data.expires_in ?? 7200; // 默认 2 小时
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? '',
      tokenType: 'Bearer',
      expiresIn,
      expiresAt,
      scope: 'contact:user.base:readonly contact:user.email:readonly',
    };
  }

  /**
   * 刷新访问令牌
   * @param refreshToken 刷新令牌
   * @returns 新的 Token 信息
   */
  async refreshAccessToken(refreshToken: string): Promise<FeishuTokens> {
    const url = `${this.baseUrl}/open-apis/authen/v1/oidc/refresh_access_token`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new BadRequestException(
        `Feishu token refresh failed: ${response.status} ${errorText}`,
      );
    }

    const data = (await response.json()) as FeishuTokenResponse;

    if (data.code !== 0 || !data.access_token) {
      throw new UnauthorizedException(
        `Feishu token refresh error: ${data.msg || 'Unknown error'}`,
      );
    }

    const expiresIn = data.expires_in ?? 7200;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      tokenType: 'Bearer',
      expiresIn,
      expiresAt,
    };
  }

  /**
   * 获取用户信息
   * @param accessToken 访问令牌
   * @returns 飞书用户信息
   */
  async getUserInfo(
    accessToken: string,
  ): Promise<FeishuUserInfoResponse['data']> {
    const url = `${this.baseUrl}/open-apis/authen/v1/user_info`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new BadRequestException(
        `Feishu user info request failed: ${response.status} ${errorText}`,
      );
    }

    const data = (await response.json()) as FeishuUserInfoResponse;

    if (data.code !== 0) {
      throw new UnauthorizedException(
        `Feishu user info error: ${data.msg || 'Unknown error'}`,
      );
    }

    return data.data;
  }

  /**
   * 存储 Token 到数据库
   * @param userId 用户 ID
   * @param tokens Token 信息
   * @param userInfo 飞书用户信息（可选）
   */
  async storeToken(
    userId: string,
    tokens: FeishuTokens,
    userInfo?: FeishuUserInfoResponse['data'],
  ): Promise<void> {
    // 查找现有 token
    const existingToken = await this.connectorTokenRepository.findOne({
      where: {
        userId,
        connectorType: this.connectorType,
      },
    });

    const metadata: Record<string, any> = {
      ...tokens.metadata,
    };

    if (userInfo) {
      metadata.feishuUserId = userInfo.user_id;
      metadata.feishuUnionId = userInfo.union_id;
      metadata.feishuOpenId = userInfo.open_id;
      metadata.feishuName = userInfo.name;
      metadata.feishuEmail = userInfo.email;
    }

    if (existingToken) {
      // 更新现有 token
      await this.connectorTokenRepository.save({
        ...existingToken,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: tokens.tokenType,
        scope: tokens.scope,
        expiresAt: tokens.expiresAt,
        metadata,
      });
      this.logger.log(`Updated existing token for user: ${userId}`);
    } else {
      // 创建新 token
      await this.connectorTokenRepository.save({
        userId,
        connectorType: this.connectorType,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: tokens.tokenType,
        scope: tokens.scope,
        expiresAt: tokens.expiresAt,
        metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      this.logger.log(`Created new token for user: ${userId}`);
    }
  }

  /**
   * 获取用户的 Token
   * @param userId 用户 ID
   * @param autoRefresh 是否自动刷新过期的 token（默认 true）
   * @returns Token 信息，如果不存在返回 null
   */
  async getUserToken(
    userId: string,
    autoRefresh = true,
  ): Promise<FeishuTokens | null> {
    const tokenEntity = await this.connectorTokenRepository.findOne({
      where: {
        userId,
        connectorType: this.connectorType,
      },
    });

    if (!tokenEntity) {
      return null;
    }

    let tokens: FeishuTokens = {
      accessToken: tokenEntity.accessToken,
      refreshToken: tokenEntity.refreshToken ?? '',
      tokenType: tokenEntity.tokenType ?? 'Bearer',
      scope: tokenEntity.scope ?? undefined,
      expiresIn: tokenEntity.expiresAt
        ? Math.floor((tokenEntity.expiresAt.getTime() - Date.now()) / 1000)
        : 7200,
      expiresAt: tokenEntity.expiresAt ?? new Date(Date.now() + 7200 * 1000),
      metadata: tokenEntity.metadata ?? undefined,
    };

    // 自动刷新过期的 token
    if (autoRefresh && tokenEntity.refreshToken) {
      const isExpired =
        !tokenEntity.expiresAt || tokenEntity.expiresAt.getTime() < Date.now();

      // 提前 5 分钟刷新
      const willExpireSoon =
        tokenEntity.expiresAt &&
        tokenEntity.expiresAt.getTime() < Date.now() + 5 * 60 * 1000;

      if (isExpired || willExpireSoon) {
        try {
          this.logger.log(
            `Token expired or expiring soon for user: ${userId}, refreshing...`,
          );
          tokens = await this.refreshAccessToken(tokenEntity.refreshToken);
          await this.storeToken(userId, tokens);
          this.logger.log(`Successfully refreshed token for user: ${userId}`);
        } catch (error) {
          this.logger.error(
            `Failed to refresh token for user: ${userId}: ${error}`,
          );
          // 返回旧 token，让调用方处理错误
        }
      }
    }

    return tokens;
  }

  /**
   * 根据飞书用户信息查找或创建用户
   * @param userInfo 飞书用户信息
   * @returns 用户 ID
   */
  private async findOrCreateUserByFeishuInfo(
    userInfo?: FeishuUserInfoResponse['data'],
  ): Promise<string> {
    if (!userInfo?.email) {
      throw new BadRequestException('Cannot create user without email');
    }

    // 尝试通过 email 查找用户
    let user = await this.userRepository.findOne({
      where: { email: userInfo.email },
    });

    if (!user) {
      // 创建新用户
      user = this.userRepository.create({
        email: userInfo.email,
        name: userInfo.name ?? userInfo.en_name ?? userInfo.email.split('@')[0],
        password: '', // OAuth 用户没有密码
        phone: userInfo.mobile ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      user = await this.userRepository.save(user);
      this.logger.log(`Created new user from Feishu: ${user.id}`);
    }

    return user.id;
  }

  /**
   * 删除用户的 Token（登出）
   * @param userId 用户 ID
   */
  async deleteUserToken(userId: string): Promise<void> {
    const token = await this.connectorTokenRepository.findOne({
      where: {
        userId,
        connectorType: this.connectorType,
      },
    });

    if (token) {
      await this.connectorTokenRepository.remove(token);
      this.logger.log(`Deleted token for user: ${userId}`);
    }
  }

  /**
   * 验证 Token 是否有效
   * @param userId 用户 ID
   * @returns Token 是否有效
   */
  async isTokenValid(userId: string): Promise<boolean> {
    const tokenEntity = await this.connectorTokenRepository.findOne({
      where: {
        userId,
        connectorType: this.connectorType,
      },
    });

    if (!tokenEntity || !tokenEntity.expiresAt) {
      return false;
    }

    return tokenEntity.expiresAt.getTime() > Date.now();
  }
}
