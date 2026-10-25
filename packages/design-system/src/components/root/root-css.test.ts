import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// jsdom doesn't apply rules in a cascade layer to an element and has no safe area, so the test reads the text of the file.
const css = readFileSync(join(import.meta.dirname, 'root.css'), 'utf8')

describe('the scroll padding in root.css', () => {
  it('keeps an element with focus below the top inset, with a fallback of 0 for a browser without insets', () => {
    expect(css).toContain('scroll-padding-block-start: env(safe-area-inset-top, 0);')
  })
})
