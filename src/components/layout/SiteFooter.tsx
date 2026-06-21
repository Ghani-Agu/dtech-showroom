import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { Logo } from '@/components/brand/Logo'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'
import { NewsletterSignup } from '@/components/forms/NewsletterSignup'

export async function SiteFooter() {
  const t = await getTranslations('navigation')
  const tFooter = await getTranslations('footer')
  const tCommon = await getTranslations('common')
  const tProducts = await getTranslations('products')

  const legalLinks = [
    { href: '/legal#mentions', label: tFooter('legalNotice') },
    { href: '/legal#cgv', label: tFooter('terms') },
    { href: '/legal#privacy', label: tFooter('privacy') },
  ]

  const catalogLinks = [
    { href: '/products', label: tProducts('pageTitle') },
    { href: '/categories', label: t('categories') },
    { href: '/brands', label: t('brands') },
    { href: '/search', label: tCommon('search') },
  ]

  const companyLinks = [
    { href: '/about', label: t('about') },
    { href: '/about#contact', label: t('contactDtech') },
  ]

  return (
    <footer
      id="contact"
      className="mt-24 border-t border-surface-elevated bg-surface-base"
    >
      <div className="mx-auto w-full max-w-[80rem] px-6 py-16 md:px-12 lg:px-16">
        {/* Newsletter — full-width strip above the link columns. Mobile-first:
            stacks naturally, keeps the input full-width with a thumb-friendly
            CTA. Matches the footer's surface tokens so it reads as integrated,
            not bolted on. */}
        <div className="mb-14 rounded-2xl border border-surface-elevated bg-surface-base-plus/40 px-5 py-7 md:px-8 md:py-9">
          <NewsletterSignup variant="inline" source="footer" />
        </div>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center" data-scroll-wordmark>
              <Logo size="lg" />
            </div>
            <p className="max-w-xs font-body text-sm text-text-secondary">
              {tFooter('tagline')}
            </p>
          </div>

          <div className="space-y-4">
            <EyebrowLabel>{t('catalog').toUpperCase()}</EyebrowLabel>
            <ul className="space-y-2">
              {catalogLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-body text-sm text-text-secondary transition-colors hover:text-text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <EyebrowLabel>{t('about').toUpperCase()}</EyebrowLabel>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-body text-sm text-text-secondary transition-colors hover:text-text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <ul className="space-y-2 pt-2">
                  {legalLinks.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="font-body text-sm text-text-disabled transition-colors hover:text-text-secondary"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <EyebrowLabel>{t('contactDtech').toUpperCase()}</EyebrowLabel>
            <ul className="space-y-2 font-body text-sm text-text-secondary">
              <li>
                <a
                  href="mailto:contact@dtech.dz"
                  className="transition-colors hover:text-text-primary"
                >
                  contact@dtech.dz
                </a>
              </li>
              <li>
                <a
                  href="tel:+213560990506"
                  className="transition-colors hover:text-text-primary"
                >
                  {tFooter('commercial')} · 0560 99 05 06
                </a>
              </li>
              <li>
                <a
                  href="tel:+213561616911"
                  className="transition-colors hover:text-text-primary"
                >
                  {tFooter('sav')} · 0561 616 911
                </a>
              </li>
              <li>
                {tFooter('addressLine1')}
                <br />
                {tFooter('addressLine2')}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-surface-elevated pt-8 md:flex-row md:items-center md:justify-between">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
            {tFooter('established')}
          </p>
          <p className="font-mono text-xs uppercase tracking-wider text-text-disabled">
            {tFooter('copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  )
}
