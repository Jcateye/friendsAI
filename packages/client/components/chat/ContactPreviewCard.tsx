import type { ContactCard } from '@/types';
import { Mail, Phone, Building2, Briefcase, Tag } from 'lucide-react';

interface ContactPreviewCardProps {
  card: ContactCard;
  pendingConfirmation?: boolean;
  onConfirm?: () => void;
  onDismiss?: () => void;
}

export function ContactPreviewCard({
  card,
  pendingConfirmation = false,
  onConfirm,
  onDismiss,
}: ContactPreviewCardProps) {
  return (
    <div className="mx-2 my-2 rounded-[16px] border border-gray-200 bg-white p-4">
      <div className="space-y-3">
        {/* Name */}
        {card.name && (
          <div>
            <h4 className="text-base font-semibold text-gray-900">
              {card.name}
            </h4>
          </div>
        )}

        {/* Contact Info */}
        <div className="space-y-2 text-sm text-gray-600">
          {card.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span>{card.email}</span>
            </div>
          )}
          {card.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span>{card.phone}</span>
            </div>
          )}
          {card.company && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span>{card.company}</span>
            </div>
          )}
          {card.title && (
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 flex-shrink-0" />
              <span>{card.title}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {card.tags && card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {card.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Notes */}
        {card.notes && (
          <div className="rounded-lg bg-gray-50 p-2 text-sm text-gray-600">
            {card.notes}
          </div>
        )}

        {pendingConfirmation && (
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-full bg-[#007AFF] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-600"
            >
              确认添加联系人
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              暂不添加
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
