import { Card, DataTable, Heading, Text } from '@fansite/design-system'

import { againstLabel, type AgainstMatch, type PlayerAgainst } from './player-against'

/** The id of the heading of the card, which the bar "Op deze pagina" links to. */
export const playerAgainstCardId = 'tegen-ons'

/** The line under the card: the card has only what the reports of the opponent show. */
export const againstNote = 'Alleen wedstrijden waarvan we de opstelling van de tegenstander kennen.'

/** "3 wedstrijden, 1 doelpunt": the figures of a group. */
export function againstSummary(matches: readonly AgainstMatch[]) {
  const goals = matches.reduce((total, { goals: scored }) => total + scored, 0)

  return `${matches.length} ${matches.length === 1 ? 'wedstrijd' : 'wedstrijden'}, ${goals} ${goals === 1 ? 'doelpunt' : 'doelpunten'}`
}

/** The score as the match label has it: the home side first. */
const scoreText = ({ goalsAgainst, goalsFor, home }: AgainstMatch) =>
  `${home ? 'thuis' : 'uit'} ${home ? `${goalsFor}–${goalsAgainst}` : `${goalsAgainst}–${goalsFor}`}`

/**
 * The card "Tegen ons" on the page of a player (issue 1545): the matches he played against us,
 * in the groups before, between and after his time with sc Heerenveen, each with its own table
 * and a line with the matches and goals. The group "Tussendoor" is only there when it has a
 * match. The page of a match is linked where the address is known.
 */
export function PlayerAgainstCard({
  against,
  matchHref,
  name,
}: {
  against: PlayerAgainst
  /** The address of the page of a match, or `undefined` when it has none. */
  matchHref: (match: AgainstMatch) => string | undefined
  name: string
}) {
  const groups = [
    { matches: against.before, title: 'Voor zijn tijd bij sc Heerenveen' },
    { matches: against.between, title: 'Tussendoor' },
    { matches: against.after, title: 'Na zijn tijd bij sc Heerenveen' },
  ].filter(({ matches }) => matches.length > 0)

  return (
    <Card aria-labelledby={playerAgainstCardId}>
      <Heading id={playerAgainstCardId} level={2}>
        Tegen ons
      </Heading>
      {groups.map(({ matches, title }) => (
        <Fragment key={title}>
          <Heading level={3}>{title}</Heading>
          <Text appearance="meta">{againstSummary(matches)}</Text>
          <DataTable
            appearance="text"
            caption={`De wedstrijden van ${name} tegen sc Heerenveen, ${title.toLowerCase()}, de nieuwste eerst`}
            columns={[
              'Wedstrijd',
              { fold: true, name: 'Club' },
              { fold: true, name: 'Uitslag' },
              { abbreviation: 'Min', name: 'Gespeelde minuten' },
              { abbreviation: 'Doelp', name: 'Doelpunten' },
            ]}
            rows={matches.map((match) => {
              const href = matchHref(match)

              return {
                cells: [match.club, scoreText(match), match.minutes, match.goals],
                header: againstLabel(match),
                ...(href === undefined ? {} : { href }),
              }
            })}
            // The matches stand in the order of the day, the newest first.
            sortable={false}
          />
        </Fragment>
      ))}
      <Text appearance="meta">{againstNote}</Text>
    </Card>
  )
}
