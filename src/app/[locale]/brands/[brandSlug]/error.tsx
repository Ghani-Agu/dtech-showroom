'use client'

import { RouteError } from '@/components/errors/RouteError'

export default function BrandError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <RouteError {...props} scope="brand" href="/brands" />
}
