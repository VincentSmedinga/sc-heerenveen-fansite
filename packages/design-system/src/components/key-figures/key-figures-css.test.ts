import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) =>
  readFileSync(join(import.meta.dirname, path), 'utf8').replaceAll(/\/\*[\s\S]*?\*\//gu, '')

describe('the CSS of the container queries of #1421', () => {
  it('lets four key figures across wait for the width of the list itself', () => {
    const css = read('key-figures.css')

    expect(css).toMatch(/\.hf-key-figures \{\s*container-name: hf-key-figures;\s*container-type: inline-size;/u)
    expect(css).toMatch(/@container hf-key-figures \(inline-size >= 42rem\) \{\s*\.hf-key-figures-across > /u)
    expect(css).not.toMatch(/@media \(width/u)
  })

  it('lets the list of players wait for the width of the block around it', () => {
    const css = read('../player-list/player-list.css')

    expect(css).toMatch(
      /\.hf-player-list-container \{\s*container-name: hf-player-list;\s*container-type: inline-size;/u,
    )
    expect(css).toMatch(/@container hf-player-list \(inline-size >= 32rem\) \{\s*\.hf-player-list \{\s*column-gap/u)
    expect(css).not.toMatch(/@media \(width/u)
    expect(read('../card-columns/card-columns.css')).not.toContain('.hf-player-list')
  })

  it('lets the bar of the results wait for the width of its line', () => {
    const css = read('../outcome-line/outcome-line.css')

    expect(css).toMatch(/\.hf-outcome-line \{\s*container-name: hf-outcome-line;\s*container-type: inline-size;/u)
    expect(css).toMatch(/@container hf-outcome-line \(inline-size >= 40rem\) \{\s*\.hf-outcome-line-bar \{/u)
    expect(css).not.toMatch(/@media \(width/u)
  })
})
