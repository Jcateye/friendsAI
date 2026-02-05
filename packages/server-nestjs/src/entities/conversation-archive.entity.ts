import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Conversation } from './conversation.entity';

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

  @Column({ type: 'timestamp', nullable: true })
  appliedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  discardedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
