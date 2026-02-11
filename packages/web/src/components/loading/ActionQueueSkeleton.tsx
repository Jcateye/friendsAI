import { Skeleton } from './Skeleton'
import { ActionCardSkeleton } from './ActionCardSkeleton'

export function ActionQueueSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Tab Navigation */}
      <div className="flex border-b border-border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 px-4 py-3">
            <div className="flex items-center gap-1">
              <Skeleton variant="circular" width={16} height={16} />
              <Skeleton variant="text" width={50} height={14} />
              <Skeleton variant="rectangular" width={20} height={18} />
            </div>
            <Skeleton variant="text" width={60} height={11} />
          </div>
        ))}
      </div>

      {/* Queue Content Skeletons */}
      <div className="flex flex-col gap-3">
        <ActionCardSkeleton />
        <ActionCardSkeleton />
      </div>

      {/* Queue Summary */}
      <div className="flex items-center justify-between px-4 py-3 bg-bg-surface rounded-md">
        <Skeleton variant="text" width={100} height={13} />
        <Skeleton variant="text" width={80} height={13} />
      </div>
    </div>
  )
}
