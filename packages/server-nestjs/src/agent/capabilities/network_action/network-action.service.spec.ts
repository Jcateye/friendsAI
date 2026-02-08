import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NetworkActionService } from './network-action.service';
import { NetworkActionContextBuilder } from './network-action.context';
import { AgentRuntimeExecutor } from '../../runtime/agent-runtime-executor.service';
import { SnapshotService } from '../../snapshots/snapshot.service';
import { Contact, Conversation } from '../../../entities';

describe('NetworkActionService', () => {
  let service: NetworkActionService;
  let contextBuilder: NetworkActionContextBuilder;
  let runtimeExecutor: AgentRuntimeExecutor;
  let snapshotService: SnapshotService;
  let contactRepository: Repository<Contact>;
  let conversationRepository: Repository<Conversation>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NetworkActionService,
        NetworkActionContextBuilder,
        {
          provide: AgentRuntimeExecutor,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: SnapshotService,
          useValue: {
            findSnapshot: jest.fn(),
            createSnapshot: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Contact),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Conversation),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NetworkActionService>(NetworkActionService);
    contextBuilder = module.get<NetworkActionContextBuilder>(NetworkActionContextBuilder);
    runtimeExecutor = module.get<AgentRuntimeExecutor>(AgentRuntimeExecutor);
    snapshotService = module.get<SnapshotService>(SnapshotService);
    contactRepository = module.get<Repository<Contact>>(getRepositoryToken(Contact));
    conversationRepository = module.get<Repository<Conversation>>(getRepositoryToken(Conversation));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('run', () => {
    it('should return cached result when available', async () => {
      const userId = 'test-user-id';
      const cachedOutput = {
        followUps: [],
        recommendations: [],
        synthesis: 'Test synthesis',
        nextActions: [],
      };

      jest.spyOn(contextBuilder, 'build').mockResolvedValue({
        contacts: [],
        recentInteractions: [],
        metadata: { totalContacts: 0, totalInteractions: 0 },
      });
      jest.spyOn(contextBuilder, 'computeSourceHash').mockReturnValue('test-hash');
      jest.spyOn(snapshotService, 'findSnapshot').mockResolvedValue({
        snapshot: {
          id: 'snapshot-id',
          output: cachedOutput,
          createdAt: new Date(),
        } as any,
        cached: true,
      });

      const result = await service.run({ userId });

      expect(result.metadata.cached).toBe(true);
      expect(result.synthesis).toBe('Test synthesis');
    });

    it('should return empty response when no contacts', async () => {
      const userId = 'test-user-id';

      jest.spyOn(contextBuilder, 'build').mockResolvedValue({
        contacts: [],
        recentInteractions: [],
        metadata: { totalContacts: 0, totalInteractions: 0 },
      });
      jest.spyOn(contextBuilder, 'computeSourceHash').mockReturnValue('test-hash');
      jest.spyOn(snapshotService, 'findSnapshot').mockResolvedValue({
        snapshot: null,
        cached: false,
      });

      const result = await service.run({ userId });

      expect(result.followUps).toEqual([]);
      expect(result.synthesis).toContain('暂无联系人数据');
    });
  });
});




