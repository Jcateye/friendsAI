import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Event } from './event.entity';
import { Conversation } from './conversation.entity';
import { ContactFact } from './contact-fact.entity';
import { ContactTodo } from './contact-todo.entity';
import { ContactBrief } from './contact-brief.entity';

@Entity({ name: 'contacts' })
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  alias: string | null;

  @Column({ type: 'text', nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  company: string | null;

  @Column({ type: 'text', nullable: true })
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
