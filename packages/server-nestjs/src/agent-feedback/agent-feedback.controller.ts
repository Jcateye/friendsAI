import { Controller, Post, Get, Body, Param, Query, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import type { Request } from 'express';
import { AgentFeedbackService } from './agent-feedback.service';
import { CreateAgentFeedbackDto, AgentFeedbackResponseDto } from './dto/agent-feedback.dto';

@ApiTags('Agent Feedback')
@Controller('agent/feedback')
export class AgentFeedbackController {
  constructor(private readonly feedbackService: AgentFeedbackService) {}

  @Post()
  @ApiOperation({
    summary: 'Submit feedback on agent-generated action cards or insights',
    description:
      'Allows users to provide feedback on agent outputs including accepting, rejecting, or modifying action cards, ' +
      'and rating insights as helpful or not. This feedback is used to improve agent performance over time.',
  })
  @ApiResponse({
    status: 201,
    description: 'Feedback successfully recorded',
    type: AgentFeedbackResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: Request,
    @Body() dto: CreateAgentFeedbackDto,
  ): Promise<AgentFeedbackResponseDto> {
    const userId = (req.user as { id?: string } | undefined)?.id;
    return this.feedbackService.create(userId ?? '', dto);
  }

  @Get('run/:runId')
  @ApiOperation({
    summary: 'Get all feedback for an agent run',
    description: 'Retrieves all feedback records associated with a specific agent run',
  })
  @ApiResponse({
    status: 200,
    description: 'List of feedback records',
    type: [AgentFeedbackResponseDto],
  })
  async findByRunId(
    @Param('runId') runId: string,
    @Req() req: Request,
  ): Promise<AgentFeedbackResponseDto[]> {
    const userId = (req.user as { id?: string } | undefined)?.id;
    return this.feedbackService.findByRunId(runId, userId);
  }

  @Get('contact/:contactId')
  @ApiOperation({
    summary: 'Get all feedback for a contact',
    description: 'Retrieves all feedback records associated with a specific contact',
  })
  @ApiResponse({
    status: 200,
    description: 'List of feedback records',
    type: [AgentFeedbackResponseDto],
  })
  async findByContactId(
    @Param('contactId') contactId: string,
    @Req() req: Request,
  ): Promise<AgentFeedbackResponseDto[]> {
    const userId = (req.user as { id?: string } | undefined)?.id;
    return this.feedbackService.findByContactId(contactId, userId);
  }

  @Get('action/:actionId')
  @ApiOperation({
    summary: 'Get all feedback for an action',
    description: 'Retrieves all feedback records associated with a specific action card',
  })
  @ApiResponse({
    status: 200,
    description: 'List of feedback records',
    type: [AgentFeedbackResponseDto],
  })
  async findByActionId(
    @Param('actionId') actionId: string,
    @Req() req: Request,
  ): Promise<AgentFeedbackResponseDto[]> {
    const userId = (req.user as { id?: string } | undefined)?.id;
    return this.feedbackService.findByActionId(actionId, userId);
  }

  @Get('stats/:agentId')
  @ApiOperation({
    summary: 'Get aggregated feedback statistics for an agent',
    description:
      'Returns aggregated statistics including total feedback count, average rating, ' +
      'feedback breakdown by type, and action acceptance rate',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent feedback statistics',
    schema: {
      type: 'object',
      properties: {
        totalFeedback: { type: 'number' },
        averageRating: { type: 'number', nullable: true },
        feedbackByType: { type: 'object' },
        acceptanceRate: { type: 'number' },
      },
    },
  })
  async getAgentStats(
    @Param('agentId') agentId: string,
    @Req() req: Request,
  ): Promise<{
    totalFeedback: number;
    averageRating: number | null;
    feedbackByType: Record<string, number>;
    acceptanceRate: number;
  }> {
    const userId = (req.user as { id?: string } | undefined)?.id;
    return this.feedbackService.getAgentStats(agentId, userId);
  }

  @Get('item/:id')
  @ApiOperation({
    summary: 'Get a specific feedback record',
    description: 'Retrieves a single feedback record by ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Feedback record found',
    type: AgentFeedbackResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Feedback not found',
  })
  async findOne(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<AgentFeedbackResponseDto> {
    const userId = (req.user as { id?: string } | undefined)?.id;
    const feedback = await this.feedbackService.findOne(id, userId);
    if (!feedback) {
      throw new Error('Feedback not found');
    }
    return feedback;
  }
}
