import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type ConversationArchiveStatus = 'ready_for_review' | 'applied' | 'discarded';

@Entity({ name: 'conversation_archives' })
export class ConversationArchive {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  @Column({ default: 'ready_for_review' })
  status: ConversationArchiveStatus;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  citations: Record<string, any> | null;

  @Column({ type: 'timestamp', nullable: true })
  appliedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  discardedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
