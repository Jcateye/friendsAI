import { BadGatewayException, Injectable } from '@nestjs/common';
import { FeishuClient } from '../../tools/feishu/feishu.client';

type JsonObject = Record<string, unknown>;

interface FeishuApiEnvelope<T> {
  code: number;
  msg: string;
  data?: T;
}

interface BitableSearchData {
  items?: JsonObject[];
  has_more?: boolean;
  page_token?: string;
}

interface BitableRecordData {
  record?: JsonObject;
}

interface FeishuMessageData {
  message_id?: string;
}

@Injectable()
export class FeishuApiService {
  constructor(private readonly feishuClient: FeishuClient) {}

  async getTenantToken(): Promise<string> {
    return this.feishuClient.getTenantAccessToken();
  }

  async searchRecords(
    appToken: string,
    tableId: string,
    options?: {
      pageSize?: number;
      pageToken?: string;
      filter?: JsonObject;
    },
  ): Promise<{
    records: JsonObject[];
    hasMore: boolean;
    pageToken?: string;
  }> {
    const payload = await this.feishuClient.request<FeishuApiEnvelope<BitableSearchData>>(
      `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          page_size: options?.pageSize ?? 100,
          page_token: options?.pageToken,
          filter: options?.filter,
        }),
      },
    );

    const data = this.unwrap(payload, 'search_records');
    return {
      records: data?.items ?? [],
      hasMore: Boolean(data?.has_more),
      pageToken: data?.page_token,
    };
  }

  async getRecord(appToken: string, tableId: string, recordId: string): Promise<JsonObject> {
    const payload = await this.feishuClient.request<FeishuApiEnvelope<BitableRecordData>>(
      `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/${encodeURIComponent(recordId)}`,
    );

    const data = this.unwrap(payload, 'get_record');
    if (!data?.record) {
      throw new BadGatewayException('Feishu API get_record returned empty record.');
    }
    return data.record;
  }

  async updateRecord(
    appToken: string,
    tableId: string,
    recordId: string,
    fields: JsonObject,
  ): Promise<JsonObject> {
    const payload = await this.feishuClient.request<FeishuApiEnvelope<BitableRecordData>>(
      `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/${encodeURIComponent(recordId)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({ fields }),
      },
    );

    const data = this.unwrap(payload, 'update_record');
    return data?.record ?? {};
  }

  async sendCardMessage(
    accessToken: string,
    userId: string,
    card: {
      content?: string;
      title?: string;
    },
  ): Promise<{ messageId?: string }> {
    const defaultCard = {
      config: { wide_screen_mode: true },
      header: {
        title: {
          tag: 'plain_text',
          content: card.title ?? 'friendsAI 通知',
        },
      },
      elements: [
        {
          tag: 'markdown',
          content: card.content ?? '操作已完成',
        },
      ],
    };

    const payload = await this.feishuClient.request<FeishuApiEnvelope<FeishuMessageData>>(
      '/open-apis/im/v1/messages?receive_id_type=open_id',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          receive_id: userId,
          msg_type: 'interactive',
          content: JSON.stringify(defaultCard),
        }),
      },
      { useTenantToken: false },
    );

    const data = this.unwrap(payload, 'send_card_message');
    return { messageId: data?.message_id };
  }

  async getUserInfo(
    accessToken: string,
    userId: string,
  ): Promise<{
    name?: string;
    avatar_url?: string;
  }> {
    const payload = await this.feishuClient.request<
      FeishuApiEnvelope<{
        user?: { name?: string; avatar_url?: string };
      }>
    >(
      `/open-apis/contact/v3/users/${encodeURIComponent(userId)}?user_id_type=open_id`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      { useTenantToken: false },
    );

    const data = this.unwrap(payload, 'get_user_info');
    return data?.user ?? {};
  }

  private unwrap<T>(payload: FeishuApiEnvelope<T>, action: string): T | undefined {
    if (!payload || typeof payload.code !== 'number') {
      throw new BadGatewayException(`Feishu API ${action} returned invalid payload.`);
    }
    if (payload.code !== 0) {
      throw new BadGatewayException(
        `Feishu API ${action} failed: code=${payload.code}, msg=${payload.msg ?? 'unknown error'}`,
      );
    }
    return payload.data;
  }
}
