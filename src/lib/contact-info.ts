/**
 * contact-info.ts — the ONE definition of how to reach D-Tech.
 *
 * Round 19 gave /contact the real registered address of SARL Hardware
 * Technology Service and left six older copies of a *different* address alive
 * elsewhere in the tree: `Cité 05 Juillet 1962` in the brand skin, the email
 * footer, the site messages and the Organization JSON-LD. Structured data
 * disagreeing with the visible address is worse than having none — Google
 * treats the mismatch as a signal the listing is unmaintained, and a customer
 * who drives to the wrong Cité does not come back.
 *
 * So the machine-readable values live here, once. Human-facing *copy* stays
 * in the message catalogues (it has to be translated), but it is copy of
 * these values — grep `ADDRESS_LINE1` before changing an address anywhere.
 *
 * Pure module, no `server-only`: client components, route metadata, the
 * sitemap and the email templates all read from it.
 */

export const PHONE_DISPLAY = '+213 560 99 05 06'
export const PHONE_TEL = '+213560990506'
export const SAV_DISPLAY = '0561 616 911'
export const SAV_TEL = '+213561616911'
export const WHATSAPP_URL = 'https://wa.me/213560990506'

/**
 * Canonical mailbox. Three files still pointed at
 * `contact@d-techalgerie.com` while thirty pointed here; the domain
 * d-techalgerie.com is real (it is the live site) but the mailbox is not the
 * one D-Tech reads.
 */
export const CONTACT_EMAIL = 'contact@dtech.dz'
export const SALES_EMAIL = 'commercial@dtech.dz'
export const SAV_EMAIL = 'sav@dtech.dz'

/** Registered seat, per the CACI directory entry. */
export const ADDRESS_LINE1 = 'Cité 1577 logements, Bt 3, local DEFG'
export const ADDRESS_LINE1_AR = 'حي 1577 مسكن، عمارة 3، محل DEFG'
export const ADDRESS_LOCALITY = 'Bab Ezzouar'
export const ADDRESS_LOCALITY_AR = 'باب الزوار'
export const ADDRESS_REGION = 'Alger'
export const ADDRESS_COUNTRY = 'DZ'

/** One-line address for footers and `{{site.address}}` tokens. */
export const ADDRESS_ONELINE = `${ADDRESS_LINE1} — ${ADDRESS_LOCALITY}, ${ADDRESS_REGION}`

/** schema.org PostalAddress, for every JSON-LD block on the site. */
export const POSTAL_ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: ADDRESS_LINE1,
  addressLocality: ADDRESS_LOCALITY,
  addressRegion: ADDRESS_REGION,
  addressCountry: ADDRESS_COUNTRY,
} as const

/** Query used for both the embedded map and the "open in Maps" link. */
export const MAP_QUERY = `D-Tech Algerie, ${ADDRESS_LINE1}, ${ADDRESS_LOCALITY}, ${ADDRESS_REGION}`
export const MAP_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAP_QUERY)}`
