import type { GameLinkItem, OpenGameCardItem } from '@fansite/design-system'

import { fansPath } from '#src/fans-paths'

import type { OpenGame } from './open-games'

import { fjouwerPath } from './fjouwer-form'
import { clubsOf, predictionPath } from './prediction'
import { ratingPath } from './rating'

// The words of the open games (issue 1645): the cards on the home page and the links under a
// match on Wedstrijden.

const fantestPath = `${fansPath}/fantest`
const monthFormat = new Intl.DateTimeFormat('nl-NL', { month: 'long', timeZone: 'UTC' })

const cardWords = {
  fjouwer: { href: fjouwerPath, link: 'Kies jouw fjouwer', name: 'Fjouwer', preposition: 'voor' },
  prognose: { href: predictionPath, link: 'Voorspel de uitslag', name: 'Prognose', preposition: 'van' },
  uitblinker: { href: ratingPath, link: 'Geef de spelers een cijfer', name: 'Uitblinker', preposition: 'voor' },
} as const

const clubsLine = (match: Parameters<typeof clubsOf>[0]) => {
  const { away, home } = clubsOf(match)

  return `${home} – ${away}`
}

/** The card of each open game on the home page. */
export function openGameCards(games: readonly OpenGame[]): OpenGameCardItem[] {
  return games.map((open) => {
    if (open.game === 'fantest') {
      const link = `Doe de test van ${monthFormat.format(new Date(Date.UTC(2000, open.month - 1, 1)))}`

      return { game: open.game, href: fantestPath, link, linkName: link, name: 'Fantest' }
    }

    const { href, link, name, preposition } = cardWords[open.game]

    return { game: open.game, href, link, linkName: `${link} ${preposition} ${clubsLine(open.match)}`, name }
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
