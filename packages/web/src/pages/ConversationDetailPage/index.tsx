import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { CustomMessageRenderer } from '../../components/chat/CustomMessageRenderer';
import { ToolConfirmationOverlay } from '../../components/chat/ToolConfirmationOverlay';
import {
  ChatInputBox,
  type ChatAgentActionOption,
  type ChatComposerSubmitPayload,
  type ChatSkillOption,
  type ToolOption,
} from '../../components/chat/ChatInputBox';
import { ArchiveApplyPanel } from '../../components/chat/ArchiveApplyPanel';
import { useConversationHistory } from '../../hooks/useConversationHistory';
import { useAgentChat, type AgentChatMessage } from '../../hooks/useAgentChat';
import { useToolConfirmations } from '../../hooks/useToolConfirmations';
import { sortMessagesByCreatedAt } from '../../lib/messages/sortMessagesByCreatedAt';
import { resolveEpochMs } from '../../lib/time/timestamp';
import type { ArchiveExtractData } from '../../lib/api/agent-types';
import type {
  AgentLlmCatalogResponse,
  AgentLlmRequest,
  ChatAgentCatalogItem,
  SkillCatalogItem,
} from '../../lib/api/types';
import { api } from '../../lib/api/client';

type MessageWithMs = AgentChatMessage & {
  createdAtMs?: number;
};

const DUPLICATE_WINDOW_MS = 5000;
const LLM_SELECTION_STORAGE_KEY = 'chat_llm_selection_v1';

function hasThinkingTag(content: string): boolean {
  return /(?:<think>|&lt;think&gt;)/i.test(content);
}

function selectAssistantContent(existing: string, incoming: string): string {
  const existingHasThinking = hasThinkingTag(existing);
  const incomingHasThinking = hasThinkingTag(incoming);

  if (existingHasThinking && !incomingHasThinking) {
    return existing;
  }
  if (!existingHasThinking && incomingHasThinking) {
    return incoming;
  }

  const existingTrimmed = existing.trim();
  const incomingTrimmed = incoming.trim();
  if (incomingTrimmed.length === 0 && existingTrimmed.length > 0) {
    return existing;
  }
  if (existingTrimmed.length === 0 && incomingTrimmed.length > 0) {
    return incoming;
  }

  return incoming.length >= existing.length ? incoming : existing;
}

const AVAILABLE_CHAT_TOOLS: ToolOption[] = [
  {
    id: 'web_search',
    name: '网络搜索',
    description: '搜索最新信息',
  },
  {
    id: 'feishu_list_message_templates',
    name: '飞书模板',
    description: '查询飞书消息模板',
  },
  {
    id: 'feishu_send_template_message',
    name: '发送飞书消息',
    description: '按模板发送飞书消息',
  },
];

const FALLBACK_AGENT_ACTIONS: ChatAgentActionOption[] = [
  {
    id: 'archive_brief:archive_extract',
    name: '提取归档',
    description: '提取归档并显示应用面板',
    agentId: 'archive_brief',
    operation: 'archive_extract',
    entryMode: 'run',
  },
  {
    id: 'archive_brief:brief_generate',
    name: '生成简报',
    description: '基于当前对话联系人生成会前简报',
    agentId: 'archive_brief',
    operation: 'brief_generate',
    entryMode: 'run',
  },
  {
    id: 'contact_insight:default',
    name: '联系人洞察',
    description: '对当前对话联系人生成洞察分析',
    agentId: 'contact_insight',
    operation: null,
    entryMode: 'run',
    defaultInputTemplate: {
      depth: 'standard',
    },
  },
  {
    id: 'network_action:default',
    name: '生成行动建议',
    description: '生成全局关系行动建议',
    agentId: 'network_action',
    operation: null,
    entryMode: 'run',
  },
];

const FALLBACK_SKILLS: ChatSkillOption[] = [
  {
    key: 'dingtalk_shanji',
    name: '解析闪记',
    description: '点亮后可解析钉钉闪记链接',
  },
];

function mapAgentCatalogToActions(items: ChatAgentCatalogItem[]): ChatAgentActionOption[] {
  const actions: ChatAgentActionOption[] = [];
  for (const item of items) {
    for (const action of item.operations) {
      actions.push({
        id: action.id,
        name: action.name,
        description: action.description,
        agentId: action.agentId,
        operation: action.operation,
        entryMode: 'run',
        defaultInputTemplate: action.defaultInputTemplate,
      });
    }
  }
  return actions;
}

function mapCatalogToSkills(items: SkillCatalogItem[]): ChatSkillOption[] {
  return items.map((item) => ({
    key: item.key,
    name: item.displayName,
    description: item.description,
  }));
}

function toLlmSelectionId(providerKey: string, model: string): string {
  return `${providerKey}/${model}`;
}

function readStoredLlmSelectionId(): string | undefined {
  try {
    const raw = localStorage.getItem(LLM_SELECTION_STORAGE_KEY);
    if (!raw) {
      return undefined;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return undefined;
    }

    const parsedRecord = parsed as Record<string, unknown>;
    const llmIdRaw = parsedRecord.llmId;
    if (typeof llmIdRaw === 'string' && llmIdRaw.trim().length > 0) {
      return llmIdRaw.trim();
    }

    const providerKeyRaw = parsedRecord.providerKey;
    const providerRaw = parsedRecord.provider;
    const modelRaw = parsedRecord.model;
    const providerKey = typeof providerKeyRaw === 'string' ? providerKeyRaw.trim() : '';
    const provider = typeof providerRaw === 'string' ? providerRaw.trim() : '';
    const model = typeof modelRaw === 'string' ? modelRaw.trim() : '';

    if (!provider || !model) {
      return undefined;
    }

    return toLlmSelectionId(providerKey || provider, model);
  } catch {
    return undefined;
  }
}

export function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  // 如果 id 是 'new'，表示新会话，不传递 conversationId
  const conversationId = id === 'new' ? undefined : id;
  const initialMessage = (location.state as { initialMessage?: string })?.initialMessage;

  const { messages: historyMessages, loading: historyLoading } = useConversationHistory({
    conversationId,
    enabled: !!conversationId && conversationId !== 'new',
  });

  const initialMessages = useMemo<MessageWithMs[]>(() => {
    if (!historyMessages || historyMessages.length === 0) {
      return [];
    }

    return historyMessages.map((message) => {
      const createdAtMs = resolveEpochMs(message.createdAtMs, message.createdAt) ?? Date.now();

      return {
        id: message.id,
        role: message.role as 'user' | 'assistant' | 'system',
        content: message.content,
        createdAt: new Date(createdAtMs),
        createdAtMs,
        metadata: message.metadata ?? undefined,
      };
    });
  }, [historyMessages]);

  const [conversation, setConversation] = useState<{ id: string; contactId?: string | null } | null>(null);
  const [localAssistantMessages, setLocalAssistantMessages] = useState<MessageWithMs[]>([]);

  useEffect(() => {
    if (!conversationId) {
      setConversation(null);
      return;
    }

    let disposed = false;
    void api.conversations.get(conversationId)
      .then((result) => {
        if (!disposed) {
          setConversation(result);
        }
      })
      .catch(() => {
        if (!disposed) {
          setConversation(null);
        }
      });

    return () => {
      disposed = true;
    };
  }, [conversationId]);

  // 处理后端返回的 conversationId
  const handleConversationCreated = useCallback((newConversationId: string) => {
    // 如果当前没有 conversationId（包括 'new' 的情况），且后端返回了新的 conversationId，更新 URL
    if ((!conversationId || id === 'new') && newConversationId) {
      navigate(`/conversation/${newConversationId}`, { replace: true });
    }
  }, [conversationId, id, navigate]);

  const [llmCatalog, setLlmCatalog] = useState<AgentLlmCatalogResponse | null>(null);
  const [selectedLlmId, setSelectedLlmId] = useState<string>('');

  const llmSelectionOptions = useMemo(
    () =>
      (llmCatalog?.providers ?? []).flatMap((provider) =>
        provider.models.map((model) => ({
          id: toLlmSelectionId(provider.key, model.model),
          providerKey: provider.key,
          provider: provider.provider,
          providerLabel: provider.label,
          model: model.model,
          modelLabel: model.label,
          reasoning: model.reasoning,
          providerOptions: model.providerOptions,
        })),
      ),
    [llmCatalog],
  );

  useEffect(() => {
    let disposed = false;

    const loadLlmCatalog = async () => {
      try {
        const catalog = await api.agent.getLlmCatalog();
        if (disposed) {
          return;
        }

        setLlmCatalog(catalog);

        const optionIds = new Set(
          catalog.providers.flatMap((provider) =>
            provider.models.map((model) => toLlmSelectionId(provider.key, model.model)),
          ),
        );
        const storedSelectionId = readStoredLlmSelectionId();
        if (storedSelectionId && optionIds.has(storedSelectionId)) {
          setSelectedLlmId(storedSelectionId);
          return;
        }

        const defaultSelectionId = toLlmSelectionId(
          catalog.defaultSelection.key,
          catalog.defaultSelection.model,
        );
        if (optionIds.has(defaultSelectionId)) {
          setSelectedLlmId(defaultSelectionId);
          return;
        }

        const firstOptionId = catalog.providers
          .flatMap((provider) => provider.models.map((model) => toLlmSelectionId(provider.key, model.model)))
          .at(0);
        setSelectedLlmId(firstOptionId ?? '');
      } catch {
        if (disposed) {
          return;
        }
        setLlmCatalog(null);
      }
    };

    void loadLlmCatalog();

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedLlmId) {
      return;
    }

    localStorage.setItem(
      LLM_SELECTION_STORAGE_KEY,
      JSON.stringify({
        llmId: selectedLlmId,
      }),
    );
  }, [selectedLlmId]);

  useEffect(() => {
    if (llmSelectionOptions.length === 0) {
      return;
    }

    const exists = llmSelectionOptions.some((option) => option.id === selectedLlmId);
    if (!exists) {
      setSelectedLlmId(llmSelectionOptions[0].id);
    }
  }, [llmSelectionOptions, selectedLlmId]);

  const selectedLlmOption = useMemo(
    () => llmSelectionOptions.find((option) => option.id === selectedLlmId),
    [llmSelectionOptions, selectedLlmId],
  );

  const selectedLlmConfig = useMemo<AgentLlmRequest | undefined>(() => {
    if (!selectedLlmOption) {
      return undefined;
    }

    const llm: AgentLlmRequest = {
      provider: selectedLlmOption.provider as AgentLlmRequest['provider'],
      providerKey: selectedLlmOption.providerKey,
      model: selectedLlmOption.model,
    };

    if (selectedLlmOption.providerOptions) {
      llm.providerOptions = selectedLlmOption.providerOptions;
    }

    return llm;
  }, [selectedLlmOption]);

  const chat = useAgentChat({
    conversationId,
    initialMessages,
    onConversationCreated: handleConversationCreated,
    llm: selectedLlmConfig,
  });

  const toolStates = chat.pendingConfirmations;
  const { pending: pendingConfirmations, confirm, reject } = useToolConfirmations({
    toolStates,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 使用 ref 保存所有用户消息，防止 stop 时被移除
  const userMessagesBackupRef = useRef<Map<string, MessageWithMs>>(new Map());

  const sortedMessages = useMemo(() => {
    const allMessages = new Map<string, MessageWithMs>();
    const initialMessageIdSet = new Set(initialMessages.map((message) => message.id));

    // 首先添加 initialMessages（来自数据库，ID 更稳定）
    initialMessages.forEach((message) => {
      allMessages.set(message.id, message);
      // 如果是用户消息，也保存到备份中
      if (message.role === 'user') {
        userMessagesBackupRef.current.set(message.id, message);
      }
    });

    // 然后处理 chat.messages（可能包含临时 ID 的消息）
    chat.messages.forEach((message) => {
      // 如果是用户消息，保存到备份中
      if (message.role === 'user') {
        const messageWithMs = message as MessageWithMs;
        userMessagesBackupRef.current.set(message.id, messageWithMs);
      }
      const existingMessage = allMessages.get(message.id);
      
      // 如果 ID 已存在，直接合并
      if (existingMessage) {
        const mergedMessage: MessageWithMs = {
          ...existingMessage,
          ...(message as MessageWithMs),
        };

        if (existingMessage.role === 'assistant' && message.role === 'assistant') {
          mergedMessage.content = selectAssistantContent(
            existingMessage.content,
            (message as MessageWithMs).content,
          );
        }

        const createdAtMs = resolveEpochMs(
          (message as MessageWithMs).createdAtMs,
          existingMessage?.createdAtMs,
          message.createdAt,
          existingMessage?.createdAt,
        );

        if (createdAtMs !== null) {
          mergedMessage.createdAtMs = createdAtMs;
          mergedMessage.createdAt = new Date(createdAtMs);
        }

        allMessages.set(message.id, mergedMessage);
      } else {
        // 如果 ID 不存在，检查是否有相同内容和角色的消息（去重）
        const messageContent = message.content;
        const messageRole = message.role;
        const messageTime = resolveEpochMs(
          (message as MessageWithMs).createdAtMs,
          undefined,
          message.createdAt,
          undefined,
        ) ?? Date.now();

        let foundDuplicate = false;
        for (const [, existingMsg] of allMessages.entries()) {
          const existingMessageTime =
            existingMsg.createdAtMs ??
            existingMsg.createdAt?.getTime();
          if (
            initialMessageIdSet.has(existingMsg.id) &&
            existingMsg.role === messageRole &&
            existingMsg.content === messageContent &&
            typeof existingMessageTime === 'number' &&
            Math.abs(existingMessageTime - messageTime) < DUPLICATE_WINDOW_MS
          ) {
            // 仅在短时间窗口内视为同一条消息，避免误删后续“同内容”回复
            foundDuplicate = true;
            break;
          }
        }

        // 如果没有找到重复，添加新消息
        if (!foundDuplicate) {
          const newMessage: MessageWithMs = {
            ...(message as MessageWithMs),
            createdAtMs: messageTime,
            createdAt: new Date(messageTime),
          };
          allMessages.set(message.id, newMessage);
        }
      }
    });

    localAssistantMessages.forEach((message) => {
      allMessages.set(message.id, message);
    });
    
    // 最后，确保所有备份的用户消息都在最终列表中（防止 stop 时被移除）
    userMessagesBackupRef.current.forEach((backupMsg, backupId) => {
      // 如果备份的消息不在 allMessages 中，添加它
      if (!allMessages.has(backupId)) {
        // 检查是否已经有相同内容的消息（通过内容和时间戳匹配）
        const hasSameContent = Array.from(allMessages.values()).some(
          (msg) => 
            msg.role === 'user' && 
            msg.content === backupMsg.content &&
            Math.abs((msg.createdAtMs ?? msg.createdAt?.getTime() ?? 0) - 
                     (backupMsg.createdAtMs ?? backupMsg.createdAt?.getTime() ?? 0)) < DUPLICATE_WINDOW_MS
        );
        
        // 如果没有相同内容的消息，添加备份的消息
        if (!hasSameContent) {
          allMessages.set(backupId, backupMsg);
        }
      }
    });

    return sortMessagesByCreatedAt(Array.from(allMessages.values()));
  }, [initialMessages, chat.messages, localAssistantMessages]);

  const visibleMessages = useMemo(
    () =>
      sortedMessages.filter(
        (message) =>
          !(
            message.role === 'assistant' &&
            typeof message.content === 'string' &&
            message.content.trim().length === 0
          ),
      ),
    [sortedMessages],
  );

  const streamingAssistantMessageId = useMemo(() => {
    if (!chat.isLoading) {
      return null;
    }

    for (let index = chat.messages.length - 1; index >= 0; index -= 1) {
      const message = chat.messages[index];
      if (message.role === 'assistant') {
        return message.id;
      }
    }

    return null;
  }, [chat.isLoading, chat.messages]);

  // 当对话消息数量达到一定阈值时，触发标题 & 摘要生成
  const hasRequestedTitleSummaryRef = useRef(false);
  const initialConversationMessageCountRef = useRef<number>(0);

  useEffect(() => {
    const initialConversationMessages = initialMessages.filter(
      (msg) =>
        msg.role === 'user' ||
        (msg.role === 'assistant' &&
          typeof msg.content === 'string' &&
          msg.content.trim().length > 0),
    );
    initialConversationMessageCountRef.current = initialConversationMessages.length;
  }, [initialMessages]);

  useEffect(() => {
    if (!conversationId) return;

    // 只统计 user / assistant 消息
    const conversationMessages = sortedMessages.filter(
      (msg) =>
        msg.role === 'user' ||
        (msg.role === 'assistant' &&
          typeof msg.content === 'string' &&
          msg.content.trim().length > 0),
    );

    if (conversationMessages.length < 3) return;
    if (conversationMessages.length <= initialConversationMessageCountRef.current) return;

    const latestMessage = conversationMessages[conversationMessages.length - 1];
    if (!latestMessage) return;
    if (latestMessage.role !== 'assistant') return;
    if (
      typeof latestMessage.content !== 'string' ||
      latestMessage.content.trim().length === 0
    ) {
      return;
    }

    if (hasRequestedTitleSummaryRef.current) return;

    hasRequestedTitleSummaryRef.current = true;

    // 调用后端 /v1/agent/run，agentId=title_summary
    void api.agent
      .runTitleSummary({
        conversationId,
        messages: conversationMessages.map((msg) => ({
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : String(msg.content),
        })),
        language: 'zh',
        llm: selectedLlmConfig,
      })
      .catch((error) => {
        // 失败时只打日志，不打扰用户
        console.error('Failed to run title_summary agent:', error);
      });
  }, [conversationId, selectedLlmConfig, sortedMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sortedMessages.length, chat.isLoading]);

  // 如果有初始消息且历史消息为空，自动发送（包括新会话的情况）
  const hasSentInitialMessage = useRef<string | null>(null);
  useEffect(() => {
    // 新会话（id === 'new'）或已有会话但历史消息为空时，如果有初始消息则自动发送
    const isNewConversation = id === 'new';
    // 检查是否已经为这个会话发送过这条初始消息
    const hasSentForThisMessage = hasSentInitialMessage.current === initialMessage;
    // 检查 chat.messages 中是否已经包含了相同内容的用户消息
    const hasMessageInChat = chat.messages.some(
      (msg) => msg.role === 'user' && msg.content === initialMessage
    );
    // 检查 sortedMessages 中是否已经包含了相同内容的用户消息
    const hasMessageInSorted = sortedMessages.some(
      (msg) => msg.role === 'user' && msg.content === initialMessage
    );
    
    const shouldAutoSend = 
      initialMessage &&
      !historyLoading &&
      historyMessages.length === 0 &&
      !hasSentForThisMessage &&
      !hasMessageInChat &&
      !hasMessageInSorted &&
      (isNewConversation || conversationId);
    
    if (shouldAutoSend) {
      hasSentInitialMessage.current = initialMessage;
      // 使用 setTimeout 确保 chat 对象已完全初始化
      setTimeout(() => {
        chat.sendMessage(initialMessage);
      }, 100);
    }
  }, [initialMessage, historyLoading, historyMessages.length, sortedMessages, chat.messages, conversationId, id, chat]);

  // 处理发送消息
  const handleSendMessage = useCallback((payload: ChatComposerSubmitPayload) => {
    chat.sendMessage(payload.content, {
      composerContext: {
        enabledTools: payload.tools,
        enabledSkills: payload.skills,
        attachments: payload.files.map((item) => ({
          name: item.file.name,
          mimeType: item.file.type || undefined,
          size: item.file.size,
          kind: item.type,
        })),
        feishuEnabled: payload.feishuEnabled,
        thinkingEnabled: payload.thinkingEnabled,
        inputMode: payload.inputMode,
      },
    });
  }, [chat]);

  // 处理停止生成
  const handleStop = useCallback(() => {
    chat.stop();
  }, [chat]);

  const [agentActionLoading, setAgentActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [archiveData, setArchiveData] = useState<ArchiveExtractData | null>(null);
  const [showArchivePanel, setShowArchivePanel] = useState(false);
  const [dynamicAgentActions, setDynamicAgentActions] = useState<ChatAgentActionOption[]>(FALLBACK_AGENT_ACTIONS);
  const [dynamicSkills, setDynamicSkills] = useState<ChatSkillOption[]>(FALLBACK_SKILLS);

  // 获取现有联系人列表（用于去重检查）
  const [existingContacts, setExistingContacts] = useState<any[]>([]);

  // 加载联系人列表
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const result = await api.contacts.list(1, 100);
        setExistingContacts(result.items || []);
      } catch {
        // 忽略错误
      }
    };
    loadContacts();
  }, []);

  useEffect(() => {
    let disposed = false;

    const loadCatalogs = async () => {
      try {
        const [agentCatalog, skillCatalog] = await Promise.all([
          api.agent.getCatalog({ surface: 'chat' }),
          api.skills.getChatCatalog({
            agentScope: conversationId || 'chat_conversation',
            capability: 'chat',
          }),
        ]);

        if (!disposed) {
          setDynamicAgentActions(
            agentCatalog.items.length > 0 ? mapAgentCatalogToActions(agentCatalog.items) : FALLBACK_AGENT_ACTIONS,
          );
          setDynamicSkills(
            skillCatalog.items.length > 0 ? mapCatalogToSkills(skillCatalog.items) : FALLBACK_SKILLS,
          );
        }
      } catch {
        if (!disposed) {
          setDynamicAgentActions(FALLBACK_AGENT_ACTIONS);
          setDynamicSkills(FALLBACK_SKILLS);
        }
      }
    };

    void loadCatalogs();
    return () => {
      disposed = true;
    };
  }, [conversationId]);

  const handleRunAgentAction = useCallback(async (action: ChatAgentActionOption) => {
    setAgentActionLoading(true);
    setActionError(null);
    setShowArchivePanel(false);

    try {
      const runtimeInput: Record<string, unknown> = {
        ...(action.defaultInputTemplate ?? {}),
      };

      if (action.agentId === 'archive_brief' && action.operation === 'archive_extract') {
        if (!conversationId) {
          throw new Error('当前没有可用会话，无法提取归档。');
        }
        runtimeInput.conversationId = conversationId;
      }

      if (
        (action.agentId === 'archive_brief' && action.operation === 'brief_generate') ||
        action.agentId === 'contact_insight'
      ) {
        if (!conversation?.contactId) {
          throw new Error('当前对话未绑定联系人，无法执行该系统级 Agent。');
        }
        runtimeInput.contactId = conversation.contactId;
      }

      const result = await api.agent.runGeneric({
        agentId: action.agentId,
        operation: action.operation,
        input: runtimeInput,
        conversationId: conversationId ?? undefined,
        options: {
          useCache: true,
        },
        llm: selectedLlmConfig,
      });

      let resultText = `已执行系统级 Agent：${action.name}${result.cached ? '（缓存命中）' : ''}`;

      if (action.agentId === 'archive_brief' && action.operation === 'archive_extract') {
        const data = result.data as unknown as ArchiveExtractData;

        setArchiveData(data);
        setShowArchivePanel(true);

        resultText = `📋 归档提取完成\n\n`;
        resultText += `摘要：${data.summary}\n\n`;

        const parts: string[] = [];
        if (data.payload?.keyPoints?.length) {
          parts.push(`${data.payload.keyPoints.length} 个关键点`);
        }
        if (data.payload?.decisions?.length) {
          parts.push(`${data.payload.decisions.length} 个决策`);
        }
        if (data.payload?.actionItems?.length) {
          parts.push(`${data.payload.actionItems.length} 个行动项`);
        }
        if (data.payload?.contacts?.length) {
          parts.push(`${data.payload.contacts.length} 个联系人`);
        }
        if (data.payload?.facts?.length) {
          parts.push(`${data.payload.facts.length} 个信息点`);
        }
        if (data.payload?.dates?.length) {
          parts.push(`${data.payload.dates.length} 个时间事项`);
        }

        if (parts.length > 0) {
          resultText += `提取到：${parts.join('、')}\n\n`;
        }
        resultText += `💡 请在下方应用面板中选择需要创建/更新的项目`;

      } else {
        const payload = JSON.stringify(result.data, null, 2);
        const clippedPayload = payload.length > 1200 ? `${payload.slice(0, 1197)}...` : payload;
        resultText = `${resultText}\n\n${clippedPayload}`;
      }

      let persistedMessage: MessageWithMs | null = null;
      if (conversationId) {
        const stored = await api.conversations.appendMessage(conversationId, {
          role: 'assistant',
          content: resultText,
          metadata: {
            surface: 'agent_run',
            agentId: action.agentId,
            operation: action.operation ?? null,
            runId: result.runId,
            cached: result.cached,
            dataPreview: JSON.stringify(result.data).slice(0, 500),
            executionTrace: {
              status: 'succeeded',
              steps: [
                {
                  id: `${result.runId}-start`,
                  kind: 'agent',
                  itemId: result.runId,
                  title: action.name,
                  status: 'running',
                },
                {
                  id: `${result.runId}-finish`,
                  kind: 'agent',
                  itemId: result.runId,
                  title: action.name,
                  status: 'succeeded',
                  output: result.data,
                },
              ],
            },
          },
        });
        const createdAtMs = resolveEpochMs(stored.createdAtMs, stored.createdAt) ?? Date.now();
        persistedMessage = {
          id: stored.id,
          role: stored.role as 'assistant',
          content: stored.content,
          createdAt: new Date(createdAtMs),
          createdAtMs,
          metadata: stored.metadata,
        };
      } else {
        const createdAtMs = Date.now();
        persistedMessage = {
          id: `local-agent-run-${createdAtMs}`,
          role: 'assistant',
          content: resultText,
          createdAt: new Date(createdAtMs),
          createdAtMs,
          metadata: {
            surface: 'agent_run',
            agentId: action.agentId,
            operation: action.operation ?? null,
            runId: result.runId,
            cached: result.cached,
            executionTrace: {
              status: 'succeeded',
              steps: [
                {
                  id: `${result.runId}-start`,
                  kind: 'agent',
                  itemId: result.runId,
                  title: action.name,
                  status: 'running',
                },
                {
                  id: `${result.runId}-finish`,
                  kind: 'agent',
                  itemId: result.runId,
                  title: action.name,
                  status: 'succeeded',
                  output: result.data,
                },
              ],
            },
          },
        };
      }

      if (persistedMessage) {
        setLocalAssistantMessages((prev) => [
          ...prev.filter((message) => message.id !== persistedMessage!.id),
          persistedMessage!,
        ]);
      }
    } catch (error) {
      setActionError(`❌ 执行失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setAgentActionLoading(false);
      setTimeout(() => {
        setActionError(null);
      }, 8000);
    }
  }, [conversation?.contactId, conversationId, selectedLlmConfig]);

  return (
    <div className="flex flex-col h-full bg-bg-page">
      <Header
        title={historyLoading ? '加载中...' : '对话'}
        showBack
      />

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {historyLoading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-text-muted">加载中...</span>
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-[16px] text-text-secondary font-primary">
                开始新的对话
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {visibleMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`min-w-0 max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-bg-card text-text-primary'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <CustomMessageRenderer
                      message={message}
                      isStreaming={chat.isLoading && message.id === streamingAssistantMessageId}
                    />
                  ) : (
                    <p className="break-words text-[15px] font-primary whitespace-pre-wrap [overflow-wrap:anywhere]">
                      {message.content}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {/* Thinking 状态：当助手正在生成回复时显示 */}
            {chat.isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-bg-card text-text-primary">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[13px] text-text-muted font-primary">思考中...</span>
                  </div>
                </div>
              </div>
            )}
            {!chat.isLoading && chat.error && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-red-50 border border-red-200 text-red-700">
                  <p className="text-[13px] whitespace-pre-wrap">
                    {(() => {
                      const firstLine = chat.error?.message?.split('\n')[0]?.trim() || '请求失败，请稍后重试';
                      return firstLine.slice(0, 240);
                    })()}
                  </p>
                </div>
              </div>
            )}
            {/* 系统级 Agent 执行错误 */}
            {actionError && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-accent/10 border border-accent/30 text-text-primary">
                  <div className="flex items-start gap-2">
                    <span className="text-[13px] font-primary whitespace-pre-wrap">{actionError}</span>
                  </div>
                </div>
              </div>
            )}
            {/* 系统级 Agent 加载状态 */}
            {agentActionLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-bg-card text-text-primary">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[13px] text-accent font-primary">执行系统级 Agent 中...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Archive Apply Panel - 当归档提取完成后显示 */}
      {showArchivePanel && archiveData && (
        <div className="px-4 py-2">
          <ArchiveApplyPanel
            data={archiveData}
            conversationId={conversationId || ''}
            existingContacts={existingContacts}
            onApplySuccess={() => {
              // 刷新联系人列表
              api.contacts.list(1, 100).then(result => {
                setExistingContacts(result.items || []);
              }).catch(() => {});
            }}
            onClose={() => setShowArchivePanel(false)}
          />
        </div>
      )}

      {llmCatalog && (
        <div className="border-t border-border bg-bg-card px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[12px] text-text-muted">模型</span>
            <select
              value={selectedLlmId}
              onChange={(event) => setSelectedLlmId(event.target.value)}
              className="h-8 flex-1 rounded-md border border-border bg-white px-2 text-[12px] text-text-primary outline-none focus:border-primary"
              aria-label="选择模型"
            >
              {llmSelectionOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.providerLabel} / {option.modelLabel}
                  {option.reasoning ? ' · 思考' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Chat Input Box */}
      <ChatInputBox
        onSendMessage={handleSendMessage}
        onStop={handleStop}
        isLoading={chat.isLoading}
        placeholder="输入消息..."
        availableTools={AVAILABLE_CHAT_TOOLS}
        availableAgents={dynamicAgentActions}
        availableSkills={dynamicSkills}
        onRunAgentAction={handleRunAgentAction}
        disabled={false}
      />

      {pendingConfirmations.length > 0 && (
        <ToolConfirmationOverlay
          confirmation={pendingConfirmations[0]}
          onConfirm={() => confirm(pendingConfirmations[0].confirmationId)}
          onReject={() => reject(pendingConfirmations[0].confirmationId)}
        />
      )}
    </div>
  );
}
