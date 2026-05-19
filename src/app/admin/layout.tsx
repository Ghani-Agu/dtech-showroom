import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { AdminShell } from '@/components/admin-v2/layout/AdminShell'
import { Toaster } from '@/components/admin-v2/ui'

export const metadata: Metadata = {
  title: 'Admin · Dtech',
  robots: { index: false, follow: false },
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)

  if (!session) {
    redirect('/login?redirect=/admin')
  }

  return (
    <>
      <AdminShell>{children}</AdminShell>
      <Toaster />
    </>
  )
}
