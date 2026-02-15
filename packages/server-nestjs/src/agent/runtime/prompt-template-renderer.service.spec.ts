import { Test, TestingModule } from '@nestjs/testing';
import { PromptTemplateRenderer } from './prompt-template-renderer.service';
import type { AgentDefinitionBundle } from '../contracts/agent-definition.types';
import type { RuntimeContext } from '../contracts/runtime.types';

describe('PromptTemplateRenderer', () => {
  let service: PromptTemplateRenderer;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PromptTemplateRenderer],
    }).compile();

    service = module.get<PromptTemplateRenderer>(PromptTemplateRenderer);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('render', () => {
    it('should render templates with context', () => {
      const bundle: AgentDefinitionBundle = {
        definition: {
          id: 'test',
          version: '1.0.0',
          prompt: {
            systemTemplate: 'system.mustache',
            userTemplate: 'user.mustache',
          },
          validation: {
            outputSchema: 'output.schema.json',
          },
        },
        systemTemplate: 'System: {{userId}}',
        userTemplate: 'User: {{input}}',
        defaults: {
          userId: 'default-user',
        },
      };

      const context: RuntimeContext = {
        input: 'test input',
      };

      const result = service.render(bundle, context);

      expect(result.system).toBe('System: default-user');
      expect(result.user).toBe('User: test input');
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should inject defaults for missing variables', () => {
      const bundle: AgentDefinitionBundle = {
        definition: {
          id: 'test',
          version: '1.0.0',
          prompt: {
            systemTemplate: 'system.mustache',
            userTemplate: 'user.mustache',
            defaultsFile: 'defaults.json',
          },
          validation: {
            outputSchema: 'output.schema.json',
          },
        },
        systemTemplate: 'System: {{userId}}',
        userTemplate: 'User: {{input}}, Contact: {{contact.name}}',
        defaults: {
          contact: {
            name: 'Default Name',
            company: 'Default Company',
          },
        },
      };

      const context: RuntimeContext = {
        input: 'test',
      };

      const result = service.render(bundle, context);

      expect(result.user).toContain('Default Name');
      expect(result.warnings.some((w) => w.path.includes('contact'))).toBe(true);
    });

    it('should warn about missing variables', () => {
      const bundle: AgentDefinitionBundle = {
        definition: {
          id: 'test',
          version: '1.0.0',
          prompt: {
            systemTemplate: 'system.mustache',
            userTemplate: 'user.mustache',
          },
          validation: {
            outputSchema: 'output.schema.json',
          },
        },
        systemTemplate: 'System: {{missingVar}}',
        userTemplate: 'User: {{input}}',
      };

      const context: RuntimeContext = {
        input: 'test',
      };

      const result = service.render(bundle, context);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.path === 'missingVar')).toBe(true);
    });

    it('should not report loop item fields as missing when section data exists', () => {
      const bundle: AgentDefinitionBundle = {
        definition: {
          id: 'test',
          version: '1.0.0',
          prompt: {
            systemTemplate: 'system.mustache',
            userTemplate: 'user.mustache',
          },
          validation: {
            outputSchema: 'output.schema.json',
          },
        },
        systemTemplate: 'System',
        userTemplate: '{{#messages}}[{{index}}] {{role}}: {{content}}{{/messages}}',
      };

      const context: RuntimeContext = {
        messages: [
          { index: 1, role: 'user', content: 'hello' },
        ],
      };

      const result = service.render(bundle, context);

      expect(result.warnings.some((w) => w.path === 'index')).toBe(false);
      expect(result.warnings.some((w) => w.path === 'role')).toBe(false);
      expect(result.warnings.some((w) => w.path === 'content')).toBe(false);
    });

    it('should not report variables from inactive sections as missing', () => {
      const bundle: AgentDefinitionBundle = {
        definition: {
          id: 'test',
          version: '1.0.0',
          prompt: {
            systemTemplate: 'system.mustache',
            userTemplate: 'user.mustache',
          },
          validation: {
            outputSchema: 'output.schema.json',
          },
        },
        systemTemplate: 'System',
        userTemplate: '{{#archive_extract}}{{conversationId}}{{/archive_extract}}{{#brief_generate}}{{contactId}}{{/brief_generate}}',
      };

      const context: RuntimeContext = {
        archive_extract: true,
        conversationId: 'conv-1',
      };

      const result = service.render(bundle, context);

      expect(result.warnings.some((w) => w.path === 'contactId')).toBe(false);
    });
  });
});
