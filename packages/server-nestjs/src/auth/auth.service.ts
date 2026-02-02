import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async register(email: string, password: string, name?: string): Promise<{ id: string; email: string }> {
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
    });

    const savedUser = await this.userRepository.save(user);
    return { id: savedUser.id, email: savedUser.email };
  }

  async login(email: string, password: string): Promise<{ id: string; email: string }> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return { id: user.id, email: user.email };
  }

  // 验证码登录：用户存在则登录，不存在则自动注册
  async loginOrRegisterByCode(email: string): Promise<{ id: string; email: string; name?: string }> {
    let user = await this.userRepository.findOne({ where: { email } });
    
    if (!user) {
      // 自动注册：生成随机密码（用户通过验证码登录，无需知道密码）
      const randomPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
      user = this.userRepository.create({
        email,
        password: hashedPassword,
        name: email.split('@')[0], // 默认使用邮箱前缀作为名称
      });
      
      user = await this.userRepository.save(user);
    }
    
    return { id: user.id, email: user.email, name: user.name };
  }
}