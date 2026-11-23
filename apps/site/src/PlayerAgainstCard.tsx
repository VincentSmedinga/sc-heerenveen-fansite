import { Card, DataTable, Disclosure, FigureList, Heading, Link, tableColumns, Text } from '@fansite/design-system'

import type { AsideGoal } from './player-aside'
import type { CareerMatch } from './player-seasons'

import { againstLabel, type AgainstMatch } from './player-against'
import { dayText, matchTitle, minuteText } from './player-career'

/** The id of the heading of the card, which the bar "Op deze pagina" links to. */
export const playerAgainstCardId = 'tegen-ons'

/** The line under the table: the table has only what the reports of the opponent show. */
export const againstNote = 'Alleen wedstrijden waarvan we de opstelling van de tegenstander kennen.'

/** "3 wedstrijden, 1 doelpunt": the figures of the matches. */
export function againstSummary(matches: readonly AgainstMatch[]) {
  const goals = matches.reduce((total, { goals: scored }) => total + scored, 0)

  return `${matches.length} ${matches.length === 1 ? 'wedstrijd' : 'wedstrijden'}, ${goals} ${goals === 1 ? 'doelpunt' : 'doelpunten'}`
}

/** The score as the match label has it: the home side first. */
const scoreText = ({ goalsAgainst, goalsFor, home }: AgainstMatch) =>
  `${home ? 'thuis' : 'uit'} ${home ? `${goalsFor}–${goalsAgainst}` : `${goalsAgainst}–${goalsFor}`}`

/**
 * The card "Tegen ons" on the page of a player (issues 1545 and 1086): what he did against us.
 * It has on top the goals he scored against us (`goals`, from the goals of the seasons) and,
 * under them, one line with the matches and goals of the matches we know from the reports of
 * the opponent (`matches`, in the order of `againstByClub`) with the table of those matches
 * behind a Disclosure. Either part can be missing; the page has no card when both are. The page
 * of a match is linked where the address is known.
 */
export function PlayerAgainstCard({
  goalHref,
  goals,
  matches,
  matchHref,
  name,
}: {
  /** The address of the page of the match of a goal, or `undefined` when it has none. */
  goalHref: (match: CareerMatch) => string | undefined
  goals: undefined | { goals: readonly AsideGoal[]; intro: string }
  matches: readonly AgainstMatch[] | undefined
  /** The address of the page of a match, or `undefined` when it has none. */
  matchHref: (match: AgainstMatch) => string | undefined
  name: string
}) {
  return (
    <Card aria-labelledby={playerAgainstCardId}>
      <Heading id={playerAgainstCardId} level={2}>
        Tegen ons
      </Heading>
      {goals === undefined ? null : (
        <>
          <Text>{goals.intro}</Text>
          <FigureList>
            {goals.goals.map((goal) => {
              const href = goalHref(goal.match)
              const title = matchTitle(goal.match, true)

              return (
                <FigureList.Item
                  figure={minuteText(goal) ?? ''}
                  key={`${goal.match.id}-${goal.minute ?? 'x'}`}
                  note={dayText(goal.match.matchDate)}
                >
                  {href === undefined ? title : <Link href={href}>{title}</Link>}
                </FigureList.Item>
              )
            })}
          </FigureList>
        </>
      )}
      {matches === undefined ? null : (
        <>
          <Text>{`${name} speelde ${againstSummary(matches)} tegen ons.`}</Text>
          <Disclosure summary="Alle wedstrijden tegen ons">
            <DataTable
              appearance="text"
              caption={`De wedstrijden van ${name} tegen sc Heerenveen, per club, de nieuwste eerst`}
              columns={[
                'Wedstrijd',
                { fold: true, name: 'Club' },
                { fold: true, name: 'Uitslag' },
                tableColumns.minutes,
                tableColumns.goals,
              ]}
              rows={matches.map((match) => {
                const href = matchHref(match)

                return {
                  cells: [match.club, scoreText(match), match.minutes, match.goals],
                  header: againstLabel(match),
                  ...(href === undefined ? {} : { href }),
                }
              })}
              // The matches stand per club, and in a club the newest first.
              sortable={false}
            />
            <Text appearance="meta">{againstNote}</Text>
          </Disclosure>
        </>
      )}
    </Card>
  )
}
