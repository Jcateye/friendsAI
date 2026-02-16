import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from '../entities';
import {
  RelationshipDebtItem,
  RelationshipHealthSnapshot,
} from '../v3-entities';
import { RelationshipsController } from './relationships.controller';
import { RelationshipsService } from './relationships.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contact]),
    TypeOrmModule.forFeature([RelationshipHealthSnapshot, RelationshipDebtItem], 'v3'),
  ],
  controllers: [RelationshipsController],
  providers: [RelationshipsService],
  exports: [RelationshipsService],
})
export class RelationshipsModule {}
