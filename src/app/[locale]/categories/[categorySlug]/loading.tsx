export default function Loading() {
  return (
    <div className="min-h-screen bg-surface-base" aria-hidden="true">
      <div className="mx-auto max-w-[80rem] px-6 py-12 md:px-12 lg:px-16">
        {/* Breadcrumb */}
        <div className="h-4 w-64 rounded bg-surface-elevated" />

        {/* Hero */}
        <div className="mt-12 aspect-[16/7] w-full rounded-md bg-surface-elevated" />

        {/* Category name + description */}
        <div className="mt-8 space-y-3">
          <div className="h-12 w-1/3 rounded bg-surface-elevated" />
          <div className="h-6 w-2/3 rounded bg-surface-elevated" />
        </div>

        {/* Product grid */}
        <div className="mt-16 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-6 2xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-md bg-surface-elevated p-2">
              <div className="aspect-[4/3] w-full rounded-sm bg-surface-base" />
              <div className="space-y-2 px-2 pb-3 pt-1">
                <div className="h-4 w-3/4 rounded bg-surface-base" />
                <div className="h-3 w-1/2 rounded bg-surface-base" />
                <div className="h-3 w-2/3 rounded bg-surface-base" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
