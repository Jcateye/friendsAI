import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConnectorsController } from './connectors.controller';
import { FeishuTemplateController } from './feishu-template.controller';
import { ConnectorsService } from './connectors.service';
import { FeishuOAuthService } from './feishu-oauth.service';
import { FeishuMessageService } from './feishu-message.service';
import { FeishuTemplateService } from './feishu-template.service';
import { ConnectorToken, User } from '../entities';
import { FeishuMessageDelivery, FeishuMessageTemplate } from '../v3-entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConnectorToken, User]),
    TypeOrmModule.forFeature([FeishuMessageTemplate, FeishuMessageDelivery], 'v3'),
  ],
  controllers: [ConnectorsController, FeishuTemplateController],
  providers: [ConnectorsService, FeishuOAuthService, FeishuMessageService, FeishuTemplateService],
  exports: [ConnectorsService, FeishuOAuthService, FeishuMessageService, FeishuTemplateService],
})
export class ConnectorsModule {}
