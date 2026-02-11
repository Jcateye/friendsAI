import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { FeishuOAuthService, FeishuTokens } from './feishu-oauth.service';
import { ActionOutcomeLog } from '../v3-entities/action-outcome-log.entity';

/**
 * 飞书 API 响应接口
 */
interface FeishuApiResponse<T = unknown> {
  code: number;
  msg: string;
  data?: T;
}

/**
 * 飞书发送消息响应
 */
interface FeishuSendMessageResponse {
  code: number;
  msg: string;
  data?: {
    message_id: string;
    msg_type: string;
    create_time: string;
  };
}

/**
 * 飞书获取用户 ID 响应
 */
interface FeishuGetUserIdResponse {
  code: number;
  msg: string;
  data?: {
    user?: {
      user_id: string;
      open_id: string;
      union_id: string;
    };
    user_list?: Array<{
      user_id: string;
      open_id: string;
      union_id: string;
    }>;
  };
}

/**
 * 飞书用户信息响应
 */
interface FeishuUserInfo {
  open_id: string;
  union_id: string;
  user_id: string;
  name: string;
  en_name: string;
  email: string;
  mobile: string;
  avatar: string;
}

/**
 * 消息发送结果
 */
export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  code?: string;
}

/**
 * 消息请求接口
 */
export interface MessageRequest {
  recipientOpenId: string;
  msgType: 'text' | 'post' | 'interactive' | 'image' | 'file' | 'audio' | 'video' | 'stickers' | 'card';
  content: any;
}

/**
 * 富文本内容结构
 */
export interface RichTextContent {
  post: {
    zh_cn: {
      title: string;
      content: Array<Array<{
        tag: 'text' | 'a' | 'at' | 'img';
        text?: string;
        href?: string;
        userId?: string;
        userName?: string;
        src?: string;
        alt?: string;
      }>>;
    };
  };
}

/**
 * 重试配置
 */
interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * 飞书消息发送服务
 *
 * 实现功能：
 * 1. 发送文本消息
 * 2. 发送富文本消息
 * 3. 批量发送消息
 * 4. 获取用户 Open ID
 * 5. Token 自动刷新
 * 6. 指数退避重试
 * 7. 失败日志记录
 */
@Injectable()
export class FeishuMessageService {
  private readonly logger = new Logger(FeishuMessageService.name);
  private readonly baseUrl: string;
  private readonly retryConfig: RetryConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly feishuOAuthService: FeishuOAuthService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    this.baseUrl = this.configService.get<string>('FEISHU_BASE_URL') ?? 'https://open.feishu.cn';
    this.retryConfig = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
    };
  }

  /**
   * 发送文本消息
   * @param userId 用户 ID
   * @param recipientOpenId 接收者 Open ID
   * @param text 文本内容
   * @returns 发送结果
   */
  async sendTextMessage(userId: string, recipientOpenId: string, text: string): Promise<SendResult> {
    try {
      const tokens = await this.getValidTokens(userId);
      if (!tokens) {
        const error = 'User not authenticated with Feishu';
        await this.logFailure(userId, recipientOpenId, 'text', error);
        return {
          success: false,
          error,
          code: 'AUTH_REQUIRED',
        };
      }

      const content = JSON.stringify({ text });

      return this.sendMessageWithRetry(
        tokens,
        recipientOpenId,
        'text',
        content,
        userId,
      );
    } catch (error) {
      this.logger.error(`Failed to send text message: ${error}`, error instanceof Error ? error.stack : undefined);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * 发送富文本消息
   * @param userId 用户 ID
   * @param recipientOpenId 接收者 Open ID
   * @param content 富文本内容
   * @returns 发送结果
   */
  async sendRichTextMessage(userId: string, recipientOpenId: string, content: RichTextContent): Promise<SendResult> {
    try {
      const tokens = await this.getValidTokens(userId);
      if (!tokens) {
        const error = 'User not authenticated with Feishu';
        await this.logFailure(userId, recipientOpenId, 'post', error);
        return {
          success: false,
          error,
          code: 'AUTH_REQUIRED',
        };
      }

      const contentJson = JSON.stringify(content);

      return this.sendMessageWithRetry(
        tokens,
        recipientOpenId,
        'post',
        contentJson,
        userId,
      );
    } catch (error) {
      this.logger.error(`Failed to send rich text message: ${error}`, error instanceof Error ? error.stack : undefined);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * 发送交互式卡片消息
   * @param userId 用户 ID
   * @param recipientOpenId 接收者 Open ID
   * @param card 卡片内容
   * @returns 发送结果
   */
  async sendCardMessage(userId: string, recipientOpenId: string, card: Record<string, any>): Promise<SendResult> {
    try {
      const tokens = await this.getValidTokens(userId);
      if (!tokens) {
        const error = 'User not authenticated with Feishu';
        await this.logFailure(userId, recipientOpenId, 'interactive', error);
        return {
          success: false,
          error,
          code: 'AUTH_REQUIRED',
        };
      }

      const content = JSON.stringify(card);

      return this.sendMessageWithRetry(
        tokens,
        recipientOpenId,
        'interactive',
        content,
        userId,
      );
    } catch (error) {
      this.logger.error(`Failed to send card message: ${error}`, error instanceof Error ? error.stack : undefined);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * 批量发送消息
   * @param userId 用户 ID
   * @param messages 消息请求列表
   * @returns 发送结果列表
   */
  async batchSendMessages(userId: string, messages: MessageRequest[]): Promise<SendResult[]> {
    const results: SendResult[] = [];
    const tokens = await this.getValidTokens(userId);

    if (!tokens) {
      return messages.map((msg) => ({
        success: false,
        error: 'User not authenticated with Feishu',
        code: 'AUTH_REQUIRED',
      }));
    }

    for (const message of messages) {
      const content = JSON.stringify(message.content);
      const result = await this.sendMessageWithRetry(
        tokens,
        message.recipientOpenId,
        message.msgType,
        content,
        userId,
      );
      results.push(result);
    }

    return results;
  }

  /**
   * 通过手机号或邮箱获取用户 Open ID
   * @param userId 用户 ID
   * @param phoneOrEmail 手机号或邮箱
   * @returns 用户 Open ID，如果不存在返回 null
   */
  async getUserOpenId(userId: string, phoneOrEmail: string): Promise<string | null> {
    try {
      const tokens = await this.getValidTokens(userId);
      if (!tokens) {
        this.logger.warn(`User ${userId} not authenticated with Feishu`);
        return null;
      }

      // 判断是手机号还是邮箱
      const isEmail = phoneOrEmail.includes('@');
      const queryType = isEmail ? 'email' : 'mobile';

      // 先尝试通过 getPhoneNumberInfo 或 getEmailInfo 查询
      let userInfo: FeishuUserInfo | null = null;

      if (isEmail) {
        userInfo = await this.getUserInfoByEmail(tokens, phoneOrEmail);
      } else {
        userInfo = await this.getUserInfoByPhone(tokens, phoneOrEmail);
      }

      if (userInfo) {
        return userInfo.open_id;
      }

      // 如果上述方法失败，尝试通过搜索用户
      return await this.searchUserByContact(tokens, phoneOrEmail);
    } catch (error) {
      this.logger.error(`Failed to get user Open ID: ${error}`, error instanceof Error ? error.stack : undefined);
      return null;
    }
  }

  /**
   * 获取用户的有效 Token
   * @param userId 用户 ID
   * @returns Token 信息，如果不存在返回 null
   */
  private async getValidTokens(userId: string): Promise<FeishuTokens | null> {
    return this.feishuOAuthService.getUserToken(userId, true);
  }

  /**
   * 带重试的消息发送
   * @param tokens Token 信息
   * @param recipientOpenId 接收者 Open ID
   * @param msgType 消息类型
   * @param content 消息内容（JSON 字符串）
   * @param userId 用户 ID（用于日志记录）
   * @returns 发送结果
   */
  private async sendMessageWithRetry(
    tokens: FeishuTokens,
    recipientOpenId: string,
    msgType: string,
    content: string,
    userId: string,
  ): Promise<SendResult> {
    let lastError: Error | null = null;
    let delay = this.retryConfig.initialDelay;

    for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await this.sendMessage(tokens.accessToken, recipientOpenId, msgType, content);

        if (result.success) {
          await this.logSuccess(userId, recipientOpenId, msgType, result.messageId);
          return result;
        }

        // 如果是认证错误，尝试刷新 token 后重试
        if (result.code === 'AUTH_EXPIRED' || result.code === 'TOKEN_INVALID') {
          this.logger.warn(`Token expired for user ${userId}, attempting refresh...`);

          const newTokens = await this.feishuOAuthService.refreshAccessToken(tokens.refreshToken);
          await this.feishuOAuthService.storeToken(userId, newTokens);

          // 更新 tokens 后继续重试
          tokens = newTokens;
          lastError = new Error(result.error);
          continue;
        }

        // 其他错误不重试
        await this.logFailure(userId, recipientOpenId, msgType, result.error ?? 'Unknown error', result.code);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 最后一次尝试失败后不再等待
        if (attempt < this.retryConfig.maxRetries - 1) {
          this.logger.warn(
            `Send message attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
          );
          await this.sleep(delay);
          delay = Math.min(delay * this.retryConfig.backoffMultiplier, this.retryConfig.maxDelay);
        }
      }
    }

    // 所有重试都失败
    const errorMessage = lastError?.message ?? 'Max retries exceeded';
    await this.logFailure(userId, recipientOpenId, msgType, errorMessage);
    return {
      success: false,
      error: errorMessage,
      code: 'MAX_RETRIES_EXCEEDED',
    };
  }

  /**
   * 发送消息到飞书
   * @param accessToken 访问令牌
   * @param recipientOpenId 接收者 Open ID
   * @param msgType 消息类型
   * @param content 消息内容（JSON 字符串）
   * @returns 发送结果
   */
  private async sendMessage(
    accessToken: string,
    recipientOpenId: string,
    msgType: string,
    content: string,
  ): Promise<SendResult> {
    const url = `${this.baseUrl}/open-apis/im/v1/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        receive_id_type: 'open_id',
        msg_type: msgType,
        receive_id: recipientOpenId,
        content,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
        code: response.status === 401 ? 'AUTH_EXPIRED' : 'HTTP_ERROR',
      };
    }

    const data = (await response.json()) as FeishuSendMessageResponse;

    if (data.code !== 0) {
      return {
        success: false,
        error: data.msg,
        code: this.mapFeishuErrorCode(data.code),
      };
    }

    return {
      success: true,
      messageId: data.data?.message_id,
    };
  }

  /**
   * 通过邮箱获取用户信息
   * @param tokens Token 信息
   * @param email 邮箱地址
   * @returns 用户信息
   */
  private async getUserInfoByEmail(tokens: FeishuTokens, email: string): Promise<FeishuUserInfo | null> {
    try {
      const url = `${this.baseUrl}/open-apis/contact/v3/users/get_user_id_by_email`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.accessToken}`,
        },
        body: JSON.stringify({ emails: [email] }),
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as FeishuGetUserIdResponse;

      if (data.code !== 0 || !data.data?.user_list?.[0]) {
        return null;
      }

      // 获取完整的用户信息
      const openId = data.data.user_list[0].open_id;
      return await this.getUserInfoByOpenId(tokens, openId);
    } catch (error) {
      this.logger.error(`Failed to get user info by email: ${error}`);
      return null;
    }
  }

  /**
   * 通过手机号获取用户信息
   * @param tokens Token 信息
   * @param phone 手机号
   * @returns 用户信息
   */
  private async getUserInfoByPhone(tokens: FeishuTokens, phone: string): Promise<FeishuUserInfo | null> {
    try {
      const url = `${this.baseUrl}/open-apis/contact/v3/users/get_user_id_by_phone`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.accessToken}`,
        },
        body: JSON.stringify({ mobiles: [phone] }),
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as FeishuGetUserIdResponse;

      if (data.code !== 0 || !data.data?.user_list?.[0]) {
        return null;
      }

      // 获取完整的用户信息
      const openId = data.data.user_list[0].open_id;
      return await this.getUserInfoByOpenId(tokens, openId);
    } catch (error) {
      this.logger.error(`Failed to get user info by phone: ${error}`);
      return null;
    }
  }

  /**
   * 通过 Open ID 获取用户信息
   * @param tokens Token 信息
   * @param openId 用户 Open ID
   * @returns 用户信息
   */
  private async getUserInfoByOpenId(tokens: FeishuTokens, openId: string): Promise<FeishuUserInfo | null> {
    try {
      // 添加 query 参数
      const urlWithParams = new URL(`${this.baseUrl}/open-apis/contact/v3/users/${openId}`);
      urlWithParams.searchParams.set('user_id_type', 'open_id');

      const response = await fetch(urlWithParams.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as FeishuApiResponse<{ user: FeishuUserInfo }>;

      if (data.code !== 0 || !data.data?.user) {
        return null;
      }

      return data.data.user;
    } catch (error) {
      this.logger.error(`Failed to get user info by open_id: ${error}`);
      return null;
    }
  }

  /**
   * 通过联系方式搜索用户
   * @param tokens Token 信息
   * @param phoneOrEmail 手机号或邮箱
   * @returns 用户 Open ID
   */
  private async searchUserByContact(tokens: FeishuTokens, phoneOrEmail: string): Promise<string | null> {
    try {
      const isEmail = phoneOrEmail.includes('@');
      const queryType = isEmail ? 'email' : 'mobile';

      // 使用搜索 API
      const url = `${this.baseUrl}/open-apis/contact/v3/users/search`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.accessToken}`,
        },
        body: JSON.stringify({
          query: phoneOrEmail,
          query_type: queryType,
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as FeishuApiResponse<{
        user_list: Array<{ open_id: string }>;
      }>;

      if (data.code !== 0 || !data.data?.user_list?.[0]) {
        return null;
      }

      return data.data.user_list[0].open_id;
    } catch (error) {
      this.logger.error(`Failed to search user by contact: ${error}`);
      return null;
    }
  }

  /**
   * 映射飞书错误码
   * @param code 飞书错误码
   * @returns 标准错误码
   */
  private mapFeishuErrorCode(code: number): string {
    const errorMap: Record<number, string> = {
      99991663: 'AUTH_EXPIRED',
      99991404: 'USER_NOT_FOUND',
      99991400: 'INVALID_PARAM',
      99991401: 'RATE_LIMIT',
    };

    return errorMap[code] ?? `FEISHU_ERROR_${code}`;
  }

  /**
   * 记录发送成功
   */
  private async logSuccess(
    userId: string,
    recipientOpenId: string,
    msgType: string,
    messageId?: string,
  ): Promise<void> {
    try {
      const repository = this.dataSource.getRepository(ActionOutcomeLog);
      const entity = repository.create({
        userId,
        contactId: null,
        agentName: 'feishu-message-service',
        actionType: 'message_sent',
        actionMetadata: {
          recipientOpenId,
          msgType,
          messageId,
        },
        outcomeType: 'success',
        outcomeReason: 'message_sent',
        actionTimestamp: new Date(),
        responseTimeSeconds: null,
        platform: 'feishu',
        messageId: messageId ?? null,
        conversationId: null,
        suggestionId: null,
        followupRequired: false,
        followupDeadline: null,
        conversionScore: null,
        metadata: {
          eventCategory: 'feishu_message',
        },
      });
      await repository.save(entity);
    } catch (error) {
      this.logger.error(`Failed to log success: ${error}`);
    }
  }

  /**
   * 记录发送失败
   */
  private async logFailure(
    userId: string,
    recipientOpenId: string,
    msgType: string,
    error: string,
    code?: string,
  ): Promise<void> {
    try {
      const repository = this.dataSource.getRepository(ActionOutcomeLog);
      const entity = repository.create({
        userId,
        contactId: null,
        agentName: 'feishu-message-service',
        actionType: 'message_sent',
        actionMetadata: {
          recipientOpenId,
          msgType,
          errorCode: code,
        },
        outcomeType: 'failure',
        outcomeReason: error,
        actionTimestamp: new Date(),
        responseTimeSeconds: null,
        platform: 'feishu',
        messageId: null,
        conversationId: null,
        suggestionId: null,
        followupRequired: false,
        followupDeadline: null,
        conversionScore: null,
        metadata: {
          eventCategory: 'feishu_message',
        },
      });
      await repository.save(entity);
    } catch (logError) {
      this.logger.error(`Failed to log failure: ${logError}`);
    }
  }

  /**
   * 睡眠指定毫秒数
   * @param ms 毫秒数
   * @returns Promise
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
