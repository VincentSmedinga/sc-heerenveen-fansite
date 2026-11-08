import {
  Card,
  Heading,
  type HeadingLevel,
  MatchHeader,
  MatchPenaltySeries,
  MatchPitch,
  MatchScoreBar,
  MatchSubstitutes,
  MatchTimeline,
  Strong,
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
//
// As a preview in a page that has its own `h1` and its own anchors, the headings stand one
// level lower, there is no `h1` and no heading is an anchor: a heading that links to itself
// would compete with those of the page.

/** The properties of the parts of the page. */
type PartProps = {
  data: MatchPageData
  /** Whether the page is shown as a preview in another page. */
  preview?: boolean
}

/** A heading level of the page, one lower in a preview. The deepest level stays the deepest. */
const levelOf = (level: Exclude<HeadingLevel, 1>, preview: boolean): Exclude<HeadingLevel, 1> =>
  preview && level < 4 ? ((level + 1) as Exclude<HeadingLevel, 1>) : level

/**
 * The cards of the page of a match, one after the other: Opstelling (the pitch, the explanation
 * of the marks, the substitutes and the list), Verloop and, with a shoot-out,
 * Strafschoppenserie. A team that is not complete has no line-up and no substitutes on the
 * page: one sentence says so. A match whose result of a series is known but not its kicks has
 * no card for them: the header has the line.
 */
export function MatchPageCards({ data, preview = false }: PartProps) {
  const built = buildMatchPage(data)
  const card = levelOf(2, preview)
  const below = levelOf(3, preview)

  return (
    <>
      <Card aria-labelledby={preview ? 'voorbeeld-opstelling' : 'opstelling'}>
        {preview ? (
          <Heading id="voorbeeld-opstelling" level={card}>
            Opstelling
          </Heading>
        ) : (
          <Heading anchor id="opstelling" level={2}>
            Opstelling
          </Heading>
        )}
        <MatchPitch
          extraTime={data.extraTime}
          headingLevel={below}
          opponent={built.pitch.opponent}
          ours={built.pitch.ours}
        >
          {data.formationOursDerived ? (
            <Text>De formatie is afgeleid uit de linie van de spelers en kan afwijken van wat er is gespeeld.</Text>
          ) : null}
          <Substitutes built={built} data={data} headingLevel={below} />
        </MatchPitch>
        {data.opponentComplete ? null : <Text>{`De opstelling van ${data.opponent} hebben we niet.`}</Text>}
      </Card>
      <Card aria-labelledby={preview ? 'voorbeeld-verloop' : 'verloop'}>
        {preview ? (
          <Heading id="voorbeeld-verloop" level={card}>
            Verloop
          </Heading>
        ) : (
          <Heading anchor id="verloop" level={2}>
            Verloop
          </Heading>
        )}
        {built.events.length === 0 ? (
          <Text>In deze wedstrijd is niets gebeurd wat we bijhouden.</Text>
        ) : (
          <MatchTimeline events={built.events} extraTime={data.extraTime} headingLevel={below} />
        )}
      </Card>
      {built.series.length === 0 ? null : (
        <Card as="div">
          <MatchPenaltySeries headingLevel={card} opponent={data.opponent} rounds={built.series} />
        </Card>
      )}
    </>
  )
}

/**
 * The header of the page of a match, in a card: the `h1` (visually hidden, since the clubs and
 * the result are what the eye sees), the clubs with the result and the scorers, the facts, and
 * the score bar "Wedstrijdverloop". Without extra time the page is as it was. A preview has no
 * `h1`, since the page it is in has one.
 */
export function MatchPageHeader({ data, preview = false, titleId = 'titel' }: PartProps & { titleId?: string }) {
  const built = buildMatchPage(data)

  return (
    <>
      {data.complete ? null : <MatchPageNotice />}
      <Card {...(preview ? { as: 'div' as const } : { 'aria-labelledby': titleId })}>
        {preview ? null : (
          <Heading className="hf-visually-hidden" id={titleId} level={1}>
            {matchPageTitle(data)}
          </Heading>
        )}
        <MatchHeader
          {...(data.afterNinety === null
            ? {}
            : { afterNinetyAgainst: data.afterNinety.against, afterNinetyFor: data.afterNinety.for })}
          {...(data.penalties === null
            ? {}
            : { penaltiesAgainst: data.penalties.against, penaltiesFor: data.penalties.for })}
          {...(data.phase === undefined ? {} : { phase: data.phase })}
          extraTime={data.extraTime}
          facts={data.facts}
          goalsAgainst={data.goalsAgainst}
          goalsFor={data.goalsFor}
          home={data.home}
          opponent={data.opponent}
          scorersAgainst={built.scorersAgainst}
          scorersFor={built.scorersFor}
        />
        {built.scoreBarAgrees ? (
          <MatchScoreBar extraTime={data.extraTime} goals={built.scoreBar} headingLevel={levelOf(2, preview)} />
        ) : null}
      </Card>
    </>
  )
}

/**
 * The notice at the top of a page whose report is not complete: in words, not in colour or an
 * icon alone, and not a `status` that a screen reader announces, since it is there from the
 * start. It goes when the report is `klaar`.
 */
function MatchPageNotice() {
  return (
    <Card as="div" surface="warm">
      <Text>
        <Strong>We vullen dit verslag nog in.</Strong> De opstelling, de wissels of de gebeurtenissen kunnen nog
        ontbreken of veranderen.
      </Text>
    </Card>
  )
}

/** The title of the page: the clubs, the home club first. */
export const matchPageTitle = ({ home, opponent }: Pick<MatchPageData, 'home' | 'opponent'>) =>
  home ? `${ourClub} – ${opponent}` : `${opponent} – ${ourClub}`

/** The whole page of a match: the header and the cards, for a place that has no page layout. */
export function MatchPageView({ data, preview = false }: PartProps) {
  return (
    <>
      <MatchPageHeader data={data} preview={preview} />
      <MatchPageCards data={data} preview={preview} />
    </>
  )
}

/** Substitutes of a team, side by side from 40 rem. */
function Substitutes({
  built,
  data,
  headingLevel,
}: {
  built: BuiltMatchPage
  data: MatchPageData
  headingLevel: Exclude<HeadingLevel, 1>
}) {
  const { opponent, ours } = built.substitutes

  return (
    <MatchSubstitutes.Group>
      <MatchSubstitutes extraTime={data.extraTime} headingLevel={headingLevel} ours substitutes={ours} team={ourClub} />
      {opponent === undefined ? null : (
        <MatchSubstitutes
          extraTime={data.extraTime}
          headingLevel={headingLevel}
          ours={false}
          substitutes={opponent}
          team={data.opponent}
        />
      )}
    </MatchSubstitutes.Group>
  )
}
