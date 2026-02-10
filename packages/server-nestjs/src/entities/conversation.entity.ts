import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { uuidv7 } from 'uuidv7';
import { User } from './user.entity';
import { Contact } from './contact.entity';
import { Message } from './message.entity';
import { timestampMsTransformer } from './timestamp-ms.transformer';

@Entity({ name: 'conversations' })
@Index('IDX_conversations_userId', ['userId'])
@Index('IDX_conversations_contactId', ['contactId'])
export class Conversation {
  @PrimaryColumn('uuid')
  id: string;

  @Column('varchar', { length: 255, nullable: true })
  title: string | null;

  @Column('text')
  content: string;

  @Column('text', { nullable: true })
  summary: string | null;

  @Column({ type: 'vector', nullable: true })
  embedding: number[] | null;

  @Column({ type: 'jsonb', nullable: true })
  parsedData: Record<string, any>;

  @Column({ default: false })
  isArchived: boolean;

  @Column('varchar', { length: 50, default: 'active' })
  status: string;

  @ManyToOne(() => User, user => user.conversations)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Contact, contact => contact.conversations, { nullable: true })
  @JoinColumn({ name: 'contactId' })
  contact: Contact | null;

  @Column({ type: 'uuid', nullable: true })
  contactId: string | null;

  @OneToMany(() => Message, message => message.conversation)
  messages: Message[];

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
