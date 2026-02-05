import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Contact } from './contact.entity';
import { Message } from './message.entity';

@Entity({ name: 'conversations' })
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  title: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'vector', nullable: true })
  embedding: number[] | null;

  @Column({ type: 'jsonb', nullable: true })
  parsedData: Record<string, any>;

  @Column({ default: false })
  isArchived: boolean;

  @Column({ default: 'active' })
  status: string;

  @ManyToOne(() => User, user => user.conversations, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column()
  userId: string;

  @ManyToOne(() => Contact, contact => contact.conversations, { nullable: true })
  @JoinColumn({ name: 'contactId' })
  contact: Contact | null;

  @Column({ type: 'uuid', nullable: true })
  contactId: string | null;

  @OneToMany(() => Message, message => message.conversation)
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
