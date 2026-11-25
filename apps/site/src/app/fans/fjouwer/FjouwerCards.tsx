import type { ReactNode } from 'react'

import { Card, Heading, Tag, Text } from '@fansite/design-system'

import type { FjouwerMatch } from '#src/fans/fjouwer'

import {
  fjouwerPath,
  type FormPlayer,
  inheritedNotice,
  inheritedOkMessage,
  unknownHourMessage,
} from '#src/fans/fjouwer-form'
import { closesAt } from '#src/fans/fjouwer-rules'
import { NoMatchCard as GameNoMatchCard, MatchLine } from '#src/fans/GameCards'
import { deadlineText } from '#src/fans/prediction'

import { PageLogIn } from '../inloggen/PageLogIn'
import { FjouwerForm } from './FjouwerForm'

const id = 'jouw-vier'

/** What the form needs of a supporter who is logged in. */
export type FjouwerChoice = {
  /** The ids of the four the supporter has now, empty for one who never chose. */
  four: readonly number[]
  inherited: boolean
  /** The ids in the four who have their ten and do not count. */
  notCounting: readonly number[]
  players: readonly FormPlayer[]
  saved: boolean
}

/**
 * The card of the match to choose for: the heading with the Tag and the deadline, the match,
 * and then the form for a supporter who is logged in, or the way in for a visitor. While the
 * hour of the kick-off is not known, a line says why the choice closes at 00.00.
 */
export function JouwVierCard({
  choice,
  match,
  now,
}: {
  /** What the form needs, or `undefined` for a visitor who is not logged in. */
  choice: FjouwerChoice | undefined
  match: FjouwerMatch
  now: Date
}) {
  const struck = choice?.notCounting ?? []
  const names = new Map(choice?.players.map((player) => [player.id, player]))
  let body: ReactNode

  if (choice === undefined) {
    body = <PageLogIn message="Log in om je vier te kiezen." returnTo={fjouwerPath} />
  } else if (choice.players.length === 0) {
    body = <Text>Van dit seizoen kennen we de selectie nog niet.</Text>
  } else {
    const people = struck.flatMap((playerId) => {
      const player = names.get(playerId)

      return player === undefined ? [] : [{ line: player.line, name: player.name }]
    })

    body = (
      <FjouwerForm
        inheritedLine={
          choice.inherited ? (struck.length > 0 ? inheritedNotice(people) : inheritedOkMessage) : undefined
        }
        matchId={match.id}
        noteForStruck="telt niet mee"
        players={choice.players}
        saved={choice.saved}
        startFour={choice.four}
        struck={struck}
      />
    )
  }

  return (
    <Card aria-labelledby={id} game="fjouwer">
      <Heading id={id} level={2}>
        Jouw vier
      </Heading>
      <Text>
        <Tag tone="open">{deadlineText(closesAt(match), now)}</Tag>
        {struck.length > 0 ? (
          <>
            {' '}
            <Tag tone="todo">Kijk even</Tag>
          </>
        ) : null}
      </Text>
      <MatchLine match={match} now={now} />
      {match.kickoffAt === null ? <Text>{unknownHourMessage}</Text> : null}
      {body}
    </Card>
  )
}

/** The card for the end of the season, when no match is left: one sentence and no form. */
export function NoMatchCard() {
  return (
    <GameNoMatchCard game="fjouwer" heading="Jouw vier" id={id}>
      Er is geen komende wedstrijd meer. Zodra de volgende wedstrijd bekend is, kies je hier weer je vier.
    </GameNoMatchCard>
  )
}
