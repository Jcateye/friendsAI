import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'tool_confirmations' })
export class ToolConfirmation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  toolName: string;

  @Column({ type: 'jsonb' })
  toolArgs: Record<string, any>;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  context: Record<string, any> | null;

  @ManyToOne(() => User, user => user.toolConfirmations, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ nullable: true })
  userId: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
