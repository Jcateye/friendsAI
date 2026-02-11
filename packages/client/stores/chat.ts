import { create } from 'zustand';
import type { Contact, Message } from '@/types';

interface ChatStore {
  // Current state
  activeContactId: string | null;
  isDrawerOpen: boolean;
  contacts: Contact[];
  messages: Record<string, Message[]>;

  // Actions
  setActiveContact: (contactId: string) => void;
  toggleDrawer: () => void;
  setDrawerOpen: (open: boolean) => void;
  setContacts: (contacts: Contact[]) => void;
  addContact: (contact: Contact) => void;
  setMessages: (contactId: string, messages: Message[]) => void;
  addMessage: (contactId: string, message: Message) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  // Initial state
  activeContactId: null,
  isDrawerOpen: false,
  contacts: [],
  messages: {},

  // Actions
  setActiveContact: (contactId) =>
    set({ activeContactId: contactId, isDrawerOpen: false }),

  toggleDrawer: () =>
    set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

  setDrawerOpen: (open) => set({ isDrawerOpen: open }),

  setContacts: (contacts) => set({ contacts }),

  addContact: (contact) =>
    set((state) => ({
      contacts: [...state.contacts, contact],
    })),

  setMessages: (contactId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [contactId]: messages },
    })),

  addMessage: (contactId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [contactId]: [...(state.messages[contactId] || []), message],
      },
    })),
}));
