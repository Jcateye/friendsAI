import { BeforeInsert, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { timestampMsTransformer } from '../entities/timestamp-ms.transformer';

export type SkillInvocationSource = 'composer_action' | 'slash' | 'codeblock' | 'natural_language' | 'none';
export type SkillInvocationStatus = 'parsed' | 'awaiting_selection' | 'executed' | 'failed' | 'ignored';

@Entity('skill_invocation_logs')
@Index('IDX_skill_invocation_logs_tenant_created', ['tenantId', 'createdAt'])
@Index('IDX_skill_invocation_logs_trace', ['traceId'])
export class SkillInvocationLog {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  tenantId: string;

  @Column({ name: 'conversation_id', type: 'uuid', nullable: true })
  conversationId: string | null;

  @Column({ name: 'session_id', type: 'varchar', length: 255, nullable: true })
  sessionId: string | null;

  @Column({ name: 'trace_id', type: 'varchar', length: 64 })
  traceId: string;

  @Column({ name: 'matched', type: 'boolean' })
  matched: boolean;

  @Column({ name: 'skill_key', type: 'varchar', length: 100, nullable: true })
  skillKey: string | null;

  @Column({ name: 'operation', type: 'varchar', length: 100, nullable: true })
  operation: string | null;

  @Column({ name: 'source', type: 'varchar', length: 40 })
  source: SkillInvocationSource;

  @Column({ name: 'confidence', type: 'numeric', precision: 5, scale: 2, nullable: true })
  confidence: number | null;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  status: SkillInvocationStatus;

  @Column({ name: 'warnings', type: 'jsonb', nullable: true })
  warnings: string[] | null;

  @Column({ name: 'args', type: 'jsonb', nullable: true })
  args: Record<string, unknown> | null;

  @Column({ name: 'raw_input', type: 'text', nullable: true })
  rawInput: string | null;

  @Column({ name: 'error_code', type: 'varchar', length: 100, nullable: true })
  errorCode: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'created_at', type: 'bigint', transformer: timestampMsTransformer })
  createdAt: Date;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) {
      this.id = uuidv7();
    }
    this.createdAt = new Date();
  }
}
