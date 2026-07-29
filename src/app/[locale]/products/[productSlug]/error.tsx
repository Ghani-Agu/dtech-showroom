'use client'

import { RouteError } from '@/components/errors/RouteError'

export default function ProductError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <RouteError {...props} scope="product" href="/categories" />
}
