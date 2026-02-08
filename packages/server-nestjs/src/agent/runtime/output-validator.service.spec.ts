import { Test, TestingModule } from '@nestjs/testing';
import { OutputValidator } from './output-validator.service';
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
  });
});
