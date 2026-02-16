import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { User } from './user.entity';
import { timestampMsTransformer } from './timestamp-ms.transformer';

export type ToolConfirmationStatus = 'pending' | 'confirmed' | 'rejected' | 'failed';

@Entity({ name: 'tool_confirmations' })
@Index('IDX_tool_confirmations_userId', ['userId'])
@Index('IDX_tool_confirmations_status', ['status'])
export class ToolConfirmation {
  @PrimaryColumn('uuid')
  id: string;

  @Column('varchar', { length: 100 })
  toolName: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, any> | null;

  @Column('varchar', { length: 50, default: 'pending' })
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
    if (!this.id) {
      this.id = uuidv7();
    }
    const now = new Date();
    this.createdAt = now;
    this.updatedAt = now;
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}
