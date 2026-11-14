import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FormationsCard } from './FormationsCard'

const rows = [
  { drawn: 3, formation: '4-3-3', lost: 2, played: 11, won: 6 },
  { drawn: 1, formation: '4-2-3-1', lost: 1, played: 2, won: 0 },
]

describe('FormationsCard', () => {
  it('is nothing without a formation', () => {
    expect(renderToStaticMarkup(<FormationsCard known={0} played={14} rows={[]} />)).toBe('')
  })

  it('has a heading, a table with a caption and column headers, and a row for each formation', () => {
    const html = renderToStaticMarkup(<FormationsCard known={13} level={3} played={13} rows={rows} />)

    expect(html).toContain('<h3 class="hf-heading-3 hf-heading-anchored" id="formaties">')
    expect(html).toContain('<caption')
    expect(html).toContain('Hoe vaak sc Heerenveen met welke formatie speelde')
    expect(html).toContain('>Formatie<')
    expect(html).toContain('>Resultaat<')
    expect(html).toContain('>4-3-3<')
    expect(html).toContain('>6–3–2<')
    expect(html).toContain('>0–1–1<')
    expect(html.indexOf('4-3-3')).toBeLessThan(html.indexOf('4-2-3-1'))
  })

  it('says how many of the played matches it counts', () => {
    expect(renderToStaticMarkup(<FormationsCard known={12} played={14} rows={rows} />)).toContain(
      'Op basis van 12 van de 14 gespeelde wedstrijden.',
    )
    expect(renderToStaticMarkup(<FormationsCard known={13} played={13} rows={rows} />)).toContain(
      'Op basis van alle 13 gespeelde wedstrijden.',
    )
  })

  it('explains the two short columns', () => {
    expect(renderToStaticMarkup(<FormationsCard known={13} played={13} rows={rows} />)).toContain(
      'G gespeeld. Resultaat: gewonnen–gelijk–verloren.',
    )
  })
})
