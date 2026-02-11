import { Test, TestingModule } from '@nestjs/testing';
import { ActionPanelController } from './action-panel.controller';
import { ActionPanelService } from './action-panel.service';
import { NetworkActionService } from '../../agent/capabilities/network_action/network-action.service';

describe('ActionPanelController', () => {
  let controller: ActionPanelController;
  let actionPanelService: {
    getFollowUps: jest.Mock;
    getRecommendedContacts: jest.Mock;
  };
  let networkActionService: {
    run: jest.Mock;
  };

  beforeEach(async () => {
    actionPanelService = {
      getFollowUps: jest.fn(),
      getRecommendedContacts: jest.fn(),
    };

    networkActionService = {
      run: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActionPanelController],
      providers: [
        { provide: ActionPanelService, useValue: actionPanelService },
        { provide: NetworkActionService, useValue: networkActionService },
      ],
    }).compile();

    controller = module.get<ActionPanelController>(ActionPanelController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return dashboard data via NetworkActionService', async () => {
    networkActionService.run.mockResolvedValue({
      followUps: [
        { contactId: 'contact-1', contactName: 'Alice', reason: 'Long time no talk', priority: 'high', suggestedAction: 'Say hello' },
      ],
      recommendations: [
        { type: 'connection', description: 'Connect with Bob', contacts: ['contact-2'], confidence: 0.8 },
      ],
      synthesis: 'Test synthesis',
      nextActions: [],
      metadata: { cached: false, sourceHash: 'abc', generatedAt: Date.now() },
    });

    const result = await controller.getDashboard({ user: { id: 'user-1' } });

    expect(networkActionService.run).toHaveBeenCalledWith({
      userId: 'user-1',
      forceRefresh: false,
    });
    expect(result).toHaveProperty('followUps');
    expect(result).toHaveProperty('recommendedContacts');
  });

  it('should fallback to legacy service when NetworkActionService fails', async () => {
    networkActionService.run.mockRejectedValue(new Error('Agent runtime failed'));
    actionPanelService.getFollowUps.mockResolvedValue([{ id: 'todo-1' }]);
    actionPanelService.getRecommendedContacts.mockResolvedValue([{ id: 'contact-1' }]);

    const result = await controller.getDashboard({ user: { id: 'user-1' } });

    expect(actionPanelService.getFollowUps).toHaveBeenCalledWith('user-1');
    expect(actionPanelService.getRecommendedContacts).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({
      followUps: [{ id: 'todo-1' }],
      recommendedContacts: [{ id: 'contact-1' }],
    });
  });

  it('should throw NotFoundException when user id is missing', async () => {
    await expect(controller.getDashboard({ user: {} })).rejects.toThrow('User not found');
  });
});
