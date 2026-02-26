import { Test, TestingModule } from '@nestjs/testing';
import { AgentRuntimeExecutor } from './agent-runtime-executor.service';
import { AgentDefinitionRegistry } from './agent-definition-registry.service';
import { PromptTemplateRenderer } from './prompt-template-renderer.service';
import { OutputValidator } from './output-validator.service';
import { SnapshotService } from '../snapshots/snapshot.service';
import { AiService } from '../../ai/ai.service';
import { TitleSummaryService } from '../capabilities/title_summary/title-summary.service';
import { ContactInsightService } from '../capabilities/contact_insight/contact-insight.service';
import { ArchiveBriefService } from '../capabilities/archive_brief/archive-brief.service';
import { ActionTrackingService } from '../../action-tracking/action-tracking.service';
import type { AgentDefinitionBundle } from '../contracts/agent-definition.types';

describe('AgentRuntimeExecutor', () => {
  let service: AgentRuntimeExecutor;
  let registry: jest.Mocked<AgentDefinitionRegistry>;
  let templateRenderer: jest.Mocked<PromptTemplateRenderer>;
  let outputValidator: jest.Mocked<OutputValidator>;
  let snapshotService: jest.Mocked<SnapshotService>;
  let aiService: jest.Mocked<AiService>;
  let titleSummaryService: jest.Mocked<TitleSummaryService>;
  let contactInsightService: jest.Mocked<ContactInsightService>;
  let archiveBriefService: jest.Mocked<ArchiveBriefService>;
  let actionTrackingService: jest.Mocked<ActionTrackingService>;

  const mockBundle: AgentDefinitionBundle = {
    definition: {
      id: 'test-agent',
      version: '1.0.0',
      prompt: {
        systemTemplate: 'system.mustache',
        userTemplate: 'user.mustache',
      },
      validation: {
        outputSchema: 'output.schema.json',
      },
      cache: {
        ttl: 3600,
      },
    },
    systemTemplate: 'You are a helpful assistant.',
    userTemplate: 'User: {{input}}',
    outputSchema: {
      type: 'object',
      properties: {
        response: { type: 'string' },
        confidence: { type: 'number' },
      },
      required: ['response'],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentRuntimeExecutor,
        {
          provide: AgentDefinitionRegistry,
          useValue: {
            loadDefinition: jest.fn(),
          },
        },
        {
          provide: PromptTemplateRenderer,
          useValue: {
            render: jest.fn(),
          },
        },
        {
          provide: OutputValidator,
          useValue: {
            validate: jest.fn(),
          },
        },
        {
          provide: SnapshotService,
          useValue: {
            findSnapshot: jest.fn().mockResolvedValue({ snapshot: null, cached: false }),
            createSnapshot: jest.fn(),
          },
        },
        {
          provide: AiService,
          useValue: {
            streamChat: jest.fn(),
          },
        },
        {
          provide: TitleSummaryService,
          useValue: {
            generate: jest.fn(),
          },
        },
        {
          provide: ContactInsightService,
          useValue: {
            generate: jest.fn(),
          },
        },
        {
          provide: ArchiveBriefService,
          useValue: {
            extractArchive: jest.fn(),
            generateBrief: jest.fn(),
          },
        },
        {
          provide: ActionTrackingService,
          useValue: {
            recordSuggestionShown: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AgentRuntimeExecutor>(AgentRuntimeExecutor);
    registry = module.get(AgentDefinitionRegistry);
    templateRenderer = module.get(PromptTemplateRenderer);
    outputValidator = module.get(OutputValidator);
    snapshotService = module.get(SnapshotService);
    aiService = module.get(AiService);
    titleSummaryService = module.get(TitleSummaryService);
    contactInsightService = module.get(ContactInsightService);
    archiveBriefService = module.get(ArchiveBriefService);
    actionTrackingService = module.get(ActionTrackingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute - generic flow', () => {
    it('should execute generic agent successfully', async () => {
      const agentId = 'test-agent';
      const input = { message: 'Hello' };

      registry.loadDefinition.mockResolvedValue(mockBundle);
      templateRenderer.render.mockReturnValue({
        system: 'You are a helpful assistant.',
        user: 'User: Hello',
        warnings: [],
      });

      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: '{"response":"Hello!","confidence":0.95}' } }] };
      })();

      aiService.streamChat.mockResolvedValue(mockStream as any);
      outputValidator.validate.mockReturnValue({ valid: true });
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });
      snapshotService.createSnapshot.mockResolvedValue({
        id: 'snapshot-123',
      } as any);

      const result = await service.execute(agentId, null, input);

      expect(result.cached).toBe(false);
      expect(result.snapshotId).toBe('snapshot-123');
      expect(result.data).toEqual({
        response: 'Hello!',
        confidence: 0.95,
      });
    });

    it('should pass llm config to AiService.streamChat', async () => {
      const agentId = 'test-agent';
      const input = { message: 'Hello' };

      registry.loadDefinition.mockResolvedValue(mockBundle);
      templateRenderer.render.mockReturnValue({
        system: 'You are a helpful assistant.',
        user: 'User: Hello',
        warnings: [],
      });

      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: '{"response":"Hello!","confidence":0.95}' } }] };
      })();

      aiService.streamChat.mockResolvedValue(mockStream as any);
      outputValidator.validate.mockReturnValue({ valid: true });
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });
      snapshotService.createSnapshot.mockResolvedValue({
        id: 'snapshot-123',
      } as any);

      const llm = {
        provider: 'gemini' as const,
        model: 'gemini-2.0-flash',
        providerOptions: {
          google: {
            safetySettings: [{ category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }],
          },
        },
      };

      await service.execute(agentId, null, input, { llm });

      expect(aiService.streamChat).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          llm,
        }),
      );
    });

    it('should return cached result when available', async () => {
      const agentId = 'test-agent';
      const input = { message: 'Hello' };

      registry.loadDefinition.mockResolvedValue(mockBundle);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: {
          id: 'snapshot-cached',
          output: { response: 'Cached response', confidence: 0.9 },
          createdAt: new Date(),
        } as any,
        cached: true,
      });

      const result = await service.execute(agentId, null, input);

      expect(result.cached).toBe(true);
      expect(result.snapshotId).toBe('snapshot-cached');
      expect(result.data).toEqual({
        response: 'Cached response',
        confidence: 0.9,
      });
      expect(templateRenderer.render).not.toHaveBeenCalled();
      expect(aiService.streamChat).not.toHaveBeenCalled();
    });

    it('should bypass cache when forceRefresh is true', async () => {
      const agentId = 'test-agent';
      const input = { message: 'Hello' };

      registry.loadDefinition.mockResolvedValue(mockBundle);
      templateRenderer.render.mockReturnValue({
        system: 'System prompt',
        user: 'User: Hello',
        warnings: [],
      });

      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: '{"response":"Fresh response","confidence":1.0}' } }] };
      })();

      aiService.streamChat.mockResolvedValue(mockStream as any);
      outputValidator.validate.mockReturnValue({ valid: true });
      snapshotService.createSnapshot.mockResolvedValue({
        id: 'snapshot-123',
      } as any);

      const result = await service.execute(agentId, null, input, { forceRefresh: true });

      expect(result.cached).toBe(false);
      expect(result.data.response).toBe('Fresh response');
      expect(snapshotService.findSnapshot).not.toHaveBeenCalled();
    });

    it('should return agent_not_found runtime error for non-existent agent', async () => {
      const agentId = 'non-existent';

      registry.loadDefinition.mockRejectedValue(new Error('Agent definition not found'));

      await expect(service.execute(agentId, null, {})).rejects.toMatchObject({
        code: 'agent_not_found',
      });
    });

    it('should return output_validation_failed runtime error for invalid output', async () => {
      const agentId = 'test-agent';
      const input = { message: 'Hello' };

      registry.loadDefinition.mockResolvedValue(mockBundle);
      templateRenderer.render.mockReturnValue({
        system: 'System prompt',
        user: 'User: Hello',
        warnings: [],
      });

      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: '{"confidence":0.5}' } }] }; // Missing required 'response'
      })();

      aiService.streamChat.mockResolvedValue(mockStream as any);
      outputValidator.validate.mockReturnValue({
        valid: false,
        errors: ['Missing required field: response'],
      });
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      await expect(service.execute(agentId, null, input)).rejects.toMatchObject({
        code: 'output_validation_failed',
      });
    });

    it('should handle non-JSON AI responses', async () => {
      const agentId = 'test-agent';
      const input = { message: 'Hello' };

      registry.loadDefinition.mockResolvedValue(mockBundle);
      templateRenderer.render.mockReturnValue({
        system: 'System prompt',
        user: 'User: Hello',
        warnings: [],
      });

      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: 'This is plain text' } }] };
      })();

      aiService.streamChat.mockResolvedValue(mockStream as any);
      outputValidator.validate.mockReturnValue({ valid: true });
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });
      snapshotService.createSnapshot.mockResolvedValue({
        id: 'snapshot-123',
      } as any);

      const result = await service.execute(agentId, null, input);

      expect(result.data).toEqual({ content: 'This is plain text' });
    });

    it('should normalize title_summary output from plain text response', async () => {
      const agentId = 'title_summary';
      const input = { conversationId: 'conv-123' };

      registry.loadDefinition.mockResolvedValue({
        ...mockBundle,
        definition: {
          ...mockBundle.definition,
          id: 'title_summary',
        },
        outputSchema: {
          type: 'object',
          required: ['title', 'summary'],
          properties: {
            title: { type: 'string' },
            summary: { type: 'string' },
          },
        },
      });
      templateRenderer.render.mockReturnValue({
        system: 'System prompt',
        user: 'User: Hello',
        warnings: [],
      });

      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: '你好，我在的。' } }] };
      })();

      aiService.streamChat.mockResolvedValue(mockStream as any);
      outputValidator.validate.mockReturnValue({ valid: true });
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });
      snapshotService.createSnapshot.mockResolvedValue({
        id: 'snapshot-123',
      } as any);

      const result = await service.execute(agentId, null, input, { skipServiceRouting: true });

      expect(result.data).toMatchObject({
        title: expect.any(String),
        summary: expect.any(String),
      });
      expect((result.data as Record<string, unknown>).summary).toBe('你好，我在的。');
    });

    it('should handle markdown-wrapped JSON', async () => {
      const agentId = 'test-agent';
      const input = { message: 'Hello' };

      registry.loadDefinition.mockResolvedValue(mockBundle);
      templateRenderer.render.mockReturnValue({
        system: 'System prompt',
        user: 'User: Hello',
        warnings: [],
      });

      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: '```json\n{"response":"Hello","confidence":0.9}\n```' } }] };
      })();

      aiService.streamChat.mockResolvedValue(mockStream as any);
      outputValidator.validate.mockReturnValue({ valid: true });
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });
      snapshotService.createSnapshot.mockResolvedValue({
        id: 'snapshot-123',
      } as any);

      const result = await service.execute(agentId, null, input);

      expect(result.data).toEqual({ response: 'Hello', confidence: 0.9 });
    });

    it('should handle snapshot save failure gracefully', async () => {
      const agentId = 'test-agent';
      const input = { message: 'Hello' };

      registry.loadDefinition.mockResolvedValue(mockBundle);
      templateRenderer.render.mockReturnValue({
        system: 'System prompt',
        user: 'User: Hello',
        warnings: [],
      });

      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: '{"response":"Hello","confidence":0.9}' } }] };
      })();

      aiService.streamChat.mockResolvedValue(mockStream as any);
      outputValidator.validate.mockReturnValue({ valid: true });
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });
      snapshotService.createSnapshot.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await service.execute(agentId, null, input);

      // Should still return result even if snapshot save fails
      expect(result.cached).toBe(false);
      expect(result.snapshotId).toBeUndefined();
      expect(result.data.response).toBe('Hello');
    });
  });

  describe('execute - title_summary routing', () => {
    it('should route to TitleSummaryService for title_summary agent', async () => {
      const agentId = 'title_summary';
      const input = { conversationId: 'conv-123' };
      const userId = 'user-123';

      titleSummaryService.generate.mockResolvedValue({
        conversationId: 'conv-123',
        title: 'Test Title',
        summary: 'Test Summary',
        sourceHash: 'hash-123',
        generatedAt: Date.now(),
      });

      const result = await service.execute(agentId, null, input, { userId });

      expect(titleSummaryService.generate).toHaveBeenCalledWith(
        { conversationId: 'conv-123', userId },
        { forceRefresh: undefined }
      );
      expect(result.data).toHaveProperty('title', 'Test Title');
    });

    it('should return cached title_summary result', async () => {
      const agentId = 'title_summary';
      const input = { conversationId: 'conv-123' };
      const userId = 'user-123';

      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: {
          id: 'snapshot-cached',
          output: {
            title: 'Cached Title',
            summary: 'Cached Summary',
          },
          createdAt: new Date(),
        } as any,
        cached: true,
      });

      const result = await service.execute(agentId, null, input, { userId });

      expect(result.cached).toBe(true);
      expect(result.snapshotId).toBe('snapshot-cached');
      expect(titleSummaryService.generate).not.toHaveBeenCalled();
    });
  });

  describe('execute - contact_insight routing', () => {
    it('should route to ContactInsightService for contact_insight agent', async () => {
      const agentId = 'contact_insight';
      const input = { contactId: 'contact-123', depth: 'standard' };
      const userId = 'user-123';

      contactInsightService.generate.mockResolvedValue({
        profileSummary: 'VIP prospect',
        relationshipSignals: [],
        opportunities: [],
        risks: [],
        suggestedActions: [],
        openingLines: [],
        citations: [],
        sourceHash: 'hash-123',
        generatedAt: Date.now(),
      });

      const result = await service.execute(agentId, null, input, { userId });

      expect(contactInsightService.generate).toHaveBeenCalledWith(
        { contactId: 'contact-123', depth: 'standard', userId },
        { forceRefresh: undefined }
      );
      expect(result.data).toHaveProperty('profileSummary', 'VIP prospect');
    });

    it('should throw error when userId is missing for contact_insight', async () => {
      const agentId = 'contact_insight';
      const input = { contactId: 'contact-123' };

      await expect(service.execute(agentId, null, input)).rejects.toMatchObject({
        code: 'invalid_input',
        message: 'userId is required',
      });
    });
  });

  describe('execute - archive_brief routing', () => {
    it('should route to archive_brief.extractArchive for archive_extract operation', async () => {
      const agentId = 'archive_brief';
      const operation = 'archive_extract';
      const input = { conversationId: 'conv-123' };
      const userId = 'user-123';

      archiveBriefService.extractArchive.mockResolvedValue({
        operation: 'archive_extract',
        id: 'archive-123',
        status: 'completed',
        summary: 'Extracted archive',
        payload: {},
        sourceHash: 'hash-123',
        generatedAt: Date.now(),
      });

      const result = await service.execute(agentId, operation, input, { userId });

      expect(archiveBriefService.extractArchive).toHaveBeenCalledWith(
        { conversationId: 'conv-123', userId },
        { forceRefresh: undefined }
      );
      expect(result.data).toHaveProperty('operation', 'archive_extract');
    });

    it('should route to archive_brief.generateBrief for brief_generate operation', async () => {
      const agentId = 'archive_brief';
      const operation = 'brief_generate';
      const input = { contactId: 'contact-123' };
      const userId = 'user-123';

      archiveBriefService.generateBrief.mockResolvedValue({
        operation: 'brief_generate',
        id: 'brief-123',
        contact_id: 'contact-123',
        content: 'Generated brief',
        generated_at: '2024-01-15T10:00:00Z',
        source_hash: 'hash-123',
      });

      const result = await service.execute(agentId, operation, input, { userId });

      expect(archiveBriefService.generateBrief).toHaveBeenCalledWith(
        { contactId: 'contact-123', userId },
        { forceRefresh: undefined }
      );
      expect(result.data).toHaveProperty('operation', 'brief_generate');
    });

    it('should throw error for invalid archive_brief operation', async () => {
      const agentId = 'archive_brief';
      const operation = 'invalid_operation';
      const input = { contactId: 'contact-123' };
      const userId = 'user-123';

      await expect(service.execute(agentId, operation, input, { userId })).rejects.toMatchObject({
        code: 'agent_operation_invalid',
      });
    });
  });

  describe('scope determination', () => {
    it('should determine conversation scope when conversationId is present', async () => {
      const agentId = 'test-agent';
      const input = { conversationId: 'conv-123' };

      registry.loadDefinition.mockResolvedValue(mockBundle);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });
      templateRenderer.render.mockReturnValue({
        system: 'System',
        user: 'User',
        warnings: [],
      });

      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: '{"response":"OK"}' } }] };
      })();
      aiService.streamChat.mockResolvedValue(mockStream as any);
      outputValidator.validate.mockReturnValue({ valid: true });
      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);

      await service.execute(agentId, null, input);

      const createSnapshotCall = snapshotService.createSnapshot.mock.calls[0][0] as any;
      expect(createSnapshotCall.scopeType).toBe('conversation');
      expect(createSnapshotCall.scopeId).toBe('conv-123');
    });

    it('should determine contact scope when contactId is present', async () => {
      const agentId = 'test-agent';
      const input = { contactId: 'contact-123' };

      registry.loadDefinition.mockResolvedValue(mockBundle);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });
      templateRenderer.render.mockReturnValue({
        system: 'System',
        user: 'User',
        warnings: [],
      });

      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: '{"response":"OK"}' } }] };
      })();
      aiService.streamChat.mockResolvedValue(mockStream as any);
      outputValidator.validate.mockReturnValue({ valid: true });
      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);

      await service.execute(agentId, null, input);

      const createSnapshotCall = snapshotService.createSnapshot.mock.calls[0][0] as any;
      expect(createSnapshotCall.scopeType).toBe('contact');
      expect(createSnapshotCall.scopeId).toBe('contact-123');
    });

    it('should default to user scope when no specific ID is present', async () => {
      const agentId = 'test-agent';
      const input = { message: 'Hello' };
      const userId = 'user-123';

      registry.loadDefinition.mockResolvedValue(mockBundle);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });
      templateRenderer.render.mockReturnValue({
        system: 'System',
        user: 'User',
        warnings: [],
      });

      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: '{"response":"OK"}' } }] };
      })();
      aiService.streamChat.mockResolvedValue(mockStream as any);
      outputValidator.validate.mockReturnValue({ valid: true });
      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);

      await service.execute(agentId, null, input, { userId });

      const createSnapshotCall = snapshotService.createSnapshot.mock.calls[0][0] as any;
      expect(createSnapshotCall.scopeType).toBe('user');
      expect(createSnapshotCall.scopeId).toBe('user-123');
    });

    it('should use userId scope for user-scope agents even if options.conversationId is present', async () => {
      const agentId = 'network_action';
      const input = { limit: 10 };
      const userId = 'user-123';

      registry.loadDefinition.mockResolvedValue(mockBundle);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });
      templateRenderer.render.mockReturnValue({
        system: 'System',
        user: 'User',
        warnings: [],
      });

      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: '{"response":"OK"}' } }] };
      })();
      aiService.streamChat.mockResolvedValue(mockStream as any);
      outputValidator.validate.mockReturnValue({ valid: true });
      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);

      await service.execute(agentId, null, input, {
        userId,
        conversationId: 'network_action',
      });

      const findSnapshotCall = snapshotService.findSnapshot.mock.calls[0][0] as any;
      const createSnapshotCall = snapshotService.createSnapshot.mock.calls[0][0] as any;
      expect(findSnapshotCall.scopeType).toBe('user');
      expect(findSnapshotCall.scopeId).toBe(userId);
      expect(createSnapshotCall.scopeType).toBe('user');
      expect(createSnapshotCall.scopeId).toBe(userId);
    });
  });

  describe('source hash computation', () => {
    it('should compute consistent hash for same input', async () => {
      const agentId = 'test-agent';
      const input = { message: 'Hello', userId: 'user-123' };

      registry.loadDefinition.mockResolvedValue(mockBundle);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });
      templateRenderer.render.mockReturnValue({
        system: 'System',
        user: 'User',
        warnings: [],
      });

      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: '{"response":"OK"}' } }] };
      })();
      aiService.streamChat.mockResolvedValue(mockStream as any);
      outputValidator.validate.mockReturnValue({ valid: true });
      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);

      await service.execute(agentId, null, input);

      const findSnapshotCall = snapshotService.findSnapshot.mock.calls[0][0] as any;
      const createSnapshotCall = snapshotService.createSnapshot.mock.calls[0][0] as any;

      expect(findSnapshotCall.sourceHash).toBe(createSnapshotCall.sourceHash);
      expect(findSnapshotCall.sourceHash).toHaveLength(64); // SHA256 hex
    });

    it('should respect sourceHashFields configuration', async () => {
      const agentId = 'test-agent';
      const input = {
        message: 'Hello',
        userId: 'user-123',
        extraData: 'should be ignored',
      };

      const bundleWithFields: AgentDefinitionBundle = {
        ...mockBundle,
        definition: {
          ...mockBundle.definition,
          cache: {
            ttl: 3600,
            sourceHashFields: ['message', 'userId'],
          },
        },
      };

      registry.loadDefinition.mockResolvedValue(bundleWithFields);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });
      templateRenderer.render.mockReturnValue({
        system: 'System',
        user: 'User',
        warnings: [],
      });

      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: '{"response":"OK"}' } }] };
      })();
      aiService.streamChat.mockResolvedValue(mockStream as any);
      outputValidator.validate.mockReturnValue({ valid: true });
      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);

      await service.execute(agentId, null, input);

      const findSnapshotCall = snapshotService.findSnapshot.mock.calls[0][0] as any;
      // The sourceHash should only include specified fields
      expect(findSnapshotCall.sourceHash).toBeDefined();
    });
  });

  describe('skipServiceRouting option', () => {
    it('should use generic flow when skipServiceRouting is true', async () => {
      const agentId = 'title_summary';
      const input = { conversationId: 'conv-123' };

      registry.loadDefinition.mockResolvedValue(mockBundle);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });
      templateRenderer.render.mockReturnValue({
        system: 'System',
        user: 'User',
        warnings: [],
      });

      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: '{"response":"OK"}' } }] };
      })();
      aiService.streamChat.mockResolvedValue(mockStream as any);
      outputValidator.validate.mockReturnValue({ valid: true });
      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);

      const result = await service.execute(agentId, null, input, { skipServiceRouting: true });

      expect(titleSummaryService.generate).not.toHaveBeenCalled();
      expect(result.data).toMatchObject({
        title: expect.any(String),
        summary: expect.any(String),
      });
    });
  });
});
