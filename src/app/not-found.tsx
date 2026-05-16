import { InquiryButton } from '@/components/ui/InquiryButton'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-surface-base px-8 py-16">
      <div className="mx-auto max-w-2xl space-y-6 text-center">
        <h1 className="font-display text-7xl font-medium tracking-tight text-text-primary leading-tight">
          404<span className="text-accent">.</span>
        </h1>
        <p className="font-body text-xl text-text-secondary">
          This page isn&apos;t in the catalog.
        </p>
        <div className="flex justify-center pt-4">
          <InquiryButton href="/">Return to the floor</InquiryButton>
        </div>
      </div>
    </div>
  )
}
