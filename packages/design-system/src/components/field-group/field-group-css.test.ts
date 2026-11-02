import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// jsdom doesn't apply rules in a cascade layer, so the test reads the text of the file.
const css = readFileSync(join(import.meta.dirname, 'field-group.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

describe('field-group.css', () => {
  it('keeps the tracks of a group with a sign at the start, so the sign takes no room that is left', () => {
    expect(css.match(/\.hf-field-group-separated \{([^}]*)\}/)?.[1]).toContain('justify-content: start;')
  })
})
