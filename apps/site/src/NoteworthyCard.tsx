import type { PublicMatch, PublicStaff } from '@fansite/db/queries'

import { Card, Heading, Link, Text } from '@fansite/design-system'

import { type CompetitionChoice, competitionParam, leagueValue } from './competition'
import { dutchDay, noteworthy, noteworthyFactsOf, orderNoteworthyFacts, pickNoteworthyFact } from './noteworthy'

/**
 * The card Opmerkelijk of the statistics page, with one noteworthy fact: a fact about one
 * match, player or coach of the season, from the matches and the head coaches the page already
 * has. It is the last card of the main column and has the warm surface, because a fact like
 * this is something remarkable (see the decision about the four surfaces). The facts of the
 * season come in the order of the day (see `orderNoteworthyFacts`), and `number` says which
 * one the address asks for. The link "Nog iets opmerkelijks" goes to the next in the same
 * order, and to the first after the last one. It is a link to the same page with
 * `?opmerkelijk=` and the choice of the competition, so it needs no script and remembers
 * nothing about the visitor. The part after the hash brings the visitor back to the card. A
 * season without a fact has no card, and with one fact there is no link, because it would lead
 * to the same card. `path` is the address of the page, which differs per season. The words are
 * in `noteworthy`.
 */
export function NoteworthyCard({
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
  const facts = orderNoteworthyFacts(noteworthyFactsOf(matches, coaches, competition), dutchDay(now))
  const picked = pickNoteworthyFact(facts, number)

  if (picked === undefined) {
    return null
  }

  const query = new URLSearchParams(competition === 'league' ? { [competitionParam]: leagueValue } : {})

  if (picked.next !== undefined) {
    query.set(noteworthy.param, String(picked.next))
  }

  return (
    <Card aria-labelledby={noteworthy.anchor} surface="warm">
      <Heading id={noteworthy.anchor} level={2}>
        {noteworthy.heading}
      </Heading>
      <Text>{picked.fact.text}</Text>
      {picked.next !== undefined && (
        <Link href={`${path}?${query.toString()}#${noteworthy.anchor}`} icon="arrow-right">
          {noteworthy.next}
        </Link>
      )}
    </Card>
  )
}
