'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { SearchInput } from '@/components/search/SearchInput'
import { duration, easing } from '@/lib/animations'
import { cn } from '@/lib/utils'

const primaryLinks = [
  { href: '/categories', label: 'Categories' },
  { href: '/brands', label: 'Brands' },
  { href: '/about', label: 'About' },
]

export function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [lastPathname, setLastPathname] = useState(pathname)

  // Close mobile menu when route changes (adjust state during render).
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

  return (
    <header className="sticky top-0 z-40 border-b border-surface-elevated bg-surface-base/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[80rem] items-center gap-6 px-6 py-4 md:px-12 lg:px-16">
        <Link
          href="/"
          className="font-mono text-sm uppercase tracking-[0.16em] text-text-primary"
        >
          DTECH
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
          <Link
            href="/about#contact"
            className="group inline-flex items-baseline gap-2 font-body text-sm text-text-primary"
          >
            <span className="border-b border-text-muted pb-0.5 transition-colors group-hover:border-accent">
              Contact Dtech
            </span>
            <span aria-hidden="true" className="text-accent transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="ml-auto inline-flex items-center justify-center lg:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <span className="font-mono text-xs uppercase tracking-wider text-text-primary">
            {open ? 'Close' : 'Menu'}
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
                  className="font-mono text-sm uppercase tracking-[0.16em] text-text-primary"
                >
                  DTECH
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="font-mono text-xs uppercase tracking-wider text-text-primary"
                >
                  Close
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
                  Contact Dtech<span className="text-accent"> →</span>
                </Link>
              </nav>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  )
}
