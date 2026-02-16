import { Test, TestingModule } from '@nestjs/testing';
import { TemplateContextBuilder } from './template-context-builder.service';
import type { AgentRunRequest } from '../agent.types';

describe('TemplateContextBuilder', () => {
  let service: TemplateContextBuilder;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateContextBuilder],
    }).compile();

    service = module.get<TemplateContextBuilder>(TemplateContextBuilder);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildContext', () => {
    it('should build basic context from input', () => {
      const request: AgentRunRequest = {
        agentId: 'contact_insight',
        input: {
          contact: {
            name: 'John Doe',
          },
        },
      };

      const context = service.buildContext(request);

      expect(context.agentId).toBe('contact_insight');
      expect(context.input).toEqual(request.input);
      expect(context.contact).toEqual({ name: 'John Doe' });
    });

    it('should include session information when provided', () => {
      const request: AgentRunRequest = {
        agentId: 'contact_insight',
        input: {},
        sessionId: 'session-123',
      };

      const context = service.buildContext(request);

      expect(context.sessionId).toBe('session-123');
    });

    it('should include conversation information when provided', () => {
      const request: AgentRunRequest = {
        agentId: 'contact_insight',
        input: {},
        conversationId: 'conv-456',
      };

      const context = service.buildContext(request);

      expect(context.conversationId).toBe('conv-456');
    });

    it('should include user information when provided', () => {
      const request: AgentRunRequest = {
        agentId: 'contact_insight',
        input: {},
        userId: 'user-789',
      };

      const context = service.buildContext(request);

      expect(context.userId).toBe('user-789');
    });

    it('should include operation when provided', () => {
      const request: AgentRunRequest = {
        agentId: 'contact_insight',
        input: {},
        operation: 'analyze',
      };

      const context = service.buildContext(request);

      expect(context.operation).toBe('analyze');
    });

    it('should include options when provided', () => {
      const request: AgentRunRequest = {
        agentId: 'contact_insight',
        input: {},
        options: {
          useCache: true,
          forceRefresh: false,
        },
      };

      const context = service.buildContext(request);

      expect(context.options).toEqual({
        useCache: true,
        forceRefresh: false,
      });
    });

    it('should merge additional context', () => {
      const request: AgentRunRequest = {
        agentId: 'contact_insight',
        input: {
          contact: {
            name: 'John Doe',
          },
        },
      };

      const context = service.buildContext(request, {
        customField: 'custom value',
        nested: {
          field: 'nested value',
        },
      });

      expect(context.customField).toBe('custom value');
      expect(context.nested).toEqual({ field: 'nested value' });
    });

    it('should remove undefined values', () => {
      const request: AgentRunRequest = {
        agentId: 'contact_insight',
        input: {},
        userId: undefined,
        sessionId: undefined,
      };

      const context = service.buildContext(request);

      expect(context.userId).toBeUndefined();
      expect(context.sessionId).toBeUndefined();
      expect('userId' in context).toBe(false);
      expect('sessionId' in context).toBe(false);
    });

    it('should expand input fields to top level', () => {
      const request: AgentRunRequest = {
        agentId: 'contact_insight',
        input: {
          contact: {
            name: 'John Doe',
            company: 'Acme Corp',
          },
          metadata: {
            source: 'api',
          },
        },
      };

      const context = service.buildContext(request);

      // input 应该保留
      expect(context.input).toEqual(request.input);
      // 同时展开到顶层
      expect(context.contact).toEqual({
        name: 'John Doe',
        company: 'Acme Corp',
      });
      expect(context.metadata).toEqual({
        source: 'api',
      });
    });
  });
});


