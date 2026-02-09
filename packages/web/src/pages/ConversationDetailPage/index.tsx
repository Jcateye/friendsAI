import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { Header } from '../../components/layout/Header';
import { CustomMessageRenderer } from '../../components/chat/CustomMessageRenderer';
import { ToolConfirmationOverlay } from '../../components/chat/ToolConfirmationOverlay';
import { ChatInputBox, type AttachedFile } from '../../components/chat/ChatInputBox';
import { SkillPanel } from '../../components/chat/SkillPanel';
import { useConversationHistory } from '../../hooks/useConversationHistory';
import { useAgentChat } from '../../hooks/useAgentChat';
import { useToolConfirmations } from '../../hooks/useToolConfirmations';
import { sortMessagesByCreatedAt } from '../../lib/messages/sortMessagesByCreatedAt';
import { resolveEpochMs } from '../../lib/time/timestamp';
import type { Message as AISDKMessage } from 'ai';
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

  // 处理技能选择
  const handleSkillSelect = useCallback((skillId: string, operation?: string) => {
    setActiveSkillId(skillId);
    // TODO: 调用对应的 Agent 能力
    console.log('Skill selected:', skillId, 'Operation:', operation);
  }, []);

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
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Skill Panel */}
      <SkillPanel
        activeSkillId={activeSkillId ?? undefined}
        onSkillSelect={handleSkillSelect}
      />

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
