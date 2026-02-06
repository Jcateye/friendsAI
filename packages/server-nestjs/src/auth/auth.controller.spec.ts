import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      authService.register.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          phone: null,
          name: 'Test User',
        },
      });

      const result = await controller.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(authService.register).toHaveBeenCalledWith(
        'test@example.com',
        undefined,
        'password123',
        'Test User',
      );
      expect(result).toHaveProperty('accessToken');
      expect(result.user).toHaveProperty('email', 'test@example.com');
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      authService.login.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        user: {
          id: 'user-1',
          email: 'login@example.com',
          phone: null,
          name: null,
        },
      });

      const result = await controller.login({
        emailOrPhone: 'login@example.com',
        password: 'password123',
      });

      expect(authService.login).toHaveBeenCalledWith('login@example.com', 'password123');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toHaveProperty('email', 'login@example.com');
    });
  });

  describe('refresh', () => {
    it('should refresh tokens', async () => {
      authService.refresh.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresIn: 900,
        user: {
          id: 'user-1',
          email: 'user@example.com',
          phone: null,
          name: null,
        },
      });

      const result = await controller.refresh({ refreshToken: 'old-refresh' });

      expect(authService.refresh).toHaveBeenCalledWith('old-refresh');
      expect(result).toHaveProperty('accessToken', 'new-access');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      authService.logout.mockResolvedValue({ success: true });

      const result = await controller.logout({ refreshToken: 'refresh-token' });

      expect(authService.logout).toHaveBeenCalledWith('refresh-token');
      expect(result).toEqual({ success: true });
    });
  });
});
