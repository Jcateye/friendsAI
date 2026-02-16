import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { timestampMsTransformer } from '../../../entities/timestamp-ms.transformer';

/**
 * Agent 快照实体
 * 用于缓存 Agent 运行结果
 */
@Entity({ name: 'agent_snapshots' })
@Index(['sourceHash'])
@Index(['expiresAtMs'])
@Index(['agentId', 'sourceHash'])
export class AgentSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Agent ID */
  @Column({ type: 'varchar', length: 100 })
  agentId: string;

  /** Operation（可选，用于多 operation agent） */
  @Column({ type: 'varchar', length: 100, nullable: true })
  operation: string | null;

  /** Scope Hash（用于快速查找） */
  @Column({ type: 'varchar', length: 64 })
  scopeHash: string;

  /** Source Hash（用于缓存命中） */
  @Column({ type: 'varchar', length: 64 })
  @Index()
  sourceHash: string;

  /** 输入数据 */
  @Column({ type: 'jsonb' })
  inputData: Record<string, unknown>;

  /** 输出数据 */
  @Column({ type: 'jsonb' })
  outputData: Record<string, unknown>;

  /** TTL（毫秒） */
  @Column({ type: 'bigint' })
  ttlMs: number;

  /** 创建时间（毫秒时间戳） */
  @Column({ type: 'bigint' })
  createdAtMs: number;

  /** 过期时间（毫秒时间戳） */
  @Column({ type: 'bigint', nullable: true })
  expiresAtMs: number | null;

  /** 元数据 */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @BeforeInsert()
  setCreatedAtMs() {
    if (typeof this.createdAtMs !== 'number' || !Number.isFinite(this.createdAtMs)) {
      this.createdAtMs = Date.now();
    }
  }
}




