import { Test, TestingModule } from '@nestjs/testing';
import { MemoryRuntime } from './memory-runtime.service';
import type { AgentDefinition } from '../contracts/agent-definition.types';
import type { RuntimeContext } from '../contracts/runtime.types';

describe('MemoryRuntime', () => {
  let memoryRuntime: MemoryRuntime;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MemoryRuntime],
    }).compile();

    memoryRuntime = module.get<MemoryRuntime>(MemoryRuntime);
  });

  describe('buildMemory', () => {
    it('should return basic memory context', async () => {
      const definition: AgentDefinition = {
        id: 'test',
        version: '1.0.0',
        prompt: {
          systemTemplate: 'system.mustache',
          userTemplate: 'user.mustache',
        },
      };

      const context: RuntimeContext = {
        input: 'test input',
      };

      const memory = await memoryRuntime.buildMemory(definition, context);

      expect(memory).toBeDefined();
      // 无记忆策略时返回空对象
      expect(Object.keys(memory)).toHaveLength(0);
    });

    it('should handle conversation memory strategy', async () => {
      const definition: AgentDefinition = {
        id: 'test',
        version: '1.0.0',
        prompt: {
          systemTemplate: 'system.mustache',
          userTemplate: 'user.mustache',
        },
        memory: {
          strategy: 'conversation',
          maxTokens: 2000,
        },
      };

      const context: RuntimeContext = {
        input: 'test input',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
        ],
      };

      const memory = await memoryRuntime.buildMemory(definition, context);

      expect(memory).toBeDefined();
      expect(memory.messages).toBeDefined();
      expect(Array.isArray(memory.messages)).toBe(true);
      expect(memory.messages?.length).toBe(2);
    });

    it('should handle contact memory strategy', async () => {
      const definition: AgentDefinition = {
        id: 'test',
        version: '1.0.0',
        prompt: {
          systemTemplate: 'system.mustache',
          userTemplate: 'user.mustache',
        },
        memory: {
          strategy: 'contact',
        },
      };

      const context: RuntimeContext = {
        input: 'test input',
        contact: {
          name: 'John Doe',
          company: 'Acme Corp',
        },
      };

      const memory = await memoryRuntime.buildMemory(definition, context);

      expect(memory).toBeDefined();
      expect(memory.contact).toBeDefined();
      expect((memory.contact as { name: string }).name).toBe('John Doe');
    });

    it('should handle custom memory strategy', async () => {
      const definition: AgentDefinition = {
        id: 'test',
        version: '1.0.0',
        prompt: {
          systemTemplate: 'system.mustache',
          userTemplate: 'user.mustache',
        },
        memory: {
          strategy: 'custom',
        },
      };

      const context: RuntimeContext = {
        input: 'test input',
        memory: {
          customField: 'custom value',
        },
      };

      const memory = await memoryRuntime.buildMemory(definition, context);

      expect(memory).toBeDefined();
      expect((memory as { customField: string }).customField).toBe('custom value');
    });

    it('should limit messages by maxTokens', async () => {
      const definition: AgentDefinition = {
        id: 'test',
        version: '1.0.0',
        prompt: {
          systemTemplate: 'system.mustache',
          userTemplate: 'user.mustache',
        },
        memory: {
          strategy: 'conversation',
          maxTokens: 500, // 大约 5 条消息
        },
      };

      const messages = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }));

      const context: RuntimeContext = {
        input: 'test input',
        messages,
      };

      const memory = await memoryRuntime.buildMemory(definition, context);

      expect(memory.messages).toBeDefined();
      // 应该限制在 maxTokens 范围内（大约 5 条消息）
      expect(memory.messages?.length).toBeLessThanOrEqual(5);
    });
  });
});


