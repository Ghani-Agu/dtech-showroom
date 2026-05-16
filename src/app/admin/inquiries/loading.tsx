import { Card } from '@/components/admin/ui/Card'
import { Skeleton } from '@/components/admin/ui/Skeleton'

export default function InquiriesLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="mb-2 h-3 w-20" />
        <Skeleton className="h-8 w-56" />
      </div>

      <div className="flex items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-md" />
        ))}
      </div>

      <Card>
        <ul className="divide-y divide-surface-overlay">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="px-6 py-4">
              <Skeleton className="mb-2 h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
