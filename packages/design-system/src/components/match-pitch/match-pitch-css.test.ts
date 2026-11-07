import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (file: string) => readFileSync(join(import.meta.dirname, file), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')
const pitch = read('match-pitch.css')
const player = read('pitch-player.css')

describe('match-pitch.css', () => {
  it('has a grass mat with ten stripes, upright and lying down', () => {
    // Two colours of 10% each repeat five times: ten stripes.
    expect(pitch).toMatch(
      /repeating-linear-gradient\(\s*to bottom,\s*var\(--hf-colour-background-pitch\) 0 10%,\s*var\(--hf-colour-background-pitch-stripe\) 10% 20%\s*\)/u,
    )
    expect(pitch).toMatch(
      /repeating-linear-gradient\(\s*to right,\s*var\(--hf-colour-background-pitch\) 0 10%,\s*var\(--hf-colour-background-pitch-stripe\) 10% 20%\s*\)/u,
    )
  })

  it('has the halfway line, the centre circle, the penalty areas and the goal areas', () => {
    for (const line of ['half', 'circle', 'penalty-area', 'goal-area']) {
      expect(pitch).toContain(`.hf-match-pitch-line-${line}`)
    }
  })

  it('lies down from 40 rem and hides the names of a crowded formation only on the upright pitch', () => {
    expect(pitch).toMatch(/@container hf-match-pitch \(min-width: 40rem\)/u)
    expect(pitch).toMatch(/\.hf-match-pitch-crowded \.hf-pitch-player-name \{\s*display: none/u)
    expect(pitch).toMatch(/\.hf-match-pitch-crowded \.hf-pitch-player-name \{\s*display: flex/u)
  })

  it('has nothing that scrolls sideways or sets a minimum width that makes the names hook into each other', () => {
    expect(pitch).not.toMatch(/min-inline-size|overflow-x|scroll/u)
  })
})

describe('pitch-player.css', () => {
  it('shows "eruit" under the name only on a pitch wider than 36 rem', () => {
    expect(player).toMatch(/@container hf-match-pitch-field \(min-width: 36rem\) \{\s*display: block/u)
  })

  it('colours the ring with the colour of a win, on a see-through track, and leaves a gap round the disc', () => {
    expect(player).toMatch(/var\(--hf-colour-outcome-win\) var\(--hf-ring-length/u)
    expect(player).toMatch(/color-mix\(in srgb, var\(--hf-colour-line-graphic-surface\) 35%, transparent\)/u)
    expect(player).toMatch(/inset: calc\(var\(--hf-pitch-ring\) \+ var\(--hf-pitch-gap\)\)/u)
  })

  it('lets a long name run over two lines with hyphens, and then end in an ellipsis', () => {
    expect(player).toMatch(/-webkit-line-clamp: 2/u)
    expect(player).toMatch(/hyphens: auto/u)
  })

  it('keeps the ring and the disc visible in forced colours', () => {
    expect(player).toMatch(/@media \(forced-colors: active\)/u)
    expect(player).toMatch(/Highlight/u)
  })
})
