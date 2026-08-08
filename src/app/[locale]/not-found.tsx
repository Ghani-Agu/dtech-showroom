import { getLocale } from 'next-intl/server'
import { EdNotFoundBody } from '@/components/editorial/EdNotFoundBody'
import { SkinShell } from '@/components/skin/SkinShell'

export default async function NotFound() {
  const locale = await getLocale()

  /* Le contenu vit dans EdNotFoundBody : l'éditeur propose une page « 404 »
     et son aperçu monte le même composant (src/server/ed-page-body.tsx), donc
     ce que l'auteur met en page est bien ce que verra un visiteur égaré. */
  return (
    <SkinShell locale={locale}>
      <EdNotFoundBody />
    </SkinShell>
  )
}
