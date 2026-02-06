import { Test, TestingModule } from '@nestjs/testing';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';

describe('ContactsController', () => {
  let controller: ContactsController;
  let contactsService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    getContactContext: jest.Mock;
  };

  const req = { user: { id: 'test-user' } };

  beforeEach(async () => {
    contactsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getContactContext: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactsController],
      providers: [{ provide: ContactsService, useValue: contactsService }],
    }).compile();

    controller = module.get<ContactsController>(ContactsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new contact', async () => {
      contactsService.create.mockResolvedValue({ id: 'contact-1', name: 'John Doe' });

      const result = await controller.create(req, {
        displayName: 'John Doe',
        email: 'john@example.com',
      });

      expect(contactsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'John Doe', email: 'john@example.com' }),
        'test-user',
      );
      expect(result).toHaveProperty('id', 'contact-1');
    });
  });

  describe('findAll', () => {
    it('should return paginated contacts', async () => {
      contactsService.findAll.mockResolvedValue({
        items: [{ id: 'contact-1' }, { id: 'contact-2' }],
        total: 2,
      });

      const result = await controller.findAll(req, 1, 10);

      expect(contactsService.findAll).toHaveBeenCalledWith('test-user', 1, 10);
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total', 2);
    });
  });

  describe('findOne', () => {
    it('should return a contact by id', async () => {
      contactsService.findOne.mockResolvedValue({ id: 'contact-1', name: 'Jane Doe' });

      const result = await controller.findOne(req, 'contact-1');

      expect(contactsService.findOne).toHaveBeenCalledWith('contact-1', 'test-user');
      expect(result).toHaveProperty('name', 'Jane Doe');
    });
  });

  describe('update', () => {
    it('should update a contact', async () => {
      contactsService.update.mockResolvedValue({ id: 'contact-1', name: 'Updated Name' });

      const result = await controller.update(req, 'contact-1', {
        displayName: 'Updated Name',
      });

      expect(contactsService.update).toHaveBeenCalledWith(
        'contact-1',
        expect.objectContaining({ name: 'Updated Name' }),
        'test-user',
      );
      expect(result).toHaveProperty('name', 'Updated Name');
    });
  });

  describe('remove', () => {
    it('should remove a contact', async () => {
      contactsService.remove.mockResolvedValue(undefined);

      await controller.remove(req, 'contact-1');

      expect(contactsService.remove).toHaveBeenCalledWith('contact-1', 'test-user');
    });
  });
});
