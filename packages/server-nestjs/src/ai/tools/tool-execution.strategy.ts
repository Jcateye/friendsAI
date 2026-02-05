import { Injectable, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ToolCall,
  ToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult,
  ToolPermission,
} from './tool.types';
import { ToolConfirmationsService } from '../../tool-confirmations/tool-confirmations.service';

interface PendingConfirmation {
  id: string;
  toolName: string;
  callId?: string;
  args: unknown;
  context: ToolExecutionContext;
  createdAt: Date;
}

@Injectable()
export class ToolExecutionStrategy {
  private tools = new Map<string, ToolDefinition>();
  private pendingConfirmations = new Map<string, PendingConfirmation>();

  constructor(
    @Optional()
    private readonly toolConfirmationsService?: ToolConfirmationsService,
  ) {}

  registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  registerTools(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      this.registerTool(tool);
    }
  }

  listTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getPendingConfirmation(confirmationId: string): PendingConfirmation | undefined {
    return this.pendingConfirmations.get(confirmationId);
  }

  async execute(call: ToolCall, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const tool = this.tools.get(call.name);
    if (!tool) {
      return {
        status: 'error',
        toolName: call.name,
        callId: call.id,
        error: 'Tool not registered.',
      };
    }

    const argsResult = this.parseToolArguments(call.arguments);
    if (!argsResult.ok) {
      return {
        status: 'error',
        toolName: tool.name,
        callId: call.id,
        error: argsResult.error,
      };
    }

    const permission = await this.resolvePermission(tool, context, argsResult.value);
    if (permission === 'deny') {
      return {
        status: 'denied',
        toolName: tool.name,
        callId: call.id,
        error: 'Permission denied.',
      };
    }

    if (permission === 'confirm') {
      if (this.toolConfirmationsService) {
        const confirmation = await this.toolConfirmationsService.create({
          toolName: tool.name,
          payload: this.buildConfirmationPayload(argsResult.value),
          conversationId: context.conversationId,
          userId: context.userId,
        });

        return {
          status: 'requires_confirmation',
          toolName: tool.name,
          callId: call.id,
          confirmationId: confirmation.id,
        };
      }

      const confirmationId = randomUUID();
      this.pendingConfirmations.set(confirmationId, {
        id: confirmationId,
        toolName: tool.name,
        callId: call.id,
        args: argsResult.value,
        context,
        createdAt: new Date(),
      });

      return {
        status: 'requires_confirmation',
        toolName: tool.name,
        callId: call.id,
        confirmationId,
      };
    }

    return this.executeTool(tool, argsResult.value, context, call);
  }

  async resolveConfirmation(confirmationId: string, approved: boolean): Promise<ToolExecutionResult> {
    if (this.toolConfirmationsService) {
      if (!approved) {
        const confirmation = await this.toolConfirmationsService.reject(
          confirmationId,
          'User rejected tool execution.',
        );
        return {
          status: 'denied',
          toolName: confirmation.toolName,
          callId: confirmation.id,
          error: confirmation.error ?? undefined,
        };
      }

      const confirmation = await this.toolConfirmationsService.confirm(confirmationId);
      return {
        status: confirmation.status === 'confirmed' ? 'success' : 'error',
        toolName: confirmation.toolName,
        callId: confirmation.id,
        result: confirmation.result ?? undefined,
        error: confirmation.error ?? undefined,
      };
    }

    const pending = this.pendingConfirmations.get(confirmationId);
    if (!pending) {
      return {
        status: 'error',
        toolName: 'unknown',
        error: 'Confirmation request not found.',
      };
    }

    this.pendingConfirmations.delete(confirmationId);

    if (!approved) {
      return {
        status: 'denied',
        toolName: pending.toolName,
        callId: pending.callId,
        error: 'User rejected tool execution.',
      };
    }

    const tool = this.tools.get(pending.toolName);
    if (!tool) {
      return {
        status: 'error',
        toolName: pending.toolName,
        callId: pending.callId,
        error: 'Tool no longer registered.',
      };
    }

    return this.executeTool(tool, pending.args, pending.context, {
      name: pending.toolName,
      id: pending.callId,
      arguments: pending.args,
    });
  }

  private parseToolArguments(
    args: unknown,
  ): { ok: true; value: unknown } | { ok: false; error: string } {
    if (args === undefined) {
      return { ok: true, value: {} };
    }

    if (typeof args === 'string') {
      try {
        return { ok: true, value: JSON.parse(args) };
      } catch (error) {
        return { ok: false, error: 'Invalid tool arguments JSON.' };
      }
    }

    return { ok: true, value: args };
  }

  private buildConfirmationPayload(args: unknown): Record<string, any> | undefined {
    if (args === undefined) {
      return undefined;
    }
    if (args && typeof args === 'object' && !Array.isArray(args)) {
      return args as Record<string, any>;
    }
    return { input: args };
  }

  private async resolvePermission(
    tool: ToolDefinition,
    context: ToolExecutionContext,
    args: unknown,
  ): Promise<ToolPermission> {
    if (!tool.permission) {
      return 'allow';
    }

    if (typeof tool.permission === 'function') {
      return tool.permission(context, args);
    }

    return tool.permission;
  }

  private async executeTool(
    tool: ToolDefinition,
    args: unknown,
    context: ToolExecutionContext,
    call: ToolCall,
  ): Promise<ToolExecutionResult> {
    try {
      const result = await tool.handler(args, context);
      return {
        status: 'success',
        toolName: tool.name,
        callId: call.id,
        result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tool execution failed.';
      return {
        status: 'error',
        toolName: tool.name,
        callId: call.id,
        error: message,
      };
    }
  }
}
