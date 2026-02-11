import { Skeleton } from './Skeleton'

export function WeeklyPlanSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton variant="circular" width={20} height={20} />
          <Skeleton variant="text" width={60} height={16} />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Skeleton variant="circular" width={16} height={16} />
            <Skeleton variant="text" width={40} height={13} />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton variant="circular" width={16} height={16} />
            <Skeleton variant="text" width={40} height={13} />
          </div>
        </div>
      </div>

      {/* Week Days Skeleton */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 bg-bg-card rounded-md">
            {/* Day Label */}
            <div className="w-12">
              <Skeleton variant="text" width={30} height={13} />
            </div>

            {/* Action Preview */}
            <div className="flex-1">
              <Skeleton variant="text" width="60%" height={13} className="mb-1" />
              <Skeleton variant="text" width="40%" height={13} />
              <div className="flex items-center gap-2 mt-2">
                <Skeleton variant="rectangular" width="100%" height={6} className="flex-1" />
                <Skeleton variant="text" width={50} height={11} />
              </div>
            </div>

            {/* Goal Badge */}
            <Skeleton variant="rectangular" width={40} height={18} />
          </div>
        ))}
      </div>
    </div>
  )
}
