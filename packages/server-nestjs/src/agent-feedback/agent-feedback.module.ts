import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentFeedback } from '../entities/agent-feedback.entity';
import { AgentFeedbackController } from './agent-feedback.controller';
import { AgentFeedbackService } from './agent-feedback.service';

@Module({
  imports: [TypeOrmModule.forFeature([AgentFeedback])],
  controllers: [AgentFeedbackController],
  providers: [AgentFeedbackService],
  exports: [AgentFeedbackService],
})
export class AgentFeedbackModule {}
