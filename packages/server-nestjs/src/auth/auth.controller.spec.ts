import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User, Contact, Conversation, Event } from '../entities';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

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
          entities: [User, Contact, Conversation, Event],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User]),
      ],
      controllers: [AuthController],
      providers: [AuthService],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const result = await controller.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email', 'test@example.com');
    });

    it('should throw conflict error for duplicate email', async () => {
      await controller.register({
        email: 'duplicate@example.com',
        password: 'password123',
      });

      await expect(
        controller.register({
          email: 'duplicate@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      await controller.register({
        email: 'login@example.com',
        password: 'password123',
      });

      const result = await controller.login({
        email: 'login@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email', 'login@example.com');
    });

    it('should throw unauthorized error for invalid credentials', async () => {
      await expect(
        controller.login({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow();
    });
  });
});