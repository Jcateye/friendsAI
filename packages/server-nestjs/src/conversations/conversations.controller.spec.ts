import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { MessagesService } from './messages.service';

describe('ConversationsController', () => {
  let controller: ConversationsController;
  let conversationsService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
  };
  let messagesService: {
    listMessages: jest.Mock;
  };

  const mockRequest = { user: { id: 'user-1' } };

  beforeEach(async () => {
    conversationsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    messagesService = {
      listMessages: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationsController],
      providers: [
        { provide: ConversationsService, useValue: conversationsService },
        { provide: MessagesService, useValue: messagesService },
      ],
    }).compile();

    controller = module.get<ConversationsController>(ConversationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new conversation', async () => {
      conversationsService.create.mockResolvedValue({
        id: 'conv-1',
        content: 'Test conversation content',
        userId: 'user-1',
      });

      const result = await controller.create(mockRequest, {
        content: 'Test conversation content',
      });

      expect(conversationsService.create).toHaveBeenCalledWith(
        { title: undefined, content: 'Test conversation content' },
        'user-1',
        undefined,
      );
      expect(result).toHaveProperty('id', 'conv-1');
    });

    it('should create a new conversation with contactId', async () => {
      conversationsService.create.mockResolvedValue({
        id: 'conv-2',
        content: 'Conversation with contact',
        userId: 'user-1',
        contactId: 'contact-1',
      });

      const result = await controller.create(mockRequest, {
        content: 'Conversation with contact',
        contactId: 'contact-1',
      });

      expect(conversationsService.create).toHaveBeenCalledWith(
        { title: undefined, content: 'Conversation with contact' },
        'user-1',
        'contact-1',
      );
      expect(result).toHaveProperty('contactId', 'contact-1');
    });
  });

  describe('findAll', () => {
    it('should return all conversations', async () => {
      conversationsService.findAll.mockResolvedValue([
        { id: 'conv-1', content: 'Conv 1' },
        { id: 'conv-2', content: 'Conv 2' },
      ]);

      const result = await controller.findAll(mockRequest);

      expect(conversationsService.findAll).toHaveBeenCalledWith('user-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('should return a conversation by id', async () => {
      conversationsService.findOne.mockResolvedValue({ id: 'conv-1', content: 'Find me' });

      const result = await controller.findOne(mockRequest, 'conv-1');

      expect(conversationsService.findOne).toHaveBeenCalledWith('conv-1', 'user-1');
      expect(result).toHaveProperty('id', 'conv-1');
    });

    it('should return null for a non-existent id', async () => {
      conversationsService.findOne.mockResolvedValue(null);

      const result = await controller.findOne(mockRequest, 'conv-unknown');

      expect(result).toBeNull();
    });
  });

  describe('listMessages', () => {
    it('should list messages with parsed limit', async () => {
      messagesService.listMessages.mockResolvedValue({ items: [] });

      await controller.listMessages(mockRequest, 'conv-1', '20');

      expect(messagesService.listMessages).toHaveBeenCalledWith('conv-1', {
        limit: 20,
        before: undefined,
        userId: 'user-1',
      });
    });
  });
});
