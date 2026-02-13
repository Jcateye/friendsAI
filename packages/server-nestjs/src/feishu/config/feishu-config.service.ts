import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeishuConfig } from '../entities/feishu-config.entity';
import { SaveConfigDto, FeishuConfigResponse } from './feishu-config.dto';

/**
 * 飞书配置管理服务
 *
 * 提供配置保存和查询接口
 */
@Injectable()
export class FeishuConfigService {
  private readonly logger = new Logger(FeishuConfigService.name);

  constructor(
    @InjectRepository(FeishuConfig)
    private readonly configRepository: Repository<FeishuConfig>,
  ) {}

  /**
   * 获取用户配置
   *
   * 从 feishu_configs 表查询用户配置
   */
  async getConfig(userId: string): Promise<FeishuConfigResponse> {
    const config = await this.configRepository.findOne({
      where: { userId },
    });

    if (!config) {
      return {
        success: true,
        message: '未找到配置，请先创建配置',
        data: {
          appToken: null,
          tableId: null,
          webhookUrl: null,
          enabled: true,
        },
      };
    }

    return {
      success: true,
      message: '获取配置成功',
      data: {
        appToken: config.appToken,
        tableId: config.tableId,
        webhookUrl: config.webhookUrl,
        enabled: config.enabled,
      },
    };
  }

  /**
   * 保存用户配置
   *
   * 将用户配置保存到数据库
   */
  async saveConfig(
    userId: string,
    dto: SaveConfigDto,
  ): Promise<FeishuConfigResponse> {
    // 检查是否已存在配置
    const existing = await this.configRepository.findOne({
      where: { userId },
    });

    const configData: Pick<SaveConfigDto, 'appToken' | 'tableId' | 'webhookUrl'> & { enabled: boolean } = {
      appToken: dto.appToken,
      tableId: dto.tableId,
      webhookUrl: dto.webhookUrl,
      enabled: dto.enabled !== undefined ? dto.enabled : true,
    };

    if (existing) {
      // 更新现有配置
      await this.configRepository.save({ ...existing, ...configData });
      this.logger.log(`更新用户配置: userId=${userId}`);
    } else {
      // 创建新配置
      await this.configRepository.save({
        ...configData,
        userId,
      });
      this.logger.log(`创建用户配置: userId=${userId}`);
    }

    return {
      success: true,
      message: '配置保存成功',
      data: configData,
    };
  }
}
