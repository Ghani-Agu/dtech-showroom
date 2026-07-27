/**
 * analytics.ts — thin, safe wrapper over gtag.
 *
 * Every call is a no-op when GA isn't configured (no id pasted in admin, ad
 * blocker, SSR), so call sites never need to guard. Event names follow GA4's
 * recommended e-commerce schema so the standard reports light up instead of
 * everything landing in "custom events".
 *
 * No price data is sent: the catalogue has no price column, and inventing a
 * `value` would corrupt revenue reporting.
 */

type GtagParams = Record<string, unknown>

declare global {
  interface Window {
    gtag?: (
      command: 'event' | 'config' | 'js' | 'set',
      targetOrName: string | Date,
      params?: GtagParams
    ) => void
    dataLayer?: unknown[]
  }
}

function send(name: string, params: GtagParams = {}): void {
  if (typeof window === 'undefined') return
  try {
    window.gtag?.('event', name, params)
  } catch {
    // Analytics must never break the storefront.
  }
}

export interface TrackedProduct {
  slug: string
  name: string
  brandName?: string
  categoryName?: string
  quantity?: number
}

function toItem(p: TrackedProduct) {
  return {
    item_id: p.slug,
    item_name: p.name,
    ...(p.brandName ? { item_brand: p.brandName } : {}),
    ...(p.categoryName ? { item_category: p.categoryName } : {}),
    quantity: p.quantity ?? 1,
  }
}

export const analytics = {
  viewItem(p: TrackedProduct) {
    send('view_item', { currency: 'DZD', items: [toItem(p)] })
  },
  viewItemList(listName: string, items: TrackedProduct[]) {
    send('view_item_list', {
      item_list_name: listName,
      items: items.slice(0, 20).map(toItem),
    })
  },
  addToCart(p: TrackedProduct) {
    send('add_to_cart', { currency: 'DZD', items: [toItem(p)] })
  },
  removeFromCart(p: TrackedProduct) {
    send('remove_from_cart', { currency: 'DZD', items: [toItem(p)] })
  },
  viewCart(items: TrackedProduct[]) {
    send('view_cart', { currency: 'DZD', items: items.map(toItem) })
  },
  /** Cart → WhatsApp handoff. The closest thing this site has to a purchase. */
  beginCheckout(items: TrackedProduct[], channel: 'whatsapp' | 'inquiry') {
    send('begin_checkout', {
      currency: 'DZD',
      checkout_channel: channel,
      items: items.map(toItem),
    })
  },
  search(term: string) {
    if (!term.trim()) return
    send('search', { search_term: term.trim().slice(0, 100) })
  },
  /** Catalogue facet use — tells you which filters actually earn their keep. */
  filter(kind: 'category' | 'brand' | 'sort' | 'featured', value: string) {
    send('select_filter', { filter_kind: kind, filter_value: value })
  },
  newsletterSignup(source: string) {
    send('sign_up', { method: 'newsletter', signup_source: source })
  },
  inquirySubmit(productSlug: string) {
    send('generate_lead', { item_id: productSlug })
  },
  chatOpen() {
    send('chat_open', {})
  },
  chatMessage() {
    send('chat_message_sent', {})
  },
  contactClick(kind: 'whatsapp' | 'phone' | 'email' | 'maps') {
    send('contact_click', { contact_kind: kind })
  },
}
