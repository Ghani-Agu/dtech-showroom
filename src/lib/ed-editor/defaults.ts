/**
 * ÉDITEUR — la composition par défaut de chaque page (pur, sans React).
 *
 * Module séparé du registre parce que le SERVEUR en a besoin : il construit le
 * document d'une page tant que rien n'est publié. Un module `'use client'` ne
 * peut pas être appelé depuis le serveur, d'où ce fichier neutre.
 *
 * Cette liste est le contrat de non-régression : tant qu'on n'a rien touché,
 * chaque page rend exactement ce qu'elle rendait avant l'éditeur, et
 * « Réinitialiser » y ramène toujours.
 */

import { edId, type EdNode } from './model'

export const DEFAULT_TYPES: Record<string, string[]> = {
  home: [
    'home.hero',
    'home.intro',
    'home.catalogue',
    'home.marquee',
    'home.proof',
    'home.history',
    'home.why',
    'home.fan',
    'home.contact',
  ],
  catalogue: ['catalogue.head', 'catalogue.families'],
  contact: ['contact.head', 'contact.channels', 'contact.location', 'contact.form'],
  company: [
    'company.hero',
    'company.figures',
    'company.story',
    'company.milestones',
    'company.ownBrands',
    'company.ranges',
    'company.distribution',
    'company.values',
    'company.clients',
    'company.cta',
  ],
  gaming: [
    'gaming.aurora',
    'gaming.hero',
    'gaming.rgbbar',
    'gaming.ticker',
    'gaming.buildpath',
    'gaming.collections',
    'gaming.why',
    'gaming.cta',
  ],
  brands: ['brands.head', 'brands.groups'],
  brand: [
    'brand.hero',
    'brand.statband',
    'brand.why',
    'brand.cats',
    'brand.selection',
    'brand.faq',
    'brand.cta',
    'brand.others',
  ],
  about: ['about.head', 'home.why', 'home.contact'],
  products: ['slot.products'],
  product: ['slot.product'],
  search: ['slot.search'],
  inquiry: ['slot.inquiry'],
  legal: ['slot.legal'],
  notfound: ['slot.notfound'],
}

/**
 * Identifiant STABLE d'une section par défaut. Il doit l'être : les réglages,
 * les styles et le CSS d'une section sont rangés sous son id. Un id régénéré à
 * chaque chargement perdrait silencieusement tout le travail.
 */
export const defaultSectionId = (type: string) => `d_${type.replace(/[^a-z0-9]+/gi, '_')}`

export function defaultSections(pageKey: string): EdNode[] {
  const types = DEFAULT_TYPES[pageKey] ?? []
  return types.map((type) => ({ id: defaultSectionId(type), type }))
}

/** Le point de départ d'une page personnalisée. */
export function starterCustom(title: string): EdNode[] {
  return [
    { id: edId('head'), type: 'page.head', props: { title: { fr: title } } },
    { id: edId('text'), type: 'lib.text' },
  ]
}
