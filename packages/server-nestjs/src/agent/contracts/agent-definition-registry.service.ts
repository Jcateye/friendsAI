import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  AgentDefinition,
  AgentDefinitionBundle,
  AgentId,
} from './agent-definition.types';
import {
  AgentDefinitionError,
  AgentDefinitionErrorCode,
  type IAgentDefinitionRegistry,
} from './agent-definition-registry.interface';

/**
 * Agent 定义注册表实现
 * 从文件系统加载 Agent 定义资产
 */
@Injectable()
export class AgentDefinitionRegistry implements IAgentDefinitionRegistry {
  private readonly logger = new Logger(AgentDefinitionRegistry.name);
  private readonly definitionsBasePath: string;

  constructor() {
    // 定义目录：packages/server-nestjs/src/agent/definitions
    this.definitionsBasePath = path.join(
      process.cwd(),
      'packages',
      'server-nestjs',
      'src',
      'agent',
      'definitions',
    );
  }

  /**
   * 获取 Agent 定义路径
   */
  getDefinitionPath(agentId: AgentId): string {
    return path.join(this.definitionsBasePath, agentId);
  }

  /**
   * 加载 Agent 定义 Bundle
   */
  async loadDefinition(agentId: AgentId): Promise<AgentDefinitionBundle> {
    const definitionPath = this.getDefinitionPath(agentId);

    try {
      // 1. 加载 agent.json
      const definition = await this.loadDefinitionFile(agentId, definitionPath);

      // 2. 加载模板文件
      const systemTemplate = await this.loadTemplate(
        definitionPath,
        definition.prompt.systemTemplate,
      );
      const userTemplate = await this.loadTemplate(
        definitionPath,
        definition.prompt.userTemplate,
      );

      // 3. 加载默认值文件（可选）
      let defaults: Record<string, unknown> | undefined;
      if (definition.prompt.defaultsFile) {
        defaults = await this.loadDefaults(definitionPath, definition.prompt.defaultsFile);
      }

      // 4. 加载输出 schema（必需）
      let outputSchema: Record<string, unknown> | undefined;
      if (definition.validation?.outputSchema) {
        outputSchema = await this.loadSchema(
          definitionPath,
          definition.validation.outputSchema,
        );
      }

      // 5. 加载输入 schema（可选）
      let inputSchema: Record<string, unknown> | undefined;
      if (definition.validation?.inputSchema) {
        inputSchema = await this.loadSchema(
          definitionPath,
          definition.validation.inputSchema,
        );
      }

      return {
        definition,
        systemTemplate,
        userTemplate,
        defaults,
        outputSchema,
        inputSchema,
      };
    } catch (error) {
      if (error instanceof AgentDefinitionError) {
        throw error;
      }
      throw new AgentDefinitionError(
        AgentDefinitionErrorCode.DEFINITION_NOT_FOUND,
        `Failed to load agent definition: ${error instanceof Error ? error.message : String(error)}`,
        agentId,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 加载 agent.json 定义文件
   */
  private async loadDefinitionFile(
    agentId: AgentId,
    definitionPath: string,
  ): Promise<AgentDefinition> {
    const definitionFile = path.join(definitionPath, 'agent.json');
    try {
      const content = await fs.readFile(definitionFile, 'utf-8');
      const definition = JSON.parse(content) as AgentDefinition;

      // 验证必需字段
      if (!definition.id || !definition.version) {
        throw new AgentDefinitionError(
          AgentDefinitionErrorCode.DEFINITION_SCHEMA_INVALID,
          'Agent definition must have "id" and "version" fields',
          agentId,
        );
      }

      if (!definition.prompt?.systemTemplate || !definition.prompt?.userTemplate) {
        throw new AgentDefinitionError(
          AgentDefinitionErrorCode.DEFINITION_TEMPLATE_MISSING,
          'Agent definition must have "prompt.systemTemplate" and "prompt.userTemplate"',
          agentId,
        );
      }

      if (!definition.validation?.outputSchema) {
        throw new AgentDefinitionError(
          AgentDefinitionErrorCode.DEFINITION_SCHEMA_INVALID,
          'Agent definition must have "validation.outputSchema"',
          agentId,
        );
      }

      return definition;
    } catch (error) {
      if (error instanceof AgentDefinitionError) {
        throw error;
      }
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new AgentDefinitionError(
          AgentDefinitionErrorCode.DEFINITION_NOT_FOUND,
          `Agent definition file not found: ${definitionFile}`,
          agentId,
        );
      }
      throw new AgentDefinitionError(
        AgentDefinitionErrorCode.DEFINITION_SCHEMA_INVALID,
        `Failed to parse agent definition: ${error instanceof Error ? error.message : String(error)}`,
        agentId,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 加载模板文件
   */
  private async loadTemplate(definitionPath: string, templateFile: string): Promise<string> {
    const templatePath = path.join(definitionPath, templateFile);
    try {
      return await fs.readFile(templatePath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new AgentDefinitionError(
          AgentDefinitionErrorCode.DEFINITION_TEMPLATE_MISSING,
          `Template file not found: ${templatePath}`,
          undefined,
          error instanceof Error ? error : undefined,
        );
      }
      throw error;
    }
  }

  /**
   * 加载默认值文件
   */
  private async loadDefaults(
    definitionPath: string,
    defaultsFile: string,
  ): Promise<Record<string, unknown>> {
    const defaultsPath = path.join(definitionPath, defaultsFile);
    try {
      const content = await fs.readFile(defaultsPath, 'utf-8');
      return JSON.parse(content) as Record<string, unknown>;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.warn(`Defaults file not found: ${defaultsPath}, using empty defaults`);
        return {};
      }
      throw new AgentDefinitionError(
        AgentDefinitionErrorCode.DEFINITION_SCHEMA_INVALID,
        `Failed to parse defaults file: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 加载 schema 文件
   */
  private async loadSchema(
    definitionPath: string,
    schemaFile: string,
  ): Promise<Record<string, unknown>> {
    const schemaPath = path.join(definitionPath, schemaFile);
    try {
      const content = await fs.readFile(schemaPath, 'utf-8');
      const schema = JSON.parse(content) as Record<string, unknown>;
      return schema;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new AgentDefinitionError(
          AgentDefinitionErrorCode.DEFINITION_SCHEMA_INVALID,
          `Schema file not found: ${schemaPath}`,
          undefined,
          error instanceof Error ? error : undefined,
        );
      }
      throw new AgentDefinitionError(
        AgentDefinitionErrorCode.DEFINITION_SCHEMA_INVALID,
        `Failed to parse schema file: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }
}



