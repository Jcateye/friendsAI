import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { Contact } from './contact.entity';
import { Conversation } from './conversation.entity';
import { ToolConfirmation } from './tool-confirmation.entity';
import { ConnectorToken } from './connector-token.entity';
import { AuthSession } from './auth-session.entity';
import { timestampMsTransformer } from './timestamp-ms.transformer';

@Entity({ name: 'users' })
@Index('IDX_users_email', ['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid', { uuidVersion: '7' })
  id: string;

  @Column('varchar', { length: 255, unique: true, nullable: true })
  email: string | null;

  @Column('varchar', { length: 50, nullable: true })
  phone: string | null;

  @Column('varchar', { length: 255 })
  password: string;

  @Column('varchar', { length: 255, nullable: true })
  name: string | null;

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

  @Column({ type: 'bigint', transformer: timestampMsTransformer })
  createdAt: Date;

  @Column({ type: 'bigint', transformer: timestampMsTransformer })
  updatedAt: Date;

  @BeforeInsert()
  setCreatedAt() {
    const now = new Date();
    this.createdAt = now;
    this.updatedAt = now;
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}
