import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { User } from './user.entity';
import { timestampMsTransformer } from './timestamp-ms.transformer';

@Entity({ name: 'connector_tokens' })
@Index('IDX_connector_tokens_userId', ['userId'])
@Index('IDX_connector_tokens_connectorType', ['connectorType'])
@Index('IDX_connector_tokens_expiresAt', ['expiresAt'])
export class ConnectorToken {
  @PrimaryColumn('uuid')
  id: string;

  @Column('varchar', { length: 50 })
  connectorType: string;

  @Column({ type: 'text' })
  accessToken: string;

  @Column({ type: 'text', nullable: true })
  refreshToken: string | null;

  @Column('varchar', { length: 50, nullable: true })
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
