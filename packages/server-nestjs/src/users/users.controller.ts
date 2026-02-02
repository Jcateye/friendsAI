import { Controller, Get, Body, Patch, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserProfileDto, UpdateUserProfileDto } from './dtos/user.dto';

interface RequestWithUser extends Request {
  user: { id: string };
}

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Req() req: RequestWithUser): Promise<UserProfileDto> {
    const userId = req.user.id;
    return this.usersService.getProfile(userId);
  }

  @Patch('profile')
  async updateProfile(@Req() req: RequestWithUser, @Body() updateUserProfileDto: UpdateUserProfileDto): Promise<UserProfileDto> {
    const userId = req.user.id;
    return this.usersService.updateProfile(userId, updateUserProfileDto);
  }

  // TODO: Add APIs for settings (notifications, dark mode, auto-sync)
  // These might be part of updateProfile or separate endpoints if more complex logic is needed.
}
