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

  it('gives every inset a fallback of 0px, so a browser without insets keeps today’s sizes', () => {
    expect(uses.length).toBeGreaterThan(0)

    for (const use of uses) {
      expect(use).toMatch(/^env\(safe-area-inset-[a-z]+, 0px\)$/)
    }
  })

  it('puts every inset inside max(), so it can only add room and never take any away', () => {
    // Remove each max(…) that holds an env(), and nothing may be left of an env().
    const rest = css.replace(/max\([^;{}]*?env\(safe-area-inset-[a-z]+, 0px\)\)/g, '')

    expect(rest).not.toContain('env(')
  })
})
