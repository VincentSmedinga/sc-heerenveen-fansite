import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (file: string) => readFileSync(join(import.meta.dirname, file), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')
const css = read('match-substitutes.css')
const disc = read('../match-pitch/pitch-player.css')

describe('match-substitutes.css', () => {
  it('draws the ring of the pitch without the grey track under the arc', () => {
    expect(css).toMatch(/--hf-pitch-ring-track: transparent/u)
    // The pitch keeps its quiet track: the property only replaces it where a list sets it.
    expect(disc).toMatch(/var\(--hf-pitch-ring-track, color-mix\(/u)
  })

  it('puts the lists of two teams side by side from 40 rem, and under each other below it', () => {
    expect(css).toMatch(/@container hf-match-substitutes \(min-width: 40rem\) \{\s*grid-template-columns: 1fr 1fr/u)
    // The container cannot ask about its own width: the columns are inside it.
    expect(css).toMatch(/\.hf-match-substitutes-columns \{\s*display: grid/u)
  })

  it('keeps the disc its size when the text is long', () => {
    expect(css).toMatch(/\.hf-pitch-player-disc \{\s*flex: none/u)
  })
})
