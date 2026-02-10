import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { User } from './user.entity';
import { Event } from './event.entity';
import { Conversation } from './conversation.entity';
import { ContactFact } from './contact-fact.entity';
import { ContactTodo } from './contact-todo.entity';
import { ContactBrief } from './contact-brief.entity';
import { timestampMsTransformer } from './timestamp-ms.transformer';

@Entity({ name: 'contacts' })
@Index('IDX_contacts_userId', ['userId'])
export class Contact {
  @PrimaryGeneratedColumn('uuid', { uuidVersion: '7' })
  id: string;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('varchar', { length: 255, nullable: true })
  alias: string | null;

  @Column('varchar', { length: 255, nullable: true })
  email: string | null;

  @Column('varchar', { length: 50, nullable: true })
  phone: string | null;

  @Column('varchar', { length: 255, nullable: true })
  company: string | null;

  @Column('varchar', { length: 255, nullable: true })
  position: string | null;

  @Column({ type: 'jsonb', nullable: true })
  profile: Record<string, any> | null;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[] | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @ManyToOne(() => User, user => user.contacts, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @OneToMany(() => Event, event => event.contact)
  events: Event[];

  @OneToMany(() => ContactFact, fact => fact.contact)
  facts: ContactFact[];

  @OneToMany(() => ContactTodo, todo => todo.contact)
  todos: ContactTodo[];

  @OneToMany(() => ContactBrief, brief => brief.contact)
  briefs: ContactBrief[];

  @OneToMany(() => Conversation, conversation => conversation.contact)
  conversations: Conversation[];

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
