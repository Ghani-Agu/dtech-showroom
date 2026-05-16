import type { MetadataRoute } from 'next'

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dtech-showroom.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/*', '/inquiry/*', '/motion', '/api/*'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
