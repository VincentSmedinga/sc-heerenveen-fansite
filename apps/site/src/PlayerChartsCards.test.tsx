import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PlayerQuartersCard, PlayerRecordCard, PlayerSeasonBarsCard } from './PlayerChartsCards'
import { withoutIcons } from './without-icons'

describe('PlayerChartsCards', () => {
  it('gives each season as a link with its number as text', () => {
    const html = withoutIcons(
      renderToStaticMarkup(
        <PlayerSeasonBarsCard
          address={(season) => `/spelers/${season.replace('/', '-')}`}
          bars={{ kind: 'goals', rows: [{ season: '2003/04', value: 19 }], title: 'Doelpunten per seizoen' }}
        />,
      ),
    )

    expect(html).toContain('Doelpunten per seizoen')
    expect(html).toContain('href="/spelers/2003-04"')
    expect(html).toContain('<span class="hf-bar-list-value">19</span>')
  })

  it('gives the goals per quarter as text and says how many have no minute', () => {
    const html = withoutIcons(
      renderToStaticMarkup(<PlayerQuartersCard quarters={{ counts: [12, 10, 10, 6, 5, 7], total: 52, unknown: 2 }} />),
    )

    expect(html.replaceAll(/\u2060/gu, '').replaceAll('\u00A0', ' ')).toContain(
      '1–15: 12 · 16–30: 10 · 31–45: 10 · 46–60: 6 · 61–75: 5 · 76–90: 7',
    )
    expect(html).toContain('Van 2 van de 52 kennen we de minuut niet.')
  })

  it('puts every card on the soft surface of the side column', () => {
    const cards = [
      <PlayerSeasonBarsCard
        address={() => '#'}
        bars={{ kind: 'goals', rows: [{ season: '2003/04', value: 19 }], title: 'Doelpunten per seizoen' }}
        key="seasons"
      />,
      <PlayerQuartersCard key="quarters" quarters={{ counts: [1, 1, 1, 1, 1, 0], total: 5, unknown: 0 }} />,
      <PlayerRecordCard key="record" record={{ draws: 1, losses: 1, title: 'Uitslagen', wins: 2 }} />,
    ]

    for (const card of cards) {
      expect(renderToStaticMarkup(card)).toMatch(/^<section class="hf-card hf-card-soft"/)
    }
  })

  it('leaves the sentence about the minute out when every goal has one', () => {
    const html = renderToStaticMarkup(
      <PlayerQuartersCard quarters={{ counts: [1, 1, 1, 1, 1, 0], total: 5, unknown: 0 }} />,
    )

    expect(html).not.toContain('kennen we de minuut niet')
  })

  it('says the three results in words next to the bar', () => {
    const html = renderToStaticMarkup(
      <PlayerRecordCard record={{ draws: 61, losses: 82, title: 'Uitslagen met hem in het veld', wins: 114 }} />,
    )

    expect(html).toContain('114 gewonnen, 61 gelijk en 82 verloren.')
    expect(html).toContain('Uitslagen met hem in het veld')
  })
})
