import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ToolConfirmation, ToolConfirmationStatus } from '../entities';

interface CreateToolConfirmationInput {
  toolName: string;
  payload?: Record<string, any>;
  conversationId?: string;
  userId?: string;
}

@Injectable()
export class ToolConfirmationsService {
  constructor(
    @InjectRepository(ToolConfirmation)
    private readonly toolConfirmationRepository: Repository<ToolConfirmation>,
  ) {}

  async create(input: CreateToolConfirmationInput): Promise<ToolConfirmation> {
    const confirmation = this.toolConfirmationRepository.create({
      toolName: input.toolName,
      payload: input.payload ?? null,
      conversationId: input.conversationId ?? null,
      userId: input.userId ?? null,
      status: 'pending',
    });

    return this.toolConfirmationRepository.save(confirmation);
  }

  async findAll(status?: ToolConfirmationStatus, userId?: string): Promise<ToolConfirmation[]> {
    const where: Record<string, any> = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    return this.toolConfirmationRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ToolConfirmation> {
    const confirmation = await this.toolConfirmationRepository.findOne({ where: { id } });
    if (!confirmation) {
      throw new NotFoundException(`Tool confirmation ${id} not found`);
    }
    return confirmation;
  }

  async confirm(id: string, payloadOverrides?: Record<string, any>): Promise<ToolConfirmation> {
    const confirmation = await this.findOne(id);

    if (confirmation.status !== 'pending') {
      throw new BadRequestException(`Tool confirmation ${id} is already ${confirmation.status}`);
    }

    const mergedPayload = {
      ...(confirmation.payload ?? {}),
      ...(payloadOverrides ?? {}),
    };
    confirmation.payload = Object.keys(mergedPayload).length > 0 ? mergedPayload : null;

    const execution = await this.executeTool(confirmation.toolName, confirmation.payload ?? undefined);

    confirmation.confirmedAt = new Date();
    confirmation.executedAt = new Date();
    confirmation.status = execution.success ? 'confirmed' : 'failed';
    confirmation.result = execution.result ?? null;
    confirmation.error = execution.error ?? null;

    return this.toolConfirmationRepository.save(confirmation);
  }

  async reject(id: string, reason?: string): Promise<ToolConfirmation> {
    const confirmation = await this.findOne(id);

    if (confirmation.status !== 'pending') {
      throw new BadRequestException(`Tool confirmation ${id} is already ${confirmation.status}`);
    }

    confirmation.status = 'rejected';
    confirmation.rejectedAt = new Date();
    confirmation.error = reason ?? null;

    return this.toolConfirmationRepository.save(confirmation);
  }

  private async executeTool(
    toolName: string,
    payload?: Record<string, any>,
  ): Promise<{ success: boolean; result?: Record<string, any>; error?: string }> {
    const handlers: Record<string, (input?: Record<string, any>) => Promise<Record<string, any>>> = {
      'feishu.send_message': async input => ({
        provider: 'feishu',
        status: 'mocked',
        payload: input ?? null,
      }),
      send_feishu_message: async input => ({
        provider: 'feishu',
        status: 'mocked',
        payload: input ?? null,
      }),
    };

    const handler = handlers[toolName];
    if (!handler) {
      return {
        success: true,
        result: {
          executed: false,
          toolName,
          payload: payload ?? null,
          message: 'Tool handler not implemented yet.',
        },
      };
    }

    try {
      const result = await handler(payload);
      return { success: true, result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
      };
    }
  }
}
