import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from '../entities';
import {
  DailyActionDigest,
  DailyActionDigestItem,
} from '../v3-entities';
import { AgentModule } from '../agent/agent.module';
import { ActionDigestController } from './action-digest.controller';
import { ActionDigestService } from './action-digest.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contact]),
    TypeOrmModule.forFeature([DailyActionDigest, DailyActionDigestItem], 'v3'),
    AgentModule,
  ],
  controllers: [ActionDigestController],
  providers: [ActionDigestService],
  exports: [ActionDigestService],
})
export class ActionDigestModule {}
