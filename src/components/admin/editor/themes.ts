/**
 * Theme registry — design styles selectable in the editor. The actual visual
 * tokens live in editor.css (`.we-canvas.we-theme-<id>`); this list drives the
 * theme picker UI (names, descriptions, swatch colors).
 *
 * Changing the theme keeps the SAME website, products and content — only the
 * style (colors, fonts, radii, shadows, spacing feel) changes.
 */
export interface ThemeDef {
  id: string
  name: string
  tagline: string
  description: string
  /** Swatch colors for the picker card (CSS color strings). */
  swatch: { bg: string; accent: string; accent2: string; ink: string }
  dark: boolean
}

export const THEMES: ThemeDef[] = [
  {
    id: 'nightline',
    name: 'Nightline',
    tagline: 'Sombre · mint',
    description:
      'Le style actuel : bleu nuit profond, accent menthe lumineux, kickers en mono. Tech, nocturne, premium.',
    swatch: { bg: '#06101a', accent: '#7ce0c3', accent2: '#f5c97b', ink: '#f4f7f5' },
    dark: true,
  },
  {
    id: 'mediterranean',
    name: 'Méditerranée éditoriale',
    tagline: 'Ivoire · cobalt',
    description:
      'Raffiné et aéré, façon magazine de design. Ivoire froid, encre marine, cobalt confiant réchauffé d’ocre. Calme et sûr de lui.',
    swatch: {
      bg: 'oklch(0.965 0.010 235)',
      accent: 'oklch(0.525 0.155 248)',
      accent2: 'oklch(0.745 0.140 78)',
      ink: 'oklch(0.180 0.040 255)',
    },
    dark: false,
  },
  {
    id: 'onyx',
    name: 'Onyx & Or',
    tagline: 'Luxe sombre',
    description:
      'Boutique de luxe : charbon chaud, or champagne, ivoire crémeux et titres en serif éditorial. Sobre, rare, élégant.',
    swatch: {
      bg: '#15120e',
      accent: 'oklch(0.800 0.115 85)',
      accent2: 'oklch(0.700 0.100 35)',
      ink: '#efe8db',
    },
    dark: true,
  },
  {
    id: 'solar',
    name: 'Studio Solaire',
    tagline: 'Chaud · vif',
    description:
      'Lumineux et énergique : papier chaud, corail vif, prune, grands arrondis. Chaleureux mais net — une boutique solaire.',
    swatch: {
      bg: 'oklch(0.965 0.025 70)',
      accent: 'oklch(0.660 0.190 35)',
      accent2: 'oklch(0.550 0.130 320)',
      ink: 'oklch(0.250 0.030 40)',
    },
    dark: false,
  },
  {
    id: 'noir',
    name: 'Noir Éditorial',
    tagline: 'Mono · contrasté',
    description:
      'Brutalisme chic : papier blanc, encre noire, un seul rouge tranchant, angles nets et grotesque géométrique. Brut, sûr, intemporel.',
    swatch: {
      bg: 'oklch(0.985 0 0)',
      accent: 'oklch(0.300 0 0)',
      accent2: 'oklch(0.560 0.200 25)',
      ink: 'oklch(0.180 0 0)',
    },
    dark: false,
  },
  {
    id: 'botanique',
    name: 'Botanique',
    tagline: 'Terreux · naturel',
    description:
      'Chaleur organique : crème chaude, vert forêt, terracotta. Posé, artisanal, vivant — une boutique qui respire.',
    swatch: {
      bg: 'oklch(0.965 0.020 95)',
      accent: 'oklch(0.520 0.110 150)',
      accent2: 'oklch(0.620 0.130 45)',
      ink: 'oklch(0.270 0.045 150)',
    },
    dark: false,
  },
  {
    id: 'aurore',
    name: 'Aurore',
    tagline: 'Pastel · doux',
    description:
      'Lever de soleil doux : blush, prune, pervenche. Léger, optimiste, généreux en arrondis — chaleureux sans être bruyant.',
    swatch: {
      bg: 'oklch(0.970 0.022 330)',
      accent: 'oklch(0.650 0.150 350)',
      accent2: 'oklch(0.680 0.120 255)',
      ink: 'oklch(0.300 0.060 330)',
    },
    dark: false,
  },
  {
    id: 'cyber',
    name: 'Cyber Néon',
    tagline: 'Néon · sombre',
    description:
      'Indigo profond, cyan et magenta néon, lueurs maîtrisées. Futuriste et énergique pour le gaming et la high-tech.',
    swatch: {
      bg: 'oklch(0.170 0.030 280)',
      accent: 'oklch(0.800 0.150 195)',
      accent2: 'oklch(0.650 0.250 330)',
      ink: 'oklch(0.950 0.020 220)',
    },
    dark: true,
  },
]

export const DEFAULT_THEME = 'nightline'

export function getTheme(id?: string): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!
}
