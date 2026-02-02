import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserProfileDto, UpdateUserProfileDto } from './dtos/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }
    // Map User entity to UserProfileDto
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      // Add other profile fields as needed
      notificationsEnabled: user.notificationsEnabled,
      darkModeEnabled: user.darkModeEnabled,
      autoSyncEnabled: user.autoSyncEnabled,
    };
  }

  async updateProfile(userId: string, updateUserProfileDto: UpdateUserProfileDto): Promise<UserProfileDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    // Update fields from DTO
    if (updateUserProfileDto.name !== undefined) {
      user.name = updateUserProfileDto.name;
    }
    if (updateUserProfileDto.notificationsEnabled !== undefined) {
      user.notificationsEnabled = updateUserProfileDto.notificationsEnabled;
    }
    if (updateUserProfileDto.darkModeEnabled !== undefined) {
      user.darkModeEnabled = updateUserProfileDto.darkModeEnabled;
    }
    if (updateUserProfileDto.autoSyncEnabled !== undefined) {
      user.autoSyncEnabled = updateUserProfileDto.autoSyncEnabled;
    }
    // Add other updatable profile fields as needed

    const updatedUser = await this.userRepository.save(user);
    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      // Add other profile fields as needed
      notificationsEnabled: updatedUser.notificationsEnabled,
      darkModeEnabled: updatedUser.darkModeEnabled,
      autoSyncEnabled: updatedUser.autoSyncEnabled,
    };
  }
}
