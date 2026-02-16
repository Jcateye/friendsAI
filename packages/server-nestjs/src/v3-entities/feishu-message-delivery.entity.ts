import { BeforeInsert, BeforeUpdate, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { timestampMsTransformer } from '../entities/timestamp-ms.transformer';

export type FeishuDeliveryStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

@Entity('feishu_message_deliveries')
@Index('IDX_feishu_message_deliveries_user_created', ['userId', 'createdAt'])
@Index('IDX_feishu_message_deliveries_message', ['messageId'])
export class FeishuMessageDelivery {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId: string | null;

  @Column({ name: 'message_id', type: 'varchar', length: 255, nullable: true })
  messageId: string | null;

  @Column({ name: 'recipient_open_id', type: 'varchar', length: 255 })
  recipientOpenId: string;

  @Column({ name: 'status', type: 'varchar', length: 32 })
  status: FeishuDeliveryStatus;

  @Column({ name: 'retryable', type: 'boolean', default: false })
  retryable: boolean;

  @Column({ name: 'error_code', type: 'varchar', length: 120, nullable: true })
  errorCode: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'conversation_id', type: 'uuid', nullable: true })
  conversationId: string | null;

  @Column({ name: 'archive_id', type: 'uuid', nullable: true })
  archiveId: string | null;

  @Column({ name: 'tool_confirmation_id', type: 'uuid', nullable: true })
  toolConfirmationId: string | null;

  @Column({ name: 'request_payload', type: 'jsonb', nullable: true })
  requestPayload: Record<string, unknown> | null;

  @Column({ name: 'response_payload', type: 'jsonb', nullable: true })
  responsePayload: Record<string, unknown> | null;

  @Column({ name: 'created_at', type: 'bigint', transformer: timestampMsTransformer })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'bigint', transformer: timestampMsTransformer })
  updatedAt: Date;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) {
      this.id = uuidv7();
    }
    const now = new Date();
    this.createdAt = now;
    this.updatedAt = now;
  }

  @BeforeUpdate()
  beforeUpdate() {
    this.updatedAt = new Date();
  }
}
