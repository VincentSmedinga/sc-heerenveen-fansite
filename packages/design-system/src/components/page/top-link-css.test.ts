import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Without the comments, which describe the rules in words.
const strip = (text: string) => text.replace(/\/\*.*?\*\//gs, '')
const css = strip(readFileSync(join(import.meta.dirname, 'top-link.css'), 'utf8'))
const index = strip(readFileSync(join(import.meta.dirname, '../../index.css'), 'utf8'))

// jsdom has no cascade layers and no scroll-driven animations, so the test reads the text of
// the file. What a browser does with it is tested in the browser (see e2e/top-link.spec.ts).
const own = css.match(/\n {2}\.hf-page-top-link \{([^{}]*)/)?.[1] ?? ''
const supports =
  css.match(/@supports \(animation-timeline: scroll\(\)\) and \(animation-range: 1px 2px\) \{([^{}]*)\}/)?.[1] ?? ''
const keyframes = css.match(/@keyframes hf-top-link-show \{(.*?\n {2}\})\n/s)?.[1] ?? ''

describe('the rule that shows the link to the top in top-link.css', () => {
  it('lets the scroll position of the page drive an animation, so there is no script', () => {
    expect(supports).toContain('animation-name: hf-top-link-show;')
    expect(supports).toContain('animation-timing-function: linear;')
    expect(supports).toContain('animation-fill-mode: both;')
    expect(supports).toContain('animation-timeline: scroll(root block);')
  })

  it('starts at the height of the small window and takes 1 pixel, so the link changes at that point', () => {
    expect(supports).toContain('animation-range: 100svh calc(100svh + 1px);')
  })

  it('changes visibility from hidden to visible, and not only the opacity, so a hidden link is out of reach', () => {
    expect(keyframes).toMatch(/from \{\s*visibility: hidden;\s*\}/)
    expect(keyframes).toMatch(/to \{\s*visibility: visible;\s*\}/)
    expect(keyframes).not.toContain('opacity')
    expect(supports).toContain('visibility: hidden;')
  })

  it('hides the link only in a browser that knows scroll-driven animations, so any other shows it always', () => {
    expect(supports).not.toBe('')
    expect(own).not.toContain('visibility')
    expect(own).not.toMatch(/animation/)
    expect(css.match(/animation-timeline: scroll\(root/g)).toHaveLength(1)
    expect(css.match(/visibility: hidden;/g)).toHaveLength(2)
  })

  it('has no transition on visibility, opacity or position: the link changes far above where it stands', () => {
    expect(own).not.toMatch(/transition:[^;]*(visibility|opacity|transform)/)
    expect(own).not.toContain('animation-duration')
  })

  it('is not part of the page in print', () => {
    expect(css).toMatch(/@media print \{\s*display: none;/)
  })
})

describe('the look of the link to the top in top-link.css', () => {
  it('is round and 44 by 44 pixels, like the theme button', () => {
    expect(own).toContain('block-size: 2.75rem;')
    expect(own).toContain('inline-size: 2.75rem;')
    expect(own).toContain('border-radius: 50%;')
    expect(css).toContain('block-size: 26px;')
  })

  it('takes its colours from the roles of links in the footer, and has no colour of its own', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(/i)
    expect(css).not.toMatch(/--hf-colour-(blue|red|grey|sand|steel)-\d+/)
    expect(new Set(css.match(/var\(--hf-colour-[a-z-]+\)/g))).toEqual(
      new Set(['var(--hf-colour-text-link)', 'var(--hf-colour-text-link-hover)']),
    )
  })

  it('comes forward under the mouse only on a device with a mouse, and when pressed and with the keyboard', () => {
    expect(css).toMatch(/&:active,\s*&:focus-visible \{[^}]*color: var\(--hf-colour-text-link-hover\);/)
    expect(css).toMatch(/@media \(hover: hover\) \{\s*&:hover \{[^}]*color: var\(--hf-colour-text-link-hover\);/)
    expect(own).not.toContain(':hover')
  })

  it('has a rim at rest, see-through, so the link does not change size', () => {
    expect(own).toContain('border: 1px solid transparent;')
  })

  it('moves with the motion tokens, so there is none with reduced motion', () => {
    expect(own).toContain('var(--hf-motion-duration-short)')
    expect(own).toContain('var(--hf-motion-ease-change)')
  })

  it('keeps an outline in forced colours, with a system colour', () => {
    expect(css).toMatch(/@media \(forced-colors: active\) \{\s*border-color: LinkText;/)
  })
})

describe('the link to the top in index.css', () => {
  it('is imported after page.css, so its rules come after those of the footer', () => {
    expect(index.indexOf('top-link.css')).toBeGreaterThan(index.indexOf('page.css'))
  })
})
