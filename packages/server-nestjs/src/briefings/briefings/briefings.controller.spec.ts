import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BriefingsController } from './briefings.controller';
import { BriefingService } from '../briefing/briefing.service';
import { AgentRuntimeExecutor } from '../../agent/runtime/agent-runtime-executor.service';

const MOCK_USER_ID = 'mock-user-id';
const MOCK_CONTACT_ID = 'contact-uuid-1';
const MOCK_BRIEFING = {
  id: 'brief-1',
  contact_id: MOCK_CONTACT_ID,
  content: 'This is a generated briefing.',
  generated_at: new Date().toISOString(),
  source_hash: 'hash',
};

const mockBriefingService = {
  getBriefing: jest.fn(),
  refreshBriefing: jest.fn(),
};

const mockAgentRuntimeExecutor = {
  execute: jest.fn(),
};

describe('BriefingsController', () => {
  let controller: BriefingsController;
  let service: BriefingService;
  let runtimeExecutor: AgentRuntimeExecutor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BriefingsController],
      providers: [
        { provide: BriefingService, useValue: mockBriefingService },
        { provide: AgentRuntimeExecutor, useValue: mockAgentRuntimeExecutor },
      ],
    }).compile();

    controller = module.get<BriefingsController>(BriefingsController);
    service = module.get<BriefingService>(BriefingService);
    runtimeExecutor = module.get<AgentRuntimeExecutor>(AgentRuntimeExecutor);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getBriefing', () => {
    const mockRequest = { user: { id: MOCK_USER_ID } } as any;

    it('should call AgentRuntimeExecutor first and return mapped result', async () => {
      mockAgentRuntimeExecutor.execute.mockResolvedValue({
        runId: 'run-1',
        cached: false,
        data: {
          id: 'brief-1',
          content: 'This is a generated briefing.',
          generated_at: MOCK_BRIEFING.generated_at,
          source_hash: 'hash',
        },
      });

      const result = await controller.getBriefing(mockRequest, MOCK_CONTACT_ID);

      expect(runtimeExecutor.execute).toHaveBeenCalledWith(
        'archive_brief',
        'brief_generate',
        { contactId: MOCK_CONTACT_ID },
        {
          useCache: true,
          forceRefresh: false,
          userId: MOCK_USER_ID,
        },
      );
      expect(result).toEqual(MOCK_BRIEFING);
      expect(service.getBriefing).not.toHaveBeenCalled();
    });

    it('should fallback to BriefingService when runtime executor fails', async () => {
      mockAgentRuntimeExecutor.execute.mockRejectedValue(new Error('runtime failed'));
      mockBriefingService.getBriefing.mockResolvedValue(MOCK_BRIEFING);

      const result = await controller.getBriefing(mockRequest, MOCK_CONTACT_ID);

      expect(service.getBriefing).toHaveBeenCalledWith(MOCK_CONTACT_ID, MOCK_USER_ID);
      expect(result).toEqual(MOCK_BRIEFING);
    });

    it('should throw NotFoundException when request has no user', async () => {
      await expect(controller.getBriefing({ user: null } as any, MOCK_CONTACT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('refreshBriefing', () => {
    const mockRequest = { user: { id: MOCK_USER_ID } } as any;

    it('should call AgentRuntimeExecutor with force refresh', async () => {
      mockAgentRuntimeExecutor.execute.mockResolvedValue({
        runId: 'run-2',
        cached: false,
        data: {
          id: 'brief-1',
          content: 'This is a generated briefing.',
          generated_at: MOCK_BRIEFING.generated_at,
          source_hash: 'hash',
        },
      });

      const result = await controller.refreshBriefing(mockRequest, MOCK_CONTACT_ID);

      expect(runtimeExecutor.execute).toHaveBeenCalledWith(
        'archive_brief',
        'brief_generate',
        { contactId: MOCK_CONTACT_ID },
        {
          useCache: false,
          forceRefresh: true,
          userId: MOCK_USER_ID,
        },
      );
      expect(result).toEqual(MOCK_BRIEFING);
    });

    it('should fallback to legacy refresh when runtime executor fails', async () => {
      mockAgentRuntimeExecutor.execute.mockRejectedValue(new Error('runtime failed'));
      mockBriefingService.refreshBriefing.mockResolvedValue(MOCK_BRIEFING);

      const result = await controller.refreshBriefing(mockRequest, MOCK_CONTACT_ID);

      expect(service.refreshBriefing).toHaveBeenCalledWith(MOCK_CONTACT_ID, MOCK_USER_ID);
      expect(result).toEqual(MOCK_BRIEFING);
    });
  });
});
