import { Test, TestingModule } from '@nestjs/testing';
import { ActionPanelController } from './action-panel.controller';
import { ActionPanelService } from './action-panel.service';

describe('ActionPanelController', () => {
  let controller: ActionPanelController;
  let actionPanelService: {
    getFollowUps: jest.Mock;
    getRecommendedContacts: jest.Mock;
  };

  beforeEach(async () => {
    actionPanelService = {
      getFollowUps: jest.fn(),
      getRecommendedContacts: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActionPanelController],
      providers: [{ provide: ActionPanelService, useValue: actionPanelService }],
    }).compile();

    controller = module.get<ActionPanelController>(ActionPanelController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return dashboard data', async () => {
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
});
