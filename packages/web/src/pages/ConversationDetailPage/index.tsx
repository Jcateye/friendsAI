import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { CustomMessageRenderer } from '../../components/chat/CustomMessageRenderer';
import { ToolConfirmationOverlay } from '../../components/chat/ToolConfirmationOverlay';
import { ChatInputBox, type AttachedFile } from '../../components/chat/ChatInputBox';
import { SkillPanel } from '../../components/chat/SkillPanel';
import { ArchiveApplyPanel } from '../../components/chat/ArchiveApplyPanel';
import { useConversationHistory } from '../../hooks/useConversationHistory';
import { useAgentChat } from '../../hooks/useAgentChat';
import { useToolConfirmations } from '../../hooks/useToolConfirmations';
import { sortMessagesByCreatedAt } from '../../lib/messages/sortMessagesByCreatedAt';
import { resolveEpochMs } from '../../lib/time/timestamp';
import type { Message as AISDKMessage } from 'ai';
import type { ArchiveExtractData } from '../../lib/api/agent-types';
import { api } from '../../lib/api/client';

type MessageWithMs = AISDKMessage & {
  createdAtMs?: number;
};

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
      };
    });
  }, [historyMessages]);

  // 处理后端返回的 conversationId
  const handleConversationCreated = useCallback((newConversationId: string) => {
    // 如果当前没有 conversationId（包括 'new' 的情况），且后端返回了新的 conversationId，更新 URL
    if ((!conversationId || id === 'new') && newConversationId) {
      navigate(`/conversation/${newConversationId}`, { replace: true });
    }
  }, [conversationId, id, navigate]);

  const chat = useAgentChat({
    conversationId,
    initialMessages,
    onConversationCreated: handleConversationCreated,
  });

  const toolStates = chat.pendingConfirmations;
  const { pending: pendingConfirmations, confirm, reject } = useToolConfirmations({
    toolStates,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 技能选择状态
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);

  // 使用 ref 保存所有用户消息，防止 stop 时被移除
  const userMessagesBackupRef = useRef<Map<string, MessageWithMs>>(new Map());

  const sortedMessages = useMemo(() => {
    const allMessages = new Map<string, MessageWithMs>();

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
          if (
            existingMsg.role === messageRole &&
            existingMsg.content === messageContent
          ) {
            // 这里不再依赖时间戳阈值，只要角色 + 内容相同就认为是重复
            // 主要解决后端历史消息和流式返回重复渲染的问题
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
                     (backupMsg.createdAtMs ?? backupMsg.createdAt?.getTime() ?? 0)) < 5000
        );
        
        // 如果没有相同内容的消息，添加备份的消息
        if (!hasSameContent) {
          allMessages.set(backupId, backupMsg);
        }
      }
    });

    return sortMessagesByCreatedAt(Array.from(allMessages.values()));
  }, [initialMessages, chat.messages]);

  // 当对话消息数量达到一定阈值时，触发标题 & 摘要生成
  const hasRequestedTitleSummaryRef = useRef(false);
  useEffect(() => {
    if (!conversationId) return;

    // 只统计 user / assistant 消息
    const conversationMessages = sortedMessages.filter(
      (msg) => msg.role === 'user' || msg.role === 'assistant'
    );

    if (conversationMessages.length < 3) return;
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
      })
      .catch((error) => {
        // 失败时只打日志，不打扰用户
        console.error('Failed to run title_summary agent:', error);
      });
  }, [conversationId, sortedMessages]);

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
  const handleSendMessage = useCallback((content: string, _files?: AttachedFile[], _tools?: string[]) => {
    // TODO: 处理文件上传和工具选择
    // 目前只发送文本内容
    chat.sendMessage(content);
  }, [chat]);

  // 处理停止生成
  const handleStop = useCallback(() => {
    chat.stop();
  }, [chat]);

  // 技能执行状态
  const [skillLoading, setSkillLoading] = useState(false);
  const [skillResult, setSkillResult] = useState<string | null>(null);
  const [archiveData, setArchiveData] = useState<ArchiveExtractData | null>(null);
  const [showArchivePanel, setShowArchivePanel] = useState(false);

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

  // 处理技能选择
  const handleSkillSelect = useCallback(async (skillId: string, operation?: string) => {
    setActiveSkillId(skillId);
    setSkillLoading(true);
    setSkillResult(null);
    setShowArchivePanel(false);

    try {
      if (skillId === 'archive_brief' && operation === 'archive_extract' && conversationId) {
        const result = await api.agent.runArchiveExtract({ conversationId });
        const data = result.data as ArchiveExtractData;

        // 保存归档数据用于应用面板
        setArchiveData(data);
        setShowArchivePanel(true);

        // 生成简短展示文本
        let resultText = `📋 归档提取完成\n\n`;
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

        setSkillResult(resultText);
      } else if (skillId === 'archive_brief' && operation === 'brief_generate' && conversationId) {
        setSkillResult('💡 生成简报功能需要在联系人详情页使用。\n\n打开联系人详情页后，点击「生成洞察」按钮即可生成会前简报。');
      } else if (skillId === 'contact_insight') {
        setSkillResult('👤 联系人洞察功能需要在联系人详情页使用。\n\n打开联系人详情页后，点击「洞察」按钮即可生成完整的联系人洞察分析。');
      } else {
        setSkillResult(`✅ 技能 "${skillId}" 操作 "${operation || '默认'}" 触发成功`);
      }
    } catch (error) {
      setSkillResult(`❌ 执行失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSkillLoading(false);
      // 5秒后清除简单结果，保留归档数据
      setTimeout(() => {
        setSkillResult(null);
        setActiveSkillId(null);
      }, 8000);
    }
  }, [conversationId]);

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
        ) : sortedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-[16px] text-text-secondary font-primary">
                开始新的对话
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {sortedMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-bg-card text-text-primary'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <CustomMessageRenderer message={message} />
                  ) : (
                    <p className="text-[15px] font-primary whitespace-pre-wrap">
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
            {/* 技能执行结果 */}
            {skillResult && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-accent/10 border border-accent/30 text-text-primary">
                  <div className="flex items-start gap-2">
                    <span className="text-[13px] font-primary whitespace-pre-wrap">{skillResult}</span>
                  </div>
                </div>
              </div>
            )}
            {/* 技能加载状态 */}
            {skillLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-bg-card text-text-primary">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[13px] text-accent font-primary">执行技能中...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Skill Panel */}
      <SkillPanel
        activeSkillId={activeSkillId ?? undefined}
        onSkillSelect={handleSkillSelect}
      />

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

      {/* Chat Input Box */}
      <ChatInputBox
        onSendMessage={handleSendMessage}
        onStop={handleStop}
        isLoading={chat.isLoading}
        placeholder="输入消息..."
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
