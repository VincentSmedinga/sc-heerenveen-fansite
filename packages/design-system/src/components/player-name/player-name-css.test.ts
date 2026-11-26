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

describe('the line behind the name in player-name.css', () => {
  it('goes to the next line as a whole, and breaks inside the column when it is wider than that', () => {
    const body = rule(String.raw`\.hf-player-name-behind \.hf-player-name-meta`)

    expect(body).toContain('display: inline-block;')
    expect(body).toContain('max-inline-size: 100%;')
    expect(body).not.toContain('nowrap')
  })

  it('makes room for the flag beside every line, so a long word never leaves it alone', () => {
    const column = rule(String.raw`\.hf-player-name-line-flagged`)
    const flag = rule(String.raw`\.hf-player-name-flag`)

    expect(column).toContain('padding-inline-start: var(--hf-player-name-flag-place);')
    expect(column).toContain('position: relative;')
    expect(flag).toContain('position: absolute;')
    expect(flag).toContain('inset-inline-start: 0;')
  })

  it('keeps the link in the text, so the name goes on from the same place as the line', () => {
    const body = rule(String.raw`\.hf-player-name-behind \.hf-player-name-link`)

    expect(body).toContain('display: inline;')
    expect(body).toContain('padding-block: var(--hf-space-xs);')
  })
})
