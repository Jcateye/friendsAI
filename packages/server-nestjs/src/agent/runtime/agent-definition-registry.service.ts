import { Injectable, Logger } from '@nestjs/common';
import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { z } from 'zod';
import type {
  AgentDefinition,
  AgentDefinitionBundle,
  AgentId,
} from '../contracts/agent-definition.types';
import {
  AgentDefinitionError,
  AgentDefinitionErrorCode,
  IAgentDefinitionRegistry,
} from '../contracts/agent-definition-registry.interface';

/**
 * Agent 定义注册表实现
 * 从文件系统加载 Agent 定义、模板、默认值和 schema
 */
@Injectable()
export class AgentDefinitionRegistry implements IAgentDefinitionRegistry {
  private readonly logger = new Logger(AgentDefinitionRegistry.name);
  private readonly cache = new Map<AgentId, { bundle: AgentDefinitionBundle; mtimeMs: number }>();
  private readonly definitionsRoot: string;
  private readonly cacheMode: 'watch' | 'memory';

  constructor() {
    // 计算定义根目录：src/agent/definitions
    // 从当前文件位置向上找到 src/agent，然后进入 definitions
    const currentDir = __dirname;
    const agentDir = resolve(currentDir, '..');
    this.definitionsRoot = resolve(agentDir, 'definitions');
    const configuredMode = (process.env.AGENT_DEFINITION_CACHE_MODE ?? '').trim().toLowerCase();
    if (configuredMode === 'watch' || configuredMode === 'memory') {
      this.cacheMode = configuredMode;
    } else {
      const nodeEnv = (process.env.NODE_ENV ?? 'development').toLowerCase();
      this.cacheMode = nodeEnv === 'production' ? 'memory' : 'watch';
    }
    this.logger.debug(`Agent definitions root: ${this.definitionsRoot}`);
    this.logger.debug(`Agent definition cache mode: ${this.cacheMode}`);
  }

  /**
   * 获取 Agent 定义路径
   */
  getDefinitionPath(agentId: AgentId): string {
    return join(this.definitionsRoot, agentId);
  }

  /**
   * 加载 Agent 定义 Bundle
   */
  async loadDefinition(agentId: AgentId): Promise<AgentDefinitionBundle> {
    const definitionPath = this.getDefinitionPath(agentId);
    const currentMtimeMs = this.getDirectoryMtimeMs(definitionPath);

    // 检查缓存
    const cached = this.cache.get(agentId);
    if (cached) {
      if (this.cacheMode === 'memory' || cached.mtimeMs === currentMtimeMs) {
        this.logger.debug(`Using cached definition for agent: ${agentId}`);
        return cached.bundle;
      }
      this.logger.debug(`Definition changed on disk, reloading: ${agentId}`);
    }

    // 1. 加载 agent.json
    const agentJsonPath = join(definitionPath, 'agent.json');
    if (!existsSync(agentJsonPath)) {
      throw new AgentDefinitionError(
        AgentDefinitionErrorCode.DEFINITION_NOT_FOUND,
        `Agent definition not found: ${agentJsonPath}`,
        agentId
      );
    }

    let definition: AgentDefinition;
    try {
      const agentJsonContent = readFileSync(agentJsonPath, 'utf-8');
      definition = JSON.parse(agentJsonContent) as AgentDefinition;
    } catch (error) {
      throw new AgentDefinitionError(
        AgentDefinitionErrorCode.DEFINITION_NOT_FOUND,
        `Failed to parse agent.json: ${error instanceof Error ? error.message : String(error)}`,
        agentId,
        error instanceof Error ? error : undefined
      );
    }

    // 验证定义基本结构
    if (!definition.id || !definition.version || !definition.prompt) {
      throw new AgentDefinitionError(
        AgentDefinitionErrorCode.DEFINITION_NOT_FOUND,
        'Invalid agent definition: missing required fields (id, version, prompt)',
        agentId
      );
    }

    // 2. 加载系统模板
    const systemTemplatePath = join(definitionPath, definition.prompt.systemTemplate);
    if (!existsSync(systemTemplatePath)) {
      throw new AgentDefinitionError(
        AgentDefinitionErrorCode.DEFINITION_TEMPLATE_MISSING,
        `System template not found: ${systemTemplatePath}`,
        agentId
      );
    }
    const systemTemplate = readFileSync(systemTemplatePath, 'utf-8');

    // 3. 加载用户模板
    const userTemplatePath = join(definitionPath, definition.prompt.userTemplate);
    if (!existsSync(userTemplatePath)) {
      throw new AgentDefinitionError(
        AgentDefinitionErrorCode.DEFINITION_TEMPLATE_MISSING,
        `User template not found: ${userTemplatePath}`,
        agentId
      );
    }
    const userTemplate = readFileSync(userTemplatePath, 'utf-8');

    // 4. 加载 defaults.json（可选）
    let defaults: Record<string, unknown> | undefined;
    if (definition.prompt.defaultsFile) {
      const defaultsPath = join(definitionPath, definition.prompt.defaultsFile);
      if (existsSync(defaultsPath)) {
        try {
          const defaultsContent = readFileSync(defaultsPath, 'utf-8');
          defaults = JSON.parse(defaultsContent) as Record<string, unknown>;
        } catch (error) {
          this.logger.warn(
            `Failed to load defaults.json for agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }

    // 5. 加载 input.schema.json（可选）
    let inputSchema: Record<string, unknown> | undefined;
    if (definition.validation?.inputSchema) {
      const inputSchemaPath = join(definitionPath, definition.validation.inputSchema);
      if (existsSync(inputSchemaPath)) {
        try {
          const inputSchemaContent = readFileSync(inputSchemaPath, 'utf-8');
          inputSchema = JSON.parse(inputSchemaContent) as Record<string, unknown>;
        } catch (error) {
          this.logger.warn(
            `Failed to load input schema for agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      } else {
        this.logger.warn(
          `Input schema file not found: ${inputSchemaPath}`
        );
      }
    }

    // 6. 加载 output.schema.json（可选）
    // 存储为 JSON Schema 对象，不转换为 ZodSchema（由 OutputValidator 在运行时转换）
    let outputSchema: z.ZodSchema | Record<string, unknown> | undefined;
    const outputSchemaFile = definition.validation?.outputSchemaFile || definition.validation?.outputSchema;
    if (outputSchemaFile) {
      const schemaPath = join(definitionPath, outputSchemaFile);
      if (existsSync(schemaPath)) {
        try {
          const schemaContent = readFileSync(schemaPath, 'utf-8');
          const jsonSchema = JSON.parse(schemaContent) as Record<string, unknown>;
          // 存储为 JSON Schema 对象，不立即转换
          // 可以选择性地转换为 ZodSchema，但为了灵活性，我们存储原始 JSON Schema
          outputSchema = jsonSchema;
        } catch (error) {
          throw new AgentDefinitionError(
            AgentDefinitionErrorCode.DEFINITION_SCHEMA_INVALID,
            `Failed to load or parse output schema: ${error instanceof Error ? error.message : String(error)}`,
            agentId,
            error instanceof Error ? error : undefined
          );
        }
      } else {
        throw new AgentDefinitionError(
          AgentDefinitionErrorCode.DEFINITION_SCHEMA_INVALID,
          `Output schema file not found: ${schemaPath}`,
          agentId
        );
      }
    }

    // 构建 bundle
    const bundle: AgentDefinitionBundle = {
      definition,
      systemTemplate,
      userTemplate,
      defaults,
      inputSchema,
      outputSchema,
    };

    // 缓存 bundle
    this.cache.set(agentId, { bundle, mtimeMs: currentMtimeMs });
    this.logger.debug(`Loaded and cached definition for agent: ${agentId}`);

    return bundle;
  }

  private getDirectoryMtimeMs(definitionPath: string): number {
    if (!existsSync(definitionPath)) {
      return 0;
    }

    let maxMtime = 0;
    const stack: string[] = [definitionPath];

    while (stack.length > 0) {
      const currentPath = stack.pop();
      if (!currentPath || !existsSync(currentPath)) {
        continue;
      }

      const stat = statSync(currentPath);
      maxMtime = Math.max(maxMtime, stat.mtimeMs);

      if (!stat.isDirectory()) {
        continue;
      }

      const children = readdirSync(currentPath);
      for (const child of children) {
        stack.push(join(currentPath, child));
      }
    }

    return maxMtime;
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
}
