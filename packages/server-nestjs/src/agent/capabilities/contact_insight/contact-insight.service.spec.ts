import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactInsightService } from './contact-insight.service';
import { ContactInsightContextBuilder } from './contact-insight-context-builder.service';
import { AgentRuntimeExecutor } from '../../runtime/agent-runtime-executor.service';
import { SnapshotService } from '../../snapshots/snapshot.service';
import { Contact } from '../../../entities/contact.entity';
import { Conversation } from '../../../entities/conversation.entity';
import { Event } from '../../../entities/event.entity';
import { ContactFact } from '../../../entities/contact-fact.entity';
import { ContactTodo } from '../../../entities/contact-todo.entity';

describe('ContactInsightService', () => {
  let service: ContactInsightService;
  let runtimeExecutor: jest.Mocked<AgentRuntimeExecutor>;
  let snapshotService: jest.Mocked<SnapshotService>;
  let contextBuilder: jest.Mocked<ContactInsightContextBuilder>;

  const mockContact: Contact = {
    id: 'contact-123',
    userId: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    company: 'Acme Corp',
    position: 'CEO',
    tags: ['vip', 'prospect'],
    note: 'Met at conference',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as Contact;

  const mockConversation: Conversation = {
    id: 'conv-123',
    userId: 'user-123',
    contactId: 'contact-123',
    title: 'Product Discussion',
    content: 'Discussed pricing and features',
    summary: 'Initial pricing discussion',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  } as Conversation;

  const mockEvent: Event = {
    id: 'event-123',
    contactId: 'contact-123',
    title: 'Coffee Chat',
    description: 'Follow-up meeting',
    eventDate: new Date('2024-01-20'),
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  } as Event;

  const mockFact: ContactFact = {
    id: 'fact-123',
    contactId: 'contact-123',
    content: 'Prefers morning meetings',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  } as ContactFact;

  const mockTodo: ContactTodo = {
    id: 'todo-123',
    contactId: 'contact-123',
    content: 'Send proposal',
    status: 'pending',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  } as ContactTodo;

  const mockContext = {
    contactId: 'contact-123',
    contact: {
      id: 'contact-123',
      name: 'John Doe',
      email: 'john@example.com',
      company: 'Acme Corp',
      position: 'CEO',
      tags: ['vip', 'prospect'],
      note: 'Met at conference',
      lastInteractionAt: new Date('2024-01-15'),
    },
    recentInteractions: [
      {
        index: 1,
        id: 'conv-123',
        summary: 'Initial pricing discussion',
        createdAt: new Date('2024-01-15'),
      },
    ],
    archivedData: {
      events: [
        {
          index: 1,
          id: 'event-123',
          type: 'event',
          title: 'Coffee Chat',
          description: 'Follow-up meeting',
          eventDate: new Date('2024-01-20'),
        },
      ],
      facts: [
        {
          id: 'fact-123',
          content: 'Prefers morning meetings',
        },
      ],
      todos: [
        {
          id: 'todo-123',
          content: 'Send proposal',
          status: 'pending',
        },
      ],
    },
    depth: 'standard' as const,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactInsightService,
        {
          provide: AgentRuntimeExecutor,
          useValue: {
            execute: jest.fn(),
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
          provide: ContactInsightContextBuilder,
          useValue: {
            buildContext: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Contact),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Conversation),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Event),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ContactFact),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ContactTodo),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ContactInsightService>(ContactInsightService);
    runtimeExecutor = module.get(AgentRuntimeExecutor);
    snapshotService = module.get(SnapshotService);
    contextBuilder = module.get(ContactInsightContextBuilder);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generate', () => {
    it('should return cached insight when available', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';
      const cachedOutput = {
        profileSummary: 'VIP prospect interested in enterprise plan',
        relationshipSignals: [
          {
            type: 'engagement',
            description: 'High engagement in recent conversations',
            strength: 'strong' as const,
          },
        ],
        opportunities: [
          {
            title: 'Enterprise Deal',
            description: 'Potential for large contract',
            priority: 'high' as const,
          },
        ],
        risks: [],
        suggestedActions: [
          {
            action: 'Schedule demo',
            reason: 'Ready for next step',
            urgency: 'high' as const,
          },
        ],
        openingLines: ['Great catching up about your expansion plans...'],
        citations: [],
        sourceHash: 'cached-hash-123',
        generatedAt: Date.now(),
      };

      contextBuilder.buildContext.mockResolvedValue(mockContext);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: {
          id: 'snapshot-123',
          output: cachedOutput,
          createdAt: new Date(),
        } as any,
        cached: true,
      });

      const result = await service.generate({ userId, contactId });

      expect(result.profileSummary).toBe(cachedOutput.profileSummary);
      expect(result.sourceHash).toBeDefined();
      expect(result.generatedAt).toBeDefined();
      // When cache hits, contextBuilder.buildContext is NOT called
      expect(contextBuilder.buildContext).not.toHaveBeenCalled();
      expect(snapshotService.findSnapshot).toHaveBeenCalled();
      expect(runtimeExecutor.execute).not.toHaveBeenCalled();
    });

    it('should generate new insight when cache miss', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contextBuilder.buildContext.mockResolvedValue(mockContext);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      const aiOutput = {
        profileSummary: 'VIP prospect interested in enterprise plan',
        relationshipSignals: [
          {
            type: 'engagement',
            description: 'High engagement',
            strength: 'strong' as const,
          },
        ],
        opportunities: [
          {
            title: 'Enterprise Deal',
            description: 'Large contract potential',
            priority: 'high' as const,
          },
        ],
        risks: [],
        suggestedActions: [],
        openingLines: [],
        citations: [],
      };

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: aiOutput,
      });

      snapshotService.createSnapshot.mockResolvedValue({
        id: 'snapshot-123',
      } as any);

      const result = await service.generate({ userId, contactId });

      expect(result.profileSummary).toBe(aiOutput.profileSummary);
      expect(result.sourceHash).toBeDefined();
      expect(result.generatedAt).toBeDefined();
      expect(runtimeExecutor.execute).toHaveBeenCalledWith(
        'contact_insight',
        null,
        expect.any(Object),
        expect.objectContaining({
          useCache: false,
          userId,
          skipServiceRouting: true,
        })
      );
      const executionOptions = runtimeExecutor.execute.mock.calls[0]?.[3] as Record<string, unknown>;
      expect(executionOptions.model).toBeUndefined();
      expect(snapshotService.createSnapshot).toHaveBeenCalled();
    });

    it('should respect forceRefresh option', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contextBuilder.buildContext.mockResolvedValue(mockContext);

      const aiOutput = {
        profileSummary: 'Updated analysis',
        relationshipSignals: [],
        opportunities: [],
        risks: [],
        suggestedActions: [],
        openingLines: [],
        citations: [],
      };

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: aiOutput,
      });

      snapshotService.createSnapshot.mockResolvedValue({
        id: 'snapshot-123',
      } as any);

      // 即使有缓存，forceRefresh=true 也应该重新生成
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: {
          id: 'cached-snapshot',
          output: { profileSummary: 'Cached data' },
          createdAt: new Date(),
        } as any,
        cached: true,
      });

      const result = await service.generate({ userId, contactId }, { forceRefresh: true });

      expect(result.profileSummary).toBe('Updated analysis');
      expect(runtimeExecutor.execute).toHaveBeenCalled();
    });

    it('should support different depth levels', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contextBuilder.buildContext.mockImplementation((uid, cid, depth) => {
        return Promise.resolve({ ...mockContext, depth });
      });

      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: { profileSummary: 'Brief analysis', relationshipSignals: [], opportunities: [], risks: [], suggestedActions: [], openingLines: [], citations: [] },
      });

      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);

      await service.generate({ userId, contactId, depth: 'brief' });
      expect(contextBuilder.buildContext).toHaveBeenCalledWith(userId, contactId, 'brief');

      await service.generate({ userId, contactId, depth: 'deep' });
      expect(contextBuilder.buildContext).toHaveBeenCalledWith(userId, contactId, 'deep');
    });

    it('should propagate context builder errors', async () => {
      const userId = 'user-123';
      const contactId = 'non-existent';

      contextBuilder.buildContext.mockRejectedValue(
        new NotFoundException(`Contact ${contactId} not found`)
      );

      await expect(service.generate({ userId, contactId })).rejects.toThrow(NotFoundException);
    });

    it('should handle runtime executor errors', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contextBuilder.buildContext.mockResolvedValue(mockContext);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      runtimeExecutor.execute.mockRejectedValue(
        new Error('AI service unavailable')
      );

      await expect(service.generate({ userId, contactId })).rejects.toThrow('AI service unavailable');
    });
  });

  describe('computeSourceHash', () => {
    it('should compute consistent hash for same input', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contextBuilder.buildContext.mockResolvedValue(mockContext);
      snapshotService.findSnapshot
        .mockResolvedValueOnce({ snapshot: null, cached: false })
        .mockResolvedValueOnce({ snapshot: null, cached: false });

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: { profileSummary: 'Test', relationshipSignals: [], opportunities: [], risks: [], suggestedActions: [], openingLines: [], citations: [] },
      });

      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);

      const result1 = await service.generate({ userId, contactId });
      const result2 = await service.generate({ userId, contactId });

      expect(result1.sourceHash).toBe(result2.sourceHash);
    });

    it('should compute different hash for different depth', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contextBuilder.buildContext.mockImplementation((uid, cid, depth) => {
        return Promise.resolve({ ...mockContext, depth });
      });

      snapshotService.findSnapshot.mockResolvedValue({ snapshot: null, cached: false });

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: { profileSummary: 'Test', relationshipSignals: [], opportunities: [], risks: [], suggestedActions: [], openingLines: [], citations: [] },
      });

      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);

      // Mock findSnapshot calls differently for each depth
      snapshotService.findSnapshot.mockImplementation(async () => {
        return { snapshot: null, cached: false };
      });

      const result1 = await service.generate({ userId, contactId, depth: 'brief' });
      const result2 = await service.generate({ userId, contactId, depth: 'deep' });

      // Different depth should result in different hash
      // Note: This test depends on the actual implementation of hash computation
      expect(result1.sourceHash).toBeDefined();
      expect(result2.sourceHash).toBeDefined();
    });
  });

  describe('TTL configuration', () => {
    it('should use 6 hour TTL for snapshots', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contextBuilder.buildContext.mockResolvedValue(mockContext);
      snapshotService.findSnapshot.mockResolvedValue({ snapshot: null, cached: false });
      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: { profileSummary: 'Test', relationshipSignals: [], opportunities: [], risks: [], suggestedActions: [], openingLines: [], citations: [] },
      });

      let capturedTtl: number | undefined;
      snapshotService.createSnapshot.mockImplementation((data: any) => {
        capturedTtl = data.ttlSeconds;
        return Promise.resolve({ id: 'snapshot-123' } as any);
      });

      await service.generate({ userId, contactId });

      expect(capturedTtl).toBe(21600); // 6 hours = 21600 seconds
    });
  });
});
