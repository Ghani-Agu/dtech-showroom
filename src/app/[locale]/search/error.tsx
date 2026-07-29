'use client'

import { RouteError } from '@/components/errors/RouteError'

export default function SearchError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <RouteError {...props} scope="search" href="/categories" />
}
