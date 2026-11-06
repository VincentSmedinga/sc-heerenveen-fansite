import atkinsonLatin from '@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-wght-normal.woff2'

import truculentaLatin from './fonts/truculenta-latin.woff2'

/**
 * The addresses of the two fonts that every page shows above the fold: Truculenta (our own
 * smaller file) and Atkinson Hyperlegible Next, both the latin subset, roman. A page that
 * preloads them has them in before the first paint, so the text does not jump when they replace
 * the fallback fonts. The bundler gives each file its hashed address, the same one that
 * `fonts.css` has, so the preload and the `@font-face` share one request. Only the site imports
 * this file: it is not part of `index.ts`, because Vitest and Storybook need none of it.
 */
export const preloadedFonts: readonly string[] = [truculentaLatin, atkinsonLatin]
