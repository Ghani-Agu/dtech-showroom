'use client'

import { Suspense, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher'
import { SearchInput } from '@/components/search/SearchInput'
import { Link, usePathname, useRouter } from '@/i18n/routing'
import { duration, easing } from '@/lib/animations'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  const t = useTranslations('navigation')
  const tCommon = useTranslations('common')
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [lastPathname, setLastPathname] = useState(pathname)

  const primaryLinks = [
    { href: '/products', label: t('catalog') },
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

  // Full-width glassy header on every route. Home is `fixed` so the
  // hero stays full-bleed behind it; non-home is `sticky` so content
  // flows naturally underneath without needing per-page top padding.
  // Both branches share the same glass + border + full-width treatment.
  const isHome = pathname === '/'
  const headerPositionClass = isHome
    ? 'fixed inset-x-0 top-0'
    : 'sticky top-0'

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = searchValue.trim()
    if (q.length === 0) return
    router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <header
      className={cn(
        headerPositionClass,
        'z-50 border-b border-white/[0.06] bg-[#050308]/80 backdrop-blur-[12px]'
      )}
    >
      <div className="flex h-16 w-full items-center gap-6 px-6 lg:px-10">
        <Link
          href="/"
          className="flex items-center text-text-primary"
          aria-label="Dtech home"
        >
          <Logo size="md" priority />
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
          {/* Glassy pill-shaped search with leading icon — bigger and
              more pronounced than the prior SearchInput. Submits on
              Enter to /search?q=... */}
          <form
            role="search"
            onSubmit={handleSearchSubmit}
            className="relative ml-auto w-full max-w-[420px]"
          >
            <label htmlFor="site-header-search" className="sr-only">
              {tCommon('search')}
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
            />
            <input
              id="site-header-search"
              type="search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={tCommon('searchPlaceholder')}
              className="h-11 w-full rounded-full border border-white/[0.08] bg-white/[0.04] pl-11 pr-4 text-sm text-white placeholder:text-white/40 backdrop-blur-[20px] backdrop-saturate-[180%] transition-all duration-200 focus:border-cyan-400/40 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
            />
          </form>
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
                  className="flex items-center text-text-primary"
                  aria-label="Dtech home"
                >
                  <Logo size="md" />
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
