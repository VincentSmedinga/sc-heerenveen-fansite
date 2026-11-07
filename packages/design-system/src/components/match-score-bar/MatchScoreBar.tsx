import type { ComponentPropsWithoutRef, CSSProperties } from 'react'

import { classNames } from '../classNames'
import { Heading, type HeadingLevel } from '../heading/Heading'
import { outcomeOf } from '../outcome'
import { type ScoreBarGoal, scoreBarLayout } from './score-bar'

/** A goal in the match, as the bar needs it. */
export type MatchScoreBarGoal = ScoreBarGoal

export type MatchScoreBarProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /**
   * Whether the match went into extra time. The bar then runs to 120 minutes, with a dashed
   * line where extra time begins.
   */
  extraTime?: boolean | undefined
  /**
   * The goals, in any order. `ours` is whether sc Heerenveen gains from the goal, so an own
   * goal of sc Heerenveen has `ours: false` and an own goal of the opponent has `ours: true`.
   * A goal in added time has the minute it follows (45 or 90) and `stoppageMinutes`.
   */
  goals: readonly MatchScoreBarGoal[]
  /** The level of the heading "Wedstrijdverloop" in the structure of the page. */
  headingLevel: HeadingLevel
}

/** Below this share of the bar there is no room for the score in small letters. */
const labelMinimumShare = 10

/** The score of a piece in the order the page writes it: sc Heerenveen first. */
const scoreOf = (piece: { goalsAgainst: number; goalsFor: number }) => `${piece.goalsFor}–${piece.goalsAgainst}`

/**
 * How the score stood during the match, as a thin bar with a piece for each score: green while
 * sc Heerenveen was ahead, grey when it was level and red when it was behind. The score is
 * written as small text above a piece, where the piece is wide enough, and under the bar is a
 * mark every 15 minutes. The bar and its marks are hidden from a screen reader; a text that
 * only they hear gives the score of every piece with its minutes. The pieces are the only
 * place where colour means something, and the text beside them says the same, so colour is
 * never the only sign. match-score-bar.css gives it its look.
 */
export const MatchScoreBar = ({ className, extraTime = false, goals, headingLevel, ...props }: MatchScoreBarProps) => {
  const { extraTimeStart, segments, ticks } = scoreBarLayout(goals, extraTime)
  const description = segments
    .map((piece) => `${scoreOf(piece)} van minuut ${piece.minuteStart} tot ${piece.minuteEnd}`)
    .join('; ')

  return (
    <div {...props} className={classNames('hf-match-score-bar', className)}>
      <Heading appearance={4} level={headingLevel}>
        Wedstrijdverloop
      </Heading>
      <div aria-hidden="true" className="hf-match-score-bar-graphic">
        <div className="hf-match-score-bar-scores">
          {segments.map((piece) =>
            piece.end - piece.start >= labelMinimumShare ? (
              <span
                className="hf-match-score-bar-score"
                key={piece.start}
                style={{ '--hf-score-end': `${piece.end}%`, '--hf-score-start': `${piece.start}%` } as CSSProperties}
              >
                {scoreOf(piece)}
              </span>
            ) : null,
          )}
        </div>
        <div className="hf-match-score-bar-pieces">
          {segments.map((piece) => (
            <span
              className={classNames(
                'hf-match-score-bar-piece',
                `hf-match-score-bar-${outcomeOf(piece.goalsFor, piece.goalsAgainst)}`,
              )}
              key={piece.start}
              style={{ '--hf-score-end': `${piece.end}%`, '--hf-score-start': `${piece.start}%` } as CSSProperties}
            />
          ))}
        </div>
        <div className="hf-match-score-bar-ticks">
          {ticks.map((tick) => (
            <span
              className="hf-match-score-bar-tick"
              key={tick.minute}
              style={{ '--hf-tick-position': `${tick.position}%` } as CSSProperties}
            >
              {tick.minute}
            </span>
          ))}
        </div>
        {extraTimeStart === null ? null : (
          <span
            className="hf-match-score-bar-extra-time"
            style={{ '--hf-tick-position': `${extraTimeStart}%` } as CSSProperties}
          />
        )}
      </div>
      <p className="hf-visually-hidden">Stand per moment: {description}.</p>
    </div>
  )
}
