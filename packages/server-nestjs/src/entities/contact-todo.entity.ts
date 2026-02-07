import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Contact } from './contact.entity';
import { timestampMsTransformer } from './timestamp-ms.transformer';

export type ContactTodoStatus = 'pending' | 'completed' | 'canceled';

@Entity({ name: 'contact_todos' })
export class ContactTodo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: 'pending' })
  status: ContactTodoStatus;

  @Column({ type: 'bigint', nullable: true, transformer: timestampMsTransformer })
  dueAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'uuid', nullable: true })
  sourceConversationId: string | null;

  @Column({ type: 'text', array: true, nullable: true })
  sourceMessageIds: string[] | null;

  @ManyToOne(() => Contact, contact => contact.todos, { nullable: false })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Column()
  contactId: string;

  @CreateDateColumn({ type: 'bigint', transformer: timestampMsTransformer })
  createdAt: Date;

  @UpdateDateColumn({ type: 'bigint', transformer: timestampMsTransformer })
  updatedAt: Date;
}
