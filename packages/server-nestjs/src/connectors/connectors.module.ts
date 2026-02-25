import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConnectorsController } from './connectors.controller';
import { FeishuTemplateController } from './feishu-template.controller';
import { FeishuBitableController } from './feishu-bitable.controller';
import { ConnectorsService } from './connectors.service';
import { FeishuOAuthService } from './feishu-oauth.service';
import { FeishuMessageService } from './feishu-message.service';
import { FeishuTemplateService } from './feishu-template.service';
import { FeishuBitableService } from './feishu-bitable.service';
import { ConnectorToken, User } from '../entities';
import { FeishuMessageDelivery, FeishuMessageTemplate } from '../v3-entities';
import { FeishuApiModule } from '../feishu/api/feishu-api.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConnectorToken, User]),
    TypeOrmModule.forFeature([FeishuMessageTemplate, FeishuMessageDelivery], 'v3'),
    FeishuApiModule,
  ],
  controllers: [ConnectorsController, FeishuTemplateController, FeishuBitableController],
  providers: [
    ConnectorsService,
    FeishuOAuthService,
    FeishuMessageService,
    FeishuTemplateService,
    FeishuBitableService,
  ],
  exports: [
    ConnectorsService,
    FeishuOAuthService,
    FeishuMessageService,
    FeishuTemplateService,
    FeishuBitableService,
  ],
})
export class ConnectorsModule {}
