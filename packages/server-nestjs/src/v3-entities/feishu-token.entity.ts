import { Entity, PrimaryColumn, Column, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { timestampMsTransformer } from '../entities/timestamp-ms.transformer';

@Entity('feishu_tokens')
@Index('IDX_feishu_tokens_user', ['userId'])
@Index('IDX_feishu_tokens_expires', ['expiresAt'])
export class FeishuToken {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 255, unique: true })
  userId: string;

  @Column({ name: 'access_token', type: 'text' })
  accessToken: string;

  @Column({ name: 'refresh_token', type: 'text' })
  refreshToken: string;

  @Column({ name: 'token_type', type: 'varchar', length: 50, default: 'Bearer' })
  tokenType: string;

  @Column({ name: 'scope', type: 'varchar', length: 500, nullable: true })
  scope: string | null;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'feishu_user_id', type: 'varchar', length: 255, nullable: true })
  feishuUserId: string | null;

  @Column({ name: 'feishu_user_name', type: 'varchar', length: 255, nullable: true })
  feishuUserName: string | null;

  @Column({ name: 'feishu_user_email', type: 'varchar', length: 255, nullable: true })
  feishuUserEmail: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'NOW()' })
  updatedAt: Date;

  @BeforeInsert()
  setId() {
    if (!this.id) {
      this.id = uuidv7();
    }
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }

  /**
   * Check if the access token is expired
   */
  isExpired(): boolean {
    return new Date() >= this.expiresAt;
  }

  /**
   * Check if the access token is about to expire (within 5 minutes)
   */
  isExpiringSoon(bufferMinutes: number = 5): boolean {
    const expiryTime = new Date(this.expiresAt);
    expiryTime.setMinutes(expiryTime.getMinutes() - bufferMinutes);
    return new Date() >= expiryTime;
  }

  /**
   * Get time remaining until token expires (in milliseconds)
   */
  getTimeRemaining(): number {
    return this.expiresAt.getTime() - Date.now();
  }
}
