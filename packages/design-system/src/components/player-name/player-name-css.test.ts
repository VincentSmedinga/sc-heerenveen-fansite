import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'player-name.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')
const rule = (selector: string) => css.match(new RegExp(String.raw`${selector} \{([^{}]*)\}`))?.[1] ?? ''

describe('the link in player-name.css', () => {
  it('keeps the rule of the plain link away from the link with a flag, so that one stays a row', () => {
    expect(css).toContain('.hf-player-name > a:not(.hf-player-name-link) {')
  })

  it('makes only the flag and the name a link, not the empty place beside them', () => {
    const body = rule(String.raw`\.hf-player-name-link`)

    expect(body).toContain('display: inline-flex;')
    expect(body).toContain('flex: 0 1 auto;')
    expect(body).toContain('align-self: flex-start;')
  })
})
