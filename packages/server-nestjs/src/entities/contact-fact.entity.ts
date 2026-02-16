import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { Contact } from './contact.entity';
import { timestampMsTransformer } from './timestamp-ms.transformer';

@Entity({ name: 'contact_facts' })
@Index('IDX_contact_facts_contactId', ['contactId'])
export class ContactFact {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'uuid', nullable: true })
  sourceConversationId: string | null;

  @Column({ type: 'text', array: true, nullable: true })
  sourceMessageIds: string[] | null;

  @ManyToOne(() => Contact, contact => contact.facts, { nullable: false })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Column()
  contactId: string;

  @Column({ type: 'bigint', transformer: timestampMsTransformer })
  createdAt: Date;

  @Column({ type: 'bigint', transformer: timestampMsTransformer })
  updatedAt: Date;

  @BeforeInsert()
  setCreatedAt() {
    if (!this.id) {
      this.id = uuidv7();
    }
    const now = new Date();
    this.createdAt = now;
    this.updatedAt = now;
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}
