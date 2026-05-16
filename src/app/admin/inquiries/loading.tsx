export default function Loading() {
  return (
    <div className="min-h-screen bg-surface-base" aria-hidden="true">
      <div className="mx-auto max-w-[80rem] px-6 py-12 md:px-12 lg:px-16">
        {/* Breadcrumb */}
        <div className="h-4 w-64 rounded bg-surface-elevated" />

        {/* Header */}
        <div className="mt-12 space-y-3">
          <div className="h-4 w-40 rounded bg-surface-elevated" />
          <div className="h-10 w-1/3 rounded bg-surface-elevated" />
        </div>

        {/* Table rows */}
        <div className="mt-12 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-1 gap-4 rounded-md bg-surface-elevated p-6 md:grid-cols-[180px_1fr_auto]">
              <div className="space-y-2">
                <div className="h-3 w-32 rounded bg-surface-base" />
                <div className="h-3 w-16 rounded bg-surface-base" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-48 rounded bg-surface-base" />
                <div className="h-3 w-64 rounded bg-surface-base" />
                <div className="h-3 w-1/2 rounded bg-surface-base" />
                <div className="h-3 w-full rounded bg-surface-base" />
                <div className="h-3 w-3/4 rounded bg-surface-base" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
