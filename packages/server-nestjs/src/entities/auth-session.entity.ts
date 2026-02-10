import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { User } from './user.entity';
import { timestampMsTransformer } from './timestamp-ms.transformer';

@Entity({ name: 'auth_sessions' })
@Index('IDX_auth_sessions_userId', ['userId'])
@Index('IDX_auth_sessions_expiresAt', ['expiresAt'])
export class AuthSession {
  @PrimaryGeneratedColumn('uuid', { uuidVersion: '7' })
  id: string;

  @Column({ type: 'text' })
  refreshToken: string;

  @Column({ type: 'bigint', transformer: timestampMsTransformer })
  expiresAt: Date;

  @Column({ type: 'bigint', nullable: true, transformer: timestampMsTransformer })
  revokedAt: Date | null;

  @ManyToOne(() => User, user => user.authSessions, { nullable: false })
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
    const now = new Date();
    this.createdAt = now;
    this.updatedAt = now;
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}
