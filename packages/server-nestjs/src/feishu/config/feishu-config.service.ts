import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeishuConfig } from '../entities/feishu-config.entity';
import { FeishuConfigResponse, SaveFeishuConfigDto } from './feishu-config.dto';

@Injectable()
export class FeishuConfigService {
  constructor(
    @InjectRepository(FeishuConfig)
    private readonly configRepository: Repository<FeishuConfig>,
  ) {}

  async getConfig(userId: string): Promise<FeishuConfigResponse> {
    const config = await this.configRepository.findOne({ where: { userId } });

    if (!config) {
      return {
        success: true,
        message: '未找到飞书配置，返回默认值',
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

  async saveConfig(userId: string, dto: SaveFeishuConfigDto): Promise<FeishuConfigResponse> {
    const existing = await this.configRepository.findOne({ where: { userId } });
    const config =
      existing ??
      this.configRepository.create({
        userId,
        appToken: null,
        tableId: null,
        webhookUrl: null,
        enabled: true,
      });

    if (dto.appToken !== undefined) {
      config.appToken = dto.appToken;
    }
    if (dto.tableId !== undefined) {
      config.tableId = dto.tableId;
    }
    if (dto.webhookUrl !== undefined) {
      config.webhookUrl = dto.webhookUrl;
    }
    if (dto.enabled !== undefined) {
      config.enabled = dto.enabled;
    }

    const saved = await this.configRepository.save(config);

    return {
      success: true,
      message: '配置保存成功',
      data: {
        appToken: saved.appToken,
        tableId: saved.tableId,
        webhookUrl: saved.webhookUrl,
        enabled: saved.enabled,
      },
    };
  }
}
