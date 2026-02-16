import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FeishuMessageDelivery,
  FeishuMessageTemplate,
  type FeishuDeliveryStatus,
  type FeishuTemplateStatus,
} from '../v3-entities';
import { FeishuMessageService } from './feishu-message.service';

export interface CreateFeishuTemplateInput {
  title: string;
  content: string;
  variables?: string[];
  status?: FeishuTemplateStatus;
}

export interface UpdateFeishuTemplateInput {
  title?: string;
  content?: string;
  variables?: string[];
  status?: FeishuTemplateStatus;
}

export interface SendByTemplateInput {
  templateId: string;
  recipientOpenId: string;
  variables?: Record<string, string>;
  conversationId?: string;
  archiveId?: string;
  toolConfirmationId?: string;
}

@Injectable()
export class FeishuTemplateService {
  private readonly enabled = process.env.FEISHU_CLOSED_LOOP_ENABLED !== 'false';

  constructor(
    @InjectRepository(FeishuMessageTemplate, 'v3')
    private readonly templateRepo: Repository<FeishuMessageTemplate>,
    @InjectRepository(FeishuMessageDelivery, 'v3')
    private readonly deliveryRepo: Repository<FeishuMessageDelivery>,
    private readonly feishuMessageService: FeishuMessageService,
  ) {}

  async listTemplates(userId: string): Promise<FeishuMessageTemplate[]> {
    this.ensureEnabled();
    return this.templateRepo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  async createTemplate(userId: string, input: CreateFeishuTemplateInput): Promise<FeishuMessageTemplate> {
    this.ensureEnabled();
    if (!input.title?.trim() || !input.content?.trim()) {
      throw new BadRequestException('title and content are required');
    }

    const template = this.templateRepo.create({
      userId,
      title: input.title.trim(),
      content: input.content,
      variables: input.variables ?? null,
      status: input.status ?? 'active',
    });

    return this.templateRepo.save(template);
  }

  async updateTemplate(
    userId: string,
    templateId: string,
    input: UpdateFeishuTemplateInput,
  ): Promise<FeishuMessageTemplate> {
    this.ensureEnabled();
    const template = await this.findTemplate(userId, templateId);

    if (input.title !== undefined) {
      template.title = input.title.trim();
    }
    if (input.content !== undefined) {
      template.content = input.content;
    }
    if (input.variables !== undefined) {
      template.variables = input.variables;
    }
    if (input.status !== undefined) {
      template.status = input.status;
    }

    return this.templateRepo.save(template);
  }

  async deleteTemplate(userId: string, templateId: string): Promise<void> {
    this.ensureEnabled();
    const template = await this.findTemplate(userId, templateId);
    await this.templateRepo.remove(template);
  }

  async sendByTemplate(userId: string, input: SendByTemplateInput): Promise<{
    success: boolean;
    deliveryId: string;
    messageId?: string;
    status: FeishuDeliveryStatus;
    retryable: boolean;
    errorCode?: string;
    error?: string;
  }> {
    this.ensureEnabled();
    const template = await this.findTemplate(userId, input.templateId);

    if (template.status !== 'active') {
      throw new BadRequestException('template_not_active');
    }

    const rendered = this.renderTemplate(
      template.content,
      template.variables ?? [],
      input.variables ?? {},
    );

    const delivery = this.deliveryRepo.create({
      userId,
      templateId: template.id,
      recipientOpenId: input.recipientOpenId,
      status: 'pending',
      retryable: false,
      conversationId: input.conversationId ?? null,
      archiveId: input.archiveId ?? null,
      toolConfirmationId: input.toolConfirmationId ?? null,
      requestPayload: {
        templateId: template.id,
        variables: input.variables ?? {},
        rendered,
      },
      responsePayload: null,
      messageId: null,
      errorCode: null,
      errorMessage: null,
    });

    const savedDelivery = await this.deliveryRepo.save(delivery);

    const sendResult = await this.feishuMessageService.sendTextMessage(
      userId,
      input.recipientOpenId,
      rendered,
    );

    const status: FeishuDeliveryStatus = sendResult.success ? 'sent' : 'failed';
    const retryable = this.isRetryableError(sendResult.code);

    savedDelivery.status = status;
    savedDelivery.retryable = retryable;
    savedDelivery.messageId = sendResult.messageId ?? null;
    savedDelivery.errorCode = sendResult.code ?? null;
    savedDelivery.errorMessage = sendResult.error ?? null;
    savedDelivery.responsePayload = {
      code: sendResult.code ?? null,
      error: sendResult.error ?? null,
      messageId: sendResult.messageId ?? null,
    };

    const updatedDelivery = await this.deliveryRepo.save(savedDelivery);

    return {
      success: sendResult.success,
      deliveryId: updatedDelivery.id,
      messageId: sendResult.messageId,
      status: updatedDelivery.status,
      retryable,
      errorCode: sendResult.code,
      error: sendResult.error,
    };
  }

  async updateDeliveryStatusByMessageId(input: {
    messageId: string;
    status: FeishuDeliveryStatus;
    errorCode?: string;
    errorMessage?: string;
    responsePayload?: Record<string, unknown>;
  }): Promise<FeishuMessageDelivery | null> {
    this.ensureEnabled();
    const delivery = await this.deliveryRepo.findOne({
      where: {
        messageId: input.messageId,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!delivery) {
      return null;
    }

    delivery.status = input.status;
    delivery.errorCode = input.errorCode ?? null;
    delivery.errorMessage = input.errorMessage ?? null;
    delivery.retryable = !['delivered', 'read', 'sent'].includes(input.status) && this.isRetryableError(input.errorCode);
    delivery.responsePayload = {
      ...(delivery.responsePayload ?? {}),
      ...(input.responsePayload ?? {}),
    };

    return this.deliveryRepo.save(delivery);
  }

  private async findTemplate(userId: string, templateId: string): Promise<FeishuMessageTemplate> {
    const template = await this.templateRepo.findOne({
      where: {
        id: templateId,
        userId,
      },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    return template;
  }

  private renderTemplate(content: string, requiredVariables: string[], values: Record<string, string>): string {
    for (const variable of requiredVariables) {
      if (!Object.prototype.hasOwnProperty.call(values, variable)) {
        throw new BadRequestException({
          code: 'template_variable_missing',
          message: `Missing variable: ${variable}`,
        });
      }
    }

    return content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
      return values[key] ?? '';
    });
  }

  private isRetryableError(code?: string): boolean {
    if (!code) {
      return false;
    }
    return ['AUTH_EXPIRED', 'RATE_LIMIT', 'HTTP_ERROR', 'MAX_RETRIES_EXCEEDED'].includes(code);
  }

  private ensureEnabled(): void {
    if (!this.enabled) {
      throw new BadRequestException('feishu_closed_loop_disabled');
    }
  }
}
