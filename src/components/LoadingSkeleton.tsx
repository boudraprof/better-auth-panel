import { Skeleton } from '#/components/ui/skeleton'

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex-1 min-w-0">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
          <Skeleton className="h-8 w-16 ml-3" />
        </div>
      ))}
    </div>
  )
}
