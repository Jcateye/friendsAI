import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User, Contact, Conversation, Event, AuthSession } from '../entities';

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
          entities: [User, Contact, Conversation, Event, AuthSession],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User, AuthSession]),
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

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email', 'test@example.com');
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
        emailOrPhone: 'login@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toHaveProperty('email', 'login@example.com');
    });

    it('should throw unauthorized error for invalid credentials', async () => {
      await expect(
        controller.login({
          emailOrPhone: 'nonexistent@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow();
    });
  });
});
