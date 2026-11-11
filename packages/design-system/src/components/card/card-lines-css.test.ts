import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { contrast, fallback, role, scale } from '../../tokens/colourRoles'

const read = (path: string) =>
  readFileSync(join(import.meta.dirname, '..', '..', path), 'utf8').replace(/\/\*.*?\*\//gs, '')

const cardCss = read('components/card/card.css')
const rule = (selector: string) => cardCss.match(new RegExp(String.raw`${selector} \{([^{}]*)\}`))?.[1] ?? ''

const properties = ['--hf-card-line', '--hf-card-line-strong', '--hf-card-line-graphic'] as const

// The surfaces with the rule that sets them: the base is the white surface, and sits in a
// :where() so a surface below wins.
const surfaces = [
  {
    background: 'background-surface',
    name: 'surface',
    selector: String.raw`:where\(\.hf-card:not\(\.hf-card-transparent\)\)`,
  },
  { background: 'background-surface-strong', name: 'surface-strong', selector: String.raw`\.hf-card-strong` },
  { background: 'background-surface-soft', name: 'surface-soft', selector: String.raw`\.hf-card-soft` },
  { background: 'background-surface-warm', name: 'surface-warm', selector: String.raw`\.hf-card-warm` },
] as const

describe('the lines of a card in card.css', () => {
  it.each(surfaces)(
    'sets the three properties on the surface $name, each from a colour token',
    ({ name, selector }) => {
      const body = rule(selector)

      for (const property of properties) {
        expect(body, `${name} ${property}`).toMatch(new RegExp(`${property}: var\\(--hf-colour-[a-z-]+\\);`))
      }
    },
  )

  it('sets the border of its surface as the first line, and the darker and the graphic line from their own roles', () => {
    for (const { name, selector } of surfaces) {
      const body = rule(selector)

      expect(body).toContain(`--hf-card-line: var(--hf-colour-border-${name});`)
      expect(body).toContain(`--hf-card-line-strong: var(--hf-colour-line-darker-${name});`)
      expect(body).toContain(`--hf-card-line-graphic: var(--hf-colour-line-graphic-${name});`)
    }
  })

  it('does not set them on the transparent surface, so what is in it keeps its own colour', () => {
    expect(rule(String.raw`\.hf-card-transparent`)).not.toMatch(/--hf-card-line/)
    // And the base rule leaves it out.
    expect(cardCss).toMatch(/:where\(\.hf-card:not\(\.hf-card-transparent\)\)/)
    expect(cardCss.match(/--hf-card-line: /g)).toHaveLength(4)
  })
})

describe('the graphic line of a surface', () => {
  it.each(surfaces)('reaches 3:1 against $name in light and in dark', ({ background, name }) => {
    const line = role(`line-graphic-${name}`)
    const surface = role(background)

    expect(contrast(line.light, surface.light)).toBeGreaterThanOrEqual(3)
    expect(contrast(line.dark, surface.dark)).toBeGreaterThanOrEqual(3)
  })

  it('is a sand step on the warm surface in light, and not blue', () => {
    expect(role('line-graphic-surface-warm').light).toBe(scale('sand-500'))
    expect(role('border-surface-warm').light).toBe(scale('sand-300'))
    expect(role('line-darker-surface-warm').light).toBe(scale('sand-400'))
  })

  it('keeps the values the issue promised on white, strong and soft', () => {
    expect(contrast(scale('steel-500'), scale('white')).toFixed(2)).toBe('4.19')
    expect(contrast(scale('steel-500'), scale('blue-100')).toFixed(2)).toBe('3.46')
    expect(contrast(scale('steel-500'), scale('blue-50')).toFixed(2)).toBe('3.85')
  })

  it('has the light value in a browser without light-dark()', () => {
    for (const { name } of surfaces) {
      expect(fallback(`line-graphic-${name}`)).toBe(role(`line-graphic-${name}`).light)
      expect(fallback(`line-darker-${name}`)).toBe(role(`line-darker-${name}`).light)
    }
  })

  it('goes darker than the border on every surface, in light and in dark', () => {
    for (const { background, name } of surfaces) {
      const surface = role(background)

      expect(contrast(role(`line-darker-${name}`).light, surface.light)).toBeGreaterThan(
        contrast(role(`border-${name}`).light, surface.light),
      )
      expect(contrast(role(`line-darker-${name}`).dark, surface.dark)).toBeGreaterThan(
        contrast(role(`border-${name}`).dark, surface.dark),
      )
    }
  })
})

describe('the parts that draw their lines with the lines of the card', () => {
  const uses: [string, string, string][] = [
    ['base/table.css', '--hf-card-line,', 'the line between the rows of a table'],
    ['base/elements.css', '--hf-card-line,', 'the rule'],
    ['base/elements.css', '--hf-card-line-graphic,', 'the bar of a quote'],
    ['base/forms.css', '--hf-card-line-strong,', 'a fieldset'],
    ['components/record-table/record-table.css', '--hf-card-line,', 'the rows of a record table'],
    ['components/input-table/input-table.css', '--hf-card-line,', 'the rows of a table to fill in'],
    ['components/news-item/news-item.css', '--hf-card-line,', 'the line above a news item'],
    ['components/discussion-item/discussion-item.css', '--hf-card-line,', 'the line above a discussion'],
    ['components/match/match.css', '--hf-card-line,', 'the line above a match'],
    ['components/short-match/short-match.css', '--hf-card-line,', 'the line above a short match'],
    ['components/bar-chart/bar-chart.css', '--hf-card-line,', 'the lines across a bar chart'],
    ['components/bar-chart/bar-chart.css', '--hf-card-line-graphic,', 'the ground of a bar chart'],
    ['components/donut-chart/donut-chart.css', '--hf-card-line-graphic,', 'the leader of a donut chart'],
    ['components/disclosure/disclosure.css', '--hf-card-line-strong,', 'a disclosure'],
    ['components/notice/notice.css', '--hf-card-line-strong,', 'a notice'],
    ['components/rich-text-editor/rich-text-editor.css', '--hf-card-line-strong,', 'the form for a link in the editor'],
  ]

  it.each(uses)('%s uses %s for %s', (file, property) => {
    expect(read(file)).toContain(`var(${property}`)
  })

  it('always gives a colour as the fallback, so a part outside a card does not change', () => {
    for (const [file] of uses) {
      const text = read(file)

      for (const [use] of text.matchAll(/var\(--hf-card-line[a-z-]*,[^;]*;/g)) {
        expect(use).toMatch(/^var\(--hf-card-line[a-z-]*, var\(--hf-colour-[a-z-]+\)\)/)
      }
    }
  })

  it('leaves the lines that have to stay as they are', () => {
    // Fields, selects and the editor's own border keep the colour that reaches 3:1.
    expect(read('base/forms.css')).toContain('var(--hf-colour-border-input)')
    expect(read('components/rich-text-editor/rich-text-editor.css')).toContain('var(--hf-colour-border-input)')
    expect(read('components/select/select.css')).toContain('var(--hf-colour-border-input)')
    // The data of a chart and the line of a standings table do not follow the card.
    expect(read('components/donut-chart/donut-chart.css')).toContain('stroke: var(--hf-colour-border-chart-slice)')
    expect(read('components/bar-chart/bar-chart.css')).toContain('stroke: var(--hf-colour-chart-line)')
  })
})
