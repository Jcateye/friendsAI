import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config'; // Import ConfigModule
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User, Contact, Conversation, Event, ToolConfirmation, ConnectorToken } from './entities';
import { AuthModule } from './auth/auth.module';
import { ContactsModule } from './contacts/contacts.module';
import { ConversationsModule } from './conversations/conversations.module';
import { EventsModule } from './events/events.module';
import { AiModule } from './ai/ai.module';
import { BriefingsModule } from './briefings/briefings.module';
import { ActionPanelModule } from './action-panel/action-panel.module';
import { AgentModule } from './agent/agent.module';
import { ConnectorsModule } from './connectors/connectors.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 使配置模块在整个应用中可用
      envFilePath: '.env', // 指定环境变量文件路径
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5434,
      username: 'postgres',
      password: 'postgres',
      database: 'friends_ai_db',
      autoLoadEntities: true,
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User, Contact, Conversation, Event, ToolConfirmation, ConnectorToken]),
    AuthModule,
    ContactsModule,
    ConversationsModule,
    EventsModule,
    AiModule,
    BriefingsModule,
    ActionPanelModule,
    AgentModule,
    ConnectorsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
