import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import Ajv, { type AnySchema, type ErrorObject, type ValidateFunction } from 'ajv';
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
  private readonly ajv = new Ajv({
    allErrors: true,
    strict: false,
    allowUnionTypes: true,
  });
  private readonly compiledSchemaCache = new Map<string, ValidateFunction>();

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

    if (typeof bundle.outputSchema === 'object' && bundle.outputSchema !== null) {
      try {
        const validator = this.getOrCompileJsonSchemaValidator(
          bundle.definition.id,
          bundle.definition.version,
          bundle.outputSchema as Record<string, unknown>,
        );
        const valid = validator(output);
        if (valid) {
          return { valid: true };
        }

        const errors = validator.errors ?? [];
        this.logger.warn(
          `Output validation failed for agent ${bundle.definition.id}: ${JSON.stringify(errors)}`,
        );

        return {
          valid: false,
          errors,
        };
      } catch (error) {
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
      `Invalid outputSchema type for agent ${bundle.definition.id}, skipping validation`,
    );
    return { valid: true };
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
      const details = this.formatValidationDetails(result.errors);
      throw new BadRequestException({
        code: 'output_validation_failed',
        message: details.join('; ') || 'Output validation failed',
        details: result.errors,
      });
    }
  }

  private getOrCompileJsonSchemaValidator(
    agentId: string,
    version: string,
    schema: Record<string, unknown>,
  ): ValidateFunction {
    const schemaKey = `${agentId}@${version}:${JSON.stringify(schema)}`;
    const cached = this.compiledSchemaCache.get(schemaKey);
    if (cached) {
      return cached;
    }

    const validator = this.ajv.compile(schema as AnySchema);
    this.compiledSchemaCache.set(schemaKey, validator);
    return validator;
  }

  private formatValidationDetails(errors: unknown): string[] {
    if (!errors) {
      return [];
    }

    if (errors instanceof z.ZodError) {
      return errors.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    }

    if (Array.isArray(errors)) {
      return (errors as ErrorObject[]).map((err) => {
        const path = err.instancePath?.replace(/^\//, '').replace(/\//g, '.') || '(root)';
        return `${path}: ${err.message ?? 'invalid'}`;
      });
    }

    return ['Output validation failed'];
  }
}
