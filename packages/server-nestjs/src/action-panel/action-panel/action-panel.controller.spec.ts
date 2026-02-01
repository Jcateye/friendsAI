import { Test, TestingModule } from '@nestjs/testing';
import { ActionPanelController } from './action-panel.controller';

describe('ActionPanelController', () => {
  let controller: ActionPanelController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActionPanelController],
    }).compile();

    controller = module.get<ActionPanelController>(ActionPanelController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
