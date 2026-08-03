/**
 * brand-marks — ONE mark for EVERY brand in the classic + brand skins.
 *
 * NOT a 'use client' module: the classic /brands page (a SERVER component)
 * imports it (see the note in editorial-logos.tsx about the flight-loader
 * proxy trap).
 *
 * Three layers:
 *  1. ED_BRAND_LOGOS — the 10 big vector marks shared with the Éditorial
 *     marquee (kept there so the marquee's curated set stays HIS decision).
 *  2. EXTRA_VECTOR_MARKS — 6 more real marks sourced for round 14b
 *     (TCL, AOC, APC, GameMax, Unomat, Reaction — detain/svg-logos, CC0
 *     redistribution; trademarks belong to their owners, shown to identify
 *     the brands the shop distributes).
 *  3. WORD_MARKS — brands with no published vector mark (local/OEM labels)
 *     get a designed wordmark tile: brand-fitting colour + bold type.
 *
 * `getBrandMark` NEVER returns undefined — brands added later in the admin
 * fall back to a deterministic colour from FALLBACK_TILES, so every brand
 * card always renders as a logo-style tile.
 */
import { ED_BRAND_LOGOS } from '@/components/editorial/editorial-logos'

export interface BrandMark {
  title: string
  /** Tile background + mark colour. */
  tile: string
  fg: string
  /** Vector mark (tight viewBox + single path), when one exists. */
  vb?: string
  ar?: number
  d?: string
  /** Typographic mark, when no vector exists. */
  word?: string
  /**
   * ROUND 27 — official artwork (transparent PNG in `/public/brands`), which
   * beats both the vector path and the wordmark. Full colour, so it is drawn
   * on a white `.bl-plate` inside the brand-coloured tile — see the long note
   * on `EdBrandLogo.img`. `tile` stays the brand ACCENT.
   */
  img?: string
  /** The ARTWORK's aspect — NOT `ar`, which describes the `d` fallback's
      viewBox. See the note on `EdBrandLogo.imgAr`. */
  imgAr?: number
}

const EXTRA_VECTOR_MARKS: Record<string, BrandMark> = {
  'tcl': {
    img: '/brands/tcl.png',
    imgAr: 3.0909,
    title: 'TCL',
    vb: '-25.00 -31.40 2550.00 843.10',
    ar: 3.0246,
    tile: '#E4262D',
    fg: '#ffffff',
    d: 'm1718.1 468.9h-220.4c-6.4 1.6-3.1.8-7.4 18.3-10.8 45.3-39.3 82.8-84.8 101.5-52.5 21.4-127.8 21.1-178.7-1.5-112.6-50.1-137.5-193.8-98-291.8 19.6-48.8 56.6-86.6 105.4-105.9 51.6-20.5 129.9-18.5 178.2 4.7 44.7 21.6 68.6 59.4 77.9 106.4 2.6 12.9 1.6 11.1 15.4 11 69.7-.8 141.7 2.1 211-.3 3.3-47.3-23.2-114.4-43.2-146.1-24.7-39.1-57.9-71.7-96.6-96.2-91.9-58.3-187.8-75.4-317.6-67-120 7.7-210.6 50.9-273 111.3-136.8 132.7-151.3 409.3.5 552l24.9 22.7c65.6 55.6 161.2 82.5 248.3 89.4 117.7 9.3 233.9-10.5 315.7-64.3 66.4-43.7 136-126.3 142.4-244.5zm-1718.1-225 283 .2.3 507.2 252.8.2.5-507 282.8-.3v-204.4l-818.6-.7zm1853.7 507.3 644 .5c2.3-16 2.1-187.2-.7-195.9l-398.7-.3v-516.2l-244.3-.7c-3.6 18.8-1.1 560.7-1.1 623.7 0 23.1-2.5 68.6 1 89z',
  },
  'aoc': {
    title: 'AOC',
    vb: '-14.37 -16.81 1466.15 514.79',
    ar: 2.8481,
    tile: '#15548B',
    fg: '#ffffff',
    d: 'M668.12 4.31c-46.726 8.19-72.735 19.75-97.784 45.28-39.02 39.018-41.909 53.469-39.98 203.76l1.443 124.28 13.007 24.564c31.791 60.697 84.778 81.41 206.167 80.93 128.616 0 187.38-29.387 209.541-104.53 10.599-35.164 10.114-236.999 0-272.162C944.135 51.036 895.001 14.426 825.637 4.31c-39.018-5.3-124.762-5.3-157.516 0zm135.842 112.236c30.345 10.599 34.198 25.531 32.754 131.024-1.445 100.193-3.373 107.903-30.347 118.98-19.75 8.67-96.824 8.191-117.536-.483-26.009-11.08-29.381-26.01-29.381-124.279 0-121.87 6.26-131.021 89.114-131.021 21.193 0 46.241 2.409 55.396 5.78zM1141.633 6.719c-65.51 12.042-104.53 47.206-118.016 107.901-9.15 39.018-11.078 203.761-2.889 246.63 7.705 40.944 27.938 76.592 53.467 93.93 32.755 21.678 70.81 28.424 165.708 28.424 97.784 0 121.389-5.781 157.032-39.5 27.939-26.01 37.092-50.58 39.017-105.01l1.448-38.537h-130.06l-2.408 21.677c-3.852 31.79-11.563 42.389-35.164 48.65-25.533 6.746-82.373 2.407-97.788-7.706-20.229-13.486-23.121-27.937-23.6-122.834 0-78.998.963-91.04 8.668-103.084 12.043-18.306 35.649-26.975 73.22-26.975 52.022 0 74.664 15.416 74.664 51.061v11.56h131.503l-2.893-42.39c-4.812-80.926-32.754-114.163-105.01-126.205-41.904-6.744-143.546-5.3-186.899 2.408zM281.315 9.127c-26.978 6.743-40.465 13.97-59.733 31.793-26.493 23.603-44.797 55.396-92.003 158.48-22.16 47.687-60.213 130.06-84.782 183.047L0 478.787l61.176 1.445c33.24.483 63.102.483 65.995-.965 2.888-.96 37.572-72.255 77.072-157.513 39.5-85.744 76.588-164.263 82.853-173.897 12.523-20.712 32.756-32.755 54.432-32.755h14.451V481.195h125.242V4.31l-92.488.481c-51.057.483-99.228 2.41-107.418 4.335z',
  },
  'apc': {
    title: 'APC',
    vb: '1.55 54.54 182.57 52.92',
    ar: 3.4496,
    tile: '#DA291C',
    fg: '#ffffff',
    d: 'M35.262 105.092l-6.326-11.29h22.872L40.323 69.47l-16.838 35.622H3.338l26.376-48.08h21.218l26.182 48.08H35.262zM77.211 77.159h25.111c6.326 0 8.857-.389 8.857-4.867 0-4.282-2.045-4.769-8.564-4.769H77.114l-5.645-10.511h35.428c16.742 0 22.971 7.299 22.971 15.086 0 7.494-5.742 15.767-24.139 15.767H97.36v17.227H77.114V77.159h.097z M182.328 101.492c-6.035 2.822-13.529 4.184-21.51 4.184-24.139 0-32.412-13.431-32.412-24.526 0-14.015 12.264-24.819 33.385-24.819 7.689 0 14.404 1.168 20.049 3.309v13.918c-5.838-3.114-10.9-4.477-16.838-4.477-10.121 0-18.395 4.575-18.395 11.874 0 7.203 8.467 11.875 18.59 11.875 5.84 0 10.609-1.168 17.131-4.185v12.847z',
  },
  'gamemax': {
    img: '/brands/gamemax.png',
    imgAr: 4.5818,
    title: 'GameMax',
    vb: '0.96 50.90 190.83 90.96',
    ar: 2.0979,
    tile: '#101013',
    fg: '#ffffff',
    d: 'M66.709 78.627H53.785s-2.952 0-4.792-2.228c-1.625-1.968-1.574-3.915-1.574-3.915l.007-3.847s-.044-1.854 1.58-3.823c1.84-2.228 4.792-2.228 4.792-2.228h15.65v3.742H53.894s-.904.009-1.726.83c-.821.821-.654 1.479-.654 1.479l-.007 3.847s-.174.75.647 1.571 1.726.83 1.726.83h10.281s1.723-.028 1.723-1.336-1.712-1.136-1.712-1.136h-9.098l-.03-3.781h11.448s2.957-.077 2.957 3.761v2.454s0 3.78-2.74 3.78zM88.842 73.265v-3.708H78.593v3.708h10.249z M86.743 66.33s1.417 0 2.875 1.267c1.273 1.105 1.363 2.766 1.363 2.766v8.265h4.034v-8.047s.076-3.062-2.508-5.492c-2.657-2.501-5.273-2.501-5.273-2.501h-6.787s-2.617 0-5.274 2.501c-2.583 2.431-2.507 5.492-2.507 5.492v8.047h4.033v-8.265s.09-1.661 1.363-2.766c1.458-1.267 2.876-1.267 2.876-1.267h5.805zM110.924 75.936l6.006-7.318v10.009h4.033v-16.04h-4.033l-7.36 9.138-7.304-9.138H98.23v16.04h4.036V68.618l6.004 7.318h2.654zM145.766 78.627H130.1s-2.951 0-4.791-2.228c-1.625-1.968-1.574-3.915-1.574-3.915l.006-3.847s-.043-1.854 1.58-3.823c1.842-2.228 4.793-2.228 4.793-2.228h15.65v3.742h-15.555s-.904.009-1.727.83c-.82.821-.654 1.479-.654 1.479l-.006 3.847s-.174.75.646 1.571c.822.821 1.727.83 1.727.83h15.57v3.742h.001z M145.766 72.413h-14.719l-.029-3.781h14.748v3.781zM72.611 79.82H57.784l-6.433 7.836s-3.598-11.557-7.312-18.146c-.204-.361-.709-.783-1.418-1.259v-8.816h10.387v-5.781H36.866l.013 11.242c-1.342-.785-2.711-1.633-3.954-2.533-4.164-3.019-11.378-8.723-11.378-8.723s-2.895 24.987-6.485 43.284c-3.591 18.295-12.228 43.064-12.228 43.064s9.921-5.232 17.227-8.723c6.163-2.943 11.12-5.451 11.12-5.451s1.199-2.615 2.398-5.123c.968-2.025 2.718-6.037 3.356-7.51l.017 14.646v.074h16.143v-5.781H42.646c1.158-1.078 4.229-3.949 5.543-5.262 1.635-1.637 5.124-5.809 5.124-5.809s.151 2.568-.108 4.516c-.219 1.635-1.526 5.342-1.526 5.342l16.026-2.834s4.034-13.736 4.797-22.895c.517-6.2.109-15.358.109-15.358z M175.857 110.334c-7.238-10.953-12.865-16.354-12.865-16.354s8.504-14.392 12.102-22.678c2.816-6.484 7.336-18.534 7.336-18.534s-13.15 8.147-24.381 13.914l.016-13.024h-16.143v5.781h10.387v10.834c-3.734 3.087-5.355 6.044-5.355 6.044v3.38h-3.156l-1.629 1.526-3.059-1.526h-25.621s5.629 5.216 9.881 8.814c4.252 3.598 9.314 8.628 9.314 8.628s-2.834 5.344-5.016 9.158c-2.18 3.816-5.895 11.309-5.895 11.309s6.645.553 9.166.902c3.924.545 7.91 1.477 7.91 1.477s2.992-2.785 4.301-4.092c1.307-1.309 5.123-4.361 5.123-4.361s2.201 2.268 4.035 4.186v6.406h-10.475v5.781h16.143v-.074l.008-6.459c2.42 2.314 4.852 4.596 4.852 4.596s5.662 2.027 12.693 4.535c7.033 2.506 14.393 6.867 14.393 6.867s-5.996-14.827-14.065-27.036z M117.094 97.031c-2.865-7.761-8.613-16.571-8.613-16.571s-7.305.694-12.974.694-13.083-1.021-13.083-1.021-4.471 6.433-8.504 17.662c-4.034 11.23-3.82 19.904-3.82 19.904s4.015-.438 7.193-.645c4.798-.311 9.594-.531 9.594-.531s.196-2.955.552-4.555c.17-.764.422-1.537.666-2.205 2.223.883 4.788 1.371 7.459 1.371 2.64 0 5.175-.477 7.378-1.34.34.85.715 1.924.959 3.047.232 1.07.43 3.629.43 3.629s4.033.154 8.83.422c3.822.213 8.178.672 8.178.672s-.866-11.375-4.245-20.533zm-33.327 9.418c-1.515-1.516-2.316-3.277-2.316-5.094 0-1.818.801-3.578 2.316-5.094 2.627-2.627 7.037-4.196 11.796-4.196 4.759 0 9.169 1.569 11.796 4.196 1.516 1.516 2.316 3.275 2.316 5.094 0 5.121-6.332 9.289-14.112 9.289-4.759.001-9.169-1.568-11.796-4.195z M108.611 101.389c0-.693-.137-1.369-.387-2.014-.117.188-.648.721-3.707 1.23-1.43.238-3.412.16-5.951-.236 0 0-1.293 1.09-6.266 2.379-2.143.557-5.95.477-7.458-1.031-.788-.787-1.474-1.982-1.447-3.406a5.714 5.714 0 0 0-.881 3.078c0 4.594 5.842 8.318 13.048 8.318 7.208 0 13.049-3.725 13.049-8.318z',
  },
  'unomat': {
    img: '/brands/unomat.png',
    imgAr: 4.469,
    title: 'Unomat',
    vb: '2.41 82.30 187.94 28.16',
    ar: 6.6751,
    tile: '#1F3D8F',
    fg: '#ffffff',
    d: 'M73.622 84.144h-8.32c-1.223 0-2.324.489-3.181 1.468-.856 1.102-1.346 2.203-1.346 3.671v8.687h6.484V89.161h12.724V97.97h6.484v-8.687c0-1.468-.489-2.569-1.346-3.671-.856-.979-1.958-1.468-3.181-1.468h-8.318zm0 19.452v5.017h8.32c1.223 0 2.324-.489 3.181-1.591a5.333 5.333 0 0 0 1.346-3.548v-5.505h-6.484V103.596h-6.363zm0 0v5.017h-8.32c-1.223 0-2.324-.489-3.181-1.591a5.333 5.333 0 0 1-1.346-3.548v-5.505h6.484V103.596h6.363zm101.302-19.452h13.581v4.894l-8.688.122v19.453h-7.096V89.159h-9.42v-5.016h11.623v.001zm-65.088 0h19.207c1.225 0 2.326.489 3.182 1.468.857 1.102 1.346 2.203 1.346 3.671v19.33h-6.484V89.159H114.73v19.453h-7.098V89.159H95.399l-.122 2.447v14.559l.122 2.447h-6.484v-19.33c0-1.468.489-2.569 1.346-3.671.856-.979 1.958-1.468 3.181-1.468h16.394v.001zm-72.429 0h-5.016v24.469h7.096V89.159h12.357v19.453h6.362v-19.33c0-1.468-.367-2.569-1.346-3.671-.856-.979-1.958-1.468-3.181-1.468H37.407v.001zm105.95 16.882h12.234v7.586h6.484v-19.33c0-1.468-.488-2.569-1.346-3.671-.855-.979-1.957-1.468-3.18-1.468h-16.395c-2.814.122-4.895 1.713-4.895 5.016v19.453h7.096v-7.586h.002zm12.235-4.282h-12.234v-7.585h12.234v7.585zM9.268 108.612c-2.814-.122-4.894-1.713-5.016-5.017V84.144h7.096v19.452h12.357V84.143h6.484v19.33c0 1.346-.489 2.569-1.346 3.67-.979.979-2.08 1.469-3.303 1.469H9.268z',
  },
  'reaction': {
    title: 'Reaction',
    vb: '18.38 89.67 158.80 16.17',
    ar: 9.8228,
    tile: '#525E74',
    fg: '#ffffff',
    d: 'M148.99 95.856c0-1.865-.523-3.133-1.344-3.73-.746-.597-2.162-.896-4.104-.896-2.162 0-3.506.299-4.102.896-.896.597-1.27 1.865-1.27 3.73v3.507c0 1.939.373 3.357 1.27 3.953.596.598 1.939.895 4.102.895 2.09 0 3.432-.297 4.104-.895.82-.596 1.344-2.014 1.344-3.953v-3.507zm-2.463 0v3.507c0 1.119-.297 1.939-.67 2.312-.373.299-1.119.373-2.314.373-1.268 0-2.014-.074-2.387-.373-.373-.373-.521-1.119-.521-2.312v-3.507c0-.97.148-1.641.521-2.014s1.119-.448 2.387-.448l2.314.373c.373.374.67.97.67 2.089zm13.055-4.476h4.104l5.297 10.594h.148l-.223-10.594h2.461v12.682h-4.102l-5.371-10.593h-.076l.225 10.593h-2.463V91.38zm-35.434-.149h2.461v12.832h-2.461V91.231zm-10.966 2.238h-3.58v10.593h-2.537V93.469h-3.73V91.38h9.848v2.089h-.001zm-30.586 2.76c0-1.641.373-2.835.97-3.581l.373-.373c.746-.672 2.163-1.045 4.028-1.045l3.73.522.82.896c.373.597.522 1.343.671 2.312v.671h-2.536v-.671c0-.746-.075-1.194-.448-1.343l-2.238-.224c-1.269 0-2.015.075-2.388.448-.373.373-.522 1.119-.522 2.387v2.835c0 1.418.149 2.164.522 2.537.373.373 1.119.447 2.388.447l2.238-.225c.373-.223.597-.746.597-1.641v-.598h2.462v.746c0 1.717-.448 2.836-1.492 3.357l-3.805.521c-2.164.076-3.506-.297-4.252-1.043-.597-.746-.97-2.09-1.119-3.955v-2.98h.001zm-13.801 3.507h-4.327l2.089-6.64h.149l2.089 6.64zm-3.954-8.505l-4.252 12.683h2.462l.895-2.312h5.446l.746 2.312h2.537l-4.252-12.683h-3.582zm-14.92 7.386h-5.894v3.357h6.267v2.088h-8.729V91.38h8.729v2.089h-6.267v3.133h5.894v2.015zm-20.44-6.341c-.597-.522-1.566-.746-2.984-.896h-6.565v12.682h2.462v-4.104h3.73c1.119 0 1.641.598 1.641 1.717v2.387h2.462v-2.387c0-.82-.075-1.566-.448-1.939-.373-.523-.895-.746-1.641-.896.895-.148 1.492-.596 1.865-1.268.224-.447.373-1.193.373-2.312 0-1.418-.224-2.387-.895-2.984zm146.14-.896v1.492h-.297v-1.269h-.076l-.297 1.269h-.225l-.373-1.269v1.269h-.225V91.38h.449l.297 1.269.225-1.269h.522zm-1.863.224h-.523v1.269h-.225v-1.269h-.521v-.224h1.27v.224h-.001zM27.542 93.842c.224.298.373.895.373 1.79 0 .821-.149 1.493-.373 1.866-.373.223-1.044.373-1.865.373h-3.282v-4.402h3.357c.894 0 1.491.15 1.79.373z',
  },}

const WORD_MARKS: Record<string, BrandMark> = {
  'mercusys': { title: 'Mercusys', word: 'MERCUSYS', tile: '#A31621', fg: '#ffffff' },
  /* ROUND 27 — hiksemi and ink-master had a designed wordmark standing in for
     a logo we did not have; both now carry their real mark. The tile colour
     is unchanged (it is the accent), the mark rides a white plate. */
  'hiksemi': { title: 'HIKSEMI', img: '/brands/hiksemi.png', imgAr: 5.8229, ar: 5.8229, tile: '#1C1E22', fg: '#F58220' },
  'ink-master': { title: 'Ink Master', img: '/brands/ink-master.png', imgAr: 1.8296, ar: 1.8296, tile: '#404A5C', fg: '#ffffff' },
  'game-revolution': { title: 'Game Revolution', word: 'GAME REVOLUTION', tile: '#5B21B6', fg: '#ffffff' },
  /* ROUND 27 — the house brand now carries its own mark instead of a
     typographic stand-in. `dtech.png` is the INK version: `.bl-plate` is
     white, and the file that ships in /public (white wordmark, for the
     dark header/footer/login) would have been invisible on it. Tile moved
     off an arbitrary blue onto the brand's own teal. */
  'dtech': { title: 'D-Tech', img: '/brands/dtech.png', imgAr: 2.0596, ar: 2.0596, tile: '#0aa2b0', fg: '#ffffff', word: 'D-Tech.' },
  /* Distributed but not yet a DB brand — here so that the day one is created
     in the admin it renders with its real mark, not a fallback colour tile. */
  'samsung': { title: 'Samsung', img: '/brands/samsung.png', imgAr: 5.5833, ar: 5.5833, tile: '#1428A0', fg: '#ffffff' },
  'apple': { title: 'Apple', img: '/brands/apple.png', imgAr: 0.8417, ar: 0.8417, tile: '#1D1D1F', fg: '#ffffff' },
  'logitech': { title: 'Logitech', img: '/brands/logitech.png', imgAr: 2.9759, ar: 2.9759, tile: '#00B8FC', fg: '#ffffff' },
}

export const BRAND_MARKS: Record<string, BrandMark> = {
  ...ED_BRAND_LOGOS,
  ...EXTRA_VECTOR_MARKS,
  ...WORD_MARKS,
}

/** Deterministic tile colours for brands created later in the admin. */
const FALLBACK_TILES = ['#0F766E', '#B45309', '#4338CA', '#9D174D', '#166534', '#7C2D12'] as const

export function getBrandMark(slug: string, name: string): BrandMark {
  const m = BRAND_MARKS[slug]
  if (m) return m
  let h = 0
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return {
    title: name,
    word: name,
    tile: FALLBACK_TILES[h % FALLBACK_TILES.length] ?? '#0F766E',
    fg: '#ffffff',
  }
}

/**
 * The mark itself — a fitted vector when one exists, a styled wordmark
 * otherwise. Wrap it in a tile that sets `background: mark.tile` and
 * `color: mark.fg` (the `.bl-tile` pattern).
 */
export function BrandMarkArt({
  slug,
  name,
  h = 40,
  maxW = 150,
}: {
  slug: string
  name: string
  h?: number
  maxW?: number
}) {
  const m = getBrandMark(slug, name)
  /* Real artwork first (round 27), on its own white plate so a full-colour
     mark never has to survive a saturated tile. */
  if (m.img && m.imgAr) {
    /* The plate scales with the mark, so one component serves a 180px hero
       tile and a 26px catalogue chip. Padding is taken OUT of the caller's
       box first, so plate + shadow never exceed h × maxW — every tile that
       carries a mark is `overflow: hidden`, and a mark clipped on one side
       reads as a broken logo. */
    const fit = Math.min(h, maxW / m.imgAr)
    const pad = Math.min(12, Math.max(3, Math.round(fit * 0.18)))
    const padX = Math.round(pad * 1.35)
    const H = Math.max(8, Math.min(h - pad * 2, (maxW - padX * 2) / m.imgAr))
    const W = +(H * m.imgAr).toFixed(1)
    /* A floor on the plate WIDTH, not on the mark: fitted purely to its own
       bounding box, ASUS (4.6:1) filled the tile while Dell (1.1:1) sat in a
       44px square next to it, and a wall of brand tiles read as ragged. The
       mark still gets its true aspect — the plate just stops shrinking. */
    const plateW = Math.min(maxW, Math.max(Math.round(maxW * 0.7), Math.round(W + padX * 2)))
    /* Below ~14px of mark height the plate stops helping: at `.edp-mark`'s
       h=15 the ASUS artwork fitted to 9px tall, which is a grey smear inside a
       white pill — strictly worse than the monochrome path, which was drawn
       for exactly that size. Small chips fall through to the vector/wordmark. */
    if (H >= 14) {
      return (
        <span
          className="bl-plate"
          style={{
            width: plateW,
            padding: `${pad}px ${padX}px`,
            borderRadius: Math.min(14, Math.max(5, Math.round(H * 0.3))),
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.img}
            alt=""
            aria-hidden
            width={W}
            height={+H.toFixed(1)}
            loading="lazy"
            decoding="async"
            style={{ width: W, height: +H.toFixed(1), objectFit: 'contain' }}
          />
        </span>
      )
    }
  }
  if (m.d && m.vb && m.ar) {
    const H = Math.min(h, maxW / m.ar)
    return (
      <svg viewBox={m.vb} width={+(H * m.ar).toFixed(1)} height={+H.toFixed(1)} aria-hidden focusable="false">
        <path fillRule="evenodd" fill="currentColor" d={m.d} />
      </svg>
    )
  }
  return <span className="bl-word">{m.word ?? name}</span>
}
