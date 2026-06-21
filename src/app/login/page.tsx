import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { Logo } from '@/components/brand/Logo'
import LoginForm from './LoginForm'
import './login.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Connexion — Dtech',
  description: 'Connectez-vous pour gérer le catalogue Dtech.',
  robots: { index: false, follow: false },
}

export default async function LoginPage() {
  // Redirect if already signed in.
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)

  if (session) {
    redirect('/admin')
  }

  const dust = [
    { l: 6, d: 11, dl: 0 }, { l: 16, d: 14, dl: -3 }, { l: 27, d: 10, dl: -6 },
    { l: 38, d: 16, dl: -2 }, { l: 49, d: 12, dl: -8 }, { l: 58, d: 15, dl: -4 },
    { l: 67, d: 11, dl: -7 }, { l: 76, d: 13, dl: -1 }, { l: 86, d: 17, dl: -5 },
    { l: 93, d: 12, dl: -9 },
  ]

  return (
    <main className="lg-scene">
      <div className="lg-orb a" aria-hidden="true" />
      <div className="lg-orb b" aria-hidden="true" />
      <div className="lg-aurora" aria-hidden="true" />
      <div className="lg-grid" aria-hidden="true" />
      <div className="lg-dust" aria-hidden="true">
        {dust.map((p, i) => (
          <span
            key={i}
            style={{
              left: `${p.l}%`,
              animationDuration: `${p.d}s`,
              animationDelay: `${p.dl}s`,
            }}
          />
        ))}
      </div>
      <div className="lg-layout">
        <section className="lg-hello">
          <p className="lg-hello-kicker">D-Tech Algérie · Espace admin</p>
          <h2 className="lg-hello-title">
            Bienvenue chez
            <br />
            <span>D-Tech</span>.
          </h2>
          <p className="lg-hello-sub">
            Votre boutique, sous contrôle. Gérez le catalogue, les photos et
            les demandes clients — chaque changement est en ligne
            instantanément.
          </p>
          <ul className="lg-hello-points">
            <li>393 produits · 21 marques · 20 catégories</li>
            <li>Modifications visibles en temps réel sur le site</li>
            <li>Commandes clients via WhatsApp</li>
          </ul>
        </section>
      <div className="lg-wrap">
        <div className="lg-card">
          <div className="lg-logo">
            <Logo size="lg" priority />
          </div>
          <header>
            <p className="lg-kicker">Dtech Algérie · Admin</p>
            <h1 className="lg-title">
              Connexion<span>.</span>
            </h1>
            <p className="lg-sub">
              Gérez le catalogue, consultez les demandes, mettez à jour les
              produits.
            </p>
          </header>

          <LoginForm />
        </div>
        <p className="lg-foot">D-Tech Algérie · depuis 2006</p>
      </div>
      </div>
    </main>
  )
}
