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

const channel = (value: number) =>
  value / 255 <= 0.04045 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4
const luminance = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16)

  return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}
const contrast = (a: string, b: string) => {
  const [high = 0, low = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x)

  return (high + 0.05) / (low + 0.05)
}

describe('the thumb of the segmented control', () => {
  it('takes its fill, its border and its shadow from colour roles, never from a scale', () => {
    expect(thumb).toContain('background-color: var(--hf-colour-background-thumb);')
    expect(thumb).toContain('border: 1px solid var(--hf-colour-border-input);')
    expect(thumb).toContain('box-shadow: 0 1px 2px var(--hf-colour-shadow-thumb);')
    expect(css).toContain('background-color: var(--hf-colour-background-track);')
    expect(css).not.toMatch(/var\(--hf-colour-(?:blue|grey|steel|sand)-/)
  })

  it.each(['light', 'dark'] as const)(
    'has a border that reaches 3:1 against the track and the thumb in %s',
    (theme) => {
      const border = role('border-input')[theme]
      const track = role('background-track')[theme]
      const fill = role('background-thumb')[theme]

      expect(contrast(border, track)).toBeGreaterThanOrEqual(3)
      expect(contrast(border, fill)).toBeGreaterThanOrEqual(3)
    },
  )

  it.each(['light', 'dark'] as const)('has labels that reach 4.5:1 on the track and on the thumb in %s', (theme) => {
    expect(contrast(role('text-secondary')[theme], role('background-track')[theme])).toBeGreaterThanOrEqual(4.5)
    expect(contrast(role('text-default')[theme], role('background-thumb')[theme])).toBeGreaterThanOrEqual(4.5)
  })

  it('has the fallback colours for a browser without light-dark(), the same as the light ones', () => {
    for (const name of ['background-track', 'background-thumb']) {
      const fallback = colour.match(new RegExp(`      --hf-colour-${name}: var\\(--hf-colour-([a-z0-9-]+)\\);`))?.[1]

      expect(scale(fallback ?? ''), name).toBe(role(name).light)
    }
  })

  it('slides with a transition on translate that takes its time and curve from the motion tokens', () => {
    expect(thumb).toContain('transition: translate var(--hf-motion-duration-short) var(--hf-motion-ease-change);')
    expect(thumb).toContain('translate: calc(var(--hf-segmented-index) *')
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
  it('is 44 pixels high, and the small size takes its height from the token', () => {
    expect(css).toContain('min-block-size: 2.75rem;')
    expect(css.slice(css.indexOf('&.hf-size-small'))).toContain('min-block-size: var(--hf-size-control-small);')
  })
})

describe('the slide between two pages', () => {
  const transitions = css.slice(css.indexOf('@supports (view-transition-name: none)'))

  it('joins the pages only without a wish for reduced motion', () => {
    expect(transitions).toMatch(
      /@media \(prefers-reduced-motion: no-preference\) \{\s*@view-transition \{\s*navigation: auto;\s*\}\s*\}/,
    )
    expect(css.match(/@view-transition/g)).toHaveLength(1)
  })

  it('names the thumb and the options, so the labels stay over the thumb, and leaves the rest of the page as it is', () => {
    expect(transitions).toContain('view-transition-name: hf-segmented-thumb;')
    expect(transitions.match(/view-transition-name: hf-segmented-option-\d;/g)).toHaveLength(4)
    expect(transitions).toMatch(
      /::view-transition-group\(root\),\s*::view-transition-old\(root\),\s*::view-transition-new\(root\) \{\s*animation: none;/,
    )
  })

  it('moves everything it names with the duration and the curve of the motion tokens', () => {
    expect(transitions).toContain('animation-duration: var(--hf-motion-duration-short);')
    expect(transitions).toContain('animation-timing-function: var(--hf-motion-ease-change);')
  })
})
