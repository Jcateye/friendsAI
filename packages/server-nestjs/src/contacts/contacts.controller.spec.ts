import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { User, Contact, Conversation, Event, ContactFact, ContactTodo } from '../entities';

describe('ContactsController', () => {
  let controller: ContactsController;
  let service: ContactsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5434,
          username: 'postgres',
          password: 'postgres',
          database: 'friends_ai_db',
          entities: [User, Contact, Conversation, Event, ContactFact, ContactTodo],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Contact]),
      ],
      controllers: [ContactsController],
      providers: [ContactsService],
    }).compile();

    controller = module.get<ContactsController>(ContactsController);
    service = module.get<ContactsService>(ContactsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new contact', async () => {
      const result = await controller.create({ user: { id: 'test-user' } }, {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        company: 'ABC Corp',
        position: 'Manager',
        tags: ['friend', 'colleague'],
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name', 'John Doe');
      expect(result).toHaveProperty('email', 'john@example.com');
    });
  });

  describe('findAll', () => {
    it('should return paginated contacts', async () => {
      const req = { user: { id: 'test-user' } };
      await controller.create(req, { name: 'Contact 1', email: 'c1@example.com' });
      await controller.create(req, { name: 'Contact 2', email: 'c2@example.com' });

      const result = await controller.findAll(req, 1, 10);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result.items.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('findOne', () => {
    it('should return a contact by id', async () => {
      const req = { user: { id: 'test-user' } };
      const created = await controller.create(req, {
        name: 'Jane Doe',
        email: 'jane@example.com',
      });

      const result = await controller.findOne(req, created.id);

      expect(result).toHaveProperty('id', created.id);
      expect(result).toHaveProperty('name', 'Jane Doe');
    });

    it('should throw not found error for invalid id', async () => {
      await expect(controller.findOne({ user: { id: 'test-user' } }, 'invalid-id')).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update a contact', async () => {
      const req = { user: { id: 'test-user' } };
      const created = await controller.create(req, {
        name: 'Original Name',
        email: 'original@example.com',
      });

      const result = await controller.update(req, created.id, {
        name: 'Updated Name',
      });

      expect(result).toHaveProperty('name', 'Updated Name');
      expect(result).toHaveProperty('email', 'original@example.com');
    });
  });

  describe('remove', () => {
    it('should remove a contact', async () => {
      const req = { user: { id: 'test-user' } };
      const created = await controller.create(req, {
        name: 'To Delete',
        email: 'delete@example.com',
      });

      await controller.remove(req, created.id);

      await expect(controller.findOne(req, created.id)).rejects.toThrow();
    });
  });
});
