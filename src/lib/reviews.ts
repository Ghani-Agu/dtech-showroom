'use client'

/**
 * Reviews v1 — frontend-complete, backend-ready.
 * Until the reviews API lands, every product gets deterministic seeded
 * reviews (stable across reloads, derived from the slug), and visitor
 * reviews persist in localStorage.
 */

export interface Review {
  id: string
  author: string
  rating: number
  text: string
  date: string // ISO
  mine?: boolean
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rng(seed: number) {
  let x = seed || 1
  return () => {
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    return ((x >>> 0) % 10000) / 10000
  }
}

const AUTHORS = [
  'Yacine B.', 'Amel K.', 'Mohamed S.', 'Lina H.', 'Karim Z.', 'Sara M.',
  'Riad T.', 'Nesrine A.', 'Sofiane L.', 'Imene D.', 'Walid G.', 'Meriem F.',
  'Adel B.', 'Kenza R.', 'Hamza O.',
]

const TEXTS: [string, number][] = [
  ['Très bon produit, conforme à la description. Livraison rapide sur Alger.', 5],
  ["Excellent rapport qualité-prix. Je recommande l'équipe D-Tech, très pro.", 5],
  ['Produit reçu en parfait état, bien emballé. Service client réactif sur WhatsApp.', 5],
  ['Fonctionne parfaitement depuis plusieurs semaines. Très satisfait.', 5],
  ['Bonne qualité générale. Le SAV a répondu à toutes mes questions.', 4],
  ['Conforme à mes attentes, installation facile. Petit délai de livraison.', 4],
  ['Bon produit pour le prix. Emballage soigné, notice claire.', 4],
  ['Achat pour le bureau, toute l’équipe est satisfaite. Service sérieux.', 5],
  ['Performance correcte, correspond à la fiche produit.', 4],
  ['Deuxième achat chez D-Tech, toujours aussi sérieux.', 5],
  ['Bien, mais j’aurais aimé plus d’accessoires fournis.', 3],
  ['Très satisfait de la qualité et du suivi de commande.', 5],
]

export function seededReviews(slug: string): Review[] {
  const r = rng(hash(slug))
  const count = 2 + Math.floor(r() * 4) // 2..5
  const out: Review[] = []
  const used = new Set<number>()
  for (let i = 0; i < count; i++) {
    let t = Math.floor(r() * TEXTS.length)
    while (used.has(t)) t = (t + 1) % TEXTS.length
    used.add(t)
    const a = Math.floor(r() * AUTHORS.length)
    const daysAgo = 5 + Math.floor(r() * 320)
    const tx = TEXTS[t] ?? TEXTS[0]!
    out.push({
      id: `seed-${slug}-${i}`,
      author: AUTHORS[a] ?? 'Client D-Tech',
      rating: tx[1],
      text: tx[0],
      date: new Date(Date.now() - daysAgo * 86400000).toISOString(),
    })
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1))
}

const LS_KEY = 'dt-reviews'

export function localReviews(slug: string): Review[] {
  if (typeof window === 'undefined') return []
  try {
    const all = JSON.parse(window.localStorage.getItem(LS_KEY) ?? '{}')
    return (all[slug] ?? []).map((r: Review) => ({ ...r, mine: true }))
  } catch {
    return []
  }
}

export function addLocalReview(
  slug: string,
  review: Omit<Review, 'id' | 'date'>
): Review {
  const full: Review = {
    ...review,
    id: `local-${Date.now()}`,
    date: new Date().toISOString(),
  }
  try {
    const all = JSON.parse(window.localStorage.getItem(LS_KEY) ?? '{}')
    all[slug] = [full, ...(all[slug] ?? [])]
    window.localStorage.setItem(LS_KEY, JSON.stringify(all))
  } catch {
    /* storage unavailable — review lives for the session only */
  }
  return full
}

export function ratingSummary(reviews: Review[]) {
  if (reviews.length === 0) return { avg: 0, count: 0, dist: [0, 0, 0, 0, 0] }
  const dist = [0, 0, 0, 0, 0]
  let sum = 0
  for (const r of reviews) {
    sum += r.rating
    const idx = Math.min(4, Math.max(0, Math.round(r.rating) - 1))
    dist[idx] = (dist[idx] ?? 0) + 1
  }
  return { avg: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length, dist }
}

/** Stable display rating for cards (seeded only, no localStorage). */
export function seededRating(slug: string): { avg: number; count: number } {
  const { avg, count } = ratingSummary(seededReviews(slug))
  return { avg, count }
}
