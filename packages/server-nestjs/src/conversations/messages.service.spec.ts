import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MessagesService } from './messages.service';

describe('MessagesService', () => {
  const conversationRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const queryBuilder = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const messageRepository = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => queryBuilder),
  };

  let service: MessagesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MessagesService(
      messageRepository as any,
      conversationRepository as any,
    );
  });

  describe('listMessages', () => {
    it('uses deterministic ordering by createdAt then id', async () => {
      conversationRepository.findOne.mockResolvedValue({ id: 'conv-1' });
      queryBuilder.getMany.mockResolvedValue([
        {
          id: '01HZZZZZZZZZZZZZZZZZZZZZZ1',
          role: 'assistant',
          content: 'older',
          createdAtMs: 1760004000000,
          metadata: null,
          citations: null,
        },
      ]);

      await service.listMessages('conv-1', { userId: 'user-1', limit: 20 });

      expect(messageRepository.createQueryBuilder).toHaveBeenCalledWith('message');
      expect(queryBuilder.where).toHaveBeenCalledWith('message.conversationId = :conversationId', {
        conversationId: 'conv-1',
      });
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('message.createdAtMs', 'ASC');
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('message.id', 'ASC');
      expect(queryBuilder.limit).toHaveBeenCalledWith(20);
    });

    it('clamps limit to 200', async () => {
      conversationRepository.findOne.mockResolvedValue({ id: 'conv-1' });
      queryBuilder.getMany.mockResolvedValue([]);

      await service.listMessages('conv-1', { userId: 'user-1', limit: 999 });

      expect(queryBuilder.limit).toHaveBeenCalledWith(200);
    });

    it('throws for invalid before', async () => {
      conversationRepository.findOne.mockResolvedValue({ id: 'conv-1' });

      await expect(service.listMessages('conv-1', { userId: 'user-1', before: 'not-a-date' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('filters with before timestamp milliseconds', async () => {
      conversationRepository.findOne.mockResolvedValue({ id: 'conv-1' });
      queryBuilder.getMany.mockResolvedValue([]);

      await service.listMessages('conv-1', {
        userId: 'user-1',
        before: '2026-02-07T10:00:00.000Z',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'message.createdAtMs < :beforeMs',
        { beforeMs: 1770458400000 },
      );
    });

    it('throws not found when conversation is missing', async () => {
      conversationRepository.findOne.mockResolvedValue(null);

      await expect(service.listMessages('missing', { userId: 'user-1' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
