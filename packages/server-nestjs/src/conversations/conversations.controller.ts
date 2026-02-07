import { Controller, Post, Get, Body, Param, Query, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { MessagesService } from './messages.service';
import { CreateConversationDto } from './dto/create-conversation.dto';

@ApiTags('conversations')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({ status: 200, description: 'Conversation created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Request() req: any,
    @Body() body: CreateConversationDto = {},
  ) {
    return this.conversationsService.create(
      {
        title: body.title,
        content: body.content,
      },
      req.user?.id,
      body.contactId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all conversations for the current user' })
  @ApiResponse({ status: 200, description: 'Conversations retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Request() req: any) {
    return this.conversationsService.findAll(req.user?.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a conversation by ID' })
  @ApiParam({ name: 'id', description: 'Conversation ID', type: String })
  @ApiResponse({ status: 200, description: 'Conversation retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.conversationsService.findOne(id, req.user?.id);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID', type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of messages to return' })
  @ApiQuery({ name: 'before', required: false, type: String, description: 'Get messages before this ISO timestamp' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  listMessages(
    @Request() req: any,
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.messagesService.listMessages(id, {
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      before,
      userId: req.user?.id,
    });
  }
}
