import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { MessagesService } from './messages.service';
import { Conversation, User, Contact, Event } from '../entities';
import { Request } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DataSource, Repository } from 'typeorm';

// Mock Request object
const mockRequest = { user: { id: uuidv4() } } as any;

describe('ConversationsController', () => {
  let controller: ConversationsController;
  let service: ConversationsService;
  let userId: string;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let contactRepository: Repository<Contact>;
  let mockContactId: string;

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: 'localhost',
      port: 5434,
      username: 'postgres',
      password: 'postgres',
      database: 'friends_ai_db',
      entities: [User, Contact, Conversation, Event],
      synchronize: true,
      logging: false,
    });
    await dataSource.initialize();
    await dataSource.dropDatabase();
    await dataSource.synchronize();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5434,
          username: 'postgres',
          password: 'postgres',
          database: 'friends_ai_db',
          entities: [User, Contact, Conversation, Event],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Conversation, User, Contact]),
      ],
      controllers: [ConversationsController],
      providers: [
        ConversationsService,
        {
          provide: MessagesService,
          useValue: {
            listMessages: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ConversationsController>(ConversationsController);
    service = module.get<ConversationsService>(ConversationsService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    contactRepository = module.get<Repository<Contact>>(getRepositoryToken(Contact));
    userId = mockRequest.user.id;

    const user = userRepository.create({
      id: userId,
      email: `${userId}@test.com`,
      password: 'hashedpassword',
      name: 'Test User',
    });
    await userRepository.save(user);

    const contact = contactRepository.create({
      id: uuidv4(),
      name: 'Mock Contact',
      userId: user.id,
    });
    await contactRepository.save(contact);
    mockContactId = contact.id;
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new conversation', async () => {
      const result = await controller.create(mockRequest, {
        content: 'Test conversation content',
      });
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('content', 'Test conversation content');
      expect(result).toHaveProperty('userId', userId);
    });

    it('should create a new conversation with contactId', async () => {
      const result = await controller.create(mockRequest, {
        content: 'Conversation with contact',
        contactId: mockContactId,
      });
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('content', 'Conversation with contact');
      expect(result).toHaveProperty('contactId', mockContactId);
      expect(result).toHaveProperty('userId', userId);
    });
  });

  describe('findAll', () => {
    it('should return all conversations', async () => {
      await controller.create(mockRequest, { content: 'Conv 1' });
      await controller.create(mockRequest, { content: 'Conv 2' });

      const result = await controller.findAll(mockRequest);
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0]).toHaveProperty('content');
    });
  });

  describe('findOne', () => {
    it('should return a conversation by id', async () => {
      const created = await controller.create(mockRequest, { content: 'Find me' });
      const result = await controller.findOne(created.id);
      expect(result).toHaveProperty('id', created.id);
      expect(result).toHaveProperty('content', 'Find me');
    });

    it('should return null for an invalid id (UUID format)', async () => {
      const nonExistentUuid = uuidv4();
      const result = await controller.findOne(nonExistentUuid);
      expect(result).toBeNull();
    });
  });
});
