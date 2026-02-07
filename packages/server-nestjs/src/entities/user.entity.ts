import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Contact } from './contact.entity';
import { Conversation } from './conversation.entity';
import { ToolConfirmation } from './tool-confirmation.entity';
import { ConnectorToken } from './connector-token.entity';
import { AuthSession } from './auth-session.entity';
import { timestampMsTransformer } from './timestamp-ms.transformer';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true, nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  phone: string | null;

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

  @OneToMany(() => AuthSession, authSession => authSession.user)
  authSessions: AuthSession[];

  @CreateDateColumn({ type: 'bigint', transformer: timestampMsTransformer })
  createdAt: Date;

  @UpdateDateColumn({ type: 'bigint', transformer: timestampMsTransformer })
  updatedAt: Date;
}
