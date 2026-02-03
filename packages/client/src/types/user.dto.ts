export interface User {
  id: string;
  email: string;
  name?: string;
  notificationsEnabled?: boolean;
  darkModeEnabled?: boolean;
  autoSyncEnabled?: boolean;
}

export type UserProfileDto = User;

export interface UpdateUserProfileDto {
  name?: string;
  email?: string;
  notificationsEnabled?: boolean;
  darkModeEnabled?: boolean;
  autoSyncEnabled?: boolean;
}

export interface SettingItem {
  id: string;
  icon: string;
  title: string;
  type: 'arrow' | 'text' | 'switch';
  value?: boolean | string;
}
