import { readFileSync } from 'node:fs'

import { headerColourOf } from './header-colour.ts'

/**
 * The colour of the header as the two variables that src/colours.ts reads, made from the colour tokens of the design
 * system. next.config.ts puts them into the code and vitest.config.ts into the tests. This file runs where the repository
 * is, never on the server.
 */
export function headerColourEnv() {
  const { dark, light } = headerColourOf(
    readFileSync(new URL('../../../packages/design-system/src/tokens/colour.css', import.meta.url), 'utf8'),
  )

  return { HEADER_COLOUR_DARK: dark, HEADER_COLOUR_LIGHT: light }
}
