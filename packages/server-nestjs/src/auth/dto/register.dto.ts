import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ required: false, description: 'Email address' })
  email?: string;

  @ApiProperty({ required: false, description: 'Phone number' })
  phone?: string;

  @ApiProperty({ description: 'Password' })
  password: string;

  @ApiProperty({ required: false, description: 'User name' })
  name?: string;
}
