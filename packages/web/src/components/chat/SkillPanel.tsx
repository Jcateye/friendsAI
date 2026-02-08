/**
 * SkillPanel 组件
 * 在聊天输入框上方显示可用技能（Agent 能力）
 */

import { useState } from 'react';
import {
  Archive,
  ChevronRight,
  Sparkles,
  User,
  Search,
  Check,
} from 'lucide-react';

// ==================== 类型定义 ====================

export interface SkillOption {
  id: string;
  name: string;
  description: string;
  icon?: React.ReactNode;
  color?: string;
  operations?: string[];
}

export interface SkillPanelProps {
  /** 可用技能列表 */
  skills?: SkillOption[];
  /** 技能选中回调 */
  onSkillSelect?: (skillId: string, operation?: string) => void;
  /** 当前激活的技能 ID */
  activeSkillId?: string;
}

// ==================== 默认技能列表 ====================

const DEFAULT_SKILLS: SkillOption[] = [
  {
    id: 'archive_brief',
    name: '会话归档',
    description: '提取归档信息并生成简报',
    icon: <Archive className="w-5 h-5" />,
    color: 'text-primary',
    operations: ['archive_extract', 'brief_generate'],
  },
  {
    id: 'contact_insight',
    name: '联系人洞察',
    description: '分析联系人关系和机会',
    icon: <User className="w-5 h-5" />,
    color: 'text-accent',
  },
  {
    id: 'web_search',
    name: '网络搜索',
    description: '搜索最新信息',
    icon: <Search className="w-5 h-5" />,
    color: 'text-warning',
  },
];

// ==================== 组件 ====================

export function SkillPanel({
  skills = DEFAULT_SKILLS,
  onSkillSelect,
  activeSkillId,
}: SkillPanelProps) {
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);

  const handleSkillClick = (skillId: string) => {
    if (expandedSkillId === skillId) {
      // 如果已展开，收起
      setExpandedSkillId(null);
    } else {
      // 展开技能
      setExpandedSkillId(skillId);
    }
  };

  const handleOperationSelect = (skillId: string, operation: string) => {
    onSkillSelect?.(skillId, operation);

    // 选择后收起
    setTimeout(() => {
      setExpandedSkillId(null);
    }, 300);
  };

  const hasOperations = (skill: SkillOption) =>
    skill.operations && skill.operations.length > 0;

  return (
    <div className="bg-bg-card border-t border-border">
      {/* 技能列表 - 横向滚动 */}
      <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1.5 shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-[13px] font-medium text-text-secondary font-primary">
            技能
          </span>
        </div>

        {skills.map((skill) => {
          const isActive = activeSkillId === skill.id;
          const isExpanded = expandedSkillId === skillId;

          return (
            <div key={skill.id} className="relative shrink-0">
              {/* 技能按钮 */}
              <button
                onClick={() => handleSkillClick(skill.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-bg-surface text-text-secondary hover:bg-border'
                }`}
              >
                <span className={isActive ? 'text-white' : skill.color}>
                  {skill.icon}
                </span>
                <span className="text-[13px] font-medium font-primary">
                  {skill.name}
                </span>
                {hasOperations(skill) && (
                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                )}
              </button>

              {/* 操作下拉菜单 */}
              {isExpanded && hasOperations(skill) && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setExpandedSkillId(null)}
                  />
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-border overflow-hidden z-20">
                    <div className="p-1">
                      {skill.operations!.map((operation) => (
                        <button
                          key={operation}
                          onClick={() => handleOperationSelect(skill.id, operation)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-bg-surface transition-colors text-left group"
                        >
                          <Check className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100" />
                          <span className="text-[13px] text-text-secondary font-primary">
                            {getOperationDisplayName(operation)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== 辅助函数 ====================

function getOperationDisplayName(operation: string): string {
  const operationNames: Record<string, string> = {
    archive_extract: '提取归档',
    brief_generate: '生成简报',
  };
  return operationNames[operation] || operation;
}
