import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { ReportFigures } from './report-figures'

import { CleanSheetsShortCard, ReportShortCard, TopScorersShortCard } from './PlayersTopCards'
import { matchData } from './test-matches'
import { reportPlayer } from './test-report-figures'
import { withoutIcons } from './without-icons'

const now = new Date('2026-10-23T13:40:00Z')

/** The text of some HTML, as a screen reader and a copy have it. */
const plain = (html: string) => html.replaceAll(/<[^>]*>/g, '')

/** Players with an assist each: the places are 5 (one), 3 (two), 2 (four players) and 1. */
const players = [
  reportPlayer(1, 'Een Alleen', { assists: 5, minutes: 1170 }),
  reportPlayer(2, 'Twee Eerste', { assists: 3, minutes: 90 }),
  reportPlayer(3, 'Twee Tweede', { assists: 3, minutes: 90 }),
  reportPlayer(4, 'Vier Een', { assists: 2, minutes: 45 }),
  reportPlayer(5, 'Vier Twee', { assists: 2, minutes: 45 }),
  reportPlayer(6, 'Vier Drie', { assists: 2, minutes: 45 }),
  reportPlayer(7, 'Vier Vier', { assists: 2, minutes: 45 }),
  reportPlayer(8, 'Laatste Plaats', { assists: 1, minutes: 10 }),
]
const figures: ReportFigures = { known: 3, played: 3, players, seasonHasReports: true }

const cardOf = (figure: 'assists' | 'minutes') =>
  withoutIcons(renderToStaticMarkup(<ReportShortCard figure={figure} figures={figures} href={`/x#${figure}`} />))

describe('the small cards with a ranking', () => {
  it('show three places, a line each, with a place of one or two players named and a bigger place as a number', () => {
    const html = cardOf('assists')

    expect(html.match(/<li /g)).toHaveLength(3)
    expect(plain(html)).toContain('Een Alleen5')
    expect(plain(html)).toContain('Twee Eerste, Twee Tweede3')
    expect(plain(html)).toContain('4 spelers2')
    expect(plain(html)).not.toContain('Vier Een')
    expect(plain(html)).not.toContain('Laatste Plaats')
  })

  it('give a bar to every line, and leave it to the eye: it has no text and is hidden from a screen reader', () => {
    const html = cardOf('assists')

    expect(html.match(/aria-hidden="true" class="hf-bar-list-track"/g)).toHaveLength(3)
    expect(html).toContain('--hf-bar-list-share:100')
  })

  it('write the minutes as the large card does, a plain number', () => {
    expect(plain(cardOf('minutes'))).toContain('Een Alleen1170')
  })

  it('end with a link that says where it goes, a different text on each card', () => {
    expect(cardOf('assists')).toContain('<a href="/x#assists">Alle assists</a>')
    expect(cardOf('minutes')).toContain('<a href="/x#minutes">Alle minuten</a>')
  })

  it('are left out when nobody has a number', () => {
    const empty: ReportFigures = { ...figures, players: [reportPlayer(1, 'Geen Assist')] }

    expect(renderToStaticMarkup(<ReportShortCard figure="assists" figures={empty} href="/x" />)).toBe('')
  })

  it('show the top scorers of the season with the link to the large card', () => {
    const html = withoutIcons(
      renderToStaticMarkup(
        <TopScorersShortCard href="/spelers/cijfers#doelpuntenmakers" matches={matchData.matches} />,
      ),
    )

    expect(html).toContain('<h2 class="hf-heading-2" id="kort-topscorers">Topscorers</h2>')
    expect(html).toContain('href="/spelers/cijfers#doelpuntenmakers"')
    expect(html.match(/<li /g)!.length).toBeLessThanOrEqual(3)
  })
})

describe('the small card De nul gehouden', () => {
  const render = (matches = matchData.matches) =>
    withoutIcons(
      renderToStaticMarkup(
        <CleanSheetsShortCard
          href="/wedstrijden/cijfers#de-nul-gehouden"
          matches={matches}
          now={now}
          when="dit seizoen"
        />,
      ),
    )

  it('is one number and one line, with the number read together with what it counts, and no list', () => {
    const html = render()

    expect(html).toContain('<p class="hf-big-figure">')
    expect(plain(html)).toMatch(/\d+ keer de nul gehouden/)
    expect(plain(html)).toMatch(/In \d+ wedstrijden?\. De laatste keer: \d–0 (thuis tegen|uit bij) .+, .+\./)
    expect(html).not.toContain('<li')
    expect(html).toContain(
      '<a href="/wedstrijden/cijfers#de-nul-gehouden">Alle wedstrijden waarin we de nul hielden</a>',
    )
  })

  it('says "Nog niet" without a line about the last time when we have not kept a clean sheet', () => {
    const conceded = matchData.matches.map((match) => ({
      ...match,
      goalsAgainst: match.status === 'played' ? 1 : null,
    }))
    const html = render(conceded)

    expect(plain(html)).toContain('0 keer de nul gehouden')
    expect(plain(html)).toContain('Nog niet de nul gehouden dit seizoen.')
    expect(html).not.toContain('De laatste keer')
  })

  it('is left out before a match is played', () => {
    expect(render(matchData.matches.filter((match) => match.status !== 'played'))).toBe('')
  })
})
