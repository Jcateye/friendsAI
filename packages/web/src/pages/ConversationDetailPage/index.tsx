import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Header } from '../../components/layout/Header';
import { CustomMessageRenderer } from '../../components/chat/CustomMessageRenderer';
import { ToolConfirmationOverlay } from '../../components/chat/ToolConfirmationOverlay';
import { useConversationHistory } from '../../hooks/useConversationHistory';
import { useAgentChat } from '../../hooks/useAgentChat';
import { useToolConfirmations } from '../../hooks/useToolConfirmations';
import { Send } from 'lucide-react';

export function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const conversationId = id;

  // 加载会话历史
  const { messages: historyMessages, loading: historyLoading } = useConversationHistory({
    conversationId,
    enabled: !!conversationId,
  });

  // 转换历史消息格式
  const initialMessages = historyMessages?.map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content,
  })) || [];

  // 使用 useAgentChat
  const chat = useAgentChat({
    conversationId,
    initialMessages: initialMessages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: new Date(),
    })),
  });

  // 从工具状态中筛选需要确认的工具
  const toolStates = chat.pendingConfirmations;
  const { pending: pendingConfirmations, confirm, reject } = useToolConfirmations({
    toolStates,
  });

  // 输入框状态
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages.length]);

  // 发送消息
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chat.isLoading) {
      return;
    }
    chat.sendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-bg-page">
      <Header
        title={historyLoading ? '加载中...' : '会话详情'}
        showBack
      />

      {/* 聊天消息区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {historyLoading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-text-muted">加载中...</span>
          </div>
        ) : chat.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-[16px] text-text-secondary font-primary">
                开始新的对话
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {chat.messages.map((message) => (
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
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 输入框 */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4 bg-bg-card border-t border-border shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息..."
          className="flex-1 px-4 py-3 bg-bg-surface rounded-full text-[15px] text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-primary font-primary"
          disabled={chat.isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || chat.isLoading}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-primary disabled:bg-text-muted disabled:opacity-50 transition-opacity shrink-0"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </form>

      {/* 工具确认弹层 */}
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
