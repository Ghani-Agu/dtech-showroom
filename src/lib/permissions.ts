/** Admin sections an employee can be granted access to. */
export const SECTIONS = [
  { key: 'products', label: 'Produits', desc: 'Ajouter, modifier, masquer, supprimer', color: 'var(--c-blue)' },
  { key: 'categories', label: 'Catégories', desc: 'Gérer les familles de produits', color: 'var(--c-orange)' },
  { key: 'brands', label: 'Marques', desc: 'Gérer les partenaires distribués', color: 'var(--c-violet)' },
  { key: 'inquiries', label: 'Demandes', desc: 'Répondre aux messages clients', color: 'var(--c-amber)' },
  { key: 'users', label: 'Utilisateurs', desc: 'Créer des comptes (réservé admin)', color: 'var(--c-rose)' },
  { key: 'newsletter', label: 'Newsletter', desc: 'Abonnés et campagnes e-mail', color: 'var(--c-mint)' },
  { key: 'editor', label: 'Éditeur web', desc: 'Composer les pages et choisir le thème', color: 'var(--c-emerald)' },
] as const

export type SectionKey = (typeof SECTIONS)[number]['key']

/** Section keys grantable to staff (users stays admin-only). */
export type StaffSectionKey = Exclude<SectionKey, 'users'>

/** What a staff account can do when no explicit permissions are set. */
export const DEFAULT_STAFF_PERMISSIONS: StaffSectionKey[] = [
  'products',
  'categories',
  'brands',
  'inquiries',
  'newsletter',
  'editor',
]

export function hasAccess(
  user: { role: string; permissions?: string[] | null },
  section: SectionKey
): boolean {
  if (user.role === 'admin') return true
  if (section === 'users') return false // always admin-only
  const granted = user.permissions ?? DEFAULT_STAFF_PERMISSIONS
  return granted.includes(section)
}

/** Sections allowed for a user — drives the sidebar. */
export function allowedSections(user: {
  role: string
  permissions?: string[] | null
}): SectionKey[] {
  return SECTIONS.map((s) => s.key).filter((k) => hasAccess(user, k))
}
