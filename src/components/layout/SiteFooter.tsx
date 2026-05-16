import Link from 'next/link'
import { EyebrowLabel } from '@/components/ui/EyebrowLabel'

const catalogLinks = [
  { href: '/categories', label: 'All categories' },
  { href: '/brands', label: 'All brands' },
  { href: '/search', label: 'Search' },
]

const companyLinks = [
  { href: '/about', label: 'About Dtech' },
  { href: '/about#contact', label: 'Contact' },
]

const legalLinks = [
  { href: '#', label: 'Terms' },
  { href: '#', label: 'Privacy' },
]

export function SiteFooter() {
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
              DTECH
            </p>
            <p className="max-w-xs font-body text-sm text-text-secondary">
              Distributor of HP, Dell, ASUS, TP-Link, and the in-house D-Tech line.
              Based in Algeria since 2006.
            </p>
          </div>

          <div className="space-y-4">
            <EyebrowLabel>CATALOG</EyebrowLabel>
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
            <EyebrowLabel>COMPANY</EyebrowLabel>
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
            <EyebrowLabel>CONTACT</EyebrowLabel>
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
            DTECH — HARDWARE TECHNOLOGY SERVICE · ALGÉRIE · EST. 2006
          </p>
          <p className="font-mono text-xs uppercase tracking-wider text-text-disabled">
            © {new Date().getFullYear()} Dtech Algérie
          </p>
        </div>
      </div>
    </footer>
  )
}
