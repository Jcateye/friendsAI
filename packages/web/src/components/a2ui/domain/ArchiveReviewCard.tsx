import { useState } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import { A2UIComponentProps, A2UIAction } from '../types';

interface ArchiveItem {
  id?: string;
  content: string;
  contactId?: string;
  contactRef?: string;
  citations?: Array<{ messageId: string; start?: number; end?: number }>;
}

interface ArchiveReviewCardProps {
  contacts?: ArchiveItem[];
  events?: ArchiveItem[];
  facts?: ArchiveItem[];
  todos?: ArchiveItem[];
  onConfirm?: (action: A2UIAction) => void;
  onEdit?: (action: A2UIAction) => void;
}

export function ArchiveReviewCard({ node, onAction }: A2UIComponentProps) {
  if (node.type !== 'custom' || node.name !== 'archive-review-card') {
    return null;
  }

  const props = (node.props || {}) as ArchiveReviewCardProps;
  const { contacts = [], events = [], facts = [], todos = [], onConfirm, onEdit } = props;

  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});

  const handleEdit = (item: ArchiveItem, category: string) => {
    const itemId = item.id || `${category}-${item.content}`;
    setEditingItem(itemId);
    setEditedContent((prev) => ({
      ...prev,
      [itemId]: item.content,
    }));
  };

  const handleSave = (item: ArchiveItem, category: string) => {
    const itemId = item.id || `${category}-${item.content}`;
    const newContent = editedContent[itemId] || item.content;
    
    if (onEdit && onAction) {
      onAction({
        type: 'custom',
        name: 'edit-archive-item',
        payload: {
          category,
          itemId: item.id,
          content: newContent,
        },
      });
    }
    
    setEditingItem(null);
  };

  const handleCancel = () => {
    setEditingItem(null);
  };

  const handleConfirm = () => {
    if (onConfirm && onAction) {
      onAction({
        type: 'custom',
        name: 'confirm-archive',
        payload: {
          contacts,
          events,
          facts,
          todos,
        },
      });
    }
  };

  const renderSection = (
    title: string,
    items: ArchiveItem[],
    category: string
  ) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-text-primary font-primary mb-2">
          {title} ({items.length})
        </h4>
        <div className="flex flex-col gap-2">
          {items.map((item, index) => {
            const itemId = item.id || `${category}-${index}`;
            const isEditing = editingItem === itemId;

            return (
              <div
                key={itemId}
                className="flex items-start gap-2 p-2 bg-bg-surface rounded-md"
              >
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editedContent[itemId] || item.content}
                      onChange={(e) =>
                        setEditedContent((prev) => ({
                          ...prev,
                          [itemId]: e.target.value,
                        }))
                      }
                      className="flex-1 px-2 py-1 text-sm border border-border rounded bg-bg-card text-text-primary"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSave(item, category)}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancel}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <p className="flex-1 text-sm text-text-primary font-primary">
                      {item.content}
                    </p>
                    <button
                      onClick={() => handleEdit(item, category)}
                      className="p-1 text-text-muted hover:text-text-primary"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      className="bg-bg-card rounded-md p-4 border border-border"
      style={node.style}
      id={node.id}
      data-testid={node.testId}
    >
      <h3 className="text-lg font-semibold text-text-primary font-display mb-4">
        归档审核
      </h3>

      {renderSection('联系人', contacts, 'contacts')}
      {renderSection('事件', events, 'events')}
      {renderSection('事实', facts, 'facts')}
      {renderSection('待办', todos, 'todos')}

      <div className="flex gap-2 mt-4 pt-4 border-t border-border">
        <button
          onClick={handleConfirm}
          className="flex-1 h-10 bg-primary text-white rounded-md font-medium font-primary hover:opacity-90"
        >
          确认应用
        </button>
        <button
          onClick={() => {
            if (onAction) {
              onAction({
                type: 'dismiss',
                label: '取消',
              });
            }
          }}
          className="flex-1 h-10 bg-bg-surface text-text-primary border border-border rounded-md font-medium font-primary hover:bg-bg-card"
        >
          取消
        </button>
      </div>
    </div>
  );
}



