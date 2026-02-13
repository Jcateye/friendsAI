import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { uuidv7 } from 'uuidv7';

/**
 * 飞书用户配置实体
 *
 * 存储用户配置的飞书 Bitable 信息和 Webhook URL
 */
@Entity({ name: 'feishu_configs' })
export class FeishuConfig {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  /**
   * Bitable 应用 token
   */
  @Column('varchar', { length: 255, nullable: true })
  appToken: string | null;

  /**
   * Bitable 数据表 ID
   */
  @Column('varchar', { length: 255, nullable: true })
  tableId: string | null;

  /**
   * 用户配置的 Webhook URL
   * 用于接收飞书 Automation 按钮点击回调
   */
  @Column('varchar', { length: 255, nullable: true })
  webhookUrl: string | null;

  /**
   * 是否启用此配置
   */
  @Column('boolean', { default: true })
  enabled: boolean;

  /**
   * 创建时间
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/**
 * 飞书 Webhook 调用日志实体
 *
 * 记录每次按钮点击的请求和处理状态
 */
@Entity({ name: 'feishu_webhook_logs' })
export class FeishuWebhookLog {
  @PrimaryColumn('uuid')
  id: string;

  /**
   * Bitable 应用 token（关联到具体的应用）
   */
  @Column('varchar', { length: 255 })
  appToken: string;

  /**
   * Bitable 数据表 ID
   */
  @Column('varchar', { length: 255 })
  tableId: string;

  /**
   * 记录 ID
   */
  @Column('varchar', { length: 255 })
  recordId: string;

  /**
   * 按钮 ID
   */
  @Column('varchar', { length: 255, nullable: true })
  buttonId: string | null;

  /**
   * 用户 ID
   */
  @Column('varchar', { length: 255 })
  userId: string;

  /**
   * Automation 传递的额外数据
   *
   * 示例：{ "customer_name": "张三", "order_amount": 100 }
   */
  @Column('jsonb', { nullable: true })
  payload: Record<string, unknown>;

  /**
   * 处理状态
   * 0 = received（已接收）
   * 1 = processing（处理中）
   * 2 = completed（处理完成）
   * 3 = failed（处理失败）
   */
  @Column('smallint', { default: 0 })
  status: number;

  /**
   * 错误消息（当 status = failed 时记录）
   */
  @Column('text', { nullable: true })
  errorMessage: string | null;

  /**
   * 接收时间
   */
  @CreateDateColumn({ name: 'received_at' })
  receivedAt: Date;

  /**
   * 处理完成时间
   */
  @Column('timestamp with time zone', { nullable: true })
  processedAt: Date | null;
}
