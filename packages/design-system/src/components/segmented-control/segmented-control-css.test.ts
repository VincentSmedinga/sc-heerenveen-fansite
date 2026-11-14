import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// jsdom doesn't apply rules in a cascade layer, so the test reads the files' text, without the
// comments, which mention the rules in words.
const read = (file: string) =>
  readFileSync(join(import.meta.dirname, '..', '..', file), 'utf8').replace(/\/\*.*?\*\//gs, '')

const css = read('components/segmented-control/segmented-control.css')
const colour = read('tokens/colour.css')

// The thumb is the first rule with ::before, up to the next rule that is not nested in it.
const thumb = css.slice(css.indexOf('&::before {'), css.indexOf('&[data-empty]::before'))

// A colour role as the pair it picks in light and in dark, as hex values from the scales.
const scale = (name: string) => {
  const hex = colour.match(new RegExp(`--hf-colour-${name}: #([0-9a-f]{3,6});`))?.[1] ?? ''

  return `#${hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex}`
}
const role = (name: string) => {
  const [, light, dark] =
    colour.match(
      new RegExp(
        `--hf-colour-${name}: light-dark\\(var\\(--hf-colour-([a-z0-9-]+)\\), var\\(--hf-colour-([a-z0-9-]+)\\)\\)`,
      ),
    ) ?? []

  return { dark: scale(dark ?? ''), light: scale(light ?? '') }
}

type Rgb = [number, number, number]

const channel = (value: number) =>
  value / 255 <= 0.04045 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4
const rgb = (hex: string): Rgb => {
  const n = Number.parseInt(hex.slice(1), 16)

  return [n >> 16, (n >> 8) & 255, n & 255]
}
const luminance = ([r, g, b]: Rgb) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
const contrast = (a: Rgb, b: Rgb) => {
  const [high = 0, low = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x)

  return (high + 0.05) / (low + 0.05)
}

// The track is a tint of one scale colour, in light and in dark:
// color-mix(in srgb, <colour> n%, transparent).
const tint = Object.fromEntries(
  ['light', 'dark'].map((theme, index) => {
    const mixes = [
      ...(colour
        .match(/--hf-colour-background-track: light-dark\(([^;]*)\);/s)?.[1]
        ?.matchAll(/color-mix\(in srgb, var\(--hf-colour-([a-z0-9-]+)\) (\d+)%, transparent\)/g) ?? []),
    ]
    const [, name = '', percentage = '0'] = mixes[index] ?? []

    return [theme, { colour: rgb(scale(name)), share: Number(percentage) / 100 }]
  }),
) as Record<'dark' | 'light', { colour: Rgb; share: number }>

// What the track comes to over a surface: the tint laid over the surface, channel by channel.
const overTrack = (theme: 'dark' | 'light', surface: Rgb): Rgb => {
  const { colour: tinted, share } = tint[theme]

  return surface.map((value, index) => (tinted[index] ?? 0) * share + value * (1 - share)) as Rgb
}

// Everything a switch can lie on: the page, the surface and the soft, strong and warm surfaces.
const surfaces = ['page', 'surface', 'surface-soft', 'surface-strong', 'surface-warm'] as const
const surface = (theme: 'dark' | 'light', name: (typeof surfaces)[number]) => rgb(role(`background-${name}`)[theme])

describe('the thumb of the segmented control', () => {
  it('takes its fill, its border and its shadow from colour roles, never from a scale', () => {
    expect(thumb).toContain('background-color: var(--hf-colour-background-thumb);')
    expect(thumb).toContain('border: 1px solid var(--hf-colour-border-input);')
    expect(thumb).toContain('box-shadow: 0 1px 2px var(--hf-colour-shadow-thumb);')
    expect(css).toContain('background-color: var(--hf-colour-background-track);')
    expect(css).not.toMatch(/var\(--hf-colour-(?:blue|grey|steel|sand)-/)
  })

  it.each(['light', 'dark'] as const)('has a track that is a see-through tint, in %s', (theme) => {
    expect(colour).toMatch(
      /--hf-colour-background-track: light-dark\(\s*color-mix\(in srgb, var\(--hf-colour-[a-z0-9-]+\) \d+%, transparent\),\s*color-mix\(in srgb, var\(--hf-colour-[a-z0-9-]+\) \d+%, transparent\)\s*\);/,
    )
    expect(tint[theme].share).toBeGreaterThan(0)
    expect(tint[theme].share).toBeLessThan(1)
  })

  it.each(['light', 'dark'] as const)('has a border that reaches 3:1 against the thumb in %s', (theme) => {
    expect(contrast(rgb(role('border-input')[theme]), rgb(role('background-thumb')[theme]))).toBeGreaterThanOrEqual(3)
  })

  describe.each(['light', 'dark'] as const)('in %s', (theme) => {
    it.each(surfaces)('has a border that reaches 3:1 against the track on %s', (name) => {
      const track = overTrack(theme, surface(theme, name))

      expect(contrast(rgb(role('border-input')[theme]), track)).toBeGreaterThanOrEqual(3)
    })

    it.each(surfaces)('has labels that reach 4.5:1 on the track on %s, and on the thumb', (name) => {
      const track = overTrack(theme, surface(theme, name))

      expect(contrast(rgb(role('text-secondary')[theme]), track)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(rgb(role('text-default')[theme]), rgb(role('background-thumb')[theme]))).toBeGreaterThanOrEqual(
        4.5,
      )
    })

    it.each(surfaces)('has a track that stays 1.1:1 away from %s, so it reads as a groove', (name) => {
      expect(contrast(overTrack(theme, surface(theme, name)), surface(theme, name))).toBeGreaterThanOrEqual(1.1)
    })
  })

  it('has the old solid colours for a browser without light-dark() or color-mix(), where the track is grey-200 and the thumb white', () => {
    const fallback = (name: string) =>
      scale(colour.match(new RegExp(`      --hf-colour-${name}: var\\(--hf-colour-([a-z0-9-]+)\\);`))?.[1] ?? '')

    expect(fallback('background-track')).toBe(scale('grey-200'))
    expect(fallback('background-thumb')).toBe(role('background-thumb').light)
  })

  it('slides with a transition on translate that takes its time and curve from the motion tokens', () => {
    expect(thumb).toContain('transition: translate var(--hf-motion-duration-medium) var(--hf-motion-ease-change);')
    expect(thumb).toContain('translate: calc(var(--hf-segmented-index) *')
  })

  it('lets the letters of an option go from regular to bold in the duration of the thumb', () => {
    expect(css).toContain('color var(--hf-motion-duration-short) var(--hf-motion-ease-change),')
    expect(css).toContain('font-weight var(--hf-motion-duration-medium) var(--hf-motion-ease-change);')
  })

  it('keeps a visible border in forced colours', () => {
    expect(thumb).toMatch(/@media \(forced-colors: active\) \{\s*border-color: CanvasText;\s*border-width: 2px;/)
  })

  it('is as wide as one option, less the edge on both sides', () => {
    expect(thumb).toContain('inline-size: calc(100% / var(--hf-segmented-count) - 2 * var(--hf-segmented-edge));')
    expect(css).toContain('--hf-segmented-edge: var(--hf-space-xs);')
  })
})

describe('the sizes of the segmented control', () => {
  it('has a compact variant that only changes the letters and the padding, not the height', () => {
    const compact = css.slice(css.indexOf('&.hf-segmented-compact'))

    expect(compact).toContain('padding-inline: var(--hf-segmented-edge);')
    expect(compact.slice(0, compact.indexOf('}'))).not.toContain('min-block-size')
  })

  it('is 44 pixels high, and the small size takes its height from the token', () => {
    expect(css).toContain('min-block-size: var(--hf-size-control);')
    expect(css.slice(css.indexOf('&.hf-size-small'))).toContain('min-block-size: var(--hf-size-control-small);')
  })
})

describe('the change of the choice', () => {
  it('uses no view transition between pages, which breaks when a page loads or scrolls up', () => {
    expect(css).not.toMatch(/view-transition|@view-transition/)
  })

  it('slides the thumb with the duration and the curve of the motion tokens, which are 0s with reduced motion', () => {
    expect(thumb).toContain('transition: translate var(--hf-motion-duration-medium) var(--hf-motion-ease-change);')
    expect(css).not.toContain('prefers-reduced-motion: no-preference')
  })

  it('has no animation that would run when a page loads', () => {
    expect(css).not.toMatch(/@keyframes|animation:/)
  })
})

describe('the space below a switch in a card', () => {
  it('comes from the flow of the card: the switch sets no margin of its own', () => {
    expect(css).not.toMatch(/\.hf-card > \.hf-segmented-control/u)
    expect(css).not.toMatch(/margin-block/u)
  })
})
