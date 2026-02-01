import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Contact } from './contact.entity';

@Entity()
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  eventDate: Date;

  @Column({ type: 'vector', nullable: true })
  embedding: number[];

  @ManyToOne(() => Contact, contact => contact.events)
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Column({ nullable: true })
  contactId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}