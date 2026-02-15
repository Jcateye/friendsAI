import { Logger, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { LoggerOptions } from 'typeorm';
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
import { ActionTrackingModule } from './action-tracking/action-tracking.module';
import { FeishuApiModule } from './feishu/api/feishu-api.module';
import { FeishuWebhookModule } from './feishu/webhook/feishu-webhook.module';
import { FeishuConfigModule } from './feishu/config/feishu-config.module';
import { TimestampMsInterceptor } from './common/interceptors/timestamp-ms.interceptor';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';

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
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error('DATABASE_URL is required');
        }
        const synchronize = false;

        // 通过环境变量控制是否打开 TypeORM 的 query 级别调试日志
        const dbDebugFlag = configService.get<string>('DB_DEBUG_LOG') ?? '';
        const enableDbDebug = ['1', 'true', 'TRUE', 'yes', 'YES'].includes(dbDebugFlag);

        const logging: LoggerOptions = enableDbDebug ? ['query', 'error', 'warn'] : ['error', 'warn'];

        const logger = new Logger('TypeOrmConfig');
        logger.log(
          `[TypeOrm] synchronize=${synchronize}, logging=${Array.isArray(logging) ? logging.join(',') : logging}`,
        );

        return {
          type: 'postgres',
          url: databaseUrl,
          autoLoadEntities: true,
          synchronize,
          migrationsRun: false,
          logging,
        };
      },
    }),
    // V3 数据源配置 - 用于 action tracking 和 weekly report
    TypeOrmModule.forRootAsync({
      name: 'v3',
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        // V3 数据库 URL，如果没有配置则使用主数据库 URL
        const databaseUrl =
          configService.get<string>('DATABASE_URL_V3') ?? configService.get<string>('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error('DATABASE_URL is required for V3 data source');
        }
        const synchronize = false;

        // 通过环境变量控制是否打开 TypeORM 的 query 级别调试日志
        const dbDebugFlag = configService.get<string>('DB_DEBUG_LOG') ?? '';
        const enableDbDebug = ['1', 'true', 'TRUE', 'yes', 'YES'].includes(dbDebugFlag);

        const logging: LoggerOptions = enableDbDebug ? ['query', 'error', 'warn'] : ['error', 'warn'];

        const logger = new Logger('TypeOrmConfig-V3');
        logger.log(
          `[TypeOrm-V3] synchronize=${synchronize}, logging=${Array.isArray(logging) ? logging.join(',') : logging}`,
        );

        return {
          type: 'postgres',
          url: databaseUrl,
          autoLoadEntities: true,
          synchronize,
          migrationsRun: false,
          logging,
          // 指向 friendsai_v3_gpt 数据库的 schema（如果需要）
          // entityPrefix: 'v3_',
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
    ActionTrackingModule,
    FeishuApiModule,
    FeishuWebhookModule,
    FeishuConfigModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      // 统一 HTTP 请求/响应日志拦截器（debug 级别）
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimestampMsInterceptor,
    },
  ],
})
export class AppModule {}
