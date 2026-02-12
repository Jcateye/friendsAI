import { Grid } from 'lucide-react';

interface FeishuBitableButtonProps {
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export function FeishuBitableButton({
  selected = false,
  onClick,
  disabled = false,
}: FeishuBitableButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        flex h-7 w-[77px] items-center justify-center gap-1 rounded-[6px]
        font-medium text-[12px] transition-all
        ${
          selected
            ? 'bg-[#E3F2FD] border-2 border-[#007AFF]'
            : 'bg-gray-100 border-2 border-transparent hover:bg-gray-200'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      aria-label="飞书多维表"
    >
      <Grid
        className={`h-[18px] w-[18px] shrink-0 ${selected ? 'text-[#4381F1]' : 'text-gray-600'}`}
        strokeWidth={2}
      />
      <span className={selected ? 'text-[#2D62B5]' : 'text-gray-700'}>多维表</span>
    </button>
  );
}
