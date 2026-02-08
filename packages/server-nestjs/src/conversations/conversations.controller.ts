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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/93473240-e68c-4772-898a-d197a5820b45',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.controller.ts:21',message:'create conversation entry',data:{hasUser:!!req.user,userId:req.user?.id,body:JSON.stringify(body)},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const userId = req.user?.id;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/93473240-e68c-4772-898a-d197a5820b45',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.controller.ts:25',message:'before service.create',data:{userId,hasUserId:!!userId,title:body.title,content:body.content,contactId:body.contactId},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    try {
      const result = this.conversationsService.create(
        {
          title: body.title,
          content: body.content,
        },
        userId,
        body.contactId,
      );
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/93473240-e68c-4772-898a-d197a5820b45',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.controller.ts:35',message:'service.create returned promise',data:{isPromise:result instanceof Promise},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return result;
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/93473240-e68c-4772-898a-d197a5820b45',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.controller.ts:40',message:'controller catch error',data:{errorMessage:error instanceof Error?error.message:String(error),errorStack:error instanceof Error?error.stack:undefined},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      throw error;
    }
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
