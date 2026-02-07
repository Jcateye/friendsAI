import { Check, User, Calendar, Lightbulb, CheckSquare } from 'lucide-react'
import { Header } from '../../components/layout/Header'

export function ConversationDetailPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="今日记录 2026/01/28" showBack />

      {/* Scroll Content */}
      <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto">
        {/* Input Section */}
        <div className="flex flex-col gap-3 p-4 bg-bg-card rounded-lg">
          <span className="text-[12px] font-medium text-text-muted font-primary">
            记录内容
          </span>
          <div className="p-3.5 bg-primary-tint rounded-md">
            <p className="text-[14px] text-text-primary font-primary leading-relaxed">
              今天和张伟见面，讨论了Q1投资计划。他对AI领域很感兴趣，希望下周能安排一次详细的项目演示。
            </p>
          </div>
        </div>

        {/* AI Result Label */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
            <span className="text-white text-xs">AI</span>
          </div>
          <span className="text-[16px] font-semibold text-text-primary font-display">
            AI 归档结果
          </span>
        </div>

        {/* Card 1 - Person */}
        <div className="flex flex-col gap-3 p-4 bg-bg-card rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <span className="text-[14px] font-semibold text-text-primary font-primary">
                相关联系人
              </span>
            </div>
            <button className="text-[13px] text-primary font-medium font-primary">
              编辑
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#C9B8A8] rounded-md flex items-center justify-center">
              <span className="text-white font-semibold">张</span>
            </div>
            <div>
              <p className="text-[14px] font-medium text-text-primary font-primary">
                张伟
              </p>
              <p className="text-[13px] text-text-secondary font-primary">
                某投资公司 · 合伙人
              </p>
            </div>
          </div>
        </div>

        {/* Card 2 - Event */}
        <div className="flex flex-col gap-3 p-4 bg-bg-card rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-info" />
              <span className="text-[14px] font-semibold text-text-primary font-primary">
                事件记录
              </span>
            </div>
            <button className="text-[13px] text-primary font-medium font-primary">
              编辑
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 mt-2 bg-info rounded-full" />
              <p className="text-[14px] text-text-primary font-primary">
                与张伟讨论Q1投资计划
              </p>
            </div>
          </div>
        </div>

        {/* Card 3 - Facts */}
        <div className="flex flex-col gap-3 p-4 bg-bg-card rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-warning" />
              <span className="text-[14px] font-semibold text-text-primary font-primary">
                关键事实
              </span>
            </div>
            <button className="text-[13px] text-primary font-medium font-primary">
              编辑
            </button>
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 mt-2 bg-warning rounded-full" />
              <p className="text-[14px] text-text-primary font-primary">
                张伟对AI领域投资很感兴趣
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 mt-2 bg-warning rounded-full" />
              <p className="text-[14px] text-text-primary font-primary">
                希望下周安排项目演示
              </p>
            </div>
          </div>
        </div>

        {/* Card 4 - Todos */}
        <div className="flex flex-col gap-3 p-4 bg-bg-card rounded-md">
          <span className="text-[14px] font-semibold text-text-primary font-primary">
            待办事项
          </span>
          <div className="flex items-center gap-2.5">
            <CheckSquare className="w-4 h-4 text-primary" />
            <p className="text-[14px] text-text-primary font-primary">
              安排下周项目演示会议
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-7 bg-bg-card border-t border-border">
        <button className="flex-1 h-12 bg-bg-card border border-border rounded-md flex items-center justify-center">
          <span className="text-[15px] font-medium text-text-secondary font-primary">
            编辑后归档
          </span>
        </button>
        <button className="flex-1 h-12 bg-primary rounded-md flex items-center justify-center gap-2">
          <Check className="w-[18px] h-[18px] text-white" />
          <span className="text-[15px] font-semibold text-white font-primary">
            确认归档
          </span>
        </button>
      </div>
    </div>
  )
}
