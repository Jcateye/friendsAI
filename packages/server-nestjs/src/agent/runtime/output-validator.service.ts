import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import type { AgentDefinitionBundle } from '../contracts/agent-definition.types';
import type { ValidationResult } from '../contracts/runtime.types';
import {
  AgentDefinitionError,
  AgentDefinitionErrorCode,
} from '../contracts/agent-definition-registry.interface';

/**
 * 输出验证器
 * 根据 Agent 定义的 outputSchema 验证输出数据
 */
@Injectable()
export class OutputValidator {
  private readonly logger = new Logger(OutputValidator.name);

  /**
   * 验证输出数据
   * @param bundle Agent 定义 Bundle
   * @param output 输出数据
   * @returns 验证结果
   */
  validate(bundle: AgentDefinitionBundle, output: unknown): ValidationResult {
    // 如果没有 schema，跳过验证
    if (!bundle.outputSchema) {
      this.logger.debug(`No output schema defined for agent ${bundle.definition.id}, skipping validation`);
      return { valid: true };
    }

    // 如果 outputSchema 是 ZodSchema，直接使用
    if (bundle.outputSchema instanceof z.ZodType) {
      try {
        bundle.outputSchema.parse(output);
        return { valid: true };
      } catch (error) {
        if (error instanceof z.ZodError) {
          this.logger.warn(
            `Output validation failed for agent ${bundle.definition.id}: ${error.message}`,
          );
          return {
            valid: false,
            errors: error,
          };
        }
        throw new AgentDefinitionError(
          AgentDefinitionErrorCode.OUTPUT_VALIDATION_FAILED,
          `Unexpected error during validation: ${error instanceof Error ? error.message : String(error)}`,
          bundle.definition.id,
          error instanceof Error ? error : undefined,
        );
      }
    }

    // 如果 outputSchema 是 JSON Schema 对象，需要转换为 ZodSchema
    // 注意：这是一个简化实现，实际应该使用更完善的 JSON Schema 到 Zod 转换库
    if (typeof bundle.outputSchema === 'object' && bundle.outputSchema !== null) {
      try {
        const zodSchema = this.convertJsonSchemaToZod(bundle.outputSchema as Record<string, unknown>);
        zodSchema.parse(output);
        return { valid: true };
      } catch (error) {
        if (error instanceof z.ZodError) {
          this.logger.warn(
            `Output validation failed for agent ${bundle.definition.id}: ${error.message}`,
          );
          return {
            valid: false,
            errors: error,
          };
        }
        throw new AgentDefinitionError(
          AgentDefinitionErrorCode.OUTPUT_VALIDATION_FAILED,
          `Unexpected error during validation: ${error instanceof Error ? error.message : String(error)}`,
          bundle.definition.id,
          error instanceof Error ? error : undefined,
        );
      }
    }

    // 如果 outputSchema 既不是 ZodSchema 也不是有效的 JSON Schema 对象，记录警告并跳过验证
    this.logger.warn(
      `Invalid outputSchema type for agent ${bundle.definition.id}, skipping validation`
    );
    return { valid: true };
  }

  /**
   * 将 JSON Schema 转换为 Zod Schema
   * 这是一个简化实现，支持基本的 JSON Schema 类型
   */
  private convertJsonSchemaToZod(jsonSchema: unknown): z.ZodSchema {
    if (typeof jsonSchema !== 'object' || jsonSchema === null) {
      throw new Error('Invalid JSON schema: must be an object');
    }

    const schema = jsonSchema as Record<string, unknown>;

    // 处理 type 字段
    const type = schema.type;
    if (type === 'string') {
      let zodSchema: z.ZodString = z.string();
      if (schema.minLength !== undefined) {
        zodSchema = zodSchema.min(schema.minLength as number);
      }
      if (schema.maxLength !== undefined) {
        zodSchema = zodSchema.max(schema.maxLength as number);
      }
      return zodSchema;
    }

    if (type === 'number' || type === 'integer') {
      let zodSchema: z.ZodNumber = z.number();
      if (schema.minimum !== undefined) {
        zodSchema = zodSchema.min(schema.minimum as number);
      }
      if (schema.maximum !== undefined) {
        zodSchema = zodSchema.max(schema.maximum as number);
      }
      return zodSchema;
    }

    if (type === 'boolean') {
      return z.boolean();
    }

    if (type === 'array') {
      const items = schema.items;
      if (items) {
        const itemSchema = this.convertJsonSchemaToZod(items);
        return z.array(itemSchema);
      }
      return z.array(z.unknown());
    }

    if (type === 'object') {
      const properties = schema.properties as Record<string, unknown> | undefined;
      const required = schema.required as string[] | undefined;

      if (!properties) {
        return z.record(z.unknown());
      }

      const shape: Record<string, z.ZodTypeAny> = {};
      for (const [key, value] of Object.entries(properties)) {
        const isRequired = required?.includes(key) ?? true;
        const fieldSchema = this.convertJsonSchemaToZod(value);
        shape[key] = isRequired ? fieldSchema : fieldSchema.optional();
      }

      return z.object(shape);
    }

    // 默认返回 unknown
    return z.unknown();
  }

  /**
   * 验证输出数据，如果验证失败则抛出异常
   * @param bundle Agent 定义 Bundle
   * @param output 输出数据
   * @throws BadRequestException 如果验证失败
   */
  validateOrThrow(bundle: AgentDefinitionBundle, output: unknown): void {
    const result = this.validate(bundle, output);
    if (!result.valid) {
      const errorMessage = result.errors instanceof z.ZodError
        ? result.errors.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
        : 'Output validation failed';
      throw new BadRequestException({
        code: 'output_validation_failed',
        message: errorMessage,
        details: result.errors,
      });
    }
  }
}


