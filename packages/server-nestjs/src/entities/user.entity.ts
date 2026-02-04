import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Contact } from './contact.entity';
import { Conversation } from './conversation.entity';
import { ToolConfirmation } from './tool-confirmation.entity';
import { ConnectorToken } from './connector-token.entity';

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

  @OneToMany(() => Contact, contact => contact.user)
  contacts: Contact[];

  @OneToMany(() => Conversation, conversation => conversation.user)
  conversations: Conversation[];

  @OneToMany(() => ToolConfirmation, toolConfirmation => toolConfirmation.user)
  toolConfirmations: ToolConfirmation[];

  @OneToMany(() => ConnectorToken, token => token.user)
  connectorTokens: ConnectorToken[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
