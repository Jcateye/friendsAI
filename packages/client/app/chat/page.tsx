'use client';

import { useEffect, useRef, useState } from 'react';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageList } from '@/components/chat/MessageList';
import { ContactsDrawer } from '@/components/drawer/ContactsDrawer';
import {
  getAllContacts,
  getMessagesByContact,
  saveContact,
  saveContactCard,
  saveMessage,
} from '@/lib/db';
import { useChatStore } from '@/stores/chat';
import type { Contact, ContactCard, Message } from '@/types';

const AVATAR_COLORS = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF3B30', '#5856D6', '#FFCC00'] as const;

const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'contact-zhangsan',
    name: '张三',
    avatarColor: AVATAR_COLORS[0],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'contact-lisi',
    name: '李四',
    avatarColor: AVATAR_COLORS[1],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

interface ChatApiResponse {
  reply: string;
  toolResult?: string;
  contactCard?: Omit<ContactCard, 'createdAt'> & { createdAt: string };
}

type ComposerTool = 'add' | 'image' | 'camera' | 'gif' | 'location';

function createMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createContactName(contactCount: number): string {
  return `新联系人${contactCount + 1}`;
}

function mapToolName(tool: ComposerTool): string {
  if (tool === 'add') return '添加附件';
  if (tool === 'image') return '图片';
  if (tool === 'camera') return '拍照';
  if (tool === 'gif') return 'GIF';
  return '位置';
}

export default function ChatPage() {
  const { activeContactId, contacts, messages, setContacts, addContact, setActiveContact, setMessages, addMessage } =
    useChatStore();
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedContacts = await getAllContacts();
        const initialContacts = storedContacts.length > 0 ? storedContacts : INITIAL_CONTACTS;

        if (storedContacts.length === 0) {
          await Promise.all(initialContacts.map((contact) => saveContact(contact)));
        }

        setContacts(initialContacts);

        if (initialContacts.length > 0) {
          setActiveContact(initialContacts[0].id);
        }
      } catch {
        setContacts(INITIAL_CONTACTS);
        setActiveContact(INITIAL_CONTACTS[0].id);
      }
    };

    void bootstrap();
  }, [setActiveContact, setContacts]);

  useEffect(() => {
    const loadActiveMessages = async () => {
      if (!activeContactId) {
        return;
      }

      try {
        const storedMessages = await getMessagesByContact(activeContactId);
        setMessages(activeContactId, storedMessages);
      } catch {
        setMessages(activeContactId, []);
      }
    };

    void loadActiveMessages();
  }, [activeContactId, setMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeContactId, messages]);

  const activeContact = contacts.find((contact) => contact.id === activeContactId) ?? null;
  const currentMessages = activeContactId ? messages[activeContactId] ?? [] : [];

  const handleAddContact = async () => {
    const newContact: Contact = {
      id: createMessageId('contact'),
      name: createContactName(contacts.length),
      avatarColor: AVATAR_COLORS[contacts.length % AVATAR_COLORS.length],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addContact(newContact);
    setActiveContact(newContact.id);

    try {
      await saveContact(newContact);
    } catch {
      // Keep optimistic UI behavior for local-first flow.
    }
  };

  const handleToolAction = async (tool: ComposerTool) => {
    if (!activeContactId) {
      return;
    }

    const toolMessage: Message = {
      id: createMessageId('tool-action'),
      contactId: activeContactId,
      role: 'assistant',
      content: '',
      toolCalls: [
        {
          id: createMessageId('tool-call'),
          name: mapToolName(tool),
          arguments: {},
          result: `${mapToolName(tool)}功能将在后续版本开放`,
        },
      ],
      createdAt: new Date(),
    };

    addMessage(activeContactId, toolMessage);

    try {
      await saveMessage(toolMessage);
    } catch {
      // Keep optimistic UI behavior for local-first flow.
    }
  };

  const handleVoiceInput = async () => {
    if (!activeContactId) {
      return;
    }

    const voiceMessage: Message = {
      id: createMessageId('voice-hint'),
      contactId: activeContactId,
      role: 'assistant',
      content: '语音输入暂未接入，请先使用文本输入。',
      createdAt: new Date(),
    };

    addMessage(activeContactId, voiceMessage);

    try {
      await saveMessage(voiceMessage);
    } catch {
      // Keep optimistic UI behavior for local-first flow.
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!activeContactId || !activeContact) {
      return;
    }

    const userMessage: Message = {
      id: createMessageId('user'),
      contactId: activeContactId,
      role: 'user',
      content,
      createdAt: new Date(),
    };

    addMessage(activeContactId, userMessage);

    try {
      await saveMessage(userMessage);
    } catch {
      // Keep optimistic UI behavior for local-first flow.
    }

    setIsLoading(true);

    let payload: ChatApiResponse | null = null;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact: activeContact,
          messages: [...currentMessages, userMessage].map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('聊天服务请求失败');
      }

      payload = (await response.json()) as ChatApiResponse;
    } catch {
      const fallbackMessage: Message = {
        id: createMessageId('assistant-error'),
        contactId: activeContactId,
        role: 'assistant',
        content: '当前 AI 服务不可用，请检查本地代理配置后重试。',
        createdAt: new Date(),
      };

      addMessage(activeContactId, fallbackMessage);

      try {
        await saveMessage(fallbackMessage);
      } catch {
        // Keep optimistic UI behavior for local-first flow.
      }

      setIsLoading(false);
      return;
    }

    if (payload.toolResult) {
      const normalizedCard = payload.contactCard
        ? {
            ...payload.contactCard,
            createdAt: new Date(payload.contactCard.createdAt),
          }
        : undefined;

      const toolMessage: Message = {
        id: createMessageId('assistant-tool'),
        contactId: activeContactId,
        role: 'assistant',
        content: '',
        toolCalls: [
          {
            id: createMessageId('extract-contact'),
            name: 'extract_contact_info',
            arguments: {},
            result: payload.toolResult,
          },
        ],
        contactCard: normalizedCard,
        createdAt: new Date(),
      };

      addMessage(activeContactId, toolMessage);

      try {
        await saveMessage(toolMessage);
      } catch {
        // Keep optimistic UI behavior for local-first flow.
      }

      if (normalizedCard) {
        try {
          await saveContactCard(normalizedCard);
        } catch {
          // Keep optimistic UI behavior for local-first flow.
        }
      }
    }

    const assistantMessage: Message = {
      id: createMessageId('assistant'),
      contactId: activeContactId,
      role: 'assistant',
      content: payload.reply || '我已经记下来了。',
      createdAt: new Date(),
    };

    addMessage(activeContactId, assistantMessage);

    try {
      await saveMessage(assistantMessage);
    } catch {
      // Keep optimistic UI behavior for local-first flow.
    }

    setIsLoading(false);
  };

  return (
    <div className="flex h-screen w-full flex-col bg-[#F5F5F7]">
      <ContactsDrawer onAddContact={handleAddContact} />

      <main className="flex flex-1 flex-col">
        <ChatHeader contact={activeContact} />

        <MessageList messages={currentMessages} />
        <div ref={messagesEndRef} />

        <ChatComposer
          onSendMessage={handleSendMessage}
          onToolAction={handleToolAction}
          onVoiceInput={handleVoiceInput}
          disabled={isLoading}
        />
      </main>
    </div>
  );
}
