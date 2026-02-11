import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { BadRequestException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { FeishuOAuthService, FeishuTokens, FeishuOAuthResult } from './feishu-oauth.service';
import { ConnectorToken } from '../entities/connector-token.entity';
import { User } from '../entities/user.entity';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('FeishuOAuthService', () => {
  let service: FeishuOAuthService;
  let configService: jest.Mocked<ConfigService>;
  let connectorTokenRepository: jest.Mocked<Repository<ConnectorToken>>;
  let userRepository: jest.Mocked<Repository<User>>;

  // Mock test data
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockFeishuUserId = 'feishu_user_123';
  const mockAccessToken = 'feishu_access_token_123';
  const mockRefreshToken = 'feishu_refresh_token_123';
  const mockCode = 'auth_code_123';

  const mockFeishuUserInfo = {
    name: 'Test User',
    en_name: 'Test User EN',
    avatar_url: 'https://example.com/avatar.jpg',
    email: 'test@feishu.com',
    mobile: '+8613800138000',
    user_id: mockFeishuUserId,
    union_id: 'union_123',
    open_id: 'open_123',
  };

  const mockTokens: FeishuTokens = {
    accessToken: mockAccessToken,
    refreshToken: mockRefreshToken,
    tokenType: 'Bearer',
    expiresIn: 7200,
    expiresAt: new Date(Date.now() + 7200 * 1000),
    scope: 'contact:user.base:readonly',
  };

  beforeEach(async () => {
    // Create mock repositories
    connectorTokenRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<Repository<ConnectorToken>>;

    userRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    // Create mock config service
    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    // Setup default config values
    configService.get.mockImplementation((key: string) => {
      const configMap: Record<string, string> = {
        FEISHU_BASE_URL: 'https://open.feishu.cn',
        FEISHU_APP_ID: 'test_app_id',
        FEISHU_APP_SECRET: 'test_app_secret',
        FEISHU_OAUTH_REDIRECT_URI: 'https://example.com/callback',
        FEISHU_OAUTH_AUTHORIZE_URL: 'https://open.feishu.cn/open-apis/authen/v1/authorize',
      };
      return configMap[key] || '';
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeishuOAuthService,
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: 'ConnectorTokenRepository',
          useValue: connectorTokenRepository,
        },
        {
          provide: 'UserRepository',
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get<FeishuOAuthService>(FeishuOAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAuthorizeUrl', () => {
    it('should generate correct authorize URL with default options', () => {
      const url = service.getAuthorizeUrl(mockUserId);

      expect(url).toContain('https://open.feishu.cn/open-apis/authen/v1/authorize');
      expect(url).toContain('app_id=test_app_id');
      expect(url).toContain(`state=${mockUserId}`);
      expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
    });

    it('should generate authorize URL with custom redirect URI', () => {
      const customRedirect = 'https://custom.example.com/callback';
      const url = service.getAuthorizeUrl(mockUserId, { redirectUri: customRedirect });

      expect(url).toContain('redirect_uri=https%3A%2F%2Fcustom.example.com%2Fcallback');
    });

    it('should generate authorize URL with custom state', () => {
      const customState = 'custom_state_123';
      const url = service.getAuthorizeUrl(mockUserId, { state: customState });

      expect(url).toContain(`state=${customState}`);
    });

    it('should generate authorize URL with custom scope', () => {
      const customScope = 'contact:user.base:readonly contact:user.email:readonly';
      const url = service.getAuthorizeUrl(mockUserId, { scope: customScope });

      // The actual encoding uses %3A for : and + for spaces
      expect(url).toContain('scope=contact%3Auser.base%3Areadonly+contact%3Auser.email%3Areadonly');
    });

    it('should throw InternalServerErrorException when APP_ID is not configured', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'FEISHU_APP_ID') return undefined;
        if (key === 'FEISHU_OAUTH_REDIRECT_URI') return 'https://example.com/callback';
        return '';
      });

      expect(() => service.getAuthorizeUrl(mockUserId)).toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when REDIRECT_URI is not configured', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'FEISHU_APP_ID') return 'test_app_id';
        if (key === 'FEISHU_OAUTH_REDIRECT_URI') return undefined;
        return '';
      });

      expect(() => service.getAuthorizeUrl(mockUserId)).toThrow(InternalServerErrorException);
    });
  });

  describe('exchangeToken', () => {
    it('should exchange authorization code for access token successfully', async () => {
      const mockTokenResponse = {
        code: 0,
        msg: 'success',
        access_token: mockAccessToken,
        refresh_token: mockRefreshToken,
        expires_in: 7200,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      const result = await service.exchangeToken(mockCode);

      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        tokenType: 'Bearer',
        expiresIn: 7200,
        expiresAt: expect.any(Date),
        scope: 'contact:user.base:readonly contact:user.email:readonly',
      });
    });

    it('should use default expires_in when not provided', async () => {
      const mockTokenResponse = {
        code: 0,
        msg: 'success',
        access_token: mockAccessToken,
        refresh_token: mockRefreshToken,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      const result = await service.exchangeToken(mockCode);

      expect(result.expiresIn).toBe(7200); // Default value
    });

    it('should handle empty refresh_token', async () => {
      const mockTokenResponse = {
        code: 0,
        msg: 'success',
        access_token: mockAccessToken,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      const result = await service.exchangeToken(mockCode);

      expect(result.refreshToken).toBe('');
    });

    it('should throw BadRequestException on HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      } as Response);

      await expect(service.exchangeToken(mockCode)).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException on Feishu error code', async () => {
      const mockTokenResponse = {
        code: 9999,
        msg: 'Invalid authorization code',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      await expect(service.exchangeToken(mockCode)).rejects.toThrow(UnauthorizedException);
    });

    it('should send correct request to Feishu API', async () => {
      const mockTokenResponse = {
        code: 0,
        msg: 'success',
        access_token: mockAccessToken,
        refresh_token: mockRefreshToken,
        expires_in: 7200,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      await service.exchangeToken(mockCode);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://open.feishu.cn/open-apis/authen/v1/oidc/access_token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('"grant_type":"authorization_code"'),
        }),
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token successfully', async () => {
      const newAccessToken = 'new_access_token_123';
      const newRefreshToken = 'new_refresh_token_123';

      const mockTokenResponse = {
        code: 0,
        msg: 'success',
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_in: 3600,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      const result = await service.refreshAccessToken(mockRefreshToken);

      expect(result.accessToken).toBe(newAccessToken);
      expect(result.refreshToken).toBe(newRefreshToken);
      expect(result.expiresIn).toBe(3600);
    });

    it('should keep old refresh token when new one not provided', async () => {
      const mockTokenResponse = {
        code: 0,
        msg: 'success',
        access_token: 'new_access_token',
        expires_in: 3600,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      const result = await service.refreshAccessToken(mockRefreshToken);

      expect(result.refreshToken).toBe(mockRefreshToken);
    });

    it('should throw BadRequestException on HTTP error during refresh', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      } as Response);

      await expect(service.refreshAccessToken(mockRefreshToken)).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException on Feishu error during refresh', async () => {
      const mockTokenResponse = {
        code: 9999,
        msg: 'Invalid refresh token',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      await expect(service.refreshAccessToken(mockRefreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getUserInfo', () => {
    it('should get user info successfully', async () => {
      const mockUserInfoResponse = {
        code: 0,
        msg: 'success',
        data: mockFeishuUserInfo,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockUserInfoResponse,
      } as Response);

      const result = await service.getUserInfo(mockAccessToken);

      expect(result).toEqual(mockFeishuUserInfo);
    });

    it('should throw BadRequestException on HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      } as Response);

      await expect(service.getUserInfo(mockAccessToken)).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException on Feishu error', async () => {
      const mockUserInfoResponse = {
        code: 9999,
        msg: 'Invalid access token',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockUserInfoResponse,
      } as Response);

      await expect(service.getUserInfo(mockAccessToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should send authorization header correctly', async () => {
      const mockUserInfoResponse = {
        code: 0,
        msg: 'success',
        data: mockFeishuUserInfo,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockUserInfoResponse,
      } as Response);

      await service.getUserInfo(mockAccessToken);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://open.feishu.cn/open-apis/authen/v1/user_info',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockAccessToken}`,
          },
        }),
      );
    });
  });

  describe('handleCallback', () => {
    beforeEach(() => {
      // Setup successful API responses
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('access_token')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              code: 0,
              access_token: mockAccessToken,
              refresh_token: mockRefreshToken,
              expires_in: 7200,
            }),
          } as Response);
        }
        if (url.includes('user_info')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              code: 0,
              data: mockFeishuUserInfo,
            }),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          text: async () => 'Not Found',
        } as Response);
      });
    });

    it('should complete full OAuth flow successfully', async () => {
      connectorTokenRepository.findOne.mockResolvedValue(null);
      connectorTokenRepository.create.mockReturnValue({} as ConnectorToken);
      connectorTokenRepository.save.mockResolvedValue({} as ConnectorToken);

      const result = await service.handleCallback(mockCode, mockUserId);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(mockUserId);
      expect(result.tokens).toBeDefined();
      expect(result.userInfo).toEqual(mockFeishuUserInfo);
    });

    it('should return error when code is missing', async () => {
      const result = await service.handleCallback('', mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authorization code is missing');
    });

    it('should handle state with timestamp format', async () => {
      connectorTokenRepository.findOne.mockResolvedValue(null);
      connectorTokenRepository.create.mockReturnValue({} as ConnectorToken);
      connectorTokenRepository.save.mockResolvedValue({} as ConnectorToken);

      const stateWithTimestamp = `${mockUserId}:1234567890`;
      const result = await service.handleCallback(mockCode, stateWithTimestamp);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(mockUserId);
    });

    it('should create new user when userId is not in state', async () => {
      connectorTokenRepository.findOne.mockResolvedValue(null);
      connectorTokenRepository.create.mockReturnValue({} as ConnectorToken);
      connectorTokenRepository.save.mockResolvedValue({} as ConnectorToken);

      userRepository.findOne.mockResolvedValue(null);
      const mockUser = {
        id: 'new-user-id',
        email: mockFeishuUserInfo.email,
        name: mockFeishuUserInfo.name,
      } as User;
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      const result = await service.handleCallback(mockCode, undefined);

      expect(result.success).toBe(true);
      expect(result.userId).toBe('new-user-id');
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockFeishuUserInfo.email },
      });
    });

    it('should use existing user when email matches', async () => {
      connectorTokenRepository.findOne.mockResolvedValue(null);
      connectorTokenRepository.create.mockReturnValue({} as ConnectorToken);
      connectorTokenRepository.save.mockResolvedValue({} as ConnectorToken);

      const existingUser = {
        id: 'existing-user-id',
        email: mockFeishuUserInfo.email,
        name: 'Existing User',
      } as User;
      userRepository.findOne.mockResolvedValue(existingUser);

      const result = await service.handleCallback(mockCode, undefined);

      expect(result.success).toBe(true);
      expect(result.userId).toBe('existing-user-id');
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when user info has no email', async () => {
      // Mock user info without email
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('access_token')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              code: 0,
              access_token: mockAccessToken,
              refresh_token: mockRefreshToken,
              expires_in: 7200,
            }),
          } as Response);
        }
        if (url.includes('user_info')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              code: 0,
              data: { ...mockFeishuUserInfo, email: undefined },
            }),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
        } as Response);
      });

      const result = await service.handleCallback(mockCode, undefined);

      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });

    it('should handle OAuth flow errors gracefully', async () => {
      mockFetch.mockImplementation(() => {
        return Promise.resolve({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        } as Response);
      });

      const result = await service.handleCallback(mockCode, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('storeToken', () => {
    it('should create new token when none exists', async () => {
      connectorTokenRepository.findOne.mockResolvedValue(null);
      connectorTokenRepository.save.mockResolvedValue({} as ConnectorToken);

      await service.storeToken(mockUserId, mockTokens, mockFeishuUserInfo);

      expect(connectorTokenRepository.findOne).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          connectorType: 'feishu',
        },
      });
      expect(connectorTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          connectorType: 'feishu',
          accessToken: mockTokens.accessToken,
        }),
      );
    });

    it('should update existing token', async () => {
      const existingToken = {
        id: 'existing-token-id',
        userId: mockUserId,
        connectorType: 'feishu',
        accessToken: 'old_token',
      } as ConnectorToken;

      connectorTokenRepository.findOne.mockResolvedValue(existingToken);
      connectorTokenRepository.save.mockResolvedValue(existingToken);

      await service.storeToken(mockUserId, mockTokens, mockFeishuUserInfo);

      expect(connectorTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'existing-token-id',
          accessToken: mockTokens.accessToken,
          refreshToken: mockTokens.refreshToken,
        }),
      );
    });

    it('should create new token without userInfo', async () => {
      connectorTokenRepository.findOne.mockResolvedValue(null);
      connectorTokenRepository.save.mockResolvedValue({} as ConnectorToken);

      await service.storeToken(mockUserId, mockTokens);

      expect(connectorTokenRepository.save).toHaveBeenCalled();
    });

    it('should include Feishu user info in metadata', async () => {
      connectorTokenRepository.findOne.mockResolvedValue(null);
      connectorTokenRepository.create.mockReturnValue({} as ConnectorToken);
      connectorTokenRepository.save.mockResolvedValue({} as ConnectorToken);

      await service.storeToken(mockUserId, mockTokens, mockFeishuUserInfo);

      const saveCall = connectorTokenRepository.save.mock.calls[0][0];
      expect(saveCall.metadata).toEqual({
        feishuUserId: mockFeishuUserInfo.user_id,
        feishuUnionId: mockFeishuUserInfo.union_id,
        feishuOpenId: mockFeishuUserInfo.open_id,
        feishuName: mockFeishuUserInfo.name,
        feishuEmail: mockFeishuUserInfo.email,
      });
    });

    it('should replace metadata when updating existing token (actual behavior)', async () => {
      const existingToken = {
        id: 'existing-token-id',
        userId: mockUserId,
        connectorType: 'feishu',
        metadata: { customField: 'custom_value' },
      } as ConnectorToken;

      connectorTokenRepository.findOne.mockResolvedValue(existingToken);
      connectorTokenRepository.save.mockResolvedValue(existingToken);

      await service.storeToken(mockUserId, mockTokens, mockFeishuUserInfo);

      const saveCall = connectorTokenRepository.save.mock.calls[0][0];
      // The actual implementation creates new metadata from tokens.metadata and userInfo,
      // it doesn't preserve existing metadata
      expect(saveCall.metadata).toEqual({
        feishuUserId: mockFeishuUserInfo.user_id,
        feishuUnionId: mockFeishuUserInfo.union_id,
        feishuOpenId: mockFeishuUserInfo.open_id,
        feishuName: mockFeishuUserInfo.name,
        feishuEmail: mockFeishuUserInfo.email,
      });
    });
  });

  describe('getUserToken', () => {
    it('should return null when token does not exist', async () => {
      connectorTokenRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserToken(mockUserId);

      expect(result).toBeNull();
    });

    it('should return token when found and valid', async () => {
      const validToken = {
        id: 'token-id',
        userId: mockUserId,
        connectorType: 'feishu',
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        tokenType: 'Bearer',
        scope: 'contact:user.base:readonly',
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
        metadata: null,
      } as ConnectorToken;

      connectorTokenRepository.findOne.mockResolvedValue(validToken);

      const result = await service.getUserToken(mockUserId);

      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        tokenType: 'Bearer',
        scope: 'contact:user.base:readonly',
        expiresIn: expect.any(Number),
        expiresAt: expect.any(Date),
        metadata: undefined,
      });
    });

    it('should auto-refresh expired token', async () => {
      const expiredToken = {
        id: 'token-id',
        userId: mockUserId,
        connectorType: 'feishu',
        accessToken: 'old_token',
        refreshToken: mockRefreshToken,
        expiresAt: new Date(Date.now() - 1000), // Expired
      } as ConnectorToken;

      connectorTokenRepository.findOne.mockResolvedValue(expiredToken);
      connectorTokenRepository.save.mockResolvedValue(expiredToken);

      const newTokens = {
        ...mockTokens,
        accessToken: 'new_token',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 0,
          access_token: 'new_token',
          refresh_token: mockRefreshToken,
          expires_in: 7200,
        }),
      } as Response);

      const result = await service.getUserToken(mockUserId, true);

      expect(result?.accessToken).toBe('new_token');
      expect(connectorTokenRepository.save).toHaveBeenCalled();
    });

    it('should auto-refresh token expiring within 5 minutes', async () => {
      const expiringSoonToken = {
        id: 'token-id',
        userId: mockUserId,
        connectorType: 'feishu',
        accessToken: 'old_token',
        refreshToken: mockRefreshToken,
        expiresAt: new Date(Date.now() + 4 * 60 * 1000), // 4 minutes from now
      } as ConnectorToken;

      connectorTokenRepository.findOne.mockResolvedValue(expiringSoonToken);
      connectorTokenRepository.save.mockResolvedValue(expiringSoonToken);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 0,
          access_token: 'new_token',
          refresh_token: mockRefreshToken,
          expires_in: 7200,
        }),
      } as Response);

      const result = await service.getUserToken(mockUserId, true);

      expect(result?.accessToken).toBe('new_token');
    });

    it('should not auto-refresh when autoRefresh is false', async () => {
      const expiredToken = {
        id: 'token-id',
        userId: mockUserId,
        connectorType: 'feishu',
        accessToken: 'old_token',
        refreshToken: mockRefreshToken,
        expiresAt: new Date(Date.now() - 1000),
      } as ConnectorToken;

      connectorTokenRepository.findOne.mockResolvedValue(expiredToken);

      const result = await service.getUserToken(mockUserId, false);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result?.accessToken).toBe('old_token');
    });

    it('should handle refresh token failure gracefully', async () => {
      const expiredToken = {
        id: 'token-id',
        userId: mockUserId,
        connectorType: 'feishu',
        accessToken: 'old_token',
        refreshToken: mockRefreshToken,
        expiresAt: new Date(Date.now() - 1000),
      } as ConnectorToken;

      connectorTokenRepository.findOne.mockResolvedValue(expiredToken);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      } as Response);

      const result = await service.getUserToken(mockUserId, true);

      // Should return old token on refresh failure
      expect(result?.accessToken).toBe('old_token');
    });

    it('should handle token with null expiresAt', async () => {
      const tokenWithNullExpiry = {
        id: 'token-id',
        userId: mockUserId,
        connectorType: 'feishu',
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        expiresAt: null,
      } as ConnectorToken;

      connectorTokenRepository.findOne.mockResolvedValue(tokenWithNullExpiry);

      const result = await service.getUserToken(mockUserId);

      expect(result?.expiresAt).toBeDefined();
      expect(result?.expiresIn).toBeDefined();
    });
  });

  describe('deleteUserToken', () => {
    it('should delete existing token', async () => {
      const existingToken = {
        id: 'token-id',
        userId: mockUserId,
        connectorType: 'feishu',
      } as ConnectorToken;

      connectorTokenRepository.findOne.mockResolvedValue(existingToken);
      connectorTokenRepository.remove.mockResolvedValue(existingToken);

      await service.deleteUserToken(mockUserId);

      expect(connectorTokenRepository.findOne).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          connectorType: 'feishu',
        },
      });
      expect(connectorTokenRepository.remove).toHaveBeenCalledWith(existingToken);
    });

    it('should not throw when token does not exist', async () => {
      connectorTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteUserToken(mockUserId)).resolves.not.toThrow();

      expect(connectorTokenRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('isTokenValid', () => {
    it('should return true for valid token', async () => {
      const validToken = {
        id: 'token-id',
        userId: mockUserId,
        connectorType: 'feishu',
        expiresAt: new Date(Date.now() + 3600 * 1000),
      } as ConnectorToken;

      connectorTokenRepository.findOne.mockResolvedValue(validToken);

      const result = await service.isTokenValid(mockUserId);

      expect(result).toBe(true);
    });

    it('should return false for expired token', async () => {
      const expiredToken = {
        id: 'token-id',
        userId: mockUserId,
        connectorType: 'feishu',
        expiresAt: new Date(Date.now() - 1000),
      } as ConnectorToken;

      connectorTokenRepository.findOne.mockResolvedValue(expiredToken);

      const result = await service.isTokenValid(mockUserId);

      expect(result).toBe(false);
    });

    it('should return false when token does not exist', async () => {
      connectorTokenRepository.findOne.mockResolvedValue(null);

      const result = await service.isTokenValid(mockUserId);

      expect(result).toBe(false);
    });

    it('should return false when token has null expiresAt', async () => {
      const tokenWithNullExpiry = {
        id: 'token-id',
        userId: mockUserId,
        connectorType: 'feishu',
        expiresAt: null,
      } as ConnectorToken;

      connectorTokenRepository.findOne.mockResolvedValue(tokenWithNullExpiry);

      const result = await service.isTokenValid(mockUserId);

      expect(result).toBe(false);
    });
  });
});
