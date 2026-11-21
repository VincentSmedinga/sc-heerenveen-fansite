import { Card, Heading, OpenGameList, type OpenGameListItem } from '@fansite/design-system'
import { isFansPartOn } from '@fansite/shared/fans-env'

import { getDatabase } from '#src/database'
import { reasonOf } from '#src/errors'
import { clubsOf, isOpen, type PredictionMatch, predictionMatches, predictionPath } from '#src/fans/prediction'

// The card Fans on the home page (issue 1498): a row for each game that is open now. It is the
// same for every visitor, so it reads nothing personal: only the match and the settings of
// the parts of Fans, in the reading the home page already does.

const timeZone = 'Europe/Amsterdam'
const weekdayFormat = new Intl.DateTimeFormat('nl-NL', { timeZone, weekday: 'long' })
const dayFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', timeZone, weekday: 'long' })
const timeFormat = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', hourCycle: 'h23', minute: '2-digit', timeZone })
const days = 24 * 60 * 60 * 1000

/**
 * The deadline in the words of a sentence, in Dutch time: "zaterdag 16.45 uur" when the
 * kick-off is within six days, and "zaterdag 5 december, 16.45 uur" further away.
 */
export function deadlineOfSentence(kickoffAt: Date, now = new Date()) {
  const time = timeFormat.format(kickoffAt).replace(':', '.')

  return kickoffAt.getTime() - now.getTime() < 6 * days
    ? `${weekdayFormat.format(kickoffAt)} ${time} uur`
    : `${dayFormat.format(kickoffAt)}, ${time} uur`
}

/** The card Fans, or nothing when no game is open. */
export function FansCard({ items }: { items: readonly OpenGameListItem[] }) {
  if (items.length === 0) {
    return null
  }

  return (
    <Card aria-labelledby="fans-heading" surface="soft">
      <Heading id="fans-heading" level={2}>
        Fans
      </Heading>
      <OpenGameList items={items} />
    </Card>
  )
}

/**
 * The rows of the card: the games that are on and open now. For now that is only the Prognose,
 * while its form is open: the match has a known kick-off that has not come.
 */
export async function loadOpenGames(now = new Date()): Promise<OpenGameListItem[]> {
  if (!isFansPartOn('accounts') || !isFansPartOn('prognose')) {
    return []
  }

  try {
    const { next } = await predictionMatches(getDatabase().db, now)
    const row = next === undefined || !isOpen(next, now) ? undefined : prognoseRow(next, now)

    return row === undefined ? [] : [row]
  } catch (error) {
    console.error(`Could not read the games that are open for the homepage: ${reasonOf(error)}`)

    return []
  }
}

/** The row of the Prognose for the match its form is open for. */
export function prognoseRow(match: Pick<PredictionMatch, 'home' | 'kickoffAt' | 'opponent'>, now = new Date()) {
  if (match.kickoffAt === null) {
    return undefined
  }

  const { away, home } = clubsOf(match)
  const clubsLine = `${home} – ${away}`

  return {
    href: predictionPath,
    link: 'Voorspel',
    linkName: `Voorspel ${clubsLine}`,
    name: 'Prognose',
    sentence: `Voorspel ${clubsLine}. Kan tot ${deadlineOfSentence(match.kickoffAt, now)}.`,
  } satisfies OpenGameListItem
}
