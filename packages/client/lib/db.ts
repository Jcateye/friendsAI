import Dexie, { Table } from 'dexie';
import type { Contact, Message, Conversation, ContactCard } from '@/types';

export class FriendsDatabase extends Dexie {
  contacts!: Table<Contact>;
  messages!: Table<Message>;
  conversations!: Table<Conversation>;
  contactCards!: Table<ContactCard>;

  constructor() {
    super('FriendsAI');
    this.version(1).stores({
      contacts: 'id, name, createdAt, updatedAt',
      messages: 'id, contactId, role, createdAt',
      conversations: 'id, contactId, lastMessageAt, messageCount',
      contactCards: 'id, name, email, phone, company, createdAt, sourceMessageId',
    });
  }
}

export const db = new FriendsDatabase();
