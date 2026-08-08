'use client'

/**
 * ÉDITEUR — le rendu d'une page à partir de son document.
 *
 * C'est le même composant qui sert le site public et l'aperçu de l'éditeur :
 * ce que l'on voit en éditant EST la page, pas une maquette. La seule
 * différence tient dans `editing`, qui ajoute la couche de sélection.
 *
 * Enveloppe des sections : `.ed-sw` est en `display: contents` tant qu'aucun
 * style n'est demandé — la mise en page reste rigoureusement celle d'avant
 * (voir la règle de compatibilité `.ed-sw + .ed-sw > .sec` dans
 * editorial-design.css). Dès qu'une section reçoit un fond, une marge ou une
 * largeur, l'enveloppe redevient une vraie boîte, parce qu'il en faut une.
 */

import dynamic from 'next/dynamic'
import { useMemo, type CSSProperties, type ReactNode } from 'react'
import type { EdDoc, EdNode, EdSite } from '@/lib/ed-editor/model'
import { isStyleEmpty, sanitizeHtml, scopeCss, styleToCss } from '@/lib/ed-editor/model'
import type { EdPageData, EdRenderCtx } from './ed-ctx'
import { getBlockDef, getSectionDef, pageFrame } from './ed-registry'
import { useEditorial } from './editorial-context'
import '@/styles/ed-blocks.css'

const EdEditLayer = dynamic(() => import('./ed-edit-layer').then((m) => m.EdEditLayer), {
  ssr: false,
})

export interface EdPageProps {
  pageKey: string
  doc: EdDoc
  site?: EdSite | null
  data?: EdPageData
  slots?: Record<string, ReactNode>
  editing?: boolean
}

export function EdPage({ pageKey, doc, site, data, slots, editing = false }: EdPageProps) {
  const { t, tf, lang } = useEditorial()

  const ctx: EdRenderCtx = useMemo(
    () => ({
      pageKey,
      locale: lang,
      editing,
      data: data ?? {},
      slots: slots ?? {},
      t,
      tf,
    }),
    [pageKey, lang, editing, data, slots, t, tf],
  )

  const frame = pageFrame(pageKey, ctx.data)
  const sections = doc.sections

  return (
    <>
      <EdStyles doc={doc} site={site} />
      <div
        className={['ed-doc', frame.className].filter(Boolean).join(' ')}
        style={frame.style}
        {...(frame.attrs ?? {})}
        data-ed-page={pageKey}
      >
        {sections.map((node) => (
          <EdSectionHost key={node.id} node={node} ctx={ctx} />
        ))}
        {editing && sections.length === 0 ? (
          <div className="ed-emptypage">
            <p>Cette page est vide.</p>
            <span>Ajoutez une section depuis le panneau de gauche.</span>
          </div>
        ) : null}
      </div>
      {editing ? <EdEditLayer /> : null}
    </>
  )
}

/* ───────────────────────────── une section ───────────────────────────── */

function EdSectionHost({ node, ctx }: { node: EdNode; ctx: EdRenderCtx }) {
  const def = getSectionDef(node.type)
  if (!def) return null

  const hidden = node.style?.hidden === true
  if (hidden && !ctx.editing) return null

  const styled = !isStyleEmpty(node.style)
  const children = node.children?.length
    ? node.children.map((child) => <EdBlockHost key={child.id} node={child} ctx={ctx} />)
    : null

  const body = def.render({ node, ctx, children })
  const raw = node.html ? sanitizeHtml(node.html) : ''

  /* Une section dont la donnée manque (un catalogue vide, une marque sans
     produits) ne rend rien — c'est le bon comportement sur le site public.
     Dans l'éditeur, en revanche, elle deviendrait invisible : on l'ajoute, il
     ne se passe rien, et on croit l'outil cassé. On la matérialise donc, avec
     la raison. */
  const empty = body === null || body === undefined || body === false
  const filler =
    ctx.editing && empty && !raw ? (
      <div className="ed-void">
        <b>{def.label}</b>
        <span>
          Rien à afficher ici : cette section est alimentée par le catalogue, et la donnée
          nécessaire n’existe pas sur cette page.
        </span>
      </div>
    ) : null

  const cls = [
    'ed-sw',
    styled ? 'is-styled' : '',
    hidden ? 'is-hidden' : '',
    node.style?.hideMobile ? 'is-nomob' : '',
    node.style?.hideDesktop ? 'is-nodesk' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={cls}
      data-ed-id={node.id}
      data-ed-type={node.type}
      data-ed-kind="section"
      data-ed-label={def.label}
      {...(node.style?.tone ? { 'data-band': node.style.tone === 'dark' ? 'dark' : undefined } : {})}
      style={styled ? (styleToCss(node.style) as CSSProperties) : undefined}
    >
      {body}
      {filler}
      {raw ? <div className="ed-rawhtml" dangerouslySetInnerHTML={{ __html: raw }} /> : null}
    </div>
  )
}

/* ─────────────────────── un composant dans une section ────────────────── */

function EdBlockHost({ node, ctx }: { node: EdNode; ctx: EdRenderCtx }) {
  const def = getBlockDef(node.type)
  if (!def) return null
  if (node.style?.hidden === true && !ctx.editing) return null
  const styled = !isStyleEmpty(node.style)
  return (
    <div
      className={`ed-bw${styled ? ' is-styled' : ''}${node.style?.hidden ? ' is-hidden' : ''}`}
      data-ed-id={node.id}
      data-ed-type={node.type}
      data-ed-kind="block"
      data-ed-label={def.label}
      style={styled ? (styleToCss(node.style) as CSSProperties) : undefined}
    >
      {def.render({ node, ctx })}
    </div>
  )
}

/* ──────────────────────────── feuilles de style ───────────────────────── */

/**
 * Tout le CSS produit par l'éditeur tient dans UNE balise : les jetons du
 * site, le CSS libre global, celui de la page, puis celui de chaque section
 * (préfixé par son identifiant). Un seul recalcul de style au lieu de vingt.
 */
function EdStyles({ doc, site }: { doc: EdDoc; site?: EdSite | null }) {
  const css = useMemo(() => {
    const out: string[] = []

    const tokens = site?.tokens ?? {}
    const fonts = site?.fonts ?? {}
    const decls: string[] = []
    for (const [k, v] of Object.entries(tokens)) decls.push(`--${k}:${v};`)
    if (fonts.display) decls.push(`--disp:${fonts.display};`)
    if (fonts.body) decls.push(`--body:${fonts.body};`)
    if (decls.length) out.push(`.editorial-root{${decls.join('')}}`)

    if (site?.css) out.push(scopeCss(site.css, '.editorial-root'))
    if (doc.css) out.push(scopeCss(doc.css, '.editorial-root'))

    const walk = (nodes: EdNode[]) => {
      for (const n of nodes) {
        if (n.css) out.push(scopeCss(n.css, `[data-ed-id="${cssEscape(n.id)}"]`))
        if (n.children) walk(n.children)
      }
    }
    walk(doc.sections)

    return out.filter(Boolean).join('\n')
  }, [doc, site])

  const fontUrl = site?.fonts?.url
  return (
    <>
      {fontUrl ? <link rel="stylesheet" href={fontUrl} /> : null}
      {css ? <style data-ed-styles dangerouslySetInnerHTML={{ __html: css }} /> : null}
    </>
  )
}

/** Les identifiants sont générés par nous, mais mieux vaut ne rien supposer. */
function cssEscape(id: string): string {
  return id.replace(/["\\]/g, '\\$&')
}
