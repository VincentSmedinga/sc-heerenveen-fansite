import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Without the comments, which mention env() in words.
const css = readFileSync(join(import.meta.dirname, 'page.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

// jsdom doesn't apply rules in a cascade layer to an element and has no safe area, so the test reads the text of the file.
describe('the safe area insets in page.css', () => {
  const uses = [...css.matchAll(/env\(\s*safe-area-inset-[a-z]+[^)]*\)/g)].map(([use]) => use)

  it('uses all four insets: the header, the body and the footer clear the notch, and the bars of the phone', () => {
    expect(new Set(uses.map((use) => use.match(/safe-area-inset-[a-z]+/)?.[0]))).toEqual(
      new Set(['safe-area-inset-bottom', 'safe-area-inset-left', 'safe-area-inset-right', 'safe-area-inset-top']),
    )
  })

  it('gives every inset a fallback of 0, so a browser without insets keeps today’s sizes', () => {
    expect(uses.length).toBeGreaterThan(0)

    for (const use of uses) {
      expect(use).toMatch(/^env\(safe-area-inset-[a-z]+, 0(px)?\)$/)
    }
  })

  it('puts every inset that adds to a margin inside max(), so it can only add room and never take any away', () => {
    // Remove each max(…) that holds an env(). What is left is the strip, which is as tall as the inset and no more.
    const rest = css.replace(/max\([^;{}]*?env\(safe-area-inset-[a-z]+, 0px\)\)/g, '')

    expect([...rest.matchAll(/([a-z-]+):[^;]*env\(/g)].map(([, property]) => property)).toEqual(['block-size'])
  })

  it('has a strip over the top inset in the colour of the header, fixed, that takes no touch and has no height without an inset', () => {
    const strip = css.match(/&::before \{([^}]*)\}/)?.[1] ?? ''

    expect(strip).toContain('background-color: var(--hf-colour-background-header);')
    expect(strip).toContain('block-size: env(safe-area-inset-top, 0);')
    expect(strip).toContain('position: fixed;')
    expect(strip).toContain('pointer-events: none;')
  })
})
