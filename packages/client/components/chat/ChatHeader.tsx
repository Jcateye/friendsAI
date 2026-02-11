import { Menu, MoreVertical } from 'lucide-react';
import { useChatStore } from '@/stores/chat';
import type { Contact } from '@/types';

interface ChatHeaderProps {
  contact: Contact | null;
}

export function ChatHeader({ contact }: ChatHeaderProps) {
  const toggleDrawer = useChatStore((state) => state.toggleDrawer);

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-[#F5F5F7] px-5">
      <button
        onClick={toggleDrawer}
        className="flex h-6 w-6 items-center justify-center text-gray-900"
        aria-label="Open contacts"
      >
        <Menu className="h-6 w-6" />
      </button>

      <h1 className="text-base font-semibold text-gray-900">
        {contact?.name || '新联系人'}
      </h1>

      <button
        className="flex h-6 w-6 items-center justify-center text-gray-900"
        aria-label="More options"
      >
        <MoreVertical className="h-6 w-6" />
      </button>
    </header>
  );
}
