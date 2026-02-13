import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

/**
 * 飞书 OpenAPI 客户端
 *
 * 封装对飞书开放平台 API 的调用
 * 使用 tenant_access_token（应用级 token）进行 API 认证
 *
 * API 文档: https://open.feishu.cn/document/server-docs/
 */
@Injectable()
export class FeishuApiService {
  private readonly logger = new Logger(FeishuApiService.name);
  private readonly http: HttpService;
  private readonly config: ConfigService;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    // 设置飞书 API 基础 URL
    // 飞书 API 国内版: https://open.feishu.cn/open-apis
    const apiBaseUrl = this.config.get<string>('FEISHU_API_BASE_URL', 'https://open.feishu.cn/open-apis');
    this.http.axiosRef.defaults.baseURL = apiBaseUrl;
    this.http.axiosRef.defaults.timeout = 30000;
  }

  /**
   * 获取租户访问令牌
   *
   * 使用应用凭据（app_id + app_secret）获取 tenant_access_token
   * 此 token 用于调用飞书 API（读写 Bitable、发消息等）
   *
   * @returns tenant_access_token
   */
  async getTenantToken(): Promise<string> {
    const appId = this.config.get<string>('FEISHU_APP_ID');
    const appSecret = this.config.get<string>('FEISHU_APP_SECRET');

    if (!appId || !appSecret) {
      throw new Error('未配置飞书应用凭据（FEISHU_APP_ID, FEISHU_APP_SECRET）');
    }

    try {
      // 调用飞书获取 tenant_access_token API
      // POST /auth/v3/tenant_access_token/internal
      const response = await this.http.axios.post(
        '/auth/v3/tenant_access_token/internal',
        {
          app_id: appId,
          app_secret: appSecret,
        },
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        },
      );

      if (response.data.code !== 0) {
        this.logger.error(`获取 tenant_access_token 失败: ${JSON.stringify(response.data)}`);
        throw new Error(`获取飞书 token失败: ${response.data.msg}`);
      }

      const token = response.data.tenant_access_token;

      this.logger.log('成功获取飞书 tenant_access_token');

      return token;
    } catch (error) {
      this.logger.error('获取飞书 tenant_access_token 异常', error);
      throw new Error(`获取飞书访问令牌失败: ${error.message}`);
    }
  }

  /**
   * 查询 Bitable 记录
   *
   * 调用飞书 API: app_table/v1/app_table_record/search
   * 搜索指定表格中的记录
   *
   * @param tenantToken - 租户访问令牌
   * @param appToken - Bitable 应用 token
   * @param tableId - 数据表 ID
   * @param options - 查询选项（分页、筛选等）
   */
  async searchRecords(
    tenantToken: string,
    appToken: string,
    tableId: string,
    options?: {
      page_size?: number;
      page_token?: string;
      filter?: Record<string, any>;
    },
  ): Promise<{
    records: any[];
    hasMore: boolean;
    pageToken?: string;
  }> {
    try {
      const response = await this.http.axios.post(
        `/bitable/v1/${appToken}/apps/${tableId}/tables/${tableId}/records/search`,
        {
          headers: {
            'Authorization': `Bearer ${tenantToken}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          data: {
            page_size: options?.page_size || 100,
            page_token: options?.page_token,
            filter: options?.filter || {},
            // 可选：指定返回字段
            // field_names: ['id', 'fields["name"]'],
          },
        },
      );

      if (response.data.code !== 0) {
        this.logger.error(`查询 Bitable 记录失败: ${JSON.stringify(response.data)}`);
        throw new Error(`查询 Bitable 失败: ${response.data.msg}`);
      }

      const data = response.data.data;

      return {
        records: data.items || [],
        hasMore: data.has_more || false,
        pageToken: data.page_token,
      };
    } catch (error) {
      this.logger.error('查询 Bitable 记录异常', error);
      throw new Error(`查询记录失败: ${error.message}`);
    }
  }

  /**
   * 获取单条记录详情
   *
   * 调用飞书 API: bitable/v1/apps/{app_token}/tables/{table_id}/records/{record_id}
   * 获取指定记录的完整信息
   *
   * @param tenantToken - 租户访问令牌
   * @param appToken - Bitable 应用 token
   * @param tableId - 数据表 ID
   * @param recordId - 记录 ID
   */
  async getRecord(
    tenantToken: string,
    appToken: string,
    tableId: string,
    recordId: string,
  ): Promise<any> {
    try {
      const response = await this.http.axios.post(
        `/bitable/v1/${appToken}/apps/${tableId}/tables/${tableId}/records/${recordId}`,
        {
          headers: {
            'Authorization': `Bearer ${tenantToken}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
        },
      );

      if (response.data.code !== 0) {
        this.logger.error(`获取 Bitable 记录详情失败: ${JSON.stringify(response.data)}`);
        throw new Error(`获取记录详情失败: ${response.data.msg}`);
      }

      return response.data.data.record;
    } catch (error) {
      this.logger.error('获取 Bitable 记录详情异常', error);
      throw new Error(`获取记录详情失败: ${error.message}`);
    }
  }

  /**
   * 更新 Bitable 记录状态
   *
   * 调用飞书 API: bitable/v1/apps/{app_token}/tables/{table_id}/records/{record_id}
   * 更新指定记录的字段值
   *
   * 注意：飞书 Bitable 使用 table_id 和 record_id 的路径结构
   * API 文档: https://open.feishu.cn/document/server-docs/bitable-v1/app-table-record/update
   *
   * @param tenantToken - 租户访问令牌
   * @param appToken - Bitable 应用 token
   * @param tableId - 数据表 ID
   * @param recordId - 记录 ID
   * @param fields - 要更新的字段键值对
   */
  async updateRecord(
    tenantToken: string,
    appToken: string,
    tableId: string,
    recordId: string,
    fields: Record<string, any>,
  ): Promise<any> {
    try {
      // 飞书更新记录需要使用 PATCH 方法，并传递 table_id 和 record_id
      // 请求体放在 data 字段中
      const response = await this.http.axios.patch(
        `/bitable/v1/${appToken}/apps/${tableId}/tables/${tableId}/records/${recordId}`,
        {
          headers: {
            'Authorization': `Bearer ${tenantToken}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          data: { fields },
        },
      );

      if (response.data.code !== 0) {
        this.logger.error(`更新 Bitable 记录失败: ${JSON.stringify(response.data)}`);
        throw new Error(`更新记录状态失败: ${response.data.msg}`);
      }

      this.logger.debug(`更新记录成功: recordId=${recordId}`);
      return response.data;
    } catch (error) {
      this.logger.error('更新 Bitable 记录异常', error);
      throw new Error(`更新记录状态失败: ${error.message}`);
    }
  }

  /**
   * 发送飞书卡片消息通知用户
   *
   * 调用飞书 API: message/v4/send_messages/batch_send_messages
   * 发送 interactive_card 类型消息给用户
   *
   * @param userAccessToken - 用户访问令牌
   * @param userId - 用户 ID（open_id）
   * @param card - 卡片内容（JSON 格式）
   */
  async sendCardMessage(
    userAccessToken: string,
    userId: string,
    card: {
      content?: string;
      title?: string;
    },
  ): Promise<any> {
    try {
      const response = await this.http.axios.post(
        '/message/v4/send_messages/batch_send_messages',
        {
          headers: {
            'Authorization': `Bearer ${userAccessToken}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          data: {
            batch_send_messages: [
              {
                msg_type: 'interactive',
                receive_id: userId,
                msg: {
                  type: 'interactive',
                  card: {
                    header: {
                      title: card.title || 'friendsAI 通知',
                      template: 'turbo',
                    },
                    elements: [
                      {
                        tag: 'div',
                        text: card.content || '操作已完成',
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      );

      if (response.data.code !== 0) {
        this.logger.error(`发送飞书消息失败: ${JSON.stringify(response.data)}`);
        throw new Error(`发送消息失败: ${response.data.msg}`);
      }

      this.logger.debug(`发送飞书消息成功: userId=${userId}`);
      return response.data;
    } catch (error) {
      this.logger.error('发送飞书消息异常', error);
      throw new Error(`发送消息失败: ${error.message}`);
    }
  }

  /**
   * 获取用户信息
   *
   * 调用飞书 API: contact/v3/users:get_user_info
   * 根据用户 ID 获取用户基础信息
   *
   * @param userAccessToken - 用户访问令牌
   * @param userId - 用户 ID（open_id）
   */
  async getUserInfo(
    userAccessToken: string,
    userId: string,
  ): Promise<{
    name: string;
    avatar_url?: string;
  }> {
    try {
      const response = await this.http.axios.post(
        '/contact/v3/users/get_user_info',
        {
          headers: {
            'Authorization': `Bearer ${userAccessToken}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          data: {
            user_id: userId,
            // 只返回需要的字段
            return_fields: ['name', 'avatar_url'],
          },
        },
      );

      if (response.data.code !== 0) {
        this.logger.error(`获取用户信息失败: ${JSON.stringify(response.data)}`);
        throw new Error(`获取用户信息失败: ${response.data.msg}`);
      }

      return response.data.data.user;
    } catch (error) {
      this.logger.error('获取用户信息异常', error);
      throw new Error(`获取用户信息失败: ${error.message}`);
    }
  }
}
