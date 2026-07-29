'use client'

import { RouteError } from '@/components/errors/RouteError'

export default function CategoryError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <RouteError {...props} scope="category" href="/categories" />
}
