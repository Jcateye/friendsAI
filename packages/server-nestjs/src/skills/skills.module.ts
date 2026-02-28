import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SkillBinding,
  SkillDefinition,
  SkillInvocationLog,
  SkillPublishLog,
  SkillReleaseRule,
  SkillRuntimeMount,
  SkillVersion,
} from '../v3-entities';
import { SkillBindingResolverService } from './skill-binding-resolver.service';
import { SkillLoaderService } from './skill-loader.service';
import { SkillParserService } from './skill-parser.service';
import { ChatSkillsController } from './chat-skills.controller';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [
        SkillDefinition,
        SkillVersion,
        SkillReleaseRule,
        SkillBinding,
        SkillRuntimeMount,
        SkillInvocationLog,
        SkillPublishLog,
      ],
      'v3',
    ),
  ],
  controllers: [SkillsController, ChatSkillsController],
  providers: [SkillsService, SkillParserService, SkillBindingResolverService, SkillLoaderService],
  exports: [SkillsService, SkillParserService, SkillBindingResolverService, SkillLoaderService],
})
export class SkillsModule {}
