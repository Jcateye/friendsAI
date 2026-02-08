import { Injectable } from '@nestjs/common';
import * as Mustache from 'mustache';
import type { AgentDefinitionBundle } from '../contracts/agent-definition.types';
import type { RuntimeContext, RenderResult } from '../contracts/runtime.types';

/**
 * 模板渲染器服务
 * 负责使用 Mustache 渲染 Agent 模板，支持缺变量告警和默认值注入
 */
@Injectable()
export class TemplateRendererService {
  /**
   * 渲染 Agent 模板
   * @param bundle Agent 定义 Bundle
   * @param context 运行时上下文
   * @returns 渲染结果
   */
  render(bundle: AgentDefinitionBundle, context: RuntimeContext): RenderResult {
    const warnings: Array<{ path: string; message: string }> = [];
    
    // 合并默认值到上下文
    const mergedContext = this.mergeDefaults(context, bundle.defaults, warnings);
    
    // 渲染系统模板
    const system = this.renderTemplate(
      bundle.systemTemplate,
      mergedContext,
      'system',
      warnings
    );
    
    // 渲染用户模板
    const user = this.renderTemplate(
      bundle.userTemplate,
      mergedContext,
      'user',
      warnings
    );
    
    return {
      system,
      user,
      warnings,
    };
  }
  
  /**
   * 渲染单个模板
   */
  private renderTemplate(
    template: string,
    context: RuntimeContext,
    templateName: string,
    warnings: Array<{ path: string; message: string }>
  ): string {
    try {
      // 使用 Mustache 渲染
      const rendered = Mustache.render(template, context);
      
      // 检查是否有未解析的变量（Mustache 会保留 {{variable}} 如果变量不存在）
      const missingVars = this.detectMissingVariables(rendered, template);
      for (const varPath of missingVars) {
        warnings.push({
          path: varPath,
          message: `Missing variable in ${templateName} template: ${varPath}`,
        });
      }
      
      return rendered;
    } catch (error) {
      throw new Error(
        `Failed to render ${templateName} template: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * 合并默认值到上下文
   */
  private mergeDefaults(
    context: RuntimeContext,
    defaults: Record<string, unknown> | undefined,
    warnings: Array<{ path: string; message: string }>
  ): RuntimeContext {
    if (!defaults) {
      return context;
    }
    
    const merged = { ...context };
    
    // 深度合并默认值
    for (const [key, defaultValue] of Object.entries(defaults)) {
      if (!(key in merged)) {
        merged[key] = defaultValue;
        warnings.push({
          path: key,
          message: `Using default value for missing variable: ${key}`,
        });
      } else if (
        typeof merged[key] === 'object' &&
        typeof defaultValue === 'object' &&
        merged[key] !== null &&
        defaultValue !== null &&
        !Array.isArray(merged[key]) &&
        !Array.isArray(defaultValue)
      ) {
        // 递归合并对象
        merged[key] = this.mergeDefaults(
          merged[key] as RuntimeContext,
          defaultValue as Record<string, unknown>,
          warnings
        );
      }
    }
    
    return merged;
  }
  
  /**
   * 检测模板中缺失的变量
   * 通过比较原始模板和渲染结果来找出未解析的变量
   */
  private detectMissingVariables(
    rendered: string,
    originalTemplate: string
  ): string[] {
    const missing: string[] = [];
    
    // 查找所有 {{variable}} 或 {{#section}} 模式
    const variablePattern = /\{\{([^#\/!>].*?)\}\}/g;
    let match;
    
    while ((match = variablePattern.exec(originalTemplate)) !== null) {
      const varName = match[1].trim();
      // 检查渲染结果中是否还包含这个变量（说明未解析）
      if (rendered.includes(`{{${varName}}}`)) {
        missing.push(varName);
      }
    }
    
    return missing;
  }
}




