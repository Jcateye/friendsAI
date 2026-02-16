import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as ApiResponseDecorator } from '@nestjs/swagger';
import { AuthService, AuthResponse } from './auth.service';
import { Public } from './public.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { SendCodeDto } from './dto/send-code.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post('send-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send verification code to email or phone' })
  @ApiResponseDecorator({ status: 200, description: 'Verification code sent' })
  @ApiResponseDecorator({ status: 400, description: 'Bad request' })
  async sendCode(@Body() sendCodeDto: SendCodeDto): Promise<{ success: boolean; message: string }> {
    return this.authService.sendVerificationCode(sendCodeDto.emailOrPhone);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponseDecorator({ status: 200, description: 'User registered successfully' })
  @ApiResponseDecorator({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponseDecorator({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(
      registerDto.email,
      registerDto.phone,
      registerDto.password,
      registerDto.name,
    );
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email/phone and password' })
  @ApiResponseDecorator({ status: 200, description: 'Login successful' })
  @ApiResponseDecorator({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto.emailOrPhone, loginDto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponseDecorator({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponseDecorator({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() refreshDto: RefreshDto): Promise<AuthResponse> {
    return this.authService.refresh(refreshDto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponseDecorator({ status: 200, description: 'Logout successful' })
  @ApiResponseDecorator({ status: 401, description: 'Invalid refresh token' })
  async logout(@Body() logoutDto: LogoutDto): Promise<{ success: boolean }> {
    return this.authService.logout(logoutDto.refreshToken);
  }
}
