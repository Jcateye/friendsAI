import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface VerifyCodeEntry {
  code: string;
  expiresAt: Date;
}

@Injectable()
export class VerifyCodeService {
  // 内存存储验证码，生产环境建议使用 Redis
  private codeStore: Map<string, VerifyCodeEntry> = new Map();

  constructor(private readonly configService: ConfigService) {}

  /**
   * 生成验证码
   * @param email 邮箱地址
   * @returns 生成的验证码
   */
  generateCode(email: string): string {
    const isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
    const universalCode = this.configService.get<string>('UNIVERSAL_VERIFY_CODE');
    
    // 开发模式下，如果配置了万能验证码，直接返回万能验证码
    if (isDevelopment && universalCode) {
      // 存储万能验证码
      this.storeCode(email, universalCode);
      return universalCode;
    }
    
    // 生产模式：生成随机6位数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.storeCode(email, code);
    return code;
  }

  /**
   * 存储验证码
   */
  private storeCode(email: string, code: string): void {
    // 验证码5分钟有效
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    this.codeStore.set(email.toLowerCase(), { code, expiresAt });
  }

  /**
   * 验证验证码
   * @param email 邮箱地址
   * @param code 验证码
   * @returns 是否验证通过
   */
  verifyCode(email: string, code: string): boolean {
    const isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
    const universalCode = this.configService.get<string>('UNIVERSAL_VERIFY_CODE');
    
    // 开发模式下，如果输入的是万能验证码，直接通过
    if (isDevelopment && universalCode && code === universalCode) {
      return true;
    }
    
    const entry = this.codeStore.get(email.toLowerCase());
    
    if (!entry) {
      return false;
    }
    
    // 检查是否过期
    if (new Date() > entry.expiresAt) {
      this.codeStore.delete(email.toLowerCase());
      return false;
    }
    
    // 验证是否匹配
    const isValid = entry.code === code;
    
    if (isValid) {
      // 验证成功后删除验证码
      this.codeStore.delete(email.toLowerCase());
    }
    
    return isValid;
  }

  /**
   * 清理过期的验证码
   */
  cleanupExpiredCodes(): void {
    const now = new Date();
    for (const [email, entry] of this.codeStore.entries()) {
      if (now > entry.expiresAt) {
        this.codeStore.delete(email);
      }
    }
  }
}
