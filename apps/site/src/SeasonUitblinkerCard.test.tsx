import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SeasonUitblinkerCard } from './SeasonUitblinkerCard'
import { withoutIcons } from './without-icons'

const render = (uitblinker: Parameters<typeof SeasonUitblinkerCard>[0]['uitblinker']) =>
  withoutIcons(renderToStaticMarkup(<SeasonUitblinkerCard uitblinker={uitblinker} />))

const star = { average: '7,8', label: 'Uitblinker vorige wedstrijd', line: 'Thuis tegen Ajax, 3–1', name: 'Speler A' }

describe('the card Uitblinker on Spelers', () => {
  it('shows a season that is over with each winner, the source and the link to the Uitblinkers of the year', () => {
    const html = render({
      kind: 'year',
      source: 'Tot 2006/07: cijfers van bezoekers van de Fansite.',
      stars: [
        { ...star, label: 'Uitblinker van het jaar' },
        { ...star, label: 'Uitblinker van het jaar', name: 'Speler B' },
      ],
    })

    expect(html).toMatch(/<h2[^>]*>Uitblinker<\/h2>/)
    expect(html.match(/hf-winner-text/g)).toHaveLength(2)
    expect(html).toContain('Tot 2006/07: cijfers van bezoekers van de Fansite.')
    expect(html).toContain('<a href="/fans/uitblinker/van-het-jaar">Uitblinker van het jaar</a>')
    expect(html).not.toContain('Geef cijfers')
  })

  it('shows the last match with the fans, and a link named by the match while the window is open', () => {
    const html = render({
      kind: 'last-match',
      openMatch: 'sc Heerenveen – FC Twente',
      result: { star, supporters: '31 fans gaven cijfers.' },
    })

    expect(html).toContain('Speler A')
    expect(html).toContain('31 fans gaven cijfers.')
    expect(html).toContain(
      '<a aria-label="Geef cijfers voor sc Heerenveen – FC Twente" href="/fans/uitblinker">Geef cijfers</a>',
    )
  })

  it('has no link while the window is closed', () => {
    expect(render({ kind: 'last-match', result: { star, supporters: '31 fans gaven cijfers.' } })).not.toContain('<a ')
  })

  it('has only a short sentence and the link while the window is open and there is no result', () => {
    const html = render({ kind: 'last-match', openMatch: 'sc Heerenveen – FC Twente' })

    expect(html).toContain('Geef de spelers van de laatste wedstrijd een cijfer.')
    expect(html).toContain('href="/fans/uitblinker"')
    expect(html).not.toContain('hf-winner')
  })
})
