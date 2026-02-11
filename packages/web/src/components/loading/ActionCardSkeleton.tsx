import { Skeleton } from './Skeleton'

export function ActionCardSkeleton() {
  return (
    <div className="bg-bg-card rounded-lg overflow-hidden shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Skeleton variant="circular" width={16} height={16} />
          <Skeleton variant="text" width={60} height={14} />
          <Skeleton variant="rectangular" width={50} height={20} />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="text" width={50} height={12} />
          <Skeleton variant="text" width={60} height={12} />
        </div>
      </div>

      {/* Why Now */}
      <div className="mb-3">
        <Skeleton variant="text" width={60} height={12} className="mb-1" />
        <Skeleton variant="text" width="100%" height={14} />
        <Skeleton variant="text" width="80%" height={14} className="mt-1" />
      </div>

      {/* Draft Message */}
      <div className="mb-3">
        <Skeleton variant="text" width={60} height={12} className="mb-1" />
        <div className="p-3 bg-primary-tint rounded-md">
          <Skeleton variant="text" width="100%" height={14} />
          <Skeleton variant="text" width="90%" height={14} className="mt-1" />
          <Skeleton variant="text" width="70%" height={14} className="mt-1" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Skeleton variant="rectangular" width={60} height={32} />
        <Skeleton variant="rectangular" width={60} height={32} />
        <Skeleton variant="rectangular" width={60} height={32} />
      </div>
    </div>
  )
}
