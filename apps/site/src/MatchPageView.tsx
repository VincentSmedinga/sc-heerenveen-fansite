import {
  Card,
  Heading,
  MatchHeader,
  MatchPenaltySeries,
  MatchPitch,
  MatchScoreBar,
  MatchSubstitutes,
  MatchTimeline,
  Text,
} from '@fansite/design-system'

import { buildMatchPage, type BuiltMatchPage, type MatchPageData, ourClub } from './match-page'

// The page of a match as the design has it, made from plain data (`MatchPageData`), so the page
// of a match and the preview in the admin (#851) show the same thing. The header comes first,
// in a card of its own: the title for a screen reader, the clubs with the result and the
// scorers, the facts and the score bar. The cards come after it: the line-up on the pitch with
// the substitutes, the course of the match in the halves, and the shoot-out when there was one.
// The page places the two parts: the header at the top of the page, over both columns, and the
// cards in the main column.

/** The title of the page: the clubs, the home club first. */
export const matchPageTitle = ({ home, opponent }: Pick<MatchPageData, 'home' | 'opponent'>) =>
  home ? `${ourClub} – ${opponent}` : `${opponent} – ${ourClub}`

/**
 * The cards of the page of a match, one after the other: Opstelling (the pitch, the explanation
 * of the marks, the substitutes and the list), Verloop and, with a shoot-out,
 * Strafschoppenserie. A team that is not complete has no line-up and no substitutes on the
 * page: one sentence says so. A match whose result of a series is known but not its kicks has
 * no card for them: the header has the line.
 */
export function MatchPageCards({ data }: { data: MatchPageData }) {
  const built = buildMatchPage(data)

  return (
    <>
      <Card aria-labelledby="opstelling">
        <Heading anchor id="opstelling" level={2}>
          Opstelling
        </Heading>
        <MatchPitch extraTime={data.extraTime} headingLevel={3} opponent={built.pitch.opponent} ours={built.pitch.ours}>
          <Substitutes built={built} data={data} />
        </MatchPitch>
        {data.opponentComplete ? null : <Text>{`De opstelling van ${data.opponent} hebben we niet.`}</Text>}
      </Card>
      <Card aria-labelledby="verloop">
        <Heading anchor id="verloop" level={2}>
          Verloop
        </Heading>
        {built.events.length === 0 ? (
          <Text>In deze wedstrijd is niets gebeurd wat we bijhouden.</Text>
        ) : (
          <MatchTimeline events={built.events} extraTime={data.extraTime} headingLevel={3} />
        )}
      </Card>
      {built.series.length === 0 ? null : (
        <Card as="div">
          <MatchPenaltySeries headingLevel={2} opponent={data.opponent} rounds={built.series} />
        </Card>
      )}
    </>
  )
}

/**
 * The header of the page of a match, in a card: the `h1` (visually hidden, since the clubs and
 * the result are what the eye sees), the clubs with the result and the scorers, the facts, and
 * the score bar "Wedstrijdverloop". Without extra time the page is as it was.
 */
export function MatchPageHeader({ data, titleId = 'titel' }: { data: MatchPageData; titleId?: string }) {
  const built = buildMatchPage(data)

  return (
    <Card aria-labelledby={titleId}>
      <Heading className="hf-visually-hidden" id={titleId} level={1}>
        {matchPageTitle(data)}
      </Heading>
      <MatchHeader
        {...(data.afterNinety === null
          ? {}
          : { afterNinetyAgainst: data.afterNinety.against, afterNinetyFor: data.afterNinety.for })}
        {...(data.penalties === null
          ? {}
          : { penaltiesAgainst: data.penalties.against, penaltiesFor: data.penalties.for })}
        extraTime={data.extraTime}
        facts={data.facts}
        goalsAgainst={data.goalsAgainst}
        goalsFor={data.goalsFor}
        home={data.home}
        opponent={data.opponent}
        scorersAgainst={built.scorersAgainst}
        scorersFor={built.scorersFor}
      />
      <MatchScoreBar extraTime={data.extraTime} goals={built.scoreBar} headingLevel={2} />
    </Card>
  )
}

/** The whole page of a match: the header and the cards, for a place that has no page layout. */
export function MatchPageView({ data }: { data: MatchPageData }) {
  return (
    <>
      <MatchPageHeader data={data} />
      <MatchPageCards data={data} />
    </>
  )
}

/** Substitutes of a team, side by side from 40 rem. */
function Substitutes({ built, data }: { built: BuiltMatchPage; data: MatchPageData }) {
  const { opponent, ours } = built.substitutes

  return (
    <MatchSubstitutes.Group>
      <MatchSubstitutes extraTime={data.extraTime} headingLevel={3} ours substitutes={ours} team={ourClub} />
      {opponent === undefined ? null : (
        <MatchSubstitutes
          extraTime={data.extraTime}
          headingLevel={3}
          ours={false}
          substitutes={opponent}
          team={data.opponent}
        />
      )}
    </MatchSubstitutes.Group>
  )
}
