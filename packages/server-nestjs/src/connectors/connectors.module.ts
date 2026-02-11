import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConnectorsController } from './connectors.controller';
import { ConnectorsService } from './connectors.service';
import { FeishuOAuthService } from './feishu-oauth.service';
import { FeishuMessageService } from './feishu-message.service';
import { ConnectorToken, User } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([ConnectorToken, User])],
  controllers: [ConnectorsController],
  providers: [ConnectorsService, FeishuOAuthService, FeishuMessageService],
  exports: [ConnectorsService, FeishuOAuthService, FeishuMessageService],
})
export class ConnectorsModule {}
