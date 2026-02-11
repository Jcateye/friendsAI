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

export async function getAllContacts(): Promise<Contact[]> {
  return db.contacts.orderBy('updatedAt').reverse().toArray();
}

export async function saveContact(contact: Contact): Promise<void> {
  await db.contacts.put(contact);
}

export async function getMessagesByContact(contactId: string): Promise<Message[]> {
  return db.messages.where('contactId').equals(contactId).sortBy('createdAt');
}

export async function saveMessage(message: Message): Promise<void> {
  await db.messages.put(message);
}

export async function saveContactCard(card: ContactCard): Promise<void> {
  await db.contactCards.put(card);
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.contacts, db.messages, db.contactCards, async () => {
    await db.contacts.clear();
    await db.messages.clear();
    await db.contactCards.clear();
  });
}
