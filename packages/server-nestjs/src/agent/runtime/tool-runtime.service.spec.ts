import { Test, TestingModule } from '@nestjs/testing';
import { ToolRuntime } from './tool-runtime.service';
import type { AgentDefinition } from '../contracts/agent-definition.types';

describe('ToolRuntime', () => {
  let toolRuntime: ToolRuntime;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ToolRuntime],
    }).compile();

    toolRuntime = module.get<ToolRuntime>(ToolRuntime);
  });

  describe('filterTools', () => {
    const availableTools = ['tool1', 'tool2', 'tool3', 'tool4'];

    it('should return empty array when no tools config is provided', () => {
      const definition: AgentDefinition = {
        id: 'test',
        version: '1.0.0',
        prompt: {
          systemTemplate: 'system.mustache',
          userTemplate: 'user.mustache',
        },
      };

      const filtered = toolRuntime.filterTools(definition, availableTools);

      expect(filtered).toEqual([]);
    });

    it('should return empty array when mode is none', () => {
      const definition: AgentDefinition = {
        id: 'test',
        version: '1.0.0',
        prompt: {
          systemTemplate: 'system.mustache',
          userTemplate: 'user.mustache',
        },
        tools: {
          mode: 'none',
        },
      };

      const filtered = toolRuntime.filterTools(definition, availableTools);

      expect(filtered).toEqual([]);
    });

    it('should filter tools using allowlist mode', () => {
      const definition: AgentDefinition = {
        id: 'test',
        version: '1.0.0',
        prompt: {
          systemTemplate: 'system.mustache',
          userTemplate: 'user.mustache',
        },
        tools: {
          mode: 'allowlist',
          allowedTools: ['tool1', 'tool3'],
        },
      };

      const filtered = toolRuntime.filterTools(definition, availableTools);

      expect(filtered).toEqual(['tool1', 'tool3']);
    });

    it('should filter tools using denylist mode', () => {
      const definition: AgentDefinition = {
        id: 'test',
        version: '1.0.0',
        prompt: {
          systemTemplate: 'system.mustache',
          userTemplate: 'user.mustache',
        },
        tools: {
          mode: 'denylist',
          allowedTools: ['tool2', 'tool4'], // 注意：当前实现中 denylist 也使用 allowedTools 字段
        },
      };

      const filtered = toolRuntime.filterTools(definition, availableTools);

      expect(filtered).toEqual(['tool1', 'tool3']);
    });

    it('should return empty array when allowlist has no matching tools', () => {
      const definition: AgentDefinition = {
        id: 'test',
        version: '1.0.0',
        prompt: {
          systemTemplate: 'system.mustache',
          userTemplate: 'user.mustache',
        },
        tools: {
          mode: 'allowlist',
          allowedTools: ['nonexistent'],
        },
      };

      const filtered = toolRuntime.filterTools(definition, availableTools);

      expect(filtered).toEqual([]);
    });

    it('should return all tools when denylist has no matching tools', () => {
      const definition: AgentDefinition = {
        id: 'test',
        version: '1.0.0',
        prompt: {
          systemTemplate: 'system.mustache',
          userTemplate: 'user.mustache',
        },
        tools: {
          mode: 'denylist',
          allowedTools: ['nonexistent'],
        },
      };

      const filtered = toolRuntime.filterTools(definition, availableTools);

      expect(filtered).toEqual(availableTools);
    });
  });
});


