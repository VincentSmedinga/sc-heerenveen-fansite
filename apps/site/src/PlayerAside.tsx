import { Card, DescriptionList, FigureList, Heading, Link, Page, Text } from '@fansite/design-system'
import { type ReactNode } from 'react'

import type { PlayerAside as PlayerAsideData } from './player-aside'
import type { CareerMatch } from './player-seasons'

import { opponentsPath } from './opponents'
import { playerHref } from './player-address'
import { dayText, matchTitle, minuteText } from './player-career'

/** The ids of the headings that name the cards of the side column. */
export const playerAsideIds = {
  against: 'tegen-ons',
  competitions: 'per-competitie',
  facts: 'meer-cijfers',
  opponents: 'vaakst-raak-tegen',
} as const

/**
 * The side column of the page of a player (#1086): the goals or matches by competition, the
 * clubs he scored against most, more figures, the goals against us, and the credit at the
 * bottom. A card with nothing to show is left out. `matchHref` gives the page of a match, or
 * `undefined` for a match that has none, which is then plain text.
 */
export function PlayerAside({
  aside,
  credit,
  matchHref,
}: {
  aside: PlayerAsideData
  credit: ReactNode
  matchHref: (match: CareerMatch) => string | undefined
}) {
  const { against, assistGiver, competitions, europe, firstGoal, opponents } = aside
  const assistGiverHref = playerHref(assistGiver?.slug)
  const firstHref = firstGoal === undefined ? undefined : matchHref(firstGoal.match)
  const facts = [firstGoal, assistGiver, europe].some((fact) => fact !== undefined)

  return (
    <Page.Sidebar aria-label="Meer cijfers over deze speler">
      {competitions === undefined ? null : (
        <Card aria-labelledby={playerAsideIds.competitions} surface="soft">
          <Heading id={playerAsideIds.competitions} level={2}>
            {competitions.title}
          </Heading>
          <FigureList>
            {competitions.rows.map(({ competition, count }) => (
              <FigureList.Item figure={count} key={competition}>
                {competition}
              </FigureList.Item>
            ))}
          </FigureList>
        </Card>
      )}
      {opponents.length === 0 ? null : (
        <Card aria-labelledby={playerAsideIds.opponents} surface="soft">
          <Heading id={playerAsideIds.opponents} level={2}>
            Vaakst raak tegen
          </Heading>
          <FigureList as="ol">
            {opponents.map(({ goals, name, slug }) => (
              <FigureList.Item figure={goals} key={slug}>
                <Link href={`${opponentsPath}/${slug}`}>{name}</Link>
              </FigureList.Item>
            ))}
          </FigureList>
        </Card>
      )}
      {!facts ? null : (
        <Card aria-labelledby={playerAsideIds.facts} surface="soft">
          <Heading id={playerAsideIds.facts} level={2}>
            Meer cijfers
          </Heading>
          <DescriptionList stacked>
            {firstGoal === undefined ? null : (
              <DescriptionList.Item term="Eerste doelpunt voor ons">
                {dayText(firstGoal.match.matchDate)}, {firstGoal.match.home ? 'thuis tegen' : 'uit bij'}{' '}
                {firstHref === undefined ? (
                  scoreLine(firstGoal.match)
                ) : (
                  <Link href={firstHref}>{scoreLine(firstGoal.match)}</Link>
                )}
              </DescriptionList.Item>
            )}
            {assistGiver === undefined ? null : (
              <DescriptionList.Item term="Vaakst bediend door">
                {assistGiverHref === undefined ? (
                  assistGiver.name
                ) : (
                  <Link href={assistGiverHref}>{assistGiver.name}</Link>
                )}
                , {assistGiver.assists} assists
              </DescriptionList.Item>
            )}
            {europe === undefined ? null : (
              <DescriptionList.Item term="Europese wedstrijden">
                {europe.matches}
                {europe.championsLeague === 0 ? '' : `, waarvan ${europe.championsLeague} in de Champions League`}
                {europe.partial ? ' (volgens de opstellingen die we hebben)' : ''}
              </DescriptionList.Item>
            )}
          </DescriptionList>
        </Card>
      )}
      {against === undefined ? null : (
        <Card aria-labelledby={playerAsideIds.against} surface="soft">
          <Heading id={playerAsideIds.against} level={2}>
            Tegen ons
          </Heading>
          <Text>{against.intro}</Text>
          <FigureList>
            {against.goals.map((goal) => {
              const href = matchHref(goal.match)
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
        </Card>
      )}
      {credit}
    </Page.Sidebar>
  )
}

/** The opponent with the score, the home club first: `Stormvogels Telstar (1–3)`. */
function scoreLine({ goalsAgainst, goalsFor, home, opponent }: CareerMatch) {
  return `${opponent} (${home ? `${goalsFor}–${goalsAgainst}` : `${goalsAgainst}–${goalsFor}`})`
}
