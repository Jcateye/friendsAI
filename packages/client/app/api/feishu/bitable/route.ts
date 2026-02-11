import { NextResponse } from 'next/server';
import {
  parseBitableSyncRequestBody,
  syncMessageToBitable,
  ValidationError,
} from './logic';

const FEISHU_SYNC_ENABLED = process.env.FEISHU_SYNC_ENABLED === 'true';
const FEISHU_BASE_URL = process.env.FEISHU_BASE_URL ?? 'https://open.feishu.cn';
const FEISHU_APP_ID = process.env.FEISHU_APP_ID ?? '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET ?? '';
const FEISHU_BITABLE_APP_TOKEN = process.env.FEISHU_BITABLE_APP_TOKEN ?? '';
const FEISHU_BITABLE_TABLE_ID = process.env.FEISHU_BITABLE_TABLE_ID ?? '';
const FEISHU_INTERNAL_API_TOKEN = process.env.FEISHU_INTERNAL_API_TOKEN ?? '';

export async function POST(request: Request) {
  try {
    if (!FEISHU_INTERNAL_API_TOKEN) {
      return NextResponse.json(
        {
          success: false,
          error: '飞书内部调用令牌未配置',
        },
        { status: 500 }
      );
    }

    const internalToken = request.headers.get('x-internal-token');
    if (internalToken !== FEISHU_INTERNAL_API_TOKEN) {
      return NextResponse.json(
        {
          success: false,
          error: 'unauthorized',
        },
        { status: 401 }
      );
    }

    if (!FEISHU_SYNC_ENABLED) {
      return NextResponse.json({
        success: true,
        data: {
          skipped: true,
          reason: 'feishu_sync_disabled',
        },
      });
    }

    if (!FEISHU_APP_ID || !FEISHU_APP_SECRET || !FEISHU_BITABLE_APP_TOKEN || !FEISHU_BITABLE_TABLE_ID) {
      return NextResponse.json(
        {
          success: false,
          error: '飞书多维表配置不完整',
        },
        { status: 500 }
      );
    }

    const rawBody = await request.json();
    const payload = parseBitableSyncRequestBody(rawBody);

    const result = await syncMessageToBitable({
      payload,
      config: {
        baseUrl: FEISHU_BASE_URL,
        appId: FEISHU_APP_ID,
        appSecret: FEISHU_APP_SECRET,
        appToken: FEISHU_BITABLE_APP_TOKEN,
        tableId: FEISHU_BITABLE_TABLE_ID,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        recordId: result.recordId,
        tableId: FEISHU_BITABLE_TABLE_ID,
        triggered: true,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Feishu bitable write failed',
      },
      { status: 502 }
    );
  }
}
