import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getPublishedDesign, getDraftDesign } from '@/server/editor-page-data'
import { ApparenceManager } from '@/components/admin/apparence/ApparenceManager'

export const metadata: Metadata = {
  title: 'Apparence · Dtech Admin',
  robots: { index: false, follow: false },
}

export default async function AdminApparencePage() {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)

  if (!session) {
    redirect('/login?redirect=/admin/apparence')
  }

  const [live, draft] = await Promise.all([
    getPublishedDesign(),
    getDraftDesign(),
  ])

  return (
    <div className="space-y-8">
      <header>
        <p
          className="font-mono text-[11px] uppercase"
          style={{ color: 'var(--admin-text-tertiary)', letterSpacing: '2px' }}
        >
          Apparence
        </p>
        <h1 className="mt-2 font-display text-3xl font-light tracking-tight text-white">
          Design du site.
        </h1>
        <p className="mt-2 max-w-prose font-body text-sm text-[var(--admin-text-secondary)]">
          Choisissez le design affiché aux visiteurs, puis mettez-le en ligne.
          Les deux designs partagent les mêmes produits, le même catalogue et le
          même back-office&nbsp;: seule l’interface change.
        </p>
      </header>

      <ApparenceManager live={live} initialSelected={draft} />
    </div>
  )
}
