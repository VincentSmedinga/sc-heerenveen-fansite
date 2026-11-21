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
  it('has no look of its own: it is a RoundButton on the page, and round-button.css gives it its look', () => {
    expect(own).not.toMatch(/(?:^|\s)(?:color|background-color|border|block-size|inline-size|border-radius):/)
    expect(css).not.toContain(':hover')
    expect(css).not.toContain('forced-colors')
  })
})

describe('the link to the top in index.css', () => {
  it('is imported after page.css, so its rules come after those of the footer', () => {
    expect(index.indexOf('top-link.css')).toBeGreaterThan(index.indexOf('page.css'))
  })

  it('is imported after round-button.css, so it hides the link in print over the display of the round button', () => {
    expect(index.indexOf('top-link.css')).toBeGreaterThan(index.indexOf('round-button.css'))
  })
})
