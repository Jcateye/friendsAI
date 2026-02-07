import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import {
  User,
  Contact,
  Conversation,
  Event,
  ToolConfirmation,
  ConnectorToken,
  AuthSession,
  Message,
  ConversationArchive,
  ContactFact,
  ContactTodo,
  ContactBrief,
} from './entities';
import { AuthModule } from './auth/auth.module';
import { ContactsModule } from './contacts/contacts.module';
import { ConversationsModule } from './conversations/conversations.module';
import { EventsModule } from './events/events.module';
import { AiModule } from './ai/ai.module';
import { BriefingsModule } from './briefings/briefings.module';
import { ActionPanelModule } from './action-panel/action-panel.module';
import { AgentModule } from './agent/agent.module';
import { ConnectorsModule } from './connectors/connectors.module';
import { ToolsModule } from './tools/tools.module';
import { ToolConfirmationsModule } from './tool-confirmations/tool-confirmations.module';
import { ConversationArchivesModule } from './conversation-archives/conversation-archives.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 使配置模块在整个应用中可用
      envFilePath: (() => {
        const nodeEnv = process.env.NODE_ENV ?? 'development';
        const envNames = [nodeEnv];
        if (nodeEnv === 'development') envNames.push('dev');
        if (nodeEnv === 'dev') envNames.push('development');

        const baseNames = envNames.flatMap((name) => [
          `.env.${name}.local`,
          `.env.${name}`,
        ]);
        const shared = ['.env.local', '.env'];
        const candidates = [...baseNames, ...shared];
        const cwd = process.cwd();
        const inPackage = path.basename(cwd) === 'server-nestjs';
        const rootPaths = candidates.map((file) => path.resolve(cwd, file));
        const packagePaths = inPackage
          ? []
          : candidates.map((file) => path.resolve(cwd, 'packages/server-nestjs', file));
        return Array.from(new Set([...rootPaths, ...packagePaths]));
      })(),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error('DATABASE_URL is required');
        }
        const synchronize = false;
        console.log(`[TypeOrm] synchronize=${synchronize}`);
        return {
          type: 'postgres',
          url: databaseUrl,
          autoLoadEntities: true,
          synchronize,
          migrationsRun: false,
          logging: ['error', 'warn'], // Enable TypeORM error logging
        };
      },
    }),
    TypeOrmModule.forFeature([
      User,
      Contact,
      Conversation,
      Event,
      ToolConfirmation,
      ConnectorToken,
      AuthSession,
      Message,
      ConversationArchive,
      ContactFact,
      ContactTodo,
      ContactBrief,
    ]),
    AuthModule,
    ContactsModule,
    ConversationsModule,
    EventsModule,
    AiModule,
    BriefingsModule,
    ActionPanelModule,
    AgentModule,
    ConnectorsModule,
    ToolsModule,
    ToolConfirmationsModule,
    ConversationArchivesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
