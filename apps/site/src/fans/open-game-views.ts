import type { GameLinkItem, OpenGameCardItem } from '@fansite/design-system'

import { fansPath } from '#src/fans-paths'

import type { OpenGame } from './open-games'

import { fjouwerPath } from './fjouwer-form'
import { clubsOf, deadlineText, predictionPath } from './prediction'
import { ratingPath } from './rating'

// The words of the open games (issue 1645): the cards on the home page and the links under a
// match on Wedstrijden.

const fantestPath = `${fansPath}/fantest`
const monthFormat = new Intl.DateTimeFormat('nl-NL', { month: 'long', timeZone: 'UTC' })
const minute = 60 * 1000

const clubsLine = (match: Parameters<typeof clubsOf>[0]) => {
  const { away, home } = clubsOf(match)

  return `${home} – ${away}`
}

/** The card of each open game on the home page. */
export function openGameCards(games: readonly OpenGame[], now = new Date()): OpenGameCardItem[] {
  return games.map((open) => {
    // The Fantest closes at midnight, which reads best as the last minute of the month.
    const last = open.game === 'fantest' ? new Date(open.closesAt.getTime() - minute) : open.closesAt
    const tag = deadlineText(last, now)

    if (open.game === 'fantest') {
      const month = monthFormat.format(new Date(Date.UTC(2000, open.month - 1, 1)))

      return {
        game: open.game,
        href: fantestPath,
        link: 'Doe de test',
        linkName: `Doe de test van ${month}`,
        name: 'Fantest',
        tag,
      }
    }

    const match = clubsLine(open.match)
    const words = {
      fjouwer: { href: fjouwerPath, link: 'Kies je vier', linkName: `Kies je vier voor ${match}`, name: 'Fjouwer' },
      prognose: { href: predictionPath, link: 'Voorspel', linkName: `Voorspel ${match}`, name: 'Prognose' },
      uitblinker: {
        href: ratingPath,
        link: 'Geef cijfers',
        linkName: `Geef cijfers voor ${match}`,
        name: 'Uitblinker',
      },
    }[open.game]

    return { game: open.game, tag, ...words }
  })
}

const linkWords = {
  fjouwer: { href: fjouwerPath, text: 'Welke fjouwer stel jij op?' },
  prognose: { href: predictionPath, text: 'Wat denk je dat het wordt?' },
  uitblinker: { href: ratingPath, text: 'Wie vond jij de besten?' },
} as const

/**
 * The links of the open games of the season, under the match each is about, by
 * `<competition>|<round>` like the addresses of the pages of the matches.
 */
export function openGameLinks(games: readonly OpenGame[], season: string): ReadonlyMap<string, GameLinkItem[]> {
  const links = new Map<string, GameLinkItem[]>()

  for (const open of games) {
    if (open.game === 'fantest' || open.match.season !== season) {
      continue
    }

    const key = `${open.match.competition}|${open.match.round}`
    const item = { game: open.game, match: clubsLine(open.match), ...linkWords[open.game] }

    links.set(key, [...(links.get(key) ?? []), item])
  }

  return links
}
