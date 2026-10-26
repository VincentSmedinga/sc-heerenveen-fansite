import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// jsdom doesn't apply rules in a cascade layer to an element and has no safe area, so the test
// reads the text of the file.
const css = readFileSync(join(import.meta.dirname, 'root.css'), 'utf8')

describe('the top edge in root.css', () => {
  it('is the top inset, with a fallback of 0 for a browser without insets', () => {
    expect(css).toContain('--hf-top-edge: env(safe-area-inset-top, 0px);')
  })

  it('is at least 8px in Safari on an iPhone or iPad, which is where Safari colours the status bar from a fixed strip', () => {
    const rule = css.match(/@supports \(-webkit-touch-callout: none\) \{([^{}]*)\}/)?.[1]

    expect(rule).toContain('--hf-top-edge: max(env(safe-area-inset-top, 0px), 8px);')
  })
})

describe('the scroll padding in root.css', () => {
  it('keeps an element with focus below the top edge, so behind neither the inset nor the strip', () => {
    expect(css).toContain('scroll-padding-block-start: var(--hf-top-edge);')
  })
})

describe('the text size adjustment in root.css', () => {
  it('is 100% on html in Safari on an iPhone or iPad, which only honours the prefixed property', () => {
    const rule = css.match(/@supports \(-webkit-touch-callout: none\) \{([^{}]*)\}/g)?.join('\n')

    expect(rule).toContain('-webkit-text-size-adjust: 100%;')
  })

  it('is 100% on html in browsers that know the unprefixed property', () => {
    const rule = css.match(/@supports \(text-size-adjust: 100%\) \{([^{}]*)\}/)?.[1]

    expect(rule).toContain('text-size-adjust: 100%;')
  })

  it('is set once, on html in the base layer, with both properties', () => {
    const base = css.match(/@layer hf\.base \{([\s\S]*)\}\s*$/)?.[1]
    const html = base?.match(/\n {2}html \{([\s\S]*?)\n {2}\}/)?.[1]

    expect(html).toContain('text-size-adjust: 100%;')
    expect(html).toContain('-webkit-text-size-adjust: 100%;')
  })

  it('is never a fixed size, which would stop a visitor from enlarging the text', () => {
    const values = [...css.matchAll(/(?<![\w-])(?:-webkit-)?text-size-adjust:\s*([^;)]+)[;)]/g)].map(
      (match) => match[1],
    )

    expect(values.length).toBeGreaterThan(0)
    expect(new Set(values)).toEqual(new Set(['100%']))
  })
})
