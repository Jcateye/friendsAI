import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index, BeforeInsert } from 'typeorm';
import { Conversation } from './conversation.entity';
import { timestampMsTransformer } from './timestamp-ms.transformer';

export type MessageStatus = 'active' | 'abandoned';

const BIGINT_TO_NUMBER = {
  to: (value: number): number => value,
  from: (value: string | number): number => Number(value),
};

@Entity({ name: 'messages' })
@Index('IDX_messages_conversationId', ['conversationId'])
@Index('IDX_messages_createdAtMs', ['createdAtMs'])
export class Message {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 50 })
  role: string;

  @Column('text')
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

  @Column('varchar', { length: 50, nullable: true, default: 'active' })
  status: MessageStatus;

  @Column({ type: 'bigint', transformer: timestampMsTransformer })
  createdAt: Date;

  @BeforeInsert()
  setCreatedAt() {
    this.createdAt = new Date();
  }
}
