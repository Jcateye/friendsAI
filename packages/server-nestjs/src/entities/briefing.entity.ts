import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Contact } from './contact.entity';

@Entity()
export class Briefing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb', nullable: true })
  lastSummary: string;


  @Column({ type: 'jsonb', nullable: true })
  pendingTodos: string[];


  @Column({ type: 'jsonb', nullable: true })
  traits: string[];

  @Column({ type: 'jsonb', nullable: true })
  suggestion: string;

  @OneToOne(() => Contact, contact => contact.briefing)
  @JoinColumn()
  contact: Contact;

  @Column({ nullable: true })
  contactId: string; // Foreign key for Contact

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
