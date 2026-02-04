import { Module } from '@nestjs/common';
import { BriefingService } from './briefing/briefing.service';
import { BriefingsController } from './briefings/briefings.controller';

@Module({
  providers: [BriefingService],
  controllers: [BriefingsController]
})
export class BriefingsModule {}
