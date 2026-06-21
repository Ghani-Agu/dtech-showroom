'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Calendar, LogOut, Moon, Search, Shield, Sun } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

const SECTIONS: Record<string, { title: string; sub: string }> = {
  admin: {
    title: 'Tableau de bord',
    sub: "Suivez le catalogue, les demandes et l'activité du site.",
  },
  inquiries: {
    title: 'Demandes',
    sub: 'Consultez et traitez les demandes des clients.',
  },
  products: {
    title: 'Produits',
    sub: 'Ajoutez, modifiez, masquez ou supprimez les produits du site.',
  },
  brands: {
    title: 'Marques',
    sub: 'Gérez les marques distribuées par D-Tech.',
  },
  categories: {
    title: 'Catégories',
    sub: 'Organisez les familles de produits du catalogue.',
  },
  users: {
    title: 'Utilisateurs',
    sub: "Gérez les accès de l'équipe à cet espace.",
  },
  settings: {
    title: 'Réglages',
    sub: 'Votre profil, mot de passe et préférences.',
  },
  editor: {
    title: 'Éditeur web',
    sub: 'Composez vos pages avec des blocs glissés-déposés.',
  },
  themes: {
    title: 'Thèmes',
    sub: 'Habillez la boutique en un clic, sans changer le contenu.',
  },
  guide: {
    title: 'Catalogue & guide',
    sub: 'Apprenez chaque section et chaque réglage de l’éditeur.',
  },
  subscribers: {
    title: 'Abonnés',
    sub: 'La liste de la newsletter D-Tech : confirmés, en attente, désinscrits.',
  },
  campaigns: {
    title: 'Campagnes',
    sub: 'Rédigez, prévisualisez et envoyez vos e-mails aux abonnés.',
  },
}

const DEFAULT_SECTION = {
  title: 'Tableau de bord',
  sub: "Suivez le catalogue, les demandes et l'activité du site.",
}

function sectionFromPathname(pathname: string) {
  if (pathname === '/admin') return DEFAULT_SECTION
  const after = pathname.split('/').filter(Boolean)[1] ?? 'admin'
  return SECTIONS[after] ?? DEFAULT_SECTION
}

export interface AdminTopbarProps {
  className?: string
  /** Display name passed from the server layout (session). */
  userName?: string
}

export function AdminTopbar({ className, userName }: AdminTopbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const section = sectionFromPathname(pathname)

  // Light/white mode — html[data-admin-theme] is the source of truth.
  const [light, setLight] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from the pre-paint attribute
    setLight(document.documentElement.dataset.adminTheme === 'light')
  }, [])
  function toggleTheme() {
    setLight((v) => {
      const next = !v
      if (next) document.documentElement.dataset.adminTheme = 'light'
      else delete document.documentElement.dataset.adminTheme
      try {
        localStorage.setItem('admin-theme', next ? 'light' : 'dark')
      } catch {
        /* private mode */
      }
      return next
    })
  }

  // Date rendered after mount only — avoids SSR/CSR locale mismatch.
  const [today, setToday] = useState('')
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only date
    setToday(
      new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    )
  }, [])

  function handleSignOut() {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push('/login'),
      },
    })
  }

  return (
    <div className={cn('px-8 pt-8', className)}>
      <header className="glass-surface flex flex-wrap items-center gap-x-6 gap-y-4 px-7 py-5">
        {/* Left — system kicker + page title + subtitle */}
        <div className="min-w-0 flex-1">
          <p
            className="flex items-center gap-2 font-mono text-[10.5px] uppercase"
            style={{ color: 'var(--admin-cyan)', letterSpacing: '2.5px' }}
          >
            <span
              aria-hidden="true"
              className="inline-block size-1.5 rounded-full"
              style={{
                background: 'var(--admin-cyan)',
                boxShadow: '0 0 8px rgba(124,224,195,0.9)',
              }}
            />
            D-Tech Algérie · Gestion du site
          </p>
          <h1 className="mt-1.5 truncate font-display text-[26px] font-light tracking-tight text-white">
            {section.title}
          </h1>
          <p
            className="mt-0.5 truncate font-body text-[13px]"
            style={{ color: 'var(--admin-text-secondary)' }}
          >
            {section.sub}
          </p>
        </div>

        {/* Right — date chip · agent chip · logout */}
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="hidden items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest lg:inline-flex"
            style={{
              borderColor: 'var(--admin-glass-border)',
              color: 'var(--admin-text-tertiary)',
            }}
          >
            <Search size={11} />
            Ctrl K
          </span>

          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={light}
            aria-label={light ? 'Passer en mode sombre' : 'Passer en mode clair'}
            title={light ? 'Mode sombre' : 'Mode clair'}
            className="inline-flex size-10 items-center justify-center rounded-2xl border transition-colors hover:border-[color-mix(in_oklab,var(--c-mint)_50%,transparent)]"
            style={{
              borderColor: 'var(--admin-glass-border)',
              color: 'var(--c-mint)',
              background: 'color-mix(in oklab, var(--c-mint) 8%, transparent)',
            }}
          >
            {light ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          <div
            className="flex items-center gap-3 rounded-2xl border px-4 py-2.5"
            style={{ borderColor: 'var(--admin-glass-border)' }}
          >
            <span
              className="flex size-9 items-center justify-center rounded-xl"
              style={{
                background: 'rgba(124,224,195,0.10)',
                border: '1px solid rgba(124,224,195,0.3)',
                color: 'var(--admin-cyan)',
              }}
            >
              <Calendar size={15} strokeWidth={1.75} />
            </span>
            <span className="hidden sm:block">
              <span
                className="block font-mono text-[9.5px] uppercase tracking-[2px]"
                style={{ color: 'var(--admin-text-tertiary)' }}
              >
                Aujourd&apos;hui
              </span>
              <span className="block font-body text-[13px] font-medium capitalize text-white">
                {today || '—'}
              </span>
            </span>
          </div>

          <div
            className="flex items-center gap-3 rounded-2xl border px-4 py-2.5"
            style={{ borderColor: 'var(--admin-glass-border)' }}
          >
            <span
              className="flex size-9 items-center justify-center rounded-xl"
              style={{
                background: 'rgba(124,224,195,0.10)',
                border: '1px solid rgba(124,224,195,0.3)',
                color: 'var(--admin-cyan)',
              }}
            >
              <Shield size={15} strokeWidth={1.75} />
            </span>
            <span className="hidden sm:block">
              <span
                className="block font-mono text-[9.5px] uppercase tracking-[2px]"
                style={{ color: 'var(--admin-text-tertiary)' }}
              >
                Connecté
              </span>
              <span className="block max-w-[160px] truncate font-body text-[13px] font-semibold text-white">
                {userName ?? 'Admin'}
              </span>
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="ml-1 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-body text-[12.5px] font-medium transition-colors hover:border-[rgba(124,224,195,0.5)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(124,224,195,0.5)]"
              style={{
                borderColor: 'var(--admin-glass-border-strong)',
                color: 'var(--admin-text-secondary)',
              }}
            >
              <LogOut size={13} />
              Déconnexion
            </button>
          </div>
        </div>
      </header>
    </div>
  )
}
