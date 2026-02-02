import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UserProfileDto {
  @IsString()
  id: string;

  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsBoolean()
  notificationsEnabled: boolean;

  @IsBoolean()
  darkModeEnabled: boolean;

  @IsBoolean()
  autoSyncEnabled: boolean;
}

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  darkModeEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  autoSyncEnabled?: boolean;
}
