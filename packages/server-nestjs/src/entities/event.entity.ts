import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { Contact } from './contact.entity';
import { timestampMsTransformer } from './timestamp-ms.transformer';

@Entity({ name: 'events' })
@Index('IDX_events_contactId', ['contactId'])
@Index('IDX_events_eventDate', ['eventDate'])
export class Event {
  @PrimaryGeneratedColumn('uuid', { uuidVersion: '7' })
  id: string;

  @Column('varchar', { length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any>;

  @Column({ type: 'bigint', nullable: true, transformer: timestampMsTransformer })
  eventDate: Date;

  @Column({ type: 'vector', nullable: true })
  embedding: number[];

  @Column({ type: 'uuid', nullable: true })
  sourceConversationId: string | null;

  @Column({ type: 'text', array: true, nullable: true })
  sourceMessageIds: string[] | null;

  @ManyToOne(() => Contact, contact => contact.events)
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Column({ type: 'uuid', nullable: true })
  contactId: string | null;

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
