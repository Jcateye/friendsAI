import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type ToolConfirmationStatus = 'pending' | 'confirmed' | 'rejected' | 'failed';

@Entity()
export class ToolConfirmation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  toolName: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, any> | null;

  @Column({ default: 'pending' })
  status: ToolConfirmationStatus;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ nullable: true })
  conversationId: string | null;

  @Column({ nullable: true })
  userId: string | null;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  executedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
