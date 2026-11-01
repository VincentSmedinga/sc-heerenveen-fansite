import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Without the comments, which describe the rules in words.
const css = readFileSync(join(import.meta.dirname, 'wikipedia-credit.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

// jsdom animates nothing, so the test reads the text of the file. What a browser does with it
// is measured in the browser (see the pull request for #565).
const arrow = css.match(/\.hf-icon \{([^{}]*)\}/)?.[1] ?? ''
const supports = css.match(/@supports ([^{]*)\{(.*)\n {4}\}\n/s)
const condition = supports?.[1] ?? ''
const block = supports?.[2] ?? ''
const content = block.match(/&::details-content \{([^{}]*)\}/)?.[1] ?? ''
const open = block.match(/&\[open\]::details-content \{([^{}]*)\}/)?.[1] ?? ''

describe('the fold of the Wikipedia credit in wikipedia-credit.css', () => {
  it('animates only in a browser that can animate to auto and knows ::details-content', () => {
    expect(condition).toContain('interpolate-size: allow-keywords')
    expect(condition).toContain('selector(::details-content)')
    expect(block).toContain('interpolate-size: allow-keywords;')
    expect(content).not.toBe('')
  })

  it('is closed at no height and no opacity, and open at auto height and full opacity', () => {
    expect(content).toMatch(/block-size: 0;/)
    expect(content).toMatch(/opacity: 0;/)
    expect(open).toMatch(/block-size: auto;/)
    expect(open).toMatch(/opacity: 1;/)
  })

  it('leaves room for the focus ring in the clipped box, and keeps the height as it was', () => {
    // The ring is 0.1875rem thick and 0.125rem away (base/focus.css): the padding gives it room
    // and the margin takes that back.
    expect(block).toContain('--hf-wikipedia-credit-ring: calc(0.1875rem + 0.125rem);')
    expect(content).toContain('padding-block: var(--hf-wikipedia-credit-ring);')
    expect(content).toContain('margin-block: calc(-1 * var(--hf-wikipedia-credit-ring));')
    expect(block).toMatch(/display: flow-root;/)
  })

  it('moves the height and the opacity with the duration and curve of the arrow', () => {
    const duration = 'var(--hf-motion-duration-short) var(--hf-motion-ease-change)'

    expect(arrow).toContain(`transition: transform ${duration};`)
    expect(content).toContain(`block-size ${duration}`)
    expect(content).toContain(`opacity ${duration}`)
  })

  it('keeps a closing fold in view for the transition and hides it after it, out of the tab order', () => {
    expect(content).toMatch(
      /content-visibility var\(--hf-motion-duration-short\) var\(--hf-motion-ease-change\) allow-discrete/,
    )
  })

  it('has no delay, so reduced motion (a duration of 0s in the tokens) leaves no transition', () => {
    expect(css).not.toMatch(/delay/)
  })
})
