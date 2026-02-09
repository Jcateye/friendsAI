import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, BeforeUpdate } from 'typeorm';
import { Contact } from './contact.entity';
import { timestampMsTransformer } from './timestamp-ms.transformer';

@Entity({ name: 'contact_briefs' })
export class ContactBrief {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  citations: Record<string, any> | null;

  @Column({ type: 'bigint', transformer: timestampMsTransformer })
  generatedAt: Date;

  @ManyToOne(() => Contact, contact => contact.briefs, { nullable: false })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Column()
  contactId: string;

  @CreateDateColumn({ type: 'bigint', transformer: timestampMsTransformer })
  createdAt: Date;

  @Column({ type: 'bigint', transformer: timestampMsTransformer })
  updatedAt: Date;

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}
