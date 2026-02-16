import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ required: false, description: 'Conversation title' })
  title?: string;

  @ApiProperty({ required: false, description: 'Initial message content' })
  content?: string;

  @ApiProperty({ required: false, description: 'Associated contact ID' })
  contactId?: string;
}
