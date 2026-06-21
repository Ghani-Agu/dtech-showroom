'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
  addLocalReview,
  localReviews,
  ratingSummary,
  seededReviews,
  type Review,
} from '@/lib/reviews'
import { Star, Stars } from './Stars'

export function ReviewsSection({ slug }: { slug: string }) {
  const t = useTranslations('showroom.reviews')
  const locale = useLocale()
  const seeded = useMemo(() => seededReviews(slug), [slug])
  const [mine, setMine] = useState<Review[]>([])
  const [form, setForm] = useState({ name: '', text: '', rating: 5 })
  const [thanks, setThanks] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time localStorage hydration after SSR
    setMine(localReviews(slug))
  }, [slug])

  const all = [...mine, ...seeded]
  const { avg, count, dist } = ratingSummary(all)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || form.text.trim().length < 4) return
    const r = addLocalReview(slug, {
      author: form.name.trim(),
      text: form.text.trim(),
      rating: form.rating,
      mine: true,
    })
    setMine((m) => [{ ...r, mine: true }, ...m])
    setForm({ name: '', text: '', rating: 5 })
    setThanks(true)
    window.setTimeout(() => setThanks(false), 5000)
  }

  return (
    <section style={{ marginTop: 60 }}>
      <span className="sr-kicker">{t('title')}</span>
      <div
        style={{
          display: 'grid', gap: 28, marginTop: 20,
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
        }}
      >
        {/* summary + form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="sr-review" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em' }}>
                {avg.toFixed(1)}
              </span>
              <Stars value={avg} size={16} />
            </div>
            <span className="sr-mono">{t('basedOn', { count })}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[5, 4, 3, 2, 1].map((n) => (
                <div className="sr-ratingbar" key={n}>
                  <span className="sr-mono" style={{ width: 14 }}>{n}</span>
                  <Star fill={1} size={11} />
                  <span className="track">
                    <span
                      className="fill"
                      style={{ width: `${count ? ((dist[n - 1] ?? 0) / count) * 100 : 0}%` }}
                    />
                  </span>
                  <span className="sr-mono" style={{ width: 22, textAlign: 'end' }}>
                    {dist[n - 1] ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <form className="sr-review" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <strong style={{ fontSize: 15 }}>{t('write')}</strong>
            <div>
              <span className="sr-mono" style={{ display: 'block', marginBottom: 7 }}>{t('rating')}</span>
              <span className="sr-starpick">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={n <= form.rating ? 'on' : undefined}
                    aria-label={`${n}/5`}
                    onClick={() => setForm((f) => ({ ...f, rating: n }))}
                  >
                    <Star fill={n <= form.rating ? 1 : 0} size={20} />
                  </button>
                ))}
              </span>
            </div>
            <label>
              <span className="sr-mono" style={{ display: 'block', marginBottom: 7 }}>{t('name')}</span>
              <input
                className="sr-input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('namePlaceholder')}
                required
                maxLength={60}
              />
            </label>
            <label>
              <span className="sr-mono" style={{ display: 'block', marginBottom: 7 }}>{t('comment')}</span>
              <textarea
                className="sr-textarea"
                rows={3}
                value={form.text}
                onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                placeholder={t('commentPlaceholder')}
                required
                minLength={4}
                maxLength={1000}
              />
            </label>
            <button type="submit" className="sr-btn sr-btn-primary" style={{ alignSelf: 'flex-start' }}>
              {t('submit')}
            </button>
            {thanks ? (
              <p className="sr-mono" style={{ color: 'var(--sr-cyan)', textTransform: 'none', letterSpacing: '0.02em' }}>
                {t('thanks')}
              </p>
            ) : null}
          </form>
        </div>

        {/* list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {all.length === 0 ? (
            <div className="sr-empty">{t('empty')}</div>
          ) : (
            all.slice(0, 8).map((r) => (
              <article className="sr-review" key={r.id}>
                <div className="who">
                  <span className="avatar">{r.author.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <div className="nm">
                      {r.author}
                      {r.mine ? (
                        <span className="sr-mono" style={{ color: 'var(--sr-cyan)', marginInlineStart: 8 }}>
                          · {t('mine')}
                        </span>
                      ) : null}
                    </div>
                    <div className="dt">
                      {new Date(r.date).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <span style={{ marginInlineStart: 'auto' }}>
                    <Stars value={r.rating} size={12} />
                  </span>
                </div>
                <p>{r.text}</p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
