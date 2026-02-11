import { X, Plus } from 'lucide-react';
import { useChatStore } from '@/stores/chat';

interface ContactsDrawerProps {
  onAddContact: () => void;
}

export function ContactsDrawer({ onAddContact }: ContactsDrawerProps) {
  const { isDrawerOpen, setDrawerOpen, contacts, activeContactId, setActiveContact } =
    useChatStore();

  if (!isDrawerOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={() => setDrawerOpen(false)}
      />

      <aside className="fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col border-r border-gray-200 bg-white">
        <header className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          <h2 className="text-base font-semibold text-gray-900">联系人</h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center text-blue-500"
              aria-label="Add contact"
              onClick={onAddContact}
            >
              <Plus className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="flex h-6 w-6 items-center justify-center text-gray-400"
              aria-label="Close drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-2">
          {contacts.map((contact) => {
            const isActive = contact.id === activeContactId;

            return (
              <button
                type="button"
                key={contact.id}
                onClick={() => setActiveContact(contact.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                  isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
              >
                <div
                  className="flex h-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: contact.avatarColor }}
                >
                  {contact.name.charAt(0).toUpperCase()}
                </div>

                <span className="flex-1 truncate text-sm font-medium text-gray-900">
                  {contact.name}
                </span>
              </button>
            );
          })}

          {contacts.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-400">暂无联系人</div>
          )}
        </div>
      </aside>
    </>
  );
}
