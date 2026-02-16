import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, AuthSession } from '../entities';
import { JwtPayload } from './jwt.strategy';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse extends AuthTokens {
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    name: string | null;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTokenExpiresIn: number;
  private readonly refreshTokenExpiresInDays: number;

  /**
   * 内存中存储验证码: Map<emailOrPhone, { code: string, expiresAt: Date }>
   */
  private readonly verificationCodes = new Map<string, { code: string; expiresAt: Date }>();

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AuthSession)
    private authSessionRepository: Repository<AuthSession>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.accessTokenExpiresIn = 900; // 15 minutes in seconds
    this.refreshTokenExpiresInDays = 7;
  }

  async register(
    email: string | undefined,
    phone: string | undefined,
    password: string,
    name?: string,
  ): Promise<AuthResponse> {
    if (!email && !phone) {
      throw new BadRequestException('Either email or phone is required');
    }

    const existingUser = await this.userRepository.findOne({
      where: [
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    });
    if (existingUser) {
      throw new ConflictException('Email or phone already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();
    const user = this.userRepository.create({
      email: email ?? null,
      phone: phone ?? null,
      password: hashedPassword,
      name,
      createdAt: now,
      updatedAt: now,
    });

    const savedUser = await this.userRepository.save(user);
    return this.generateTokens(savedUser);
  }

  /**
   * 发送验证码
   * dev 环境固定返回 123456，不真正发送邮件
   */
  async sendVerificationCode(emailOrPhone: string): Promise<{ success: boolean; message: string }> {
    if (!emailOrPhone) {
      throw new BadRequestException('emailOrPhone is required');
    }

    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';
    const code = isDev ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();

    // 存储验证码，5 分钟有效
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);
    this.verificationCodes.set(emailOrPhone, { code, expiresAt });

    if (isDev) {
      this.logger.log(`[DEV] Verification code for ${emailOrPhone}: ${code}`);
    } else {
      // TODO: 生产环境调用真实的邮件/短信发送服务
      this.logger.log(`Verification code sent to ${emailOrPhone}`);
    }

    return {
      success: true,
      message: isDev
        ? '验证码已发送（开发环境固定为 123456）'
        : '验证码已发送，请查收',
    };
  }

  async login(emailOrPhone: string, password: string): Promise<AuthResponse> {
    if (!emailOrPhone) {
      throw new BadRequestException('emailOrPhone is required');
    }

    // 检查是否是验证码登录
    const storedCode = this.verificationCodes.get(emailOrPhone);
    const isCodeLogin = storedCode
      && storedCode.code === password
      && new Date() < storedCode.expiresAt;

    if (isCodeLogin) {
      // 验证码匹配，清除已使用的验证码
      this.verificationCodes.delete(emailOrPhone);

      // 查找用户，不存在则自动注册
      let user = await this.userRepository.findOne({
        where: [
          { email: emailOrPhone },
          { phone: emailOrPhone },
        ],
      });

      if (!user) {
        this.logger.log(`Auto-registering user: ${emailOrPhone}`);
        const hashedPassword = await bcrypt.hash(password, 10);
        const now = new Date();
        const isEmail = emailOrPhone.includes('@');
        user = this.userRepository.create({
          email: isEmail ? emailOrPhone : null,
          phone: isEmail ? null : emailOrPhone,
          password: hashedPassword,
          createdAt: now,
          updatedAt: now,
        });
        user = await this.userRepository.save(user);
      }

      return this.generateTokens(user);
    }

    // 普通密码登录
    const user = await this.userRepository.findOne({
      where: [
        { email: emailOrPhone },
        { phone: emailOrPhone },
      ],
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const session = await this.authSessionRepository.findOne({
      where: {
        refreshToken,
        revokedAt: IsNull(),
      },
      relations: ['user'],
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date() > session.expiresAt) {
      await this.revokeSession(session);
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revoke old session and create new tokens (rotation)
    await this.revokeSession(session);
    return this.generateTokens(session.user);
  }

  async logout(refreshToken: string): Promise<{ success: boolean }> {
    const session = await this.authSessionRepository.findOne({
      where: {
        refreshToken,
        revokedAt: IsNull(),
      },
    });

    if (session) {
      await this.revokeSession(session);
    }

    return { success: true };
  }

  async logoutAll(userId: string): Promise<{ success: boolean }> {
    await this.authSessionRepository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    return { success: true };
  }

  private async generateTokens(user: User): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.accessTokenExpiresIn,
    });

    const refreshToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshTokenExpiresInDays);

    const now = new Date();
    const session = this.authSessionRepository.create({
      userId: user.id,
      refreshToken,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });
    await this.authSessionRepository.save(session);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiresIn,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
      },
    };
  }

  private async revokeSession(session: AuthSession): Promise<void> {
    session.revokedAt = new Date();
    await this.authSessionRepository.save(session);
  }
}
