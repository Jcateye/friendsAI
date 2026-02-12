import { Image, Video, Mic, FileText, Folder } from 'lucide-react';
import { Fragment } from 'react';

export type ToolMenuItemId = 'image' | 'video' | 'audio' | 'document' | 'file';

export interface ToolMenuItem {
  id: ToolMenuItemId;
  label: string;
  icon: typeof Image;
}

interface ToolsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tool: ToolMenuItemId) => void | Promise<void>;
  position?: { x: number; y: number };
}

const MENU_ITEMS: ToolMenuItem[] = [
  { id: 'image', label: '图片', icon: Image },
  { id: 'video', label: '视频', icon: Video },
  { id: 'audio', label: '音频', icon: Mic },
  { id: 'document', label: '文档', icon: FileText },
  { id: 'file', label: '文件', icon: Folder },
];

export function ToolsMenu({ isOpen, onClose, onSelect, position }: ToolsMenuProps) {
  if (!isOpen) return null;

  // 如果有传入位置，使用动态位置；否则使用默认位置
  const menuStyle = position
    ? {
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateY(-100%)', // 向上偏移完整高度，使菜单底部对齐按钮顶部
      }
    : {
        bottom: '100px',
        right: '16px',
      };

  return (
    <Fragment>
      {/* Scrim / Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu */}
      <div
        className="fixed z-50 w-[160px] rounded-xl border border-gray-200 bg-white p-2 shadow-lg"
        style={menuStyle}
        role="menu"
      >
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item.id);
                onClose();
              }}
              className="
                flex w-full items-center gap-2.5
                rounded-lg px-3 py-2.5
                text-[15px] font-medium text-gray-900
                transition-colors
                hover:bg-gray-100
                active:bg-gray-200
              "
              >
              <Icon className="h-5 w-5 text-gray-600" strokeWidth={2} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </Fragment>
  );
}
