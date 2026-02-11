'use client';

import { useState, useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chat';
import { db } from '@/lib/db';
import type { Contact, Message } from '@/types';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageList } from '@/components/chat/MessageList';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ContactsDrawer } from '@/components/drawer/ContactsDrawer';

const AVATAR_COLORS = [
  '#007AFF',
  '#34C759',
  '#FF9500',
  '#AF52DE',
  '#FF3B30',
  '#5856D6',
  '#FFCC00',
] as const;

// Demo data
const DEMO_CONTACTS: Contact[] = [
  {
    id: '1',
    name: '张三',
    avatarColor: AVATAR_COLORS[0],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: '李四',
    avatarColor: AVATAR_COLORS[1],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    name: '王五',
    avatarColor: AVATAR_COLORS[2],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '4',
    name: '赵六',
    avatarColor: AVATAR_COLORS[3],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const DEMO_MESSAGES: Record<string, Message[]> = {
  '1': [
    {
      id: '1-1',
      contactId: '1',
      role: 'user',
      content: '你好，最近怎么样？',
      createdAt: new Date(Date.now() - 3600000),
    },
    {
      id: '1-2',
      contactId: '1',
      role: 'assistant',
      content: '你好！我很好，谢谢关心。最近在做一个新项目，很有意思。',
      createdAt: new Date(Date.now() - 3000000),
    },
    {
      id: '1-3',
      contactId: '1',
      role: 'user',
      content: '听起来不错！是什么项目？',
      createdAt: new Date(Date.now() - 2400000),
    },
    {
      id: '1-4',
      contactId: '1',
      role: 'assistant',
      content: '',
      toolCalls: [
        {
          id: 'tool-1',
          name: 'extract_contact_info',
          arguments: {},
          result: '已提取联系人信息：王五，前端工程师，专注于 React 开发',
        },
      ],
      createdAt: new Date(Date.now() - 1800000),
    },
  ],
};

export default function ChatPage() {
  const { activeContactId, contacts, messages, setContacts, setActiveContact, setMessages, addMessage } =
    useChatStore();

  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize demo data
  useEffect(() => {
    setContacts(DEMO_CONTACTS);

    // Load messages for demo contacts
    Object.entries(DEMO_MESSAGES).forEach(([contactId, msgs]) => {
      setMessages(contactId, msgs);
    });

    // Set first contact as active
    if (DEMO_CONTACTS.length > 0) {
      setActiveContact(DEMO_CONTACTS[0].id);
    }
  }, [setContacts, setMessages, setActiveContact]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeContactId]);

  const activeContact = contacts.find((c) => c.id === activeContactId) || null;
  const currentMessages = activeContactId ? messages[activeContactId] || [] : [];

  const handleSendMessage = async (content: string) => {
    if (!activeContactId) return;

    // Add user message
    const userMessage: Message = {
      id: `${Date.now()}-user`,
      contactId: activeContactId,
      role: 'user',
      content,
      createdAt: new Date(),
    };
    addMessage(activeContactId, userMessage);

    // Simulate AI response
    setIsLoading(true);

    // Simulate tool call
    setTimeout(() => {
      const toolMessage: Message = {
        id: `${Date.now()}-tool`,
        contactId: activeContactId,
        role: 'assistant',
        content: '',
        toolCalls: [
          {
            id: `tool-${Date.now()}`,
            name: 'extract_contact_info',
            arguments: {},
            result: '已识别并保存联系人信息',
          },
        ],
        createdAt: new Date(),
      };
      addMessage(activeContactId, toolMessage);

      // Simulate text response
      setTimeout(() => {
        const responseMessage: Message = {
          id: `${Date.now()}-assistant`,
          contactId: activeContactId,
          role: 'assistant',
          content: `我已记录：${content}`,
          createdAt: new Date(),
        };
        addMessage(activeContactId, responseMessage);
        setIsLoading(false);
      }, 1000);
    }, 500);
  };

  return (
    <div className="flex h-screen w-full flex-col bg-[#F5F5F7]">
      <ContactsDrawer />

      <main className="flex flex-1 flex-col">
        <ChatHeader contact={activeContact} />

        <MessageList messages={currentMessages} />

        <div ref={messagesEndRef} />

        <ChatComposer onSendMessage={handleSendMessage} disabled={isLoading} />
      </main>
    </div>
  );
}
