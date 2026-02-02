import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, OneToOne } from 'typeorm';
import { User } from './user.entity';
import { Event } from './event.entity';
import { Conversation } from './conversation.entity';
import { Briefing } from './briefing.entity';

@Entity()
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  position: string;

  @Column({ type: 'jsonb', nullable: true })
  profile: Record<string, any>;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ default: false })
  isStarred: boolean;

  @ManyToOne(() => User, user => user.contacts, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @OneToMany(() => Event, event => event.contact)
  events: Event[];

  @OneToMany(() => Conversation, conversation => conversation.contact)
  conversations: Conversation[];

  @OneToOne(() => Briefing, briefing => briefing.contact, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  briefing: Briefing;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
