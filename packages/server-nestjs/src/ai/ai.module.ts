import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { VectorService } from './vector/vector.service';

@Module({
  providers: [AiService, VectorService],
  exports: [AiService]
})
export class AiModule {}
