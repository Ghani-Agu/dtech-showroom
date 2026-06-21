import { Card } from '@/components/admin/ui/Card'
import { Skeleton } from '@/components/admin/ui/Skeleton'

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="mb-2 h-3 w-20" />
        <Skeleton className="h-8 w-40" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="mb-3 h-3 w-16" />
            <Skeleton className="h-8 w-12" />
          </Card>
        ))}
      </div>

      <Card>
        <div className="border-b border-white/[0.08] px-6 py-4">
          <Skeleton className="h-4 w-32" />
        </div>
        <ul className="divide-y divide-white/[0.06]">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-3 w-12" />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
