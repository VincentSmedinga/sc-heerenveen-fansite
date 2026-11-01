import type { PublicMatch, PublicStaff } from '@fansite/db/queries'

import { Card, Heading, Link, Text } from '@fansite/design-system'

import { type CompetitionChoice, competitionParam, leagueValue } from './competition'
import { dutchDay, orderWeetjes, pickWeetje, weetjesOf } from './weetjes'

/**
 * The card of the statistics page with one weetje: a fact about one match, player or coach of
 * the season, from the matches and the head coaches the page already has. It is the last card
 * of the main column and has the warm surface, because a weetje is something remarkable (see
 * the decision about the four surfaces). The weetjes of the season come in the order of the
 * day (see `orderWeetjes`), and `number` says which one the address asks for. The link "Nog een
 * weetje" goes to the next in the same order, and to the first after the last one. It is a link
 * to the same page with `?weetje=` and the choice of the competition, so it needs no script and
 * remembers nothing about the visitor. The part after the hash brings the visitor back to the
 * card. A season without a weetje has no card, and with one weetje there is no link, because it
 * would lead to the same card. `path` is the address of the page, which differs per season.
 */
export function WeetjesCard({
  coaches,
  competition,
  matches,
  now,
  number,
  path,
}: {
  coaches: PublicStaff[]
  competition: CompetitionChoice
  matches: PublicMatch[]
  now: Date
  number: number
  path: string
}) {
  const picked = pickWeetje(orderWeetjes(weetjesOf(matches, coaches, competition), dutchDay(now)), number)

  if (picked === undefined) {
    return null
  }

  const query = new URLSearchParams(competition === 'league' ? { [competitionParam]: leagueValue } : {})

  if (picked.next !== undefined) {
    query.set('weetje', String(picked.next))
  }

  return (
    <Card aria-labelledby="weetjes" surface="warm">
      <Heading id="weetjes" level={2}>
        Weetjes
      </Heading>
      <Text>{picked.weetje.text}</Text>
      {picked.next !== undefined && (
        <Link href={`${path}?${query.toString()}#weetjes`} icon="arrow-right">
          Nog een weetje
        </Link>
      )}
    </Card>
  )
}
