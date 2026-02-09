import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, BeforeUpdate } from 'typeorm';
import { User } from './user.entity';
import { timestampMsTransformer } from './timestamp-ms.transformer';

@Entity({ name: 'auth_sessions' })
export class AuthSession {
  @PrimaryGeneratedColumn('uuid')
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

  @CreateDateColumn({ type: 'bigint', transformer: timestampMsTransformer })
  createdAt: Date;

  @Column({ type: 'bigint', transformer: timestampMsTransformer })
  updatedAt: Date;

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}
