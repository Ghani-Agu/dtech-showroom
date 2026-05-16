import { Card } from '@/components/admin/ui/Card'
import { Skeleton } from '@/components/admin/ui/Skeleton'

export default function CategoriesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Skeleton className="mb-2 h-3 w-20" />
          <Skeleton className="h-8 w-40" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <Card>
        <ul className="divide-y divide-surface-overlay">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
