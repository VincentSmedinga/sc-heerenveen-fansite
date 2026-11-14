import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RefereesCard } from './RefereesCard'

const rows = [
  { drawn: 12, lost: 20, name: 'Bas Nijhuis', played: 44, won: 12 },
  { drawn: 9, lost: 14, name: 'Danny Makkelie', played: 41, won: 18 },
]

describe('RefereesCard', () => {
  it('is nothing without a referee', () => {
    expect(renderToStaticMarkup(<RefereesCard known={0} played={14} referees={0} rows={[]} />)).toBe('')
  })

  it('has a heading, a table with a caption and column headers, and the names as text', () => {
    const html = renderToStaticMarkup(<RefereesCard known={85} level={3} played={85} referees={2} rows={rows} />)

    expect(html).toContain('id="scheidsrechters"')
    expect(html).toContain('<caption')
    expect(html).toContain('>Scheidsrechter<')
    expect(html).toContain('>Bas Nijhuis<')
    expect(html).toContain('>Danny Makkelie<')
    expect(html).not.toContain('<th scope="row"><a')
    expect(html.indexOf('Bas Nijhuis')).toBeLessThan(html.indexOf('Danny Makkelie'))
  })

  it('explains the short columns', () => {
    expect(renderToStaticMarkup(<RefereesCard known={85} played={85} referees={2} rows={rows} />)).toContain(
      'G gespeeld, W winst, G gelijk, V verlies',
    )
  })

  it('says how many of the played matches it counts', () => {
    expect(renderToStaticMarkup(<RefereesCard known={80} played={85} referees={2} rows={rows} />)).toContain(
      'Op basis van 80 van de 85 gespeelde wedstrijden.',
    )
    expect(renderToStaticMarkup(<RefereesCard known={85} played={85} referees={2} rows={rows} />)).toContain(
      'Op basis van alle 85 gespeelde wedstrijden.',
    )
  })

  it('says how many referees there are for the top of all seasons only', () => {
    expect(renderToStaticMarkup(<RefereesCard known={85} played={85} referees={158} rows={rows} top />)).toContain(
      '158 scheidsrechters, de top 5 op aantal wedstrijden.',
    )
    expect(renderToStaticMarkup(<RefereesCard known={85} played={85} referees={158} rows={rows} />)).not.toContain(
      'de top 5',
    )
  })
})
