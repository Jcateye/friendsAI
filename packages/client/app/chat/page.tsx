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
  requestId?: string;
}

interface ChatToolsPayload {
  enabled: Array<'extract_contact_info' | 'feishu_template_message'>;
  feishuTemplateMessage?: {
    mode: 'sync' | 'preview';
  };
}

type ComposerTool = 'image' | 'video' | 'audio' | 'document' | 'file' | 'feishu_bitable';

function createMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createContactName(contactCount: number): string {
  return `新联系人${contactCount + 1}`;
}

function mapToolName(tool: ComposerTool): string {
  if (tool === 'image') return '图片';
  if (tool === 'video') return '视频';
  if (tool === 'audio') return '音频';
  if (tool === 'document') return '文档';
  if (tool === 'file') return '文件';
  if (tool === 'feishu_bitable') return '飞书多维表';
  return '未知工具';
}

function buildChatToolsPayload(
  isFeishuToolEnabled: boolean,
  feishuMode: 'sync' | 'preview'
): ChatToolsPayload {
  if (!isFeishuToolEnabled) {
    return {
      enabled: ['extract_contact_info'],
    };
  }

  return {
    enabled: ['extract_contact_info', 'feishu_template_message'],
    feishuTemplateMessage: {
      mode: feishuMode,
    },
  };
}

export default function ChatPage() {
  const {
    activeContactId,
    contacts,
    messages,
    setContacts,
    addContact,
    setActiveContact,
    setMessages,
    addMessage,
    updateMessage,
  } = useChatStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isFeishuToolEnabled, setIsFeishuToolEnabled] = useState(false);
  const [feishuMode, setFeishuMode] = useState<'sync' | 'preview'>('sync');
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

  const updateMessageById = async (
    contactId: string,
    messageId: string,
    updater: (message: Message) => Message
  ) => {
    const targetMessage = (messages[contactId] ?? []).find((message) => message.id === messageId);
    if (!targetMessage) {
      return;
    }

    const updatedMessage = updater(targetMessage);
    updateMessage(contactId, messageId, updater);

    try {
      await saveMessage(updatedMessage);
    } catch {
      // Keep optimistic UI behavior for local-first flow.
    }
  };

  const handleConfirmContactCard = async (messageId: string) => {
    if (!activeContactId) {
      return;
    }

    const message = (messages[activeContactId] ?? []).find((item) => item.id === messageId);

    if (!message?.contactCard) {
      return;
    }

    try {
      await saveContactCard(message.contactCard);
    } catch {
      // Keep optimistic UI behavior for local-first flow.
    }

    await updateMessageById(activeContactId, messageId, (item) => ({
      ...item,
      pendingContactCardConfirmation: false,
    }));
  };

  const handleDismissContactCard = async (messageId: string) => {
    if (!activeContactId) {
      return;
    }

    await updateMessageById(activeContactId, messageId, (item) => ({
      ...item,
      pendingContactCardConfirmation: false,
    }));
  };

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

    const normalizedContent = content.trim();
    if (!normalizedContent) {
      return;
    }

    const userMessage: Message = {
      id: createMessageId('user'),
      contactId: activeContactId,
      role: 'user',
      content: normalizedContent,
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
    const toolsPayload = buildChatToolsPayload(isFeishuToolEnabled, feishuMode);

    try {
      const requestPayload = {
        contact: activeContact,
        messages: [...currentMessages, userMessage]
          .filter((message) => message.content.trim().length > 0)
          .map((message) => ({
            role: message.role,
            content: message.content,
          })),
        tools: toolsPayload,
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as
          | {
              error?: string;
              requestId?: string;
            }
          | null;

        console.error('[chat-page] /api/chat request failed', {
          status: response.status,
          statusText: response.statusText,
          requestId: errorBody?.requestId,
          error: errorBody?.error,
          contactId: activeContact.id,
          messageCount: requestPayload.messages.length,
          enabledTools: requestPayload.tools.enabled,
          feishuMode: requestPayload.tools.feishuTemplateMessage?.mode,
        });

        throw new Error(errorBody?.error ?? '聊天服务请求失败');
      }

      payload = (await response.json()) as ChatApiResponse;

      console.info('[chat-page] /api/chat request succeeded', {
        requestId: payload.requestId,
        contactId: activeContact.id,
        messageCount: requestPayload.messages.length,
        hasToolResult: Boolean(payload.toolResult),
      });
    } catch (error) {
      console.error('[chat-page] failed to send message', {
        contactId: activeContact.id,
        error: error instanceof Error ? error.message : String(error),
      });

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
        pendingContactCardConfirmation: Boolean(normalizedCard),
        createdAt: new Date(),
      };

      addMessage(activeContactId, toolMessage);

      try {
        await saveMessage(toolMessage);
      } catch {
        // Keep optimistic UI behavior for local-first flow.
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

        <MessageList
          messages={currentMessages}
          onConfirmContactCard={handleConfirmContactCard}
          onDismissContactCard={handleDismissContactCard}
        />
        <div ref={messagesEndRef} />

        <ChatComposer
          onSendMessage={handleSendMessage}
          onToolAction={handleToolAction}
          onVoiceInput={handleVoiceInput}
          disabled={isLoading}
          isFeishuToolEnabled={isFeishuToolEnabled}
          onToggleFeishuTool={() => setIsFeishuToolEnabled(!isFeishuToolEnabled)}
        />
      </main>
    </div>
  );
}
