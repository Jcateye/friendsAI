import { Test, TestingModule } from '@nestjs/testing';
import { OutputValidator } from './output-validator.service';
import { AgentDefinitionRegistry } from './agent-definition-registry.service';
import type { AgentDefinitionBundle } from '../contracts/agent-definition.types';
import {
  AgentDefinitionError,
  AgentDefinitionErrorCode,
} from '../contracts/agent-definition-registry.interface';

describe('OutputValidator', () => {
  let service: OutputValidator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OutputValidator],
    }).compile();

    service = module.get<OutputValidator>(OutputValidator);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validate', () => {
    it('should validate correct output', () => {
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
        systemTemplate: '',
        userTemplate: '',
        outputSchema: {
          type: 'object',
          properties: {
            response: { type: 'string' },
            confidence: { type: 'number' },
          },
          required: ['response'],
        },
      };

      const output = {
        response: 'test response',
        confidence: 0.9,
      };

      const result = service.validate(bundle, output);
      expect(result.valid).toBe(true);
    });

    it('should return invalid result for invalid output', () => {
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
        systemTemplate: '',
        userTemplate: '',
        outputSchema: {
          type: 'object',
          properties: {
            response: { type: 'string' },
          },
          required: ['response'],
        },
      };

      const output = {
        // missing required 'response' field
        confidence: 0.9,
      };

      const result = service.validate(bundle, output);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should skip validation if no schema', () => {
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
        systemTemplate: '',
        userTemplate: '',
        // no outputSchema
      };

      const output = { anything: 'goes' };

      const result = service.validate(bundle, output);
      expect(result.valid).toBe(true);
    });

    it('should enforce enum/minItems/maxItems by JSON schema rules', () => {
      const bundle: AgentDefinitionBundle = {
        definition: {
          id: 'json-schema-agent',
          version: '1.0.0',
          prompt: {
            systemTemplate: 'system.mustache',
            userTemplate: 'user.mustache',
          },
          validation: {
            outputSchema: 'output.schema.json',
          },
        },
        systemTemplate: '',
        userTemplate: '',
        outputSchema: {
          type: 'object',
          properties: {
            level: { type: 'string', enum: ['high', 'medium', 'low'] },
            tags: {
              type: 'array',
              items: { type: 'string' },
              minItems: 2,
              maxItems: 3,
            },
          },
          required: ['level', 'tags'],
        },
      };

      const invalid = {
        level: 'urgent',
        tags: ['one'],
      };

      const result = service.validate(bundle, invalid);
      expect(result.valid).toBe(false);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should accept concise Chinese titles/actions for contact_insight output', async () => {
      const registry = new AgentDefinitionRegistry();
      const bundle = await registry.loadDefinition('contact_insight');

      const output = {
        profileSummary:
          '该联系人近期互动稳定，合作意愿较高，建议围绕共同项目推进更高频且更具体的跟进，保持关系热度并创造可见成果。',
        relationshipSignals: [
          {
            type: 'engagement_opportunity',
            description: '最近两次互动反馈积极，且对后续协作给出明确时间窗口，属于可推进状态。',
            strength: 'strong',
          },
        ],
        opportunities: [
          {
            title: '跟进',
            description: '可在本周内发起一次短会，聚焦当前合作议题并确认双方下一步分工与时间节点。',
            priority: 'high',
          },
        ],
        risks: [
          {
            title: '降温',
            description: '若持续缺少明确推进动作，当前积极信号可能转为观望，影响后续协作节奏。',
            severity: 'medium',
          },
        ],
        suggestedActions: [
          {
            action: '发消息',
            reason: '在48小时内发送简洁进展消息可维持互动连续性，并自然引导到下一次沟通。',
            urgency: 'high',
          },
        ],
        openingLines: ['最近你提到的项目方向很有启发，我整理了一个可执行的小提案，想听听你的看法。'],
        citations: [],
        priorityScore: 78,
        reasonTags: ['engagement_opportunity'],
        relationshipRiskLevel: 'medium',
      };

      const result = service.validate(bundle, output);
      expect(result.valid).toBe(true);
    });
  });
});
