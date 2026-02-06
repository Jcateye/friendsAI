import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Email or phone number' })
  emailOrPhone: string;

  @ApiProperty({ description: 'Password' })
  password: string;
}
