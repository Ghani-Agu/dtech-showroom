import { getTranslations } from 'next-intl/server'
import { InquiryButton } from '@/components/ui/InquiryButton'

export default async function NotFound() {
  const t = await getTranslations('notFound')

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-surface-base px-8 py-16">
      <div className="mx-auto max-w-2xl space-y-6 text-center">
        <h1 className="font-display text-7xl font-medium leading-tight tracking-tight text-text-primary">
          404<span className="text-accent">.</span>
        </h1>
        <p className="font-body text-xl text-text-secondary">
          {t('heading')}
        </p>
        <p className="font-body text-base text-text-muted">
          {t('description')}
        </p>
        <div className="flex justify-center pt-4">
          <InquiryButton href="/">{t('action')}</InquiryButton>
        </div>
      </div>
    </div>
  )
}
