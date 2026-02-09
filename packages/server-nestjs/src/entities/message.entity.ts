import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, BeforeInsert } from 'typeorm';
import { Conversation } from './conversation.entity';
import { timestampMsTransformer } from './timestamp-ms.transformer';

const BIGINT_TO_NUMBER = {
  to: (value: number): number => value,
  from: (value: string | number): number => Number(value),
};

@Entity({ name: 'messages' })
export class Message {
  @PrimaryColumn({ type: 'text' })
  id: string;

  @Column({ type: 'text' })
  role: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  citations: Record<string, any> | null;

  @ManyToOne(() => Conversation, conversation => conversation.messages, { nullable: false })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column()
  conversationId: string;

  @Column({
    type: 'bigint',
    name: 'createdAtMs',
    transformer: BIGINT_TO_NUMBER,
  })
  createdAtMs: number;

  @Column({ type: 'text', nullable: true, default: 'active' })
  status: 'active' | 'abandoned' | null;

  @Column({ type: 'bigint', transformer: timestampMsTransformer })
  createdAt: Date;

  @BeforeInsert()
  setCreatedAt() {
    this.createdAt = new Date();
  }
}
