import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { FeishuApiService } from '../api/feishu-api.service';
import { FeishuWebhookLog } from '../entities/feishu-config.entity';
import { ButtonClickDto, ButtonClickErrorResponse, ButtonClickResponse } from './dto/button-click.dto';
import { MessageStatusDto, MessageStatusResponse } from './dto/message-status.dto';
import { FeishuMessageDelivery } from '../../v3-entities';

const WEBHOOK_STATUS = {
  RECEIVED: 0,
  PROCESSING: 1,
  COMPLETED: 2,
  FAILED: 3,
} as const;

@Injectable()
export class FeishuWebhookService {
  private readonly logger = new Logger(FeishuWebhookService.name);
  private readonly encryptKey: string;
  private readonly closedLoopEnabled = process.env.FEISHU_CLOSED_LOOP_ENABLED !== 'false';

  constructor(
    private readonly config: ConfigService,
    private readonly feishuApi: FeishuApiService,
    @InjectRepository(FeishuWebhookLog)
    private readonly webhookLogRepository: Repository<FeishuWebhookLog>,
    @InjectRepository(FeishuMessageDelivery, 'v3')
    private readonly deliveryRepository: Repository<FeishuMessageDelivery>,
  ) {
    this.encryptKey = this.config.get<string>('FEISHU_ENCRYPT_KEY') ?? '';
  }

  async handleButtonClick(dto: ButtonClickDto): Promise<ButtonClickResponse | ButtonClickErrorResponse> {
    const payload = this.normalizePayload(dto);
    const validationError = this.validatePayload(payload);
    if (validationError) {
      return validationError;
    }

    const logRecord = await this.createLog(payload);

    try {
      await this.webhookLogRepository.update(logRecord.id, {
        status: WEBHOOK_STATUS.PROCESSING,
      });

      if (!this.verifySignature(payload)) {
        await this.markFailed(logRecord.id, '签名验证失败');
        return {
          success: false,
          message: '签名验证失败',
          error: 'INVALID_SIGNATURE',
        };
      }

      if (!this.isTimestampValid(payload.timestamp)) {
        await this.markFailed(logRecord.id, '请求时间戳过期');
        return {
          success: false,
          message: '请求已过期',
          error: 'TIMESTAMP_EXPIRED',
        };
      }

      let recordData: Record<string, unknown> | null = null;
      try {
        recordData = await this.feishuApi.getRecord(payload.appToken, payload.tableId, payload.recordId);
      } catch (error) {
        this.logger.error('查询飞书记录失败，继续执行后续流程', error);
      }

      const result = await this.processBusinessLogic(
        recordData,
        payload.extraData,
        payload.userId,
        payload.buttonId ?? '',
      );

      if (result.success && recordData) {
        try {
          await this.feishuApi.updateRecord(payload.appToken, payload.tableId, payload.recordId, {
            status: 'processed',
          });
        } catch (error) {
          this.logger.error('更新飞书记录状态失败', error);
        }
      }

      if (result.notifyUser && result.cardMessage) {
        try {
          const tenantToken = await this.feishuApi.getTenantToken();
          await this.feishuApi.sendCardMessage(tenantToken, payload.userId, result.cardMessage);
        } catch (error) {
          this.logger.error('发送飞书通知失败', error);
        }
      }

      await this.markCompleted(logRecord.id);

      return {
        success: true,
        message: '处理成功',
        data: {
          recordId: payload.recordId,
          status: 'completed',
          result: result.data,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      await this.markFailed(logRecord.id, message);
      return {
        success: false,
        message: '处理失败',
        error: 'PROCESSING_FAILED',
      };
    }
  }

  async handleMessageStatus(dto: MessageStatusDto): Promise<MessageStatusResponse> {
    if (!this.closedLoopEnabled) {
      return {
        success: false,
        message: 'feishu_closed_loop_disabled',
      };
    }

    if (!dto.messageId || !dto.status) {
      return {
        success: false,
        message: 'messageId and status are required',
      };
    }

    const delivery = await this.deliveryRepository.findOne({
      where: {
        messageId: dto.messageId,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!delivery) {
      return {
        success: false,
        message: `delivery not found for messageId=${dto.messageId}`,
      };
    }

    delivery.status = dto.status;
    delivery.errorCode = dto.errorCode ?? null;
    delivery.errorMessage = dto.errorMessage ?? null;
    delivery.retryable = dto.status === 'failed';
    delivery.responsePayload = {
      ...(delivery.responsePayload ?? {}),
      callback: {
        timestamp: dto.timestamp ?? null,
        traceId: dto.traceId ?? null,
        extra: dto.extra ?? null,
      },
      status: dto.status,
      errorCode: dto.errorCode ?? null,
      errorMessage: dto.errorMessage ?? null,
    };

    const saved = await this.deliveryRepository.save(delivery);
    return {
      success: true,
      message: 'delivery status updated',
      deliveryId: saved.id,
    };
  }

  verifySignature(dto: ButtonClickDto): boolean {
    if (!this.encryptKey) {
      this.logger.warn('FEISHU_ENCRYPT_KEY 未配置，跳过签名校验');
      return true;
    }

    if (!dto.token) {
      return false;
    }

    const signPayload = [
      `appToken=${dto.appToken ?? ''}`,
      `buttonId=${dto.buttonId ?? ''}`,
      `recordId=${dto.recordId ?? ''}`,
      `tableId=${dto.tableId ?? ''}`,
      `timestamp=${dto.timestamp ?? ''}`,
      `userId=${dto.userId ?? ''}`,
    ].join('&');

    const expected = crypto.createHmac('sha256', this.encryptKey).update(signPayload, 'utf8').digest('base64');
    return this.safeCompare(dto.token, expected);
  }

  private safeCompare(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
  }

  private isTimestampValid(timestamp: string): boolean {
    const parsed = Number(timestamp);
    if (!Number.isFinite(parsed)) {
      return false;
    }

    const maxDrift = 5 * 60 * 1000;
    return Math.abs(Date.now() - parsed) <= maxDrift;
  }

  private validatePayload(dto: ButtonClickDto): ButtonClickErrorResponse | null {
    if (!dto.timestamp || !dto.token || !dto.appToken || !dto.tableId || !dto.recordId || !dto.userId) {
      return {
        success: false,
        message: '请求参数不完整',
        error: 'INVALID_PAYLOAD',
      };
    }

    return null;
  }

  private normalizePayload(dto: ButtonClickDto): ButtonClickDto {
    return {
      ...dto,
      appToken: dto.appToken ?? dto.app_token ?? '',
      tableId: dto.tableId ?? dto.table_id ?? '',
      recordId: dto.recordId ?? dto.record_id ?? '',
      buttonId: dto.buttonId ?? dto.button_id,
      userId: dto.userId ?? dto.user_id ?? '',
      viewId: dto.viewId ?? dto.view_id,
      extraData: dto.extraData ?? dto.extra_data,
    };
  }

  private async createLog(dto: ButtonClickDto): Promise<FeishuWebhookLog> {
    const entity = this.webhookLogRepository.create({
      appToken: dto.appToken,
      tableId: dto.tableId,
      recordId: dto.recordId,
      buttonId: dto.buttonId ?? null,
      userId: dto.userId,
      payload: dto.extraData ?? null,
      status: WEBHOOK_STATUS.RECEIVED,
      errorMessage: null,
      processedAt: null,
    });
    return this.webhookLogRepository.save(entity);
  }

  private async markCompleted(logId: string): Promise<void> {
    await this.webhookLogRepository.update(logId, {
      status: WEBHOOK_STATUS.COMPLETED,
      processedAt: new Date(),
      errorMessage: null,
    });
  }

  private async markFailed(logId: string, errorMessage: string): Promise<void> {
    await this.webhookLogRepository.update(logId, {
      status: WEBHOOK_STATUS.FAILED,
      processedAt: new Date(),
      errorMessage,
    });
  }

  private async processBusinessLogic(
    recordData: Record<string, unknown> | null,
    extraData: Record<string, unknown> | undefined,
    userId: string,
    buttonId: string,
  ): Promise<{
    success: boolean;
    notifyUser?: boolean;
    cardMessage?: {
      content?: string;
      title?: string;
    };
    data?: Record<string, unknown>;
  }> {
    void recordData;

    this.logger.debug(
      `处理飞书业务逻辑: userId=${userId}, buttonId=${buttonId}, extraData=${JSON.stringify(extraData ?? {})}`,
    );

    return {
      success: true,
      notifyUser: false,
      data: {
        userId,
        buttonId,
        processedAt: new Date().toISOString(),
      },
    };
  }
}
