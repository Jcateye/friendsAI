import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { VectorService } from './vector/vector.service';
import { Conversation, Event } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Event])],
  providers: [AiService, VectorService],
  exports: [AiService, VectorService],
})
export class AiModule {}
