import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'connector_tokens' })
export class ConnectorToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  connectorType: string;

  @Column({ type: 'text' })
  accessToken: string;

  @Column({ type: 'text', nullable: true })
  refreshToken: string | null;

  @Column({ type: 'text', nullable: true })
  tokenType: string | null;

  @Column({ type: 'text', nullable: true })
  scope: string | null;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @ManyToOne(() => User, user => user.connectorTokens, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
