'use client'

/**
 * HeroEditor — manage the homepage slider hero: upload/reorder slide images,
 * edit the heading/subtitle/buttons, then save a draft or publish live.
 * Self-contained; uses the admin-shell tokens for styling.
 */
import React, { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ChevronLeft, ExternalLink, Upload, Trash2, ArrowUp, ArrowDown, Rocket, Check, ImagePlus,
} from 'lucide-react'
import {
  uploadHeroImage, saveHeroDraft, publishHero, unpublishHero,
} from '@/server/hero-actions'
import type { HeroConfig, HeroSlide } from '@/components/home/hero-config'
import './editor.css'

const EMPTY: HeroConfig = { slides: [] }

export function HeroEditor({
  initial,
  initiallyPublished,
  uiClass = '',
}: {
  initial: HeroConfig | null
  initiallyPublished: boolean
  uiClass?: string
}) {
  const [cfg, setCfg] = useState<HeroConfig>(initial ?? EMPTY)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [published, setPublished] = useState(initiallyPublished)
  const [active, setActive] = useState(0)

  const fileRef = React.useRef<HTMLInputElement>(null)

  function patch(p: Partial<HeroConfig>) {
    setCfg((c) => ({ ...c, ...p }))
  }
  function setSlides(slides: HeroSlide[]) {
    setCfg((c) => ({ ...c, slides }))
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const next: HeroSlide[] = [...cfg.slides]
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', file)
        const r = await uploadHeroImage(fd)
        if (r.ok) next.push({ src: r.url, alt: '' })
        else toast.error(r.error ?? "Échec de l'envoi")
      }
      setSlides(next)
      toast.success('Image(s) ajoutée(s)')
    } finally {
      setUploading(false)
    }
  }

  function removeSlide(i: number) {
    setSlides(cfg.slides.filter((_, idx) => idx !== i))
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= cfg.slides.length) return
    const next = [...cfg.slides]
    ;[next[i], next[j]] = [next[j]!, next[i]!]
    setSlides(next)
  }
  function setAlt(i: number, alt: string) {
    setSlides(cfg.slides.map((s, idx) => (idx === i ? { ...s, alt } : s)))
  }

  async function doSave() {
    setBusy(true)
    try {
      const r = await saveHeroDraft(cfg)
      if (r.ok) toast.success('Brouillon enregistré')
      else toast.error(r.error ?? 'Échec')
    } finally {
      setBusy(false)
    }
  }
  async function doPublish() {
    setBusy(true)
    try {
      const r = await publishHero(cfg)
      if (r.ok) {
        setPublished(true)
        toast.success('Hero publié — en ligne sur la page d’accueil')
      } else toast.error(r.error ?? 'Échec')
    } finally {
      setBusy(false)
    }
  }
  async function doUnpublish() {
    if (!confirm('Dépublier le hero ? La page d’accueil reprendra le slider par défaut (produits en vedette).')) return
    setBusy(true)
    try {
      const r = await unpublishHero()
      if (r.ok) {
        setPublished(false)
        toast.success('Hero dépublié')
      } else toast.error(r.error ?? 'Échec')
    } finally {
      setBusy(false)
    }
  }

  const field = (
    label: string,
    key: keyof HeroConfig,
    placeholder = ''
  ) => (
    <label className="he-field">
      <span>{label}</span>
      <input
        value={(cfg[key] as string) ?? ''}
        placeholder={placeholder}
        onChange={(e) => patch({ [key]: e.target.value } as Partial<HeroConfig>)}
      />
    </label>
  )

  const slides = cfg.slides
  const preview = slides[active] ?? slides[0]

  return (
    <div className={`we-page ${uiClass}`} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="we-page-bar">
        <Link className="we-exit" href="/editor?page=home">
          <ChevronLeft size={16} /> <span>Éditeur</span>
        </Link>
        <span className="we-appbar-brand">
          <ImagePlus size={16} style={{ color: 'var(--c-mint)' }} /> Hero d’accueil
        </span>
        <span className={`he-status ${published ? 'is-live' : ''}`}>
          {published ? '● En ligne' : '○ Brouillon'}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Link className="we-appbar-link" href="/" target="_blank" rel="noopener noreferrer">
            Voir le site <ExternalLink size={13} />
          </Link>
          {published && (
            <button className="he-btn" onClick={doUnpublish} disabled={busy}>
              Dépublier
            </button>
          )}
          <button className="he-btn" onClick={doSave} disabled={busy}>
            <Check size={14} /> Enregistrer
          </button>
          <button className="he-btn he-btn-primary" onClick={doPublish} disabled={busy}>
            <Rocket size={14} /> {published ? 'Republier' : 'Publier'}
          </button>
        </div>
      </div>

      <div className="he-wrap">
        <section className="he-col">
          <h2 className="he-h">Images du slider</h2>
          <p className="he-hint">
            Ajoutez vos visuels (format paysage 16:9 conseillé). Glissez l’ordre avec les flèches.
            Si aucune image n’est ajoutée, la page d’accueil affiche automatiquement vos produits en vedette.
          </p>

          <button
            className="he-upload"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={16} /> {uploading ? 'Envoi…' : 'Ajouter des images'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              void onFiles(e.target.files)
              e.target.value = ''
            }}
          />

          <div className="he-slides">
            {slides.length === 0 && (
              <p className="he-empty">Aucune image — slider par défaut (produits en vedette).</p>
            )}
            {slides.map((s, i) => (
              <div
                key={i}
                className={`he-slide ${i === active ? 'is-active' : ''}`}
                onClick={() => setActive(i)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.src} alt={s.alt} />
                <div className="he-slide-body">
                  <input
                    className="he-alt"
                    placeholder="Texte alternatif (description)"
                    value={s.alt}
                    onChange={(e) => setAlt(i, e.target.value)}
                  />
                  <div className="he-slide-acts">
                    <button onClick={() => move(i, -1)} disabled={i === 0} title="Monter"><ArrowUp size={14} /></button>
                    <button onClick={() => move(i, 1)} disabled={i === slides.length - 1} title="Descendre"><ArrowDown size={14} /></button>
                    <button className="danger" onClick={() => removeSlide(i)} title="Supprimer"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="he-col">
          <h2 className="he-h">Textes & boutons</h2>
          <p className="he-hint">Laissez vide pour garder le texte par défaut du site.</p>
          {field('Sur-titre', 'kicker', 'D-Tech Algérie · Depuis 2006')}
          {field('Titre — ligne 1', 'title1', 'La techno qui')}
          {field('Titre — ligne 2 (accent)', 'title2', 'vous ressemble.')}
          <label className="he-field">
            <span>Sous-titre</span>
            <textarea
              rows={3}
              value={cfg.subtitle ?? ''}
              placeholder="Plus de 393 produits sélectionnés…"
              onChange={(e) => patch({ subtitle: e.target.value })}
            />
          </label>
          <div className="he-row">
            {field('Bouton principal — texte', 'primaryLabel', 'Voir le catalogue')}
            {field('Bouton principal — lien', 'primaryHref', '/products')}
          </div>
          <div className="he-row">
            {field('Bouton secondaire — texte', 'secondaryLabel', 'Notre histoire')}
            {field('Bouton secondaire — lien', 'secondaryHref', '/about')}
          </div>

          <h2 className="he-h" style={{ marginTop: 22 }}>Aperçu</h2>
          <div className="he-preview">
            {preview?.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.src} alt={preview.alt} />
            ) : (
              <div className="he-preview-empty">Vos produits en vedette s’afficheront ici</div>
            )}
            <div className="he-preview-text">
              <span className="he-pv-kicker">{cfg.kicker || 'D-Tech Algérie · Depuis 2006'}</span>
              <strong className="he-pv-title">
                {cfg.title1 || 'La techno qui'} <em>{cfg.title2 || 'vous ressemble.'}</em>
              </strong>
              <span className="he-pv-sub">{cfg.subtitle || 'Plus de 393 produits sélectionnés…'}</span>
            </div>
          </div>
          <p className="he-hint">L’aperçu est indicatif — cliquez « Publier » puis « Voir le site » pour le rendu réel.</p>
        </section>
      </div>
    </div>
  )
}
