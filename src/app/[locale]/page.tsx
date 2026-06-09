import { HomeShowcase } from '@/components/home/HomeShowcase'

// The Nightline showcase ships with its own curated catalogue
// (src/components/home/nightline-data.ts) and renders no DB content,
// so the homepage needs no server-side data fetching.
export default function HomePage() {
  return <HomeShowcase />
}
