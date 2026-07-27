'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

export function ShowroomFooter() {
  const t = useTranslations('showroom.footer')
  const tNav = useTranslations('showroom.nav')
  const tFooter = useTranslations('footer')
  return (
    <footer className="sr-footer">
      <div className="sr-wrap">
        <div className="cols">
          <div>
            <span className="sr-wordmark" style={{ marginBottom: 12, display: 'inline-flex' }}>
              <span className="name">
                D-Tech<span className="dot">.</span>
              </span>
              <small>Algérie · {new Date().getFullYear()}</small>
            </span>
            <p className="sr-sub" style={{ fontSize: 13.5, marginTop: 10 }}>{t('blurb')}</p>
          </div>
          <div>
            <h4>{tNav('catalog')}</h4>
            <ul>
              <li><Link href="/products">{t('allProducts')}</Link></li>
              <li><Link href="/categories">{tNav('categories')}</Link></li>
              <li><Link href="/brands">{tNav('brands')}</Link></li>
              <li><Link href="/search">{tNav('search')}</Link></li>
            </ul>
          </div>
          <div>
            <h4>{t('service')}</h4>
            <ul>
              <li><Link href="/about">{tNav('about')}</Link></li>
              <li><Link href="/legal#mentions">{tFooter('legalNotice')}</Link></li>
              <li><Link href="/legal#cgv">{tFooter('terms')}</Link></li>
              <li><Link href="/legal#privacy">{tFooter('privacy')}</Link></li>
            </ul>
          </div>
          <div>
            <h4>{t('contact')}</h4>
            <ul>
              <li><a href="mailto:contact@dtech.dz">contact@dtech.dz</a></li>
              <li><a href="tel:+213560990506">{tFooter('commercial')} · 0560 99 05 06</a></li>
              <li><a href="tel:+213561616911">{tFooter('sav')} · 0561 616 911</a></li>
              <li>
                {tFooter('addressLine1')}, {tFooter('addressLine2')}
              </li>
            </ul>
          </div>
        </div>
        <div className="base">
          <span className="sr-mono">{tFooter('established')}</span>
          <span className="sr-mono">{tFooter('copyright', { year: new Date().getFullYear() })}</span>
        </div>
      </div>
    </footer>
  )
}
