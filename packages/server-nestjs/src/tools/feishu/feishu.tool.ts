import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ToolDefinition } from '../tool.interface';
import { ToolRegistry } from '../tool-registry.service';
import { FeishuClient } from './feishu.client';

export type FeishuToolAction = 'get_tenant_access_token' | 'list_contacts';

export interface FeishuToolInput {
  action: FeishuToolAction;
  params?: {
    department_id?: string;
    page_size?: number;
    page_token?: string;
  };
}

@Injectable()
export class FeishuTool implements ToolDefinition<FeishuToolInput, unknown>, OnModuleInit {
  name = 'feishu';
  description = 'Access Feishu APIs for contacts and tenant tokens.';

  constructor(
    private readonly registry: ToolRegistry,
    private readonly feishuClient: FeishuClient,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(input: FeishuToolInput): Promise<unknown> {
    switch (input.action) {
      case 'get_tenant_access_token':
        return { tenant_access_token: await this.feishuClient.getTenantAccessToken() };
      case 'list_contacts':
        return this.feishuClient.listContacts(input.params);
      default:
        throw new BadRequestException(`Unsupported Feishu action: ${input.action}`);
    }
  }
}
