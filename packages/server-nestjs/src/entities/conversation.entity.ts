import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Contact } from './contact.entity';

@Entity()
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'vector', nullable: true })
  embedding: number[] | null;

  @Column({ type: 'jsonb', nullable: true })
  parsedData: Record<string, any>;

  @Column({ default: false })
  isArchived: boolean;

  @ManyToOne(() => User, user => user.conversations, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column()
  userId: string;

  @ManyToOne(() => Contact, contact => contact.conversations, { nullable: true })
  @JoinColumn({ name: 'contactId' })
  contact: Contact | null;

  @Column({ nullable: true })
  contactId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}