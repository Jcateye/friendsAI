import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { ActionTrackingModule } from '../action-tracking/action-tracking.module';
import {
  User,
  Contact,
  Conversation,
  ConnectorToken,
  AgentSnapshot,
  Event,
  ContactFact,
  ContactTodo,
} from '../entities';
import { AgentController } from './agent.controller';
import { AgentOrchestrator } from './agent.orchestrator';
import { AgentMessageStore } from './agent-message.store';
import { ContextBuilder } from './context-builder';
import { ContextBuilderService } from './context-builder.service';
import { SnapshotService } from './snapshots/snapshot.service';
import { SnapshotRepository } from './snapshots/snapshot.repository';
// Runtime Core services
import { AgentDefinitionRegistry } from './runtime/agent-definition-registry.service';
import { PromptTemplateRenderer } from './runtime/prompt-template-renderer.service';
import { TemplateContextBuilder } from './runtime/template-context-builder.service';
import { MemoryRuntime } from './runtime/memory-runtime.service';
import { ToolRuntime } from './runtime/tool-runtime.service';
import { OutputValidator } from './runtime/output-validator.service';
// Contact Insight capability
import { ContactInsightContextBuilder } from './capabilities/contact_insight/contact-insight-context-builder.service';
import { ContactInsightService } from './capabilities/contact_insight/contact-insight.service';
// Title Summary capability
import { TitleSummaryService } from './capabilities/title_summary/title-summary.service';
// Archive Brief capability
import { ArchiveBriefService } from './capabilities/archive_brief/archive-brief.service';
// Network Action capability
import { NetworkActionContextBuilder } from './capabilities/network_action/network-action.context';
import { NetworkActionService } from './capabilities/network_action/network-action.service';
// Runtime Executor
import { AgentRuntimeExecutor } from './runtime/agent-runtime-executor.service';
// Agent List Service
import { AgentListService } from './agent-list.service';
import { AgentDefinitionReleaseRule, AgentDefinitionVersion } from '../v3-entities';
import { SkillsModule } from '../skills/skills.module';
import { LocalEngine } from './engines/local.engine';
import { EnginePolicyResolver } from './engines/engine-policy.resolver';
import { EngineRouter } from './engines/engine.router';
import { ShanjiExtractorService } from '../skills/shanji/shanji-extractor.service';

@Module({
  imports: [
    AiModule,
    ConversationsModule,
    ActionTrackingModule,
    SkillsModule,
    TypeOrmModule.forFeature([
      User,
      Contact,
      Conversation,
      ConnectorToken,
      AgentSnapshot,
      Event,
      ContactFact,
      ContactTodo,
    ]),
    TypeOrmModule.forFeature([
      AgentDefinitionVersion,
      AgentDefinitionReleaseRule,
    ], 'v3'),
  ],
  controllers: [AgentController],
  providers: [
    AgentOrchestrator,
    AgentMessageStore,
    ContextBuilder,
    ContextBuilderService,
    SnapshotService,
    SnapshotRepository,
    // Runtime Core services
    AgentDefinitionRegistry,
    PromptTemplateRenderer,
    TemplateContextBuilder,
    MemoryRuntime,
    ToolRuntime,
    OutputValidator,
    // Contact Insight capability
    ContactInsightContextBuilder,
    ContactInsightService,
    // Title Summary capability
    TitleSummaryService,
    // Archive Brief capability
    ArchiveBriefService,
    // Network Action capability
    NetworkActionContextBuilder,
    NetworkActionService,
    // Runtime Executor
    AgentRuntimeExecutor,
    // Engines
    LocalEngine,
    EnginePolicyResolver,
    EngineRouter,
    ShanjiExtractorService,
    // Agent List Service
    AgentListService,
  ],
  exports: [
    AgentOrchestrator,
    AgentMessageStore,
    ContextBuilder,
    ContextBuilderService,
    SnapshotService,
    // Runtime Core services
    AgentDefinitionRegistry,
    PromptTemplateRenderer,
    TemplateContextBuilder,
    MemoryRuntime,
    ToolRuntime,
    OutputValidator,
    // Contact Insight exports
    ContactInsightService,
    // Title Summary exports
    TitleSummaryService,
    // Archive Brief exports
    ArchiveBriefService,
    // Network Action exports
    NetworkActionService,
    // Runtime Executor exports
    AgentRuntimeExecutor,
    // Engine routing exports
    EngineRouter,
  ],
})
export class AgentModule {}
