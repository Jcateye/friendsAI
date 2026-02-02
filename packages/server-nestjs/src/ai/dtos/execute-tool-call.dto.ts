import { IsString, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExecuteToolCallDto {
  @ApiProperty({
    description: 'The name of the tool to be executed, e.g., "send_feishu_template"',
    example: 'send_feishu_template',
  })
  @IsString()
  @IsNotEmpty()
  toolName: string;

  @ApiProperty({
    description: 'The payload/arguments for the tool execution',
    example: { templateId: 'follow_up_v1', content: 'Follow-up message content' },
  })
  @IsObject()
  @IsNotEmpty()
  payload: Record<string, any>; // Use Record<string, any> for dynamic payload structure
}
