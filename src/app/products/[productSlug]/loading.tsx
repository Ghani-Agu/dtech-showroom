export default function Loading() {
  return (
    <div className="min-h-screen bg-surface-base" aria-hidden="true">
      <div className="mx-auto max-w-[80rem] px-6 py-12 md:px-12 lg:px-16">
        {/* Breadcrumb */}
        <div className="h-4 w-64 rounded bg-surface-elevated" />

        {/* Stage */}
        <div className="mt-8 aspect-[4/3] w-full rounded-md bg-surface-elevated md:aspect-video" />

        {/* Title + tagline */}
        <div className="mt-12 space-y-3">
          <div className="h-12 w-3/4 rounded bg-surface-elevated" />
          <div className="h-6 w-1/2 rounded bg-surface-elevated" />
        </div>

        {/* Body */}
        <div className="mt-8 space-y-2">
          <div className="h-4 w-full rounded bg-surface-elevated" />
          <div className="h-4 w-full rounded bg-surface-elevated" />
          <div className="h-4 w-2/3 rounded bg-surface-elevated" />
        </div>

        {/* Specs */}
        <div className="mt-12 space-y-3 rounded-md bg-surface-elevated p-8">
          <div className="h-4 w-1/3 rounded bg-surface-base" />
          <div className="h-4 w-1/2 rounded bg-surface-base" />
          <div className="h-4 w-1/3 rounded bg-surface-base" />
          <div className="h-4 w-1/2 rounded bg-surface-base" />
        </div>
      </div>
    </div>
  )
}
