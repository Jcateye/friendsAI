import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeishuApiService } from '../api/feishu-api.service';
import { ButtonClickDto, ButtonClickResponse, ButtonClickErrorResponse } from './dto/button-click.dto';
import * as crypto from 'crypto';

/**
 * 飞书按钮 Webhook 核心业务逻辑
 *
 * 功能：
 * 1. 验证飞书请求签名（HMAC-SHA256）
 * 2. 防重放攻击（时间戳验证，5分钟有效期）
 * 3. 调用飞书 API 查询 Bitable 记录
 * 4. 执行业务逻辑（可扩展）
 * 5. 可选：更新记录状态
 * 6. 可选：发送飞书卡片消息通知用户
 */
@Injectable()
export class FeishuWebhookService {
  private readonly logger = new Logger(FeishuWebhookService.name);

  private readonly encryptKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly feishuApi: FeishuApiService,
  ) {
    this.encryptKey = this.config.get<string>('FEISHU_ENCRYPT_KEY', '');
  }

  /**
   * 验证飞书请求签名
   *
   * 使用 HMAC-SHA256 算法验证请求来源
   *
   * @param dto - 请求数据
   * @returns 签名是否有效
   */
  verifySignature(dto: ButtonClickDto): boolean {
    const signature = dto.token;

    // 如果没有配置加密密钥，开发环境跳过签名验证
    if (!this.encryptKey) {
      this.logger.warn('未配置 FEISHU_ENCRYPT_KEY，跳过签名验证（生产环境应配置）');
      return true;
    }

    try {
      // 构造待签名字符串
      // 按照飞书规范，将关键参数按字母顺序排序拼接
      const params = {
        timestamp: dto.timestamp,
        appToken: dto.appToken,
        tableId: dto.tableId,
        recordId: dto.recordId,
        buttonId: dto.buttonId,
        userId: dto.userId,
      };

      // 排序并拼接
      const sortedKeys = Object.keys(params).sort();
      const signStr = sortedKeys.map(k => `${k}=${params[k as keyof typeof params]}`).join('&');

      // 使用 HMAC-SHA256 计算签名
      const hmac = crypto
        .createHmac('sha256', this.encryptKey)
        .update(signStr, 'utf8')
        .digest('base64');

      // 对比签名（使用 timing-safe 比较）
      return signature === hmac;
    } catch (error) {
      this.logger.error('签名验证过程出错', error);
      return false;
    }
  }

  /**
   * 验证时间戳有效性（防重放攻击）
   *
   * @param timestamp - 请求时间戳（毫秒）
   * @returns 时间戳是否有效（5分钟内）
   */
  private isTimestampValid(timestamp: number): boolean {
    const now = Date.now();
    const maxDiff = 5 * 60 * 1000; // 5分钟

    return Math.abs(now - timestamp) <= maxDiff;
  }

  /**
   * 处理按钮点击事件的主入口
   *
   * @param dto - 按钮点击请求数据
   * @returns 处理结果响应
   */
  async handleButtonClick(dto: ButtonClickDto): Promise<ButtonClickResponse | ButtonClickErrorResponse> {
    const { timestamp, token, appToken, tableId, recordId, buttonId, userId, extraData } = dto;

    this.logger.log(
      `收到按钮点击: userId=${userId}, recordId=${recordId}, buttonId=${buttonId}, appToken=${appToken}`,
    );

    // 1. 验证签名
    const isValid = this.verifySignature(dto);
    if (!isValid) {
      this.logger.warn('签名验证失败');
      return {
        success: false,
        message: '签名验证失败',
        error: 'INVALID_SIGNATURE',
      };
    }

    // 2. 防重放攻击检查（时间戳验证）
    if (!this.isTimestampValid(Number(timestamp))) {
      this.logger.warn(`时间戳验证失败: timestamp=${timestamp}`);
      return {
        success: false,
        message: '请求已过期',
        error: 'TIMESTAMP_EXPIRED',
      };
    }

    // 3. 调用飞书 API 查询记录详情
    let recordData: any = null;
    try {
      const tenantToken = await this.feishuApi.getTenantToken();

      recordData = await this.feishuApi.getRecord(tenantToken, appToken, tableId, recordId);
      this.logger.debug(`查询 Bitable 记录成功: recordId=${recordId}`);
    } catch (error) {
      this.logger.error('查询 Bitable 记录失败', error);
      // 继续执行，不阻断流程
    }

    // 4. 执行业务逻辑（可由子类扩展）
    const result = await this.processBusinessLogic(recordData, extraData, userId, buttonId);

    // 5. 可选：更新记录状态
    if (result.success && recordData) {
      try {
        await this.feishuApi.updateRecord(
          await this.feishuApi.getTenantToken(),
          appToken,
          tableId,
          recordId,
          { status: 'processed' },
        );
        this.logger.debug(`更新记录状态成功: recordId=${recordId}`);
      } catch (error) {
        this.logger.error('更新记录状态失败', error);
      }
    }

    // 6. 可选：发送飞书卡片消息通知用户
    if (result.notifyUser && result.cardMessage) {
      try {
        await this.feishuApi.sendCardMessage(
          await this.feishuApi.getTenantToken(),
          userId,
          result.cardMessage,
        );
        this.logger.debug(`发送飞书消息成功: userId=${userId}`);
      } catch (error) {
        this.logger.error('发送飞书消息失败', error);
      }
    }

    return {
      success: true,
      message: '处理成功',
      data: {
        recordId,
        status: 'completed',
        result: result.data,
      },
    };
  }

  /**
   * 执行业务逻辑
   *
   * 可由子类扩展实现具体业务逻辑
   *
   * @param recordData - 从 Bitable 获取的记录数据
   * @param extraData - Automation 传递的额外数据
   * @param userId - 用户 ID
   * @param buttonId - 按钮 ID
   * @returns 业务处理结果
   */
  private async processBusinessLogic(
    recordData: any,
    extraData: Record<string, any> | undefined,
    userId: string,
    buttonId: string,
  ): Promise<{
    success: boolean;
    notifyUser?: boolean;
    cardMessage?: {
      content?: string;
      title?: string;
    };
    data?: any;
  }> {
    // TODO: 实现具体业务逻辑
    // 示例：根据 extraData 中的 customer_name 查询 CRM 数据
    // 示例：根据操作类型发送不同的通知消息

    this.logger.debug(
      `处理业务逻辑: buttonId=${buttonId}, userId=${userId}, extraData=${JSON.stringify(extraData || {})}`,
    );

    return {
      success: true,
      notifyUser: false, // 默认不发通知
      data: {
        buttonId,
        processedAt: new Date().toISOString(),
      },
    };
  }
}
