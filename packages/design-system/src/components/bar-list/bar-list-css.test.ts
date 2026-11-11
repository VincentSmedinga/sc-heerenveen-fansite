import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// jsdom doesn't apply rules in a cascade layer, so the test reads the files' text, without the
// comments.
const read = (file: string) => readFileSync(join(import.meta.dirname, '..', file), 'utf8').replace(/\/\*.*?\*\//gs, '')

describe('the track of a bar list', () => {
  it('is the colour of the page, or the track of the card it is on', () => {
    expect(read('bar-list/bar-list.css')).toContain(
      'background-color: var(--hf-card-track, var(--hf-colour-background-page));',
    )
  })

  it('is the tint of the track of a switch on a soft card, so it shows against the blue', () => {
    const soft = read('card/card.css').match(/\.hf-card-soft \{[^}]*\}/s)?.[0] ?? ''

    expect(soft).toContain('--hf-card-track: var(--hf-colour-background-track);')
  })
})
