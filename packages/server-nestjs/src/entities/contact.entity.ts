import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Event } from './event.entity';
import { Conversation } from './conversation.entity';

@Entity()
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  email: string | null;

  @Column({ nullable: true })
  phone: string | null;

  @Column({ nullable: true })
  company: string | null;

  @Column({ nullable: true })
  position: string | null;

  @Column({ type: 'jsonb', nullable: true })
  profile: Record<string, any> | null;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[] | null;

  @ManyToOne(() => User, user => user.contacts, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ nullable: true })
  userId: string | null;

  @OneToMany(() => Event, event => event.contact)
  events: Event[];

  @OneToMany(() => Conversation, conversation => conversation.contact)
  conversations: Conversation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}