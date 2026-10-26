import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'standings-table.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

/** The declarations of the first rule with this selector. */
function declarationsOf(selector: string) {
  const start = css.indexOf(`${selector} {`)

  return start === -1 ? '' : css.slice(start, css.indexOf('}', start))
}

describe('standings-table.css', () => {
  it('makes the wrapper the container for the query, and positions it so the hidden words of the headers stay in it', () => {
    expect(declarationsOf('.hf-standings')).toMatch(/container-type: inline-size/u)
    expect(declarationsOf('.hf-standings')).toMatch(/position: relative/u)
  })

  it('makes the points bold, like the row of our own club', () => {
    expect(declarationsOf('.hf-standings-table td.hf-standings-points')).toMatch(/font-weight: 700/u)
  })

  it('draws the bar as long as the share the component gives, from the start side', () => {
    expect(declarationsOf('&::before')).toMatch(/inline-size: calc\(var\(--hf-points-share\) \* 1%\)/u)
  })

  it('colours the bars with the green of a win, a calm part of it and the whole for our own row', () => {
    expect(declarationsOf('&::before')).toMatch(
      /background-color: color-mix\(in srgb, var\(--hf-colour-outcome-win\) 70%, transparent\)/u,
    )
    expect(declarationsOf('.hf-standings-table-own .hf-standings-bar::before')).toMatch(
      /background-color: var\(--hf-colour-outcome-win\)/u,
    )
  })

  it('keeps the bars visible in forced colours with a system colour', () => {
    expect(css).toMatch(
      /@media \(forced-colors: active\) \{\s*\.hf-standings-bar::before \{\s*background-color: CanvasText/u,
    )
  })

  it('hides the bar with a container query on the place of the table, not the screen', () => {
    expect(css).toMatch(
      /@container hf-standings \(inline-size < [\d.]+rem\) \{\s*\.hf-standings-bar \{\s*display: none/u,
    )
    expect(css).not.toMatch(/@media \((?:min|max)-width/u)
  })

  it('has no area that scrolls sideways', () => {
    expect(css).not.toMatch(/overflow-x|hf-standings-scroll/u)
  })
})
