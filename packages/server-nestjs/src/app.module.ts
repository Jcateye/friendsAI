import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Import ConfigModule
import { AppController } from './app.controller';
import { AppService } from './app.service';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 使配置模块在整个应用中可用
      envFilePath: '.env', // 指定环境变量文件路径
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
