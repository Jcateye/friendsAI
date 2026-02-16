import { BeforeInsert, BeforeUpdate, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { timestampMsTransformer } from '../../entities/timestamp-ms.transformer';

@Entity({ name: 'feishu_configs' })
@Index('IDX_feishu_configs_user_id', ['userId'], { unique: true })
export class FeishuConfig {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'app_token', type: 'varchar', length: 255, nullable: true })
  appToken: string | null;

  @Column({ name: 'table_id', type: 'varchar', length: 255, nullable: true })
  tableId: string | null;

  @Column({ name: 'webhook_url', type: 'varchar', length: 1024, nullable: true })
  webhookUrl: string | null;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({
    name: 'created_at',
    type: 'bigint',
    transformer: timestampMsTransformer,
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'bigint',
    transformer: timestampMsTransformer,
  })
  updatedAt: Date;

  @BeforeInsert()
  setCreateFields(): void {
    if (!this.id) {
      this.id = uuidv7();
    }
    const now = new Date();
    this.createdAt = now;
    this.updatedAt = now;
  }

  @BeforeUpdate()
  setUpdateFields(): void {
    this.updatedAt = new Date();
  }
}

@Entity({ name: 'feishu_webhook_logs' })
@Index('IDX_feishu_webhook_logs_record_id', ['recordId'])
@Index('IDX_feishu_webhook_logs_status_received_at', ['status', 'receivedAt'])
export class FeishuWebhookLog {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'app_token', type: 'varchar', length: 255 })
  appToken: string;

  @Column({ name: 'table_id', type: 'varchar', length: 255 })
  tableId: string;

  @Column({ name: 'record_id', type: 'varchar', length: 255 })
  recordId: string;

  @Column({ name: 'button_id', type: 'varchar', length: 255, nullable: true })
  buttonId: string | null;

  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ type: 'smallint', default: 0 })
  status: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({
    name: 'received_at',
    type: 'bigint',
    transformer: timestampMsTransformer,
  })
  receivedAt: Date;

  @Column({
    name: 'processed_at',
    type: 'bigint',
    nullable: true,
    transformer: timestampMsTransformer,
  })
  processedAt: Date | null;

  @BeforeInsert()
  setCreateFields(): void {
    if (!this.id) {
      this.id = uuidv7();
    }
    if (!this.receivedAt) {
      this.receivedAt = new Date();
    }
  }
}
