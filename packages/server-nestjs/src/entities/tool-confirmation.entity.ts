import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import { User } from './user.entity';
import { timestampMsTransformer } from './timestamp-ms.transformer';

export type ToolConfirmationStatus = 'pending' | 'confirmed' | 'rejected' | 'failed';

@Entity({ name: 'tool_confirmations' })
export class ToolConfirmation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  toolName: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, any> | null;

  @Column({ default: 'pending' })
  status: ToolConfirmationStatus;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'uuid', nullable: true })
  conversationId: string | null;

  @ManyToOne(() => User, user => user.toolConfirmations, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'bigint', nullable: true, transformer: timestampMsTransformer })
  confirmedAt: Date | null;

  @Column({ type: 'bigint', nullable: true, transformer: timestampMsTransformer })
  rejectedAt: Date | null;

  @Column({ type: 'bigint', nullable: true, transformer: timestampMsTransformer })
  executedAt: Date | null;

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
