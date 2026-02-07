import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { CustomMessageRenderer } from '../../components/chat/CustomMessageRenderer';
import { ChatComposer } from '../../components/chat/ChatComposer';
import { ToolConfirmationOverlay } from '../../components/chat/ToolConfirmationOverlay';
import { useConversations } from '../../hooks/useConversations';
import { useAgentChat } from '../../hooks/useAgentChat';
import { useToolConfirmations } from '../../hooks/useToolConfirmations';
import { ChevronRight, Send } from 'lucide-react';

export function ChatPage() {
  const navigate = useNavigate();
  const { conversations, isLoading: conversationsLoading, reload: reloadConversations, createConversation } = useConversations();
  const [conversationId, setConversationId] = useState<string | undefined>();

  // 使用 useAgentChat 处理消息发送和接收
  const chat = useAgentChat({
    conversationId,
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

  // 当发送第一条消息时，创建新会话
  useEffect(() => {
    if (chat.messages.length > 0 && !conversationId) {
      const hasUserMessage = chat.messages.some((msg) => msg.role === 'user');
      if (hasUserMessage) {
        createConversation({})
          .then((newConversation) => {
            setConversationId(newConversation.id);
          })
          .catch((error) => {
            console.error('Failed to create conversation:', error);
          });
      }
    }
  }, [chat.messages.length, conversationId, createConversation]);

  // 当有新消息时，更新会话列表
  useEffect(() => {
    if (conversationId && chat.messages.length > 0) {
      const timer = setTimeout(() => {
        reloadConversations();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [chat.messages.length, conversationId, reloadConversations]);

  // 发送消息
  const handleSendMessage = (message: string) => {
    chat.sendMessage(message);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chat.isLoading) {
      return;
    }
    handleSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-bg-page">
      <Header
        title="对话"
        showMenu
        showNewChat
        onMenuClick={() => {
          console.log('Menu clicked');
        }}
        onNewChatClick={() => {
          setConversationId(undefined);
          navigate('/chat');
        }}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* 聊天消息区域 */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {chat.messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-[16px] text-text-secondary font-primary">
                  开始新的对话
                </p>
                <p className="text-[14px] text-text-muted font-primary mt-2">
                  输入消息与 AI 助手交流
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

        {/* 最近会话列表 - 固定在底部，在 TabBar 上方 */}
        {!conversationsLoading && conversations.length > 0 && (
          <div className="flex flex-col gap-3 p-4 border-t border-border bg-bg-card shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold text-text-primary font-primary">
                最近记录
              </span>
              <button
                onClick={() => navigate('/contacts')}
                className="text-[13px] text-text-muted font-primary flex items-center gap-1 hover:text-text-primary transition-colors"
              >
                查看全部
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {conversations.slice(0, 3).map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => navigate(`/conversation/${conversation.id}`)}
                  className="flex items-center gap-3 p-3 bg-bg-surface rounded-md text-left hover:bg-bg-card active:bg-bg-page transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 bg-primary-tint rounded-md flex items-center justify-center shrink-0">
                    <span className="text-primary text-sm">💬</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-text-primary font-primary truncate">
                      {conversation.title || '新对话'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

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
