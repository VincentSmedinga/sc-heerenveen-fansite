import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { classNames } from '../classNames'
import { outcomeOf } from '../outcome'

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

/**
 * The head of the page of a match: the two clubs with the result between them, the way it went
 * on in words under it when there was extra time or a shoot-out, and the facts of the match as
 * a
 * list of terms and values. The home club is first and the first number is its, as in a
 * `Match`.
 * The result has the colour of the outcome for sc Heerenveen, from the classes of match.css,
 * and
 * a screen reader hears "3 tegen 0". The words under the result are written out, so they need
 * no
 * abbreviation: "Na verlenging. Na 90 minuten 1–1. Na strafschoppen 5–4." The heading of the
 * page
 * is not part of it: the page has the `h1`, and this stands under it. match-header.css gives it
 * its
 * look.
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
  ...props
}: MatchHeaderProps) => {
  const [first, second] = home ? [ourClub, opponent] : [opponent, ourClub]
  const shootOut = penaltiesFor !== undefined && penaltiesAgainst !== undefined
  const afterNinety = extraTime === true && afterNinetyFor !== undefined && afterNinetyAgainst !== undefined
  // A shoot-out decides a level score, so the colour follows it.
  const outcome = shootOut ? outcomeOf(penaltiesFor, penaltiesAgainst) : outcomeOf(goalsFor, goalsAgainst)
  const how = [
    extraTime === true ? 'Na verlenging.' : undefined,
    afterNinety ? `Na 90 minuten ${sides(home, afterNinetyFor, afterNinetyAgainst, '–')}.` : undefined,
    shootOut ? `Na strafschoppen ${sides(home, penaltiesFor, penaltiesAgainst, '–')}.` : undefined,
  ].filter((part) => part !== undefined)

  return (
    <div {...props} className={classNames('hf-match-header', className)}>
      <p className="hf-match-header-clubs">
        <span className={first === ourClub ? 'hf-match-own' : undefined}>{first}</span>{' '}
        <span className={classNames('hf-match-header-score', `hf-match-${outcome}`)}>
          <span aria-hidden="true">{sides(home, goalsFor, goalsAgainst, '–')}</span>
          <span className="hf-visually-hidden">{sides(home, goalsFor, goalsAgainst, ' tegen ')}</span>
        </span>{' '}
        <span className={second === ourClub ? 'hf-match-own' : undefined}>{second}</span>
      </p>
      {how.length > 0 ? <p className="hf-match-header-how">{how.join(' ')}</p> : null}
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
