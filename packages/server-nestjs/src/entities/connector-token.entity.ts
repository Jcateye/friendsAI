import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, BeforeUpdate } from 'typeorm';
import { User } from './user.entity';
import { timestampMsTransformer } from './timestamp-ms.transformer';

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

  @Column({ type: 'bigint', nullable: true, transformer: timestampMsTransformer })
  expiresAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @ManyToOne(() => User, user => user.connectorTokens, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn({ type: 'bigint', transformer: timestampMsTransformer })
  createdAt: Date;

  @Column({ type: 'bigint', transformer: timestampMsTransformer })
  updatedAt: Date;

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}
