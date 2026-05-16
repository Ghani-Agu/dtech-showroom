import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'

const legalLinks = [
  { href: '#', label: 'Terms' },
  { href: '#', label: 'Privacy' },
]

export async function SiteFooter() {
  const t = await getTranslations('navigation')
  const tFooter = await getTranslations('footer')
  const tCommon = await getTranslations('common')

  const catalogLinks = [
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
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <p
              className="font-mono text-sm uppercase tracking-[0.16em] text-text-primary"
              data-scroll-wordmark
            >
              {tFooter('wordmark')}
            </p>
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
              <li>contact@d-techalgerie.com</li>
              <li>+213 0 00 00 00 00</li>
              <li>
                Dtech Algérie
                <br />
                Alger, Algeria
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
