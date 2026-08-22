import { Skeleton } from '#/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '#/components/ui/card'

export function DashboardSkeleton() {
  return (
    <div className="h-full p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 p-4">
              <Skeleton className="size-5 rounded" />
              <div>
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-3 w-16 mt-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Header skeleton */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Skeleton className="h-9 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* User list skeleton */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-20" />
          </div>
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-37" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-4" />
                  <div>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48 mt-1" />
                  </div>
                </div>
                <div className="flex gap-1">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

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

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 sm:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-3 p-4">
            <Skeleton className="size-5 rounded" />
            <div>
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-16 mt-1" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
