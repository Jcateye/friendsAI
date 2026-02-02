import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { VerifyCodeService } from './verify-code.service';

interface RegisterDto {
  email: string;
  password: string;
  name?: string;
  verifyCode?: string;
}

interface LoginDto {
  email: string;
  password: string;
  verifyCode?: string;
}

interface CodeLoginDto {
  email: string;
  code: string;
}

interface SendVerifyCodeDto {
  email: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly verifyCodeService: VerifyCodeService,
  ) {}

  @Post('send-verify-code')
  async sendVerifyCode(@Body() dto: SendVerifyCodeDto) {
    const code = this.verifyCodeService.generateCode(dto.email);
    
    return { 
      message: 'Verification code sent',
      email: dto.email,
      code: process.env.NODE_ENV === 'development' ? code : undefined,
    };
  }

  // 前端兼容接口：/auth/send-code
  @Post('send-code')
  async sendCode(@Body() dto: SendVerifyCodeDto) {
    return this.sendVerifyCode(dto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    if (registerDto.verifyCode) {
      const isValid = this.verifyCodeService.verifyCode(
        registerDto.email,
        registerDto.verifyCode,
      );
      if (!isValid) {
        throw new BadRequestException('Invalid or expired verification code');
      }
    }
    
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.name,
    );
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    if (loginDto.verifyCode) {
      const isValid = this.verifyCodeService.verifyCode(
        loginDto.email,
        loginDto.verifyCode,
      );
      if (!isValid) {
        throw new BadRequestException('Invalid or expired verification code');
      }
    }
    
    return this.authService.login(loginDto.email, loginDto.password);
  }

  // 纯验证码登录（前端主要使用此接口）
  @Post('login-by-code')
  async loginByCode(@Body() dto: CodeLoginDto) {
    // 验证验证码
    const isValid = this.verifyCodeService.verifyCode(dto.email, dto.code);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired verification code');
    }
    
    // 使用验证码登录/自动注册
    const result = await this.authService.loginOrRegisterByCode(dto.email);
    
    return {
      token: `token_${result.id}_${Date.now()}`,
      user: result,
    };
  }
}