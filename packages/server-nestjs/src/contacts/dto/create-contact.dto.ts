import { ApiProperty } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ required: false, description: 'Contact name' })
  name?: string;

  @ApiProperty({ required: false, description: 'Display name for the contact' })
  displayName?: string;

  @ApiProperty({ required: false, description: 'Email address' })
  email?: string;

  @ApiProperty({ required: false, description: 'Phone number' })
  phone?: string;

  @ApiProperty({ required: false, description: 'Company name' })
  company?: string;

  @ApiProperty({ required: false, description: 'Job position' })
  position?: string;

  @ApiProperty({ required: false, description: 'Additional notes' })
  note?: string;

  @ApiProperty({ required: false, description: 'Profile metadata', additionalProperties: true })
  profile?: Record<string, any>;

  @ApiProperty({ required: false, description: 'Tags', type: [String] })
  tags?: string[];
}
