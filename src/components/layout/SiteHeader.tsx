'use client'

import { Suspense, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'framer-motion'
import { Logo } from '@/components/brand/Logo'
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher'
import { SearchInput } from '@/components/search/SearchInput'
import { Link, usePathname } from '@/i18n/routing'
import { duration, easing } from '@/lib/animations'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  const t = useTranslations('navigation')
  const tCommon = useTranslations('common')
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [lastPathname, setLastPathname] = useState(pathname)

  const primaryLinks = [
    { href: '/categories', label: t('categories') },
    { href: '/brands', label: t('brands') },
    { href: '/about', label: t('about') },
  ] as const

  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setOpen(false)
  }

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <header className="sticky top-0 z-40 border-b border-surface-elevated bg-surface-base/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[80rem] items-center gap-6 px-6 py-4 md:px-12 lg:px-16">
        <Link
          href="/"
          className="flex items-center gap-2 font-mono text-sm uppercase tracking-[0.16em] text-text-primary"
        >
          <Logo size="sm" priority />
          <span>DTECH</span>
        </Link>

        <nav className="hidden flex-1 items-center gap-6 lg:flex">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'font-body text-sm transition-colors hover:text-text-primary',
                pathname?.startsWith(link.href)
                  ? 'text-text-primary'
                  : 'text-text-secondary'
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="ml-auto w-72">
            <Suspense fallback={null}>
              <SearchInput />
            </Suspense>
          </div>
          <LocaleSwitcher />
          <Link
            href="/about#contact"
            className="group inline-flex items-baseline gap-2 font-body text-sm text-text-primary"
          >
            <span className="border-b border-text-muted pb-0.5 transition-colors group-hover:border-accent">
              {t('contactDtech')}
            </span>
            <span
              aria-hidden="true"
              className="text-accent transition-transform duration-200 group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="ml-auto inline-flex items-center justify-center lg:hidden"
          aria-label={open ? tCommon('close') : tCommon('open')}
          aria-expanded={open}
        >
          <span className="font-mono text-xs uppercase tracking-wider text-text-primary">
            {open ? tCommon('close') : tCommon('menu')}
          </span>
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration.fast }}
            className="fixed inset-0 top-0 z-50 bg-surface-base/80 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: duration.base, ease: easing.out }}
              className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col gap-8 border-l border-surface-elevated bg-surface-base px-8 py-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="flex items-center gap-2 font-mono text-sm uppercase tracking-[0.16em] text-text-primary"
                >
                  <Logo size="sm" />
                  <span>DTECH</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="font-mono text-xs uppercase tracking-wider text-text-primary"
                >
                  {tCommon('close')}
                </button>
              </div>
              <Suspense fallback={null}>
                <SearchInput />
              </Suspense>
              <nav className="flex flex-col gap-4">
                {primaryLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="font-display text-3xl text-text-primary"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/about#contact"
                  className="font-display text-3xl text-text-primary"
                >
                  {t('contactDtech')}
                  <span className="text-accent"> →</span>
                </Link>
                <div className="pt-4">
                  <LocaleSwitcher />
                </div>
              </nav>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  )
}
