import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArchiveBriefService } from './archive-brief.service';
import { AgentRuntimeExecutor } from '../../runtime/agent-runtime-executor.service';
import { SnapshotService } from '../../snapshots/snapshot.service';
import { Conversation } from '../../../entities/conversation.entity';
import { Contact } from '../../../entities/contact.entity';

describe('ArchiveBriefService', () => {
  let service: ArchiveBriefService;
  let runtimeExecutor: jest.Mocked<AgentRuntimeExecutor>;
  let snapshotService: jest.Mocked<SnapshotService>;
  let conversationRepository: jest.Mocked<Repository<Conversation>>;
  let contactRepository: jest.Mocked<Repository<Contact>>;

  const mockConversation: Conversation = {
    id: 'conv-123',
    userId: 'user-123',
    contactId: 'contact-123',
    title: 'Product Discussion',
    content: 'Discussed pricing plans and enterprise features',
    summary: 'Pricing inquiry',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Tell me about your pricing',
        createdAt: new Date('2024-01-15'),
      } as any,
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'We offer flexible plans...',
        createdAt: new Date('2024-01-15'),
      } as any,
    ],
  } as Conversation;

  const mockContact: Contact = {
    id: 'contact-123',
    userId: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    company: 'Acme Corp',
    position: 'CEO',
    tags: ['vip'],
    note: 'Met at conference',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as Contact;

  beforeEach(async () => {
    const mockConvRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]), // Default empty array
    };

    const mockContactRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArchiveBriefService,
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
          provide: getRepositoryToken(Conversation),
          useValue: mockConvRepo,
        },
        {
          provide: getRepositoryToken(Contact),
          useValue: mockContactRepo,
        },
      ],
    }).compile();

    service = module.get<ArchiveBriefService>(ArchiveBriefService);
    runtimeExecutor = module.get(AgentRuntimeExecutor);
    snapshotService = module.get(SnapshotService);
    conversationRepository = module.get(getRepositoryToken(Conversation));
    contactRepository = module.get(getRepositoryToken(Contact));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractArchive', () => {
    it('should return cached archive extract when available', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';

      conversationRepository.findOne.mockResolvedValue(mockConversation);

      const cachedOutput: ArchiveBriefService.ArchiveExtractOutput = {
        operation: 'archive_extract',
        id: 'archive-123',
        status: 'completed',
        summary: 'Key discussion points extracted',
        payload: {
          topics: ['pricing', 'features'],
          actionItems: ['Send proposal'],
        },
        sourceHash: 'cached-hash-123',
        generatedAt: Date.now(),
      };

      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: {
          id: 'snapshot-123',
          output: cachedOutput,
          createdAt: new Date(),
        } as any,
        cached: true,
      });

      const result = await service.extractArchive({ userId, conversationId });

      expect(result.operation).toBe('archive_extract');
      expect(result.summary).toBe(cachedOutput.summary);
      expect(result.sourceHash).toBeDefined();
      expect(runtimeExecutor.execute).not.toHaveBeenCalled();
    });

    it('should generate new archive extract when cache miss', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';

      conversationRepository.findOne.mockResolvedValue(mockConversation);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      const aiData = {
        id: 'archive-123',
        status: 'completed',
        summary: 'Discussion about pricing and features',
        payload: {
          topics: ['pricing', 'enterprise'],
          nextSteps: ['Schedule demo'],
        },
      };

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: aiData,
      });

      snapshotService.createSnapshot.mockResolvedValue({
        id: 'snapshot-123',
      } as any);

      const result = await service.extractArchive({ userId, conversationId });

      expect(result.operation).toBe('archive_extract');
      expect(result.summary).toBe(aiData.summary);
      expect(result.payload).toEqual(aiData.payload);
      expect(result.sourceHash).toBeDefined();
      expect(result.generatedAt).toBeDefined();

      expect(runtimeExecutor.execute).toHaveBeenCalledWith(
        'archive_brief',
        'archive_extract',
        expect.objectContaining({
          operation: 'archive_extract',
          conversationId,
        }),
        expect.objectContaining({
          useCache: false,
          userId,
          conversationId,
          skipServiceRouting: true,
        })
      );

      expect(snapshotService.createSnapshot).toHaveBeenCalled();
    });

    it('should respect forceRefresh option', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';

      conversationRepository.findOne.mockResolvedValue(mockConversation);

      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: {
          id: 'cached-snapshot',
          output: { summary: 'Cached archive' },
          createdAt: new Date(),
        } as any,
        cached: true,
      });

      const newData = {
        id: 'archive-456',
        status: 'completed',
        summary: 'Fresh extract',
        payload: {},
      };

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: newData,
      });

      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);

      const result = await service.extractArchive({ userId, conversationId }, { forceRefresh: true });

      expect(result.summary).toBe('Fresh extract');
      expect(runtimeExecutor.execute).toHaveBeenCalled();
    });

    it('should throw NotFoundException when conversation not found', async () => {
      const userId = 'user-123';
      const conversationId = 'non-existent';

      conversationRepository.findOne.mockResolvedValue(null);

      await expect(service.extractArchive({ userId, conversationId })).rejects.toThrow(
        NotFoundException
      );
      await expect(service.extractArchive({ userId, conversationId })).rejects.toThrow(
        'Conversation not found: non-existent'
      );
    });

    it('should handle conversation without messages', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';

      const conversationWithoutMessages = {
        ...mockConversation,
        messages: [],
      };

      conversationRepository.findOne.mockResolvedValue(conversationWithoutMessages);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: {
          id: 'archive-123',
          status: 'completed',
          summary: 'No messages to archive',
          payload: {},
        },
      });

      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);

      const result = await service.extractArchive({ userId, conversationId });

      expect(result.summary).toBe('No messages to archive');
    });
  });

  describe('generateBrief', () => {
    it('should return cached brief when available', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contactRepository.findOne.mockResolvedValue(mockContact);

      const cachedOutput: ArchiveBriefService.BriefGenerateOutput = {
        operation: 'brief_generate',
        id: 'brief-123',
        contact_id: contactId,
        content: 'John is interested in enterprise solutions',
        generated_at: '2024-01-15T10:00:00Z',
        source_hash: 'cached-hash-123',
      };

      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: {
          id: 'snapshot-123',
          output: cachedOutput,
          createdAt: new Date(),
        } as any,
        cached: true,
      });

      const result = await service.generateBrief({ userId, contactId });

      expect(result.operation).toBe('brief_generate');
      expect(result.content).toBe(cachedOutput.content);
      expect(result.contact_id).toBe(contactId);
      expect(runtimeExecutor.execute).not.toHaveBeenCalled();
    });

    it('should generate new brief when cache miss', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contactRepository.findOne.mockResolvedValue(mockContact);
      conversationRepository.find.mockResolvedValue([]);

      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      const aiData = {
        id: 'brief-123',
        contact_id: contactId,
        content: 'VIP prospect from Acme Corp, interested in enterprise features',
        generated_at: '2024-01-15T10:00:00Z',
      };

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: aiData,
      });

      snapshotService.createSnapshot.mockResolvedValue({
        id: 'snapshot-123',
      } as any);

      const result = await service.generateBrief({ userId, contactId });

      expect(result.operation).toBe('brief_generate');
      expect(result.content).toBe(aiData.content);
      expect(result.contact_id).toBe(contactId);
      expect(result.source_hash).toBeDefined();

      expect(runtimeExecutor.execute).toHaveBeenCalledWith(
        'archive_brief',
        'brief_generate',
        expect.objectContaining({
          operation: 'brief_generate',
          contactId,
          name: mockContact.name,
          company: mockContact.company,
        }),
        expect.objectContaining({
          useCache: false,
          userId,
          skipServiceRouting: true,
        })
      );

      expect(snapshotService.createSnapshot).toHaveBeenCalled();
    });

    it('should respect forceRefresh option', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contactRepository.findOne.mockResolvedValue(mockContact);

      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: {
          id: 'cached-snapshot',
          output: { content: 'Cached brief' },
          createdAt: new Date(),
        } as any,
        cached: true,
      });

      const newData = {
        id: 'brief-456',
        contact_id: contactId,
        content: 'Updated brief',
        generated_at: '2024-01-15T11:00:00Z',
      };

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: newData,
      });

      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);

      const result = await service.generateBrief({ userId, contactId }, { forceRefresh: true });

      expect(result.content).toBe('Updated brief');
      expect(runtimeExecutor.execute).toHaveBeenCalled();
    });

    it('should throw NotFoundException when contact not found', async () => {
      const userId = 'user-123';
      const contactId = 'non-existent';

      contactRepository.findOne.mockResolvedValue(null);

      await expect(service.generateBrief({ userId, contactId })).rejects.toThrow(
        NotFoundException
      );
      await expect(service.generateBrief({ userId, contactId })).rejects.toThrow(
        'Contact not found: non-existent'
      );
    });

    it('should include recent interactions in input data', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contactRepository.findOne.mockResolvedValue(mockContact);

      const recentConversations = [
        {
          id: 'conv-1',
          createdAt: new Date('2024-01-10'),
          summary: 'Initial call',
          content: 'First discussion',
        },
        {
          id: 'conv-2',
          createdAt: new Date('2024-01-15'),
          summary: 'Follow-up',
          content: 'Second discussion',
        },
      ] as Conversation[];

      conversationRepository.find.mockResolvedValue(recentConversations);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: {
          id: 'brief-123',
          contact_id: contactId,
          content: 'Test brief',
          generated_at: '2024-01-15T10:00:00Z',
        },
      });

      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);

      await service.generateBrief({ userId, contactId });

      const executeCall = runtimeExecutor.execute.mock.calls[0];
      const inputData = executeCall[2] as any;

      expect(inputData.recentInteractions).toBeDefined();
      expect(inputData.recentInteractions).toHaveLength(2);
      expect(inputData.recentInteractions[0].summary).toBe('Initial call');
    });
  });

  describe('formatArchiveExtractOutput', () => {
    it('should format AI data correctly', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';

      conversationRepository.findOne.mockResolvedValue(mockConversation);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      const aiData = {
        id: 'custom-id',
        status: 'ready',
        summary: 'Test summary',
        payload: { key: 'value' },
      };

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: aiData,
      });

      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);

      const result = await service.extractArchive({ userId, conversationId });

      expect(result.operation).toBe('archive_extract');
      expect(result.id).toBe('custom-id');
      expect(result.status).toBe('ready');
      expect(result.summary).toBe('Test summary');
      expect(result.payload).toEqual({ key: 'value' });
    });

    it('should use defaults for missing fields', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';

      conversationRepository.findOne.mockResolvedValue(mockConversation);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      const aiData = {
        // Missing id, status, summary, payload
        payload: { data: 'test' },
      };

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: aiData,
      });

      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);

      const result = await service.extractArchive({ userId, conversationId });

      expect(result.id).toBe(conversationId);
      expect(result.status).toBe('completed');
      expect(result.summary).toBe('');
      expect(result.payload).toEqual({ data: 'test' });
    });
  });

  describe('formatBriefGenerateOutput', () => {
    it('should format brief AI data correctly', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contactRepository.findOne.mockResolvedValue(mockContact);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      const aiData = {
        id: 'brief-custom-id',
        contact_id: 'different-contact-id',
        content: 'Test brief content',
        generated_at: '2024-01-15T12:00:00Z',
      };

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: aiData,
      });

      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);

      const result = await service.generateBrief({ userId, contactId });

      expect(result.operation).toBe('brief_generate');
      expect(result.id).toBe('brief-custom-id');
      expect(result.contact_id).toBe('different-contact-id');
      expect(result.content).toBe('Test brief content');
      expect(result.generated_at).toBe('2024-01-15T12:00:00Z');
    });

    it('should use defaults for missing brief fields', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contactRepository.findOne.mockResolvedValue(mockContact);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      const aiData = {
        content: 'Brief content',
      };

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: aiData,
      });

      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);

      const result = await service.generateBrief({ userId, contactId });

      expect(result.id).toBeDefined();
      expect(result.contact_id).toBe(contactId);
      expect(result.content).toBe('Brief content');
      expect(result.generated_at).toBeDefined();
    });
  });

  describe('TTL configuration', () => {
    it('should use 24 hour TTL for archive extract snapshots', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';

      conversationRepository.findOne.mockResolvedValue(mockConversation);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: {
          id: 'archive-123',
          status: 'completed',
          summary: 'Test',
          payload: {},
        },
      });

      let capturedTtl: number | undefined;
      snapshotService.createSnapshot.mockImplementation((data: any) => {
        capturedTtl = data.ttlSeconds;
        return Promise.resolve({ id: 'snapshot-123' } as any);
      });

      await service.extractArchive({ userId, conversationId });

      expect(capturedTtl).toBe(86400); // 24 hours
    });

    it('should use 24 hour TTL for brief snapshots', async () => {
      const userId = 'user-123';
      const contactId = 'contact-123';

      contactRepository.findOne.mockResolvedValue(mockContact);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: {
          id: 'brief-123',
          contact_id: contactId,
          content: 'Test',
          generated_at: '2024-01-15T10:00:00Z',
        },
      });

      let capturedTtl: number | undefined;
      snapshotService.createSnapshot.mockImplementation((data: any) => {
        capturedTtl = data.ttlSeconds;
        return Promise.resolve({ id: 'snapshot-123' } as any);
      });

      await service.generateBrief({ userId, contactId });

      expect(capturedTtl).toBe(86400); // 24 hours
    });
  });

  describe('source hash computation', () => {
    it('should compute consistent hash for same input', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';

      conversationRepository.findOne.mockResolvedValue(mockConversation);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: {
          id: 'archive-123',
          status: 'completed',
          summary: 'Test',
          payload: {},
        },
      });

      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);

      const result1 = await service.extractArchive({ userId, conversationId });

      // Reset for second call
      conversationRepository.findOne.mockResolvedValue(mockConversation);
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      const result2 = await service.extractArchive({ userId, conversationId });

      expect(result1.sourceHash).toBe(result2.sourceHash);
    });

    it('should compute different hash for different operations', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';
      const contactId = 'contact-123';

      conversationRepository.findOne.mockResolvedValue(mockConversation);
      contactRepository.findOne.mockResolvedValue(mockContact);
      conversationRepository.find.mockResolvedValue([]);

      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-123',
        cached: false,
        data: {
          id: 'result-123',
          status: 'completed',
          summary: 'Test',
          payload: {},
        },
      });

      snapshotService.createSnapshot.mockResolvedValue({ id: 'snapshot-123' } as any);

      const archiveResult = await service.extractArchive({ userId, conversationId });

      // Reset for brief call
      snapshotService.findSnapshot.mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      runtimeExecutor.execute.mockResolvedValue({
        runId: 'run-456',
        cached: false,
        data: {
          id: 'brief-123',
          contact_id: contactId,
          content: 'Test brief',
          generated_at: '2024-01-15T10:00:00Z',
        },
      });

      const briefResult = await service.generateBrief({ userId, contactId });

      expect(archiveResult.sourceHash).toBeDefined();
      expect(briefResult.source_hash).toBeDefined();
      // Different operations should produce different hashes
      expect(archiveResult.sourceHash).not.toBe(briefResult.source_hash);
    });
  });
});
