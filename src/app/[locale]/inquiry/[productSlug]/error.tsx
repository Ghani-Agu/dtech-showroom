'use client'

import { RouteError } from '@/components/errors/RouteError'
import { CONTACT_EMAIL } from '@/lib/contact-info'

export default function InquiryError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // The one boundary where the fallback matters commercially: the visitor was
  // mid-enquiry, so the copy hands them a mailbox rather than only a retry.
  return (
    <RouteError {...props} scope="inquiry" href="/" values={{ email: CONTACT_EMAIL }} />
  )
}
