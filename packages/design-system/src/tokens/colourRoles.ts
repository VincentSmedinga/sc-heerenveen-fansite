import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/*
 * The colour roles of colour.css as hex values from the scales, for tests that check a contrast
 * ratio. jsdom doesn't resolve light-dark(), so the test reads the text of the file.
 */

const colour = readFileSync(join(import.meta.dirname, 'colour.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

/** A scale colour, such as `red-700`, as `#rrggbb`. */
export const scale = (name: string) => {
  const hex = colour.match(new RegExp(`--hf-colour-${name}: #([0-9a-f]{3,6});`))?.[1] ?? ''

  return `#${hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex}`
}

/** A colour role, such as `text-missing`, as the scale colour it picks in light and in dark. */
export const role = (name: string) => {
  const [, light, dark] =
    colour.match(
      new RegExp(
        `--hf-colour-${name}: light-dark\\(var\\(--hf-colour-([a-z0-9-]+)\\), var\\(--hf-colour-([a-z0-9-]+)\\)\\)`,
      ),
    ) ?? []

  return { dark: scale(dark ?? ''), light: scale(light ?? '') }
}

/** The colour a role has in a browser without light-dark(), as a scale colour. */
export const fallback = (name: string) =>
  scale(colour.match(new RegExp(`      --hf-colour-${name}: var\\(--hf-colour-([a-z0-9-]+)\\);`))?.[1] ?? '')

const channel = (value: number) =>
  value / 255 <= 0.04045 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4
const luminance = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16)

  return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}

/** The WCAG 2.2 contrast ratio between two `#rrggbb` colours. */
export const contrast = (a: string, b: string) => {
  const [high = 0, low = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x)

  return (high + 0.05) / (low + 0.05)
}
