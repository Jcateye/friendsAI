import { Test, TestingModule } from '@nestjs/testing';
import { BriefingsController } from './briefings.controller';
import { BriefingService } from '../briefing/briefing.service';
import { NotFoundException } from '@nestjs/common';

const MOCK_USER_ID = 'mock-user-id';
const MOCK_CONTACT_ID = 'contact-uuid-1';
const MOCK_BRIEFING = {
  id: 'brief-1',
  contact_id: MOCK_CONTACT_ID,
  content: 'This is a generated briefing.',
  generated_at: new Date().toISOString(),
  source_hash: 'hash',
};

// Mock BriefingService
const mockBriefingService = {
  getBriefing: jest.fn(),
  refreshBriefing: jest.fn(),
};

describe('BriefingsController', () => {
  let controller: BriefingsController;
  let service: BriefingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BriefingsController],
      providers: [
        { provide: BriefingService, useValue: mockBriefingService },
      ],
    }).compile();

    controller = module.get<BriefingsController>(BriefingsController);
    service = module.get<BriefingService>(BriefingService); // Get the mocked service instance

    jest.clearAllMocks(); // Clear mocks before each test
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getBriefing', () => {
    // Mock Request object
    const mockRequest = { user: { id: MOCK_USER_ID } } as any;

    beforeEach(() => {
      mockBriefingService.getBriefing.mockResolvedValue(MOCK_BRIEFING);
    });

    it('should call BriefingService.getBriefing with correct parameters', async () => {
      const result = await controller.getBriefing(mockRequest, MOCK_CONTACT_ID);
      expect(service.getBriefing).toHaveBeenCalledWith(MOCK_CONTACT_ID, MOCK_USER_ID);
      expect(result).toEqual(MOCK_BRIEFING);
    });

    it('should throw NotFoundException if BriefingService throws NotFoundException', async () => {
      mockBriefingService.getBriefing.mockRejectedValue(new NotFoundException('Contact not found'));
      await expect(controller.getBriefing(mockRequest, MOCK_CONTACT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('refreshBriefing', () => {
    const mockRequest = { user: { id: MOCK_USER_ID } } as any;

    beforeEach(() => {
      mockBriefingService.refreshBriefing.mockResolvedValue(MOCK_BRIEFING);
    });

    it('should call BriefingService.refreshBriefing with correct parameters', async () => {
      const result = await controller.refreshBriefing(mockRequest, MOCK_CONTACT_ID);
      expect(service.refreshBriefing).toHaveBeenCalledWith(MOCK_CONTACT_ID, MOCK_USER_ID);
      expect(result).toEqual(MOCK_BRIEFING);
    });

    it('should throw NotFoundException if BriefingService throws NotFoundException', async () => {
      mockBriefingService.refreshBriefing.mockRejectedValue(new NotFoundException('Contact not found'));
      await expect(controller.refreshBriefing(mockRequest, MOCK_CONTACT_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
