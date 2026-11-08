import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { classNames } from '../classNames'
import { type Outcome, outcomeOf } from '../outcome'

/** The name of our own club, which a match always has on one side. */
const ourClub = 'sc Heerenveen'

/** One fact of the match, such as the competition or the stadium. */
export type MatchHeaderFact = {
  /** What the fact is, such as `Stadion`. */
  label: string
  /** The fact, as plain text or a `Time`. */
  value: ReactNode
}

export type MatchHeaderProps = MatchHeaderBase & {
  /** The score after 90 minutes of a match with extra time. Both numbers, or none. */
  afterNinetyAgainst?: number | undefined
  afterNinetyFor?: number | undefined
  /** Whether the match went to extra time. The result is the one after extra time. */
  extraTime?: boolean | undefined
  /** The shoot-out of a match that was level after extra time. Both numbers, or none. */
  penaltiesAgainst?: number | undefined
  penaltiesFor?: number | undefined
  /**
   * Where a match stands that has no result yet. `live` is a match that is being played: the
   * goals are the stand so far, and the pill says "Live" in place of an outcome. `upcoming` is
   * a match that has not begun: no stand, a dash, and the pill says "Nog niet begonnen". Leave
   * it out for a match that was played.
   */
  phase?: 'live' | 'upcoming' | undefined
  /**
   * The goals of the opponent, under its name, in the order of the clock. Leave it out and
   * nothing stands there. An own goal of sc Heerenveen is in this list.
   */
  scorersAgainst?: MatchHeaderScorer[] | undefined
  /**
   * The goals of sc Heerenveen, under its name, in the order of the clock. An own goal of the
   * opponent is in this list.
   */
  scorersFor?: MatchHeaderScorer[] | undefined
}

/** A goal in the list of scorers under a club. */
export type MatchHeaderScorer = {
  /**
   * The minute on the clock: 45 for "45+2". Empty when nobody knows it: the list then has the
   * name alone.
   */
  minute: null | number
  /**
   * Whether it was an own goal. List it under the club that gets the goal, not under the club
   * of the player: it is then written with "(e.d.)".
   */
  ownGoal?: boolean | undefined
  /** Whether it was scored from the penalty spot. It is then written with "(str.)". */
  penalty?: boolean | undefined
  /** The name as it is written in the list, such as the surname. */
  player: string
  /** The minutes of added time after `minute`: 2 for "45+2". Leave it out in regular time. */
  stoppageMinutes?: null | number | undefined
}

type MatchHeaderBase = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /**
   * The facts under the result, in the order they are shown. Leave out a fact that is not
   * known.
   */
  facts: MatchHeaderFact[]
  /** The goals of the opponent, also when sc Heerenveen plays away. */
  goalsAgainst: number
  /** The goals of sc Heerenveen. */
  goalsFor: number
  /** Whether sc Heerenveen plays at home. The home club is named first. */
  home: boolean
  /** The club sc Heerenveen played, as plain text. */
  opponent: string
}

/** The two numbers from the home club's side, with a dash or in words. */
const sides = (home: boolean, ours: number, theirs: number, dash: string) =>
  home ? `${ours}${dash}${theirs}` : `${theirs}${dash}${ours}`

const outcomeWords: Record<Outcome, string> = { draw: 'Gelijkspel', loss: 'Verloren', win: 'Gewonnen' }

const minuteOf = (scorer: MatchHeaderScorer) =>
  scorer.minute === null
    ? ''
    : scorer.stoppageMinutes === null || scorer.stoppageMinutes === undefined
      ? ` ${scorer.minute}’`
      : ` ${scorer.minute}+${scorer.stoppageMinutes}’`

/**
 * The goals under a club: "Hoekstra 12’ · Wiersma 58’ (str.)". The abbreviations are written
 * out for a screen reader, which hears "Wiersma, minuut 58, strafschop"; the eye gets the short
 * form.
 */
function Scorers({ club, scorers }: { club: string; scorers: MatchHeaderScorer[] | undefined }) {
  if (scorers === undefined || scorers.length === 0) {
    return null
  }

  return (
    <p className="hf-match-header-scorers">
      <span className="hf-visually-hidden">Doelpunten {club}: </span>
      {scorers.map((scorer, index) => (
        // One player can score twice in a minute, so the place in the list is the key.
        <span key={index}>
          {index > 0 ? (
            <>
              <span aria-hidden="true"> · </span>
              <span className="hf-visually-hidden">; </span>
            </>
          ) : null}
          <span aria-hidden="true" className="hf-match-header-scorer">
            {scorer.player}
            {minuteOf(scorer)}
            {scorer.ownGoal === true ? (
              <>
                {' '}
                (<abbr title="eigen doelpunt">e.d.</abbr>)
              </>
            ) : null}
            {scorer.penalty === true ? (
              <>
                {' '}
                (<abbr title="strafschop">str.</abbr>)
              </>
            ) : null}
          </span>
          <span className="hf-visually-hidden">
            {scorer.player}
            {scorer.minute === null ? '' : `, minuut ${scorer.minute}`}
            {scorer.minute === null || scorer.stoppageMinutes === null || scorer.stoppageMinutes === undefined
              ? ''
              : ` plus ${scorer.stoppageMinutes}`}
            {scorer.ownGoal === true ? ', eigen doelpunt' : ''}
            {scorer.penalty === true ? ', strafschop' : ''}
          </span>
        </span>
      ))}
    </p>
  )
}

/**
 * The head of the page of a match: the two clubs with the result, the outcome in a pill, the
 * scorers under each club, the way it went on in words when there was extra time or a
 * shoot-out, and the facts of the match as a list of terms and values in small letters. The
 * home club is first and the first number is its, as in a `Match`. On a narrow place each club
 * has its name and its goals on a line, and from 40 rem the names stand left and right with the
 * result large in the middle. The result has the colour of the outcome for sc Heerenveen, from
 * the classes of match.css, and the pill says "Gewonnen", "Verloren" or "Gelijkspel", after the
 * shoot-out if there was one. A screen reader hears "3 tegen 0". The words under the result are
 * written out: "Na verlenging (na 90 minuten 1–1)" or "Na strafschoppen 5–4 (na verlenging
 * 1–1)". A match that is being played (`phase` is `live`) has the stand so far in no colour of
 * an outcome, and the pill says "Live"; a match that has not begun (`upcoming`) has dashes and
 * the pill says "Nog niet begonnen". The words are the sign, not the colour. The heading of the
 * page is not part of it: the page has the `h1`, and may keep it
 * visually hidden, since the names and the result are what the eye sees.
 * match-header.css gives it its look.
 */
export const MatchHeader = ({
  afterNinetyAgainst,
  afterNinetyFor,
  className,
  extraTime,
  facts,
  goalsAgainst,
  goalsFor,
  home,
  opponent,
  penaltiesAgainst,
  penaltiesFor,
  phase,
  scorersAgainst,
  scorersFor,
  ...props
}: MatchHeaderProps) => {
  const unfinished = phase !== undefined
  const shootOut = !unfinished && penaltiesFor !== undefined && penaltiesAgainst !== undefined
  const afterNinety =
    !unfinished && extraTime === true && afterNinetyFor !== undefined && afterNinetyAgainst !== undefined
  // A shoot-out decides a level score, so the colour and the pill follow it. A match that has
  // no result yet has no outcome, so it has no colour of one either.
  const outcome = unfinished
    ? undefined
    : shootOut
      ? outcomeOf(penaltiesFor, penaltiesAgainst)
      : outcomeOf(goalsFor, goalsAgainst)
  const result = phase === 'upcoming' ? '–' : sides(home, goalsFor, goalsAgainst, '–')
  const how = unfinished
    ? undefined
    : shootOut
      ? `Na strafschoppen ${sides(home, penaltiesFor, penaltiesAgainst, '–')} (na ${extraTime === true ? 'verlenging' : '90 minuten'} ${result})`
      : extraTime === true
        ? `Na verlenging${afterNinety ? ` (na 90 minuten ${sides(home, afterNinetyFor, afterNinetyAgainst, '–')})` : ''}`
        : undefined
  const shownGoals = (goals: number) => (phase === 'upcoming' ? '–' : goals)
  const us = { goals: shownGoals(goalsFor), name: ourClub, ours: true, scorers: scorersFor }
  const them = { goals: shownGoals(goalsAgainst), name: opponent, ours: false, scorers: scorersAgainst }
  const clubs = home ? [us, them] : [them, us]

  return (
    <div {...props} className={classNames('hf-match-header', className)}>
      <div className="hf-match-header-board">
        {clubs.map((club, index) => (
          <div
            className={classNames(
              'hf-match-header-club',
              index === 0 ? 'hf-match-header-first' : 'hf-match-header-second',
            )}
            key={club.name}
          >
            <p className={classNames('hf-match-header-name hf-heading-3', club.ours && 'hf-match-own')}>{club.name}</p>
            <p
              aria-hidden="true"
              className={classNames(
                'hf-match-header-goals hf-heading-2',
                club.ours && outcome !== undefined && `hf-match-${outcome}`,
              )}
            >
              {club.goals}
            </p>
            <Scorers club={club.name} scorers={club.scorers} />
          </div>
        ))}
        <div className="hf-match-header-summary">
          <p
            aria-hidden="true"
            className={classNames('hf-match-header-result', outcome !== undefined && `hf-match-${outcome}`)}
          >
            {result}
          </p>
          {phase === 'upcoming' ? null : (
            <p className="hf-visually-hidden">
              {phase === 'live' ? 'Tussenstand' : 'Eindstand'}: {sides(home, goalsFor, goalsAgainst, ' tegen ')}
            </p>
          )}
          {outcome === undefined ? (
            <p className={classNames('hf-match-header-outcome', phase === 'live' && 'hf-match-header-live')}>
              {phase === 'live' ? 'Live' : 'Nog niet begonnen'}
            </p>
          ) : (
            <p className={classNames('hf-match-header-outcome', `hf-match-${outcome}`)}>{outcomeWords[outcome]}</p>
          )}
          {how === undefined ? null : <p className="hf-match-header-how">{how}</p>}
        </div>
      </div>
      <dl className="hf-match-header-facts">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
