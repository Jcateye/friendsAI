import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import { Conversation } from './conversation.entity';
import { timestampMsTransformer } from './timestamp-ms.transformer';

export type ConversationArchiveStatus = 'ready_for_review' | 'applied' | 'discarded';

@Entity({ name: 'conversation_archives' })
export class ConversationArchive {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Conversation, { nullable: false })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column()
  conversationId: string;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  citations: Record<string, any> | null;
  @Column({ type: 'text', default: 'ready_for_review' })
  status: ConversationArchiveStatus;

  @Column({ type: 'bigint', nullable: true, transformer: timestampMsTransformer })
  appliedAt: Date | null;

  @Column({ type: 'bigint', nullable: true, transformer: timestampMsTransformer })
  discardedAt: Date | null;

  @Column({ type: 'bigint', transformer: timestampMsTransformer })
  createdAt: Date;

  @Column({ type: 'bigint', transformer: timestampMsTransformer })
  updatedAt: Date;

  @BeforeInsert()
  setCreatedAt() {
    const now = new Date();
    this.createdAt = now;
    this.updatedAt = now;
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}
