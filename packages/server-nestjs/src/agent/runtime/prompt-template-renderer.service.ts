import { Injectable, Logger } from '@nestjs/common';
import Mustache from 'mustache';
import type { AgentDefinitionBundle } from '../contracts/agent-definition.types';
import type { RenderResult, RuntimeContext } from '../contracts/runtime.types';

/**
 * 模板渲染警告
 */
export interface TemplateWarning {
  /** 变量路径（如 'contact.company'） */
  path: string;
  /** 警告消息 */
  message: string;
}

/**
 * Prompt 模板渲染器
 * 使用 Mustache 渲染模板，支持缺变量告警和 defaults 注入
 */
@Injectable()
export class PromptTemplateRenderer {
  private readonly logger = new Logger(PromptTemplateRenderer.name);

  /**
   * 渲染模板
   * @param bundle Agent 定义 Bundle
   * @param context 运行时上下文
   * @returns 渲染结果
   */
  render(bundle: AgentDefinitionBundle, context: RuntimeContext): RenderResult {
    const warnings: TemplateWarning[] = [];

    // 1. 合并 defaults 到上下文
    const mergedContext = this.mergeDefaults(context, bundle.defaults, warnings);

    // 2. 检测缺失变量
    const missingVars = this.detectMissingVariables(
      bundle.systemTemplate,
      bundle.userTemplate,
      mergedContext,
    );
    missingVars.forEach((varPath) => {
      warnings.push({
        path: varPath,
        message: `Variable "${varPath}" is missing in context, using default value if available`,
      });
    });

    // 3. 渲染系统提示
    const systemPrompt = this.renderTemplate(
      bundle.systemTemplate,
      mergedContext,
      'system',
      warnings,
    );

    // 4. 渲染用户提示
    const userPrompt = this.renderTemplate(
      bundle.userTemplate,
      mergedContext,
      'user',
      warnings,
    );

    // 5. 记录警告
    if (warnings.length > 0) {
      this.logger.warn(`Template rendering warnings: ${JSON.stringify(warnings)}`);
    }

    return {
      system: systemPrompt,
      user: userPrompt,
      warnings: warnings.map((w) => ({
        path: w.path,
        message: w.message,
      })),
    };
  }

  /**
   * 合并默认值到上下文
   */
  private mergeDefaults(
    context: RuntimeContext,
    defaults?: Record<string, unknown>,
    warnings?: TemplateWarning[],
  ): RuntimeContext {
    if (!defaults) {
      return context;
    }

    const merged = { ...context };

    // 深度合并 defaults
    for (const [key, value] of Object.entries(defaults)) {
      if (!(key in merged)) {
        merged[key] = value;
        if (warnings) {
          warnings.push({
            path: key,
            message: `Using default value for "${key}"`,
          });
        }
      } else if (
        typeof merged[key] === 'object' &&
        merged[key] !== null &&
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(merged[key]) &&
        !Array.isArray(value)
      ) {
        // 递归合并对象
        merged[key] = this.mergeDefaults(
          merged[key] as RuntimeContext,
          value as Record<string, unknown>,
          warnings,
        );
      }
    }

    return merged;
  }

  /**
   * 检测模板中的缺失变量
   */
  private detectMissingVariables(
    systemTemplate: string,
    userTemplate: string,
    context: RuntimeContext,
  ): string[] {
    const missing = new Set<string>();

    this.collectMissingByRenderedPath(systemTemplate, context, missing);
    this.collectMissingByRenderedPath(userTemplate, context, missing);

    return Array.from(missing);
  }

  /**
   * 按 Mustache 渲染路径检测缺失变量，避免 section/loop 场景误报
   */
  private collectMissingByRenderedPath(
    template: string,
    context: RuntimeContext,
    missing: Set<string>,
  ): void {
    try {
      const tokens = Mustache.parse(template) as MustacheToken[];
      this.collectMissingFromTokens(tokens, [context], missing);
    } catch {
      // parse 失败时回退到原始正则策略
      const allVars = this.extractVariablesFallback(template);
      for (const varPath of allVars) {
        if (!this.hasVariableFallback(context, varPath)) {
          missing.add(varPath);
        }
      }
    }
  }

  /**
   * 遍历 Mustache token 树，按上下文作用域检测缺失变量
   */
  private collectMissingFromTokens(
    tokens: MustacheToken[],
    contextStack: unknown[],
    missing: Set<string>,
  ): void {
    for (const token of tokens) {
      const type = token[0];
      const rawName = token[1];
      const name = typeof rawName === 'string' ? rawName.trim() : '';

      if (!name) continue;

      if (type === 'name' || type === '&') {
        if (name === '.') continue;
        const resolved = this.resolveVariable(contextStack, name);
        if (!resolved.found) {
          missing.add(name);
        }
        continue;
      }

      if (type !== '#' && type !== '^') {
        continue;
      }

      const sectionTokens = (token[4] as MustacheToken[] | undefined) ?? [];
      const section = this.resolveVariable(contextStack, name);

      if (type === '#') {
        if (!section.found || !this.isTruthyForMustache(section.value)) {
          continue;
        }

        if (Array.isArray(section.value)) {
          for (const item of section.value) {
            this.collectMissingFromTokens(sectionTokens, [...contextStack, item], missing);
          }
        } else if (section.value !== null && typeof section.value === 'object') {
          this.collectMissingFromTokens(sectionTokens, [...contextStack, section.value], missing);
        } else {
          this.collectMissingFromTokens(sectionTokens, contextStack, missing);
        }
      } else {
        // Inverted section
        if (!section.found || !this.isTruthyForMustache(section.value)) {
          this.collectMissingFromTokens(sectionTokens, contextStack, missing);
        }
      }
    }
  }

  /**
   * 按 Mustache 语义在上下文栈中解析变量
   */
  private resolveVariable(
    contextStack: unknown[],
    varPath: string,
  ): { found: boolean; value?: unknown } {
    if (varPath === '.') {
      return { found: true, value: contextStack[contextStack.length - 1] };
    }

    for (let i = contextStack.length - 1; i >= 0; i -= 1) {
      const resolved = this.resolveFromContext(contextStack[i], varPath);
      if (resolved.found) {
        return resolved;
      }
    }

    return { found: false };
  }

  private resolveFromContext(
    context: unknown,
    varPath: string,
  ): { found: boolean; value?: unknown } {
    const parts = varPath.split('.');
    let current: unknown = context;

    for (const part of parts) {
      if (typeof current !== 'object' || current === null) {
        return { found: false };
      }
      if (!(part in (current as Record<string, unknown>))) {
        return { found: false };
      }
      current = (current as Record<string, unknown>)[part];
    }

    return { found: true, value: current };
  }

  private isTruthyForMustache(value: unknown): boolean {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return Boolean(value);
  }

  /**
   * 从模板中提取变量路径（fallback）
   */
  private extractVariablesFallback(template: string): string[] {
    const vars: string[] = [];
    const regex = /\{\{([^}]+)\}\}/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(template)) !== null) {
      const varPath = match[1].trim();
      // 跳过 Mustache 特殊语法（如 {{#section}}, {{/section}}, {{^inverted}} 等）
      if (
        !varPath.startsWith('#') &&
        !varPath.startsWith('/') &&
        !varPath.startsWith('^') &&
        !varPath.startsWith('&') &&
        !varPath.startsWith('!')
      ) {
        vars.push(varPath);
      }
    }

    return [...new Set(vars)]; // 去重
  }

  /**
   * 检查上下文中是否存在变量（fallback）
   */
  private hasVariableFallback(context: RuntimeContext, varPath: string): boolean {
    const parts = varPath.split('.');
    let current: unknown = context;

    for (const part of parts) {
      if (typeof current !== 'object' || current === null) {
        return false;
      }
      if (!(part in current)) {
        return false;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return true;
  }

  /**
   * 渲染单个模板
   */
  private renderTemplate(
    template: string,
    context: RuntimeContext,
    templateName: string,
    warnings: TemplateWarning[],
  ): string {
    try {
      return Mustache.render(template, context);
    } catch (error) {
      const message = `Failed to render ${templateName} template: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(message, error);
      warnings.push({
        path: templateName,
        message,
      });
      // 返回原始模板作为降级
      return template;
    }
  }
}

type MustacheToken = [string, string, number?, number?, MustacheToken[]?];
