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

  /* ROUND 23b / 27 — the live band sizes itself to the MEAN slide ratio (see
     `heroAspect` in EditorialSections.tsx — keep the two rules identical).
     Slides uploaded before this round carry no stored size, so the thumbnails
     report theirs on load and we fold those in the same way. */
  const [seen, setSeen] = useState<Record<string, number>>({})
  function noteSize(src: string, el: HTMLImageElement) {
    const r = el.naturalWidth / el.naturalHeight
    if (!Number.isFinite(r) || r <= 0) return
    setSeen((m) => (m[src] !== undefined ? m : { ...m, [src]: r }))
  }
  function ratioOf(s: HeroSlide): number | undefined {
    return s.w && s.h ? s.w / s.h : seen[s.src]
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
        if (r.ok) next.push({ src: r.url, alt: '', w: r.w, h: r.h })
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
    if (!confirm('Dépublier le hero ? La page d’accueil reprendra le slider par défaut (panneau D-Tech).')) return
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

  const slides = cfg.slides
  const preview = slides[active] ?? slides[0]

  const known = slides.map(ratioOf).filter((r): r is number => typeof r === 'number' && Number.isFinite(r) && r > 0)
  /* ROUND 27 — MEAN, and clamped 1.45 … 3.4. Must stay byte-for-byte the same
     rule as `heroAspect`: this editor's whole job is to predict the band, and
     while it still ran round 23b's `Math.min` it previewed a 1.333:1 band for
     a set the storefront renders at 2.39:1. */
  const bandRatio = known.length
    ? Math.min(3.4, Math.max(1.45, known.reduce((a, r) => a + r, 0) / known.length))
    : 1920 / 700
  /* ROUND 27 — which slide is furthest from the band's shape, i.e. the one
     that will show the widest bars. No longer "gives the height": with the
     storefront on `object-fit: contain` no single slide drives the depth and
     none of them is cropped. */
  const offIdx =
    known.length > 1
      ? slides.reduce(
          (best, s, i) => {
            const r = ratioOf(s)
            if (r === undefined) return best
            const d = Math.abs(Math.log(r / bandRatio))
            return d > best.d ? { i, d } : best
          },
          { i: -1, d: 0.14 },
        ).i
      : -1
  /* ROUND 27 — the old warning said a squarer slide would be "rognée en haut
     et en bas". It no longer is: `contain` letterboxes onto a blurred copy of
     the slide instead. What is still worth saying is that mixing shapes costs
     visible bars, so the note is about consistency, not about damage. */
  const mixed = offIdx >= 0

  return (
    <div className={`we-page ${uiClass}`} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="we-page-bar">
        {/* ROUND 23 — this page is reached from the admin sidebar, so "back"
            means the admin, not the web editor it used to send people to. */}
        <Link className="we-exit" href="/admin" title="Revenir à l’administration">
          <ChevronLeft size={16} /> <span>Quitter</span>
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
            Le hero <strong>s’adapte à vos images</strong> — aucune n’est recadrée en hauteur.
            Glissez l’ordre avec les flèches. Si aucune image n’est ajoutée, le slider
            affiche un panneau D-Tech aux couleurs du site.
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
              <p className="he-empty">Aucune image — le slider affiche le panneau D-Tech par défaut.</p>
            )}
            {slides.map((s, i) => (
              <div
                key={i}
                className={`he-slide ${i === active ? 'is-active' : ''}`}
                onClick={() => setActive(i)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.src}
                  alt={s.alt}
                  onLoad={(e) => noteSize(s.src, e.currentTarget)}
                />
                <div className="he-slide-body">
                  <span className="he-dim">
                    {s.w && s.h ? `${s.w} × ${s.h}` : '…'}
                    {i === offIdx && (
                      <b title="Cette image a une forme assez différente des autres : elle s’affichera en entier, avec des bandes floutées sur les côtés ou en haut et en bas.">
                        bandes visibles
                      </b>
                    )}
                  </span>
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
          <h2 className="he-h">Aperçu</h2>
          <p className="he-hint">
            Chaque image est affichée <strong>en entier</strong>, jamais recadrée :
            la bande prend la forme <strong>moyenne</strong> de vos images, et celles
            qui sortent de cette forme sont complétées par une version floutée
            d’elles-mêmes. Pour une bande parfaitement pleine, gardez toutes vos
            images au même format (1920 × 700 par exemple).
            Le slider <strong>défile tout seul</strong> : ~5,5&nbsp;s par image,
            12 au maximum ; le visiteur peut mettre en pause, cliquer une puce ou
            faire glisser. Le titre et les boutons sont posés dans un encadré en
            bas à gauche, qui reste lisible quelle que soit l’image.
          </p>
          {mixed && (
            <p className="he-warn">
              Vos images n’ont pas toutes la même forme. Aucune ne sera rognée,
              mais celle qui est signalée «&nbsp;bandes visibles&nbsp;» s’affichera
              avec des bandes floutées autour. Recadrez-la au même format que les
              autres (1920 × 700) pour une bande pleine.
            </p>
          )}
          <div className="he-preview" style={{ aspectRatio: String(bandRatio) }}>
            {preview?.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.src} alt={preview.alt} />
            ) : (
              <div className="he-preview-empty">Vos images du slider s’afficheront ici</div>
            )}
          </div>
          <p className="he-hint">
            L’aperçu est indicatif — cliquez « Publier » puis « Voir le site »
            pour le rendu réel.
          </p>

          <div className="he-tips">
            <h3>Pour un rendu net</h3>
            <ul>
              <li>
                <strong>Donnez-leur toutes la même taille.</strong> La bande se
                règle sur la plus haute&nbsp;: une seule image plus carrée que
                les autres et tout le hero grandit. 1920 × 700 reste la valeur
                de référence.
              </li>
              <li>
                Gardez le sujet <strong>au centre</strong> — sur un écran plus
                étroit que l’image, les bords gauche et droit sont coupés
                (jamais le haut ni le bas).
              </li>
              <li>
                <strong>Plus d’assombrissement&nbsp;:</strong> l’image s’affiche
                à sa vraie luminosité. Le titre et les boutons sont en blanc en
                bas à gauche — gardez ce coin sombre, sinon ils deviennent
                illisibles.
              </li>
              <li>
                Si l’image contient du texte, laissez-le loin du bas&nbsp;: les
                flèches et les puces s’affichent par-dessus.
              </li>
              <li>Renseignez le texte alternatif de chaque image (accessibilité + SEO).</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}
