import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AgentDefinitionPublishLog,
  AgentDefinitionReleaseRule,
  AgentDefinitionVersion,
} from '../v3-entities';
import { AgentDefinitionCenterController } from './agent-definition-center.controller';
import { AgentDefinitionCenterService } from './agent-definition-center.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [
        AgentDefinitionVersion,
        AgentDefinitionReleaseRule,
        AgentDefinitionPublishLog,
      ],
      'v3',
    ),
  ],
  controllers: [AgentDefinitionCenterController],
  providers: [AgentDefinitionCenterService],
  exports: [AgentDefinitionCenterService],
})
export class AgentDefinitionCenterModule {}
