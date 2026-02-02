import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Contact } from './contact.entity';

@Entity()
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true }) // Added inputText
  inputText?: string;

  @Column({ type: 'vector', nullable: true })
  embedding: number[];

  @Column({ type: 'jsonb', nullable: true })
  parsedData: Record<string, any>;

  @Column({ default: false })
  isArchived: boolean;

  @ManyToOne(() => User, user => user.conversations, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Contact, contact => contact.conversations, { nullable: true })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Column({ nullable: true })
  contactId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
