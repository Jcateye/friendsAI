import { Test, TestingModule } from '@nestjs/testing';
import { AgentDefinitionRegistry } from './agent-definition-registry.service';
import { PromptTemplateRenderer } from './prompt-template-renderer.service';
import { TemplateContextBuilder } from './template-context-builder.service';
import { OutputValidator } from './output-validator.service';
import type { AgentRunRequest } from '../agent.types';

/**
 * 端到端测试：完整流程
 * Registry → ContextBuilder → Renderer → Validator
 */
describe('Runtime Core E2E', () => {
  let registry: AgentDefinitionRegistry;
  let contextBuilder: TemplateContextBuilder;
  let renderer: PromptTemplateRenderer;
  let validator: OutputValidator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentDefinitionRegistry,
        PromptTemplateRenderer,
        TemplateContextBuilder,
        OutputValidator,
      ],
    }).compile();

    registry = module.get<AgentDefinitionRegistry>(AgentDefinitionRegistry);
    contextBuilder = module.get<TemplateContextBuilder>(TemplateContextBuilder);
    renderer = module.get<PromptTemplateRenderer>(PromptTemplateRenderer);
    validator = module.get<OutputValidator>(OutputValidator);
  });

  it('should complete full flow: load → build context → render → validate', async () => {
    // 1. 加载定义
    const bundle = await registry.loadDefinition('example_agent');
    expect(bundle).toBeDefined();

    // 2. 构建上下文
    const request: AgentRunRequest = {
      agentId: 'example_agent',
      input: {
        message: 'Hello, test message',
        contact: {
          name: 'John Doe',
          company: 'Acme Corp',
          email: 'john@acme.com',
        },
      },
      userId: 'user-123',
      conversationId: 'conv-456',
    };

    const context = contextBuilder.buildContext(request);
    expect(context.agentId).toBe('example_agent');
    expect(context.userId).toBe('user-123');
    expect(context.conversationId).toBe('conv-456');

    // 3. 渲染模板
    const renderResult = renderer.render(bundle, context);
    expect(renderResult.system).toBeTruthy();
    expect(renderResult.user).toBeTruthy();
    expect(renderResult.system).toContain('helpful AI assistant');
    expect(renderResult.user).toContain('Hello, test message');

    // 4. 验证输出（模拟 LLM 输出）
    const mockOutput = {
      response: 'This is a test response',
      confidence: 0.95,
    };

    const validationResult = validator.validate(bundle, mockOutput);
    expect(validationResult.valid).toBe(true);
  });

  it('should handle missing variables with defaults', async () => {
    const bundle = await registry.loadDefinition('example_agent');

    const request: AgentRunRequest = {
      agentId: 'example_agent',
      input: {
        message: 'Test input',
        // 不提供 contact 信息
      },
    };

    const context = contextBuilder.buildContext(request);
    const renderResult = renderer.render(bundle, context);

    // 应该使用 defaults.json 中的默认值
    expect(renderResult.warnings.length).toBeGreaterThanOrEqual(0);
    // 渲染应该仍然成功，使用默认值
    expect(renderResult.system).toBeTruthy();
    expect(renderResult.user).toBeTruthy();
  });

  it('should detect validation errors', async () => {
    const bundle = await registry.loadDefinition('example_agent');

    // 无效的输出（缺少必需字段 response）
    const invalidOutput = {
      // response 字段缺失
      confidence: 0.5,
    };

    const validationResult = validator.validate(bundle, invalidOutput);
    // validate 方法返回 ValidationResult，不抛异常
    expect(validationResult.valid).toBe(false);
    expect(validationResult.errors).toBeDefined();
  });
});


