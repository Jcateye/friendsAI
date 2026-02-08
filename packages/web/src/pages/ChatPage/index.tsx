import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { GlobalDrawer } from '../../components/layout/GlobalDrawer';
import { useConversations } from '../../hooks/useConversations';
import { ChevronRight, Send } from 'lucide-react';

// Helper function to get relative time display
const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
};

export function ChatPage() {
  const navigate = useNavigate();
  const { conversations, isLoading: conversationsLoading, createConversation } = useConversations();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 输入框状态
  const [input, setInput] = useState('');

  // 发送消息
  const handleSendMessage = async (message: string) => {
    try {
      // 先创建会话
      const newConversation = await createConversation({});
      const currentConversationId = newConversation.id;
      
      // 导航到会话详情页面，消息会在详情页发送
      navigate(`/conversation/${currentConversationId}`, {
        state: { initialMessage: message }
      });
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) {
      return;
    }
    const messageToSend = input;
    setInput(''); // 先清空输入框，提供即时反馈
    await handleSendMessage(messageToSend);
  };

  // Prepare drawer records from conversations
  const drawerRecords = useMemo(() => {
    return conversations.map((conv) => {
      // Get first 100 chars of content as subtitle
      const subtitle = conv.content
        ? (conv.content.length > 50 ? conv.content.slice(0, 50) + '...' : conv.content)
        : '暂无摘要';

      return {
        id: conv.id,
        title: conv.title || '新对话',
        subtitle,
        date: conv.createdAt
          ? new Date(conv.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
          : '',
        timeDisplay: conv.createdAt ? getRelativeTime(new Date(conv.createdAt)) : '',
        status: conv.isArchived ? ('archived' as const) : ('pending' as const),
      };
    });
  }, [conversations]);

  return (
    <div className="flex flex-col h-full bg-bg-page">
      <Header
        title="对话"
        showMenu
        showNewChat
        onMenuClick={() => setIsDrawerOpen(true)}
        onNewChatClick={() => {
          navigate('/chat');
        }}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* 输入区域 - 固定在顶部 */}
        <div className="p-4 bg-bg-card border-b border-border shrink-0">
          <div className="bg-bg-surface rounded-xl p-4 mb-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="写下今天见了谁、聊了什么..."
              className="w-full bg-transparent text-[15px] text-text-primary placeholder:text-text-muted outline-none resize-none font-primary min-h-[80px]"
              rows={3}
            />
            <p className="text-[12px] text-text-muted font-primary mt-2">(10分钟搞定)</p>
          </div>
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <button
              type="button"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-tint shrink-0"
              aria-label="语音输入"
            >
              <span className="text-primary text-lg">🎤</span>
            </button>
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg disabled:bg-text-muted disabled:opacity-50 transition-opacity font-primary text-[15px] flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>发送</span>
            </button>
          </form>
        </div>

        {/* 空状态提示 */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
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
        </div>

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


      {/* Global Drawer */}
      <GlobalDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        records={drawerRecords}
      />
    </div>
  );
}
