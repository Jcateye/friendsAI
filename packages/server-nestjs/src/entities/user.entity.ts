import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Contact } from './contact.entity';
import { Conversation } from './conversation.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  name: string;

  @Column({ default: true })
  notificationsEnabled: boolean;

  @Column({ default: false })
  darkModeEnabled: boolean;

  @Column({ default: true })
  autoSyncEnabled: boolean;

  @OneToMany(() => Contact, contact => contact.user)
  contacts: Contact[];

  @OneToMany(() => Conversation, conversation => conversation.user)
  conversations: Conversation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}