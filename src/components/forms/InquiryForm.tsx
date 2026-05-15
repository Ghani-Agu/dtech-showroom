'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { submitInquiry, type InquiryActionResult } from '@/server/actions'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { cn } from '@/lib/utils'

interface InquiryFormProps {
  productSlug: string
}

const labelClasses = 'font-body text-sm font-medium text-text-secondary'
const fieldClasses =
  'w-full rounded-sm bg-surface-elevated px-4 py-3 font-body text-base text-text-primary placeholder:text-text-muted outline-none ring-0 focus:ring-1 focus:ring-accent'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <SecondaryButton as="button" type="submit" disabled={pending}>
      {pending ? 'Sending…' : 'Send to Dtech →'}
    </SecondaryButton>
  )
}

export function InquiryForm({ productSlug }: InquiryFormProps) {
  const [state, formAction] = useActionState<InquiryActionResult, FormData>(
    submitInquiry,
    null
  )
  // State is reserved for inline error display in a future phase;
  // for Phase 1 we rely on HTML5 native validation. Reading it once
  // also keeps the type-check honest about the binding.
  void state

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="productSlug" value={productSlug} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="fullName" className={labelClasses}>
            Your name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            placeholder="Yacine Benali"
            className={fieldClasses}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className={labelClasses}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={255}
            autoComplete="email"
            placeholder="you@example.com"
            className={fieldClasses}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="phone" className={labelClasses}>
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            minLength={6}
            maxLength={40}
            autoComplete="tel"
            placeholder="+213 ..."
            className={fieldClasses}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="company" className={labelClasses}>
            Company <span className="text-text-muted">(optional)</span>
          </label>
          <input
            id="company"
            name="company"
            type="text"
            maxLength={120}
            autoComplete="organization"
            className={fieldClasses}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="message" className={labelClasses}>
          How will you be using this?
        </label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={5}
          placeholder="A short note about intended use, volume, timing, configuration."
          className={cn(fieldClasses, 'resize-y')}
        />
      </div>

      <div className="pt-2">
        <Submit />
      </div>
    </form>
  )
}
