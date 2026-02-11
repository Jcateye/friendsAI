import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentFeedback } from '../entities/agent-feedback.entity';
import { CreateAgentFeedbackDto, AgentFeedbackResponseDto } from './dto/agent-feedback.dto';

@Injectable()
export class AgentFeedbackService {
  constructor(
    @InjectRepository(AgentFeedback)
    private readonly feedbackRepository: Repository<AgentFeedback>,
  ) {}

  /**
   * Create a new feedback record
   */
  async create(
    userId: string,
    dto: CreateAgentFeedbackDto,
  ): Promise<AgentFeedbackResponseDto> {
    const feedback = this.feedbackRepository.create({
      userId,
      agentId: dto.agentId,
      runId: dto.runId,
      actionId: dto.actionId,
      contactId: dto.contactId,
      feedbackType: dto.feedbackType,
      rating: dto.rating,
      comment: dto.comment,
      originalData: dto.originalData,
      modifiedData: dto.modifiedData,
      reason: dto.reason,
    });

    const saved = await this.feedbackRepository.save(feedback);

    return this.toResponseDto(saved);
  }

  /**
   * Get feedback by ID
   */
  async findOne(id: string, userId?: string): Promise<AgentFeedbackResponseDto | null> {
    const queryBuilder = this.feedbackRepository.createQueryBuilder('feedback')
      .where('feedback.id = :id', { id });

    if (userId) {
      queryBuilder.andWhere('feedback.userId = :userId', { userId });
    }

    const feedback = await queryBuilder.getOne();
    return feedback ? this.toResponseDto(feedback) : null;
  }

  /**
   * Get feedback for a specific agent run
   */
  async findByRunId(runId: string, userId?: string): Promise<AgentFeedbackResponseDto[]> {
    const queryBuilder = this.feedbackRepository.createQueryBuilder('feedback')
      .where('feedback.runId = :runId', { runId });

    if (userId) {
      queryBuilder.andWhere('feedback.userId = :userId', { userId });
    }

    const feedbacks = await queryBuilder.getMany();
    return feedbacks.map(f => this.toResponseDto(f));
  }

  /**
   * Get feedback for a specific contact
   */
  async findByContactId(contactId: string, userId?: string): Promise<AgentFeedbackResponseDto[]> {
    const queryBuilder = this.feedbackRepository.createQueryBuilder('feedback')
      .where('feedback.contactId = :contactId', { contactId });

    if (userId) {
      queryBuilder.andWhere('feedback.userId = :userId', { userId });
    }

    const feedbacks = await queryBuilder.getMany();
    return feedbacks.map(f => this.toResponseDto(f));
  }

  /**
   * Get feedback for a specific action
   */
  async findByActionId(actionId: string, userId?: string): Promise<AgentFeedbackResponseDto[]> {
    const queryBuilder = this.feedbackRepository.createQueryBuilder('feedback')
      .where('feedback.actionId = :actionId', { actionId });

    if (userId) {
      queryBuilder.andWhere('feedback.userId = :userId', { userId });
    }

    const feedbacks = await queryBuilder.getMany();
    return feedbacks.map(f => this.toResponseDto(f));
  }

  /**
   * Get aggregated feedback stats for an agent
   */
  async getAgentStats(agentId: string, userId?: string): Promise<{
    totalFeedback: number;
    averageRating: number | null;
    feedbackByType: Record<string, number>;
    acceptanceRate: number;
  }> {
    const queryBuilder = this.feedbackRepository.createQueryBuilder('feedback')
      .where('feedback.agentId = :agentId', { agentId });

    if (userId) {
      queryBuilder.andWhere('feedback.userId = :userId', { userId });
    }

    const feedbacks = await queryBuilder.getMany();

    const totalFeedback = feedbacks.length;
    const ratedFeedbacks = feedbacks.filter(f => f.rating !== null);
    const averageRating = ratedFeedbacks.length > 0
      ? ratedFeedbacks.reduce((sum, f) => sum + (f.rating ?? 0), 0) / ratedFeedbacks.length
      : null;

    const feedbackByType: Record<string, number> = {};
    for (const feedback of feedbacks) {
      feedbackByType[feedback.feedbackType] = (feedbackByType[feedback.feedbackType] || 0) + 1;
    }

    const actionFeedbacks = feedbacks.filter(f =>
      f.feedbackType === 'action_accepted' ||
      f.feedbackType === 'action_rejected' ||
      f.feedbackType === 'action_modified'
    );
    const acceptanceRate = actionFeedbacks.length > 0
      ? actionFeedbacks.filter(f => f.feedbackType === 'action_accepted').length / actionFeedbacks.length
      : 0;

    return {
      totalFeedback,
      averageRating,
      feedbackByType,
      acceptanceRate,
    };
  }

  private toResponseDto(feedback: AgentFeedback): AgentFeedbackResponseDto {
    return {
      id: feedback.id,
      userId: feedback.userId ?? '',
      agentId: feedback.agentId,
      runId: feedback.runId ?? undefined,
      actionId: feedback.actionId ?? undefined,
      contactId: feedback.contactId ?? undefined,
      feedbackType: feedback.feedbackType as any,
      rating: feedback.rating ?? undefined,
      comment: feedback.comment ?? undefined,
      originalData: feedback.originalData ?? undefined,
      modifiedData: feedback.modifiedData ?? undefined,
      reason: feedback.reason ?? undefined,
      createdAt: feedback.createdAt.toISOString(),
      updatedAt: feedback.updatedAt.toISOString(),
    };
  }
}
