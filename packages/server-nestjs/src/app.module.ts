import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User, Contact, Conversation, Event } from './entities';
import { AuthModule } from './auth/auth.module';
import { ContactsModule } from './contacts/contacts.module';
import { ConversationsModule } from './conversations/conversations.module';
import { EventsModule } from './events/events.module';
import { AiModule } from './ai/ai.module';
import { BriefingsModule } from './briefings/briefings.module';
import { ActionPanelModule } from './action-panel/action-panel.module';
import { LoggerModule } from 'nestjs-pino';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 使配置模块在整个应用中可用
      envFilePath: '.env', // 指定环境变量文件路径
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        pinoHttp: {
          level: configService.get<string>('NODE_ENV') !== 'production' ? 'debug' : 'info',
          transport: configService.get<string>('NODE_ENV') !== 'production'
            ? { target: 'pino-pretty' }
            : {
                target: 'pino-roll',
                options: {
                  file: join(__dirname, '..', '..', 'logs', 'application.log'),
                  frequency: 'daily',
                  size: '10m', // Optional: Rotate when file reaches 10MB
                  mkdir: true,
                  limit: {
                    count: 7, // Keep 7 rotated files
                  },
                },
              },
          autoLogging: false, // Disables automatic logging of incoming requests
          redact: ['req.headers.authorization'], // Redact sensitive info
        },
      }),
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
    TypeOrmModule.forFeature([User, Contact, Conversation, Event]),
    AuthModule,
    ContactsModule,
    ConversationsModule,
    EventsModule,
    AiModule,
    BriefingsModule,
    ActionPanelModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
