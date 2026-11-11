import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { PlayerAside as PlayerAsideData } from './player-aside'
import type { CareerMatch } from './player-seasons'

import { PlayerAside } from './PlayerAside'
import { withoutIcons } from './without-icons'

const match = (id: number, extra: Partial<CareerMatch> = {}): CareerMatch => ({
  clubSlug: 'testdorp-fc',
  competition: 'Eredivisie',
  goalsAgainst: 3,
  goalsFor: 1,
  home: false,
  id,
  matchDate: '2003-02-04',
  opponent: 'Stormvogels Testdorp',
  round: String(id),
  season: '2002/03',
  ...extra,
})

const empty: PlayerAsideData = {
  against: undefined,
  assistGiver: undefined,
  competitions: undefined,
  europe: undefined,
  firstGoal: undefined,
  opponents: [],
}

const full: PlayerAsideData = {
  against: {
    goals: [
      {
        match: match(2, { home: true, matchDate: '1997-05-08', opponent: 'Roda Test', season: '1996/97' }),
        minute: 5,
        stoppage: undefined,
      },
    ],
    intro: 'Voor hij hier kwam, scoorde hij één keer tegen sc Heerenveen.',
  },
  assistGiver: { assists: 3, name: 'Ad Maat', slug: 'ad-maat' },
  competitions: {
    rows: [
      { competition: 'Eredivisie', count: 12 },
      { competition: 'KNVB Beker', count: 1 },
    ],
    title: 'Doelpunten per competitie',
  },
  europe: { championsLeague: 2, matches: 5, partial: true },
  firstGoal: { match: match(1), minute: 12, stoppage: undefined },
  opponents: [{ goals: 6, name: 'Testdorp FC', slug: 'testdorp-fc' }],
}

const render = (aside: PlayerAsideData, hrefs = true) =>
  withoutIcons(
    renderToStaticMarkup(
      <PlayerAside
        aside={aside}
        credit={<p>Bron: de bron</p>}
        matchHref={({ id }) => (hrefs ? `/wedstrijden/2002-03/wedstrijd-${id}` : undefined)}
      />,
    ),
  )

describe('the side column of a player', () => {
  it('is an aside with every card, and the credit last', () => {
    const html = render(full)

    expect(html).toMatch(/^<aside[^>]*aria-label="Meer cijfers over deze speler"/)
    const order = [
      '>Doelpunten per competitie<',
      '>Vaakst raak tegen<',
      '>Meer cijfers<',
      '>Tegen ons<',
      'Bron: de bron',
    ].map((text) => html.indexOf(text))

    expect(order.every((at) => at >= 0)).toBe(true)
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it('gives each row a name and a number, with the clubs as links to their page', () => {
    const html = render(full)

    expect(html).toContain(
      '<span class="hf-figure-list-name">Eredivisie</span><span class="hf-figure-list-figure">12</span>',
    )
    expect(html).toContain('<a href="/tegenstanders/testdorp-fc">Testdorp FC</a>')
    expect(html).toContain('<ol class="hf-figure-list"')
  })

  it('has the facts that we know, with links to the match and to the player who gave the assist', () => {
    const html = render(full)

    expect(html).toContain(
      '4 februari 2003, uit bij <a href="/wedstrijden/2002-03/wedstrijd-1">Stormvogels Testdorp (3–1)</a>',
    )
    expect(html).toContain('<a href="/spelers/ad-maat">Ad Maat</a>, 3 assists')
    expect(html).toContain('5, waarvan 2 in de Champions League (volgens de opstellingen die we hebben)')
  })

  it('shows a goal against us with the date, the match and the minute, as plain text without a page', () => {
    expect(render(full)).toContain(
      '8 mei 1997</span><a href="/wedstrijden/2002-03/wedstrijd-2">sc Heerenveen – Roda Test 1–3</a>',
    )
    expect(render(full, false)).toContain('8 mei 1997</span>sc Heerenveen – Roda Test 1–3')
    expect(render(full)).toContain('5′')
  })

  it('leaves out a card that has nothing, and has no "Meer cijfers" without a fact', () => {
    const html = render(empty)

    expect(html).not.toContain('<h2')
    expect(html).toContain('Bron: de bron')
    expect(render({ ...empty, europe: { championsLeague: 0, matches: 1, partial: false } })).toContain('>Meer cijfers<')
  })
})
