import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'bar.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

/** The declarations of the first rule with this selector. */
function declarationsOf(selector: string) {
  const start = css.indexOf(`${selector} {`)

  return start === -1 ? '' : css.slice(start, css.indexOf('}', start))
}

describe('bar.css', () => {
  it('makes the wrapper the container for the query, and positions it so the hidden words of the headers stay in it', () => {
    expect(declarationsOf('.hf-bar-place')).toMatch(/container-type: inline-size/u)
    expect(declarationsOf('.hf-bar-place')).toMatch(/position: relative/u)
  })

  it('gives the space that is left to the name, so the columns of numbers sit close together', () => {
    expect(declarationsOf('.hf-bar-table thead th:not(.hf-numeric)')).toMatch(/inline-size: 100%/u)
  })

  it('makes the number with the bar bold', () => {
    expect(declarationsOf('.hf-bar-table td.hf-bar-value')).toMatch(/font-weight: 700/u)
  })

  it('draws the bar as long as the share the component gives, from the start side', () => {
    expect(declarationsOf('&::before')).toMatch(/inline-size: calc\(var\(--hf-bar-share\) \* 1%\)/u)
  })

  it('colours the bars with a calm part of the green of a win', () => {
    expect(declarationsOf('&::before')).toMatch(
      /background-color: color-mix\(in srgb, var\(--hf-colour-outcome-win\) 70%, transparent\)/u,
    )
  })

  it('keeps the bars visible in forced colours with a system colour', () => {
    expect(css).toMatch(/@media \(forced-colors: active\) \{\s*\.hf-bar::before \{\s*background-color: CanvasText/u)
  })

  it('hides the bar with a container query on the place of the table, not the screen', () => {
    expect(css).toMatch(/@container hf-bar-place \(inline-size < [\d.]+rem\) \{\s*\.hf-bar \{\s*display: none/u)
    expect(css).not.toMatch(/@media \((?:min|max)-width/u)
  })

  it('has no area that scrolls sideways', () => {
    expect(css).not.toMatch(/overflow-x|scroll/u)
  })
})
