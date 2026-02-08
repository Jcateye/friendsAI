import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../entities';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
  ) {}

  async create(
    input: { content?: string; title?: string },
    userId: string,
    contactId?: string,
  ): Promise<Conversation> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/93473240-e68c-4772-898a-d197a5820b45',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.service.ts:13',message:'service.create entry',data:{userId,hasUserId:!!userId,title:input.title,content:input.content,contactId},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const conversation = this.conversationRepository.create({
      title: input.title ?? null,
      content: input.content ?? input.title ?? '',
      userId,
      contactId,
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/93473240-e68c-4772-898a-d197a5820b45',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.service.ts:22',message:'before save',data:{conversationUserId:conversation.userId,conversationTitle:conversation.title,conversationContent:conversation.content,conversationContactId:conversation.contactId},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    try {
      const saved = await this.conversationRepository.save(conversation);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/93473240-e68c-4772-898a-d197a5820b45',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.service.ts:28',message:'save success',data:{savedId:saved.id},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return saved;
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/93473240-e68c-4772-898a-d197a5820b45',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversations.service.ts:32',message:'save error',data:{errorMessage:error instanceof Error?error.message:String(error),errorStack:error instanceof Error?error.stack:undefined,errorName:error instanceof Error?error.name:undefined},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      throw error;
    }
  }

  async findAll(userId?: string): Promise<Conversation[]> {
    const queryOptions = {
      where: userId ? { userId } : undefined,
      order: { updatedAt: 'DESC' as const },
    };
    return this.conversationRepository.find(queryOptions);
  }

  async findOne(id: string, userId?: string): Promise<Conversation | null> {
    return this.conversationRepository.findOne({
      where: userId ? { id, userId } : { id },
    });
  }
}
