import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

/** What the fan predicted: the full-time score and the half-time score. */
export type PredictionListGuess = {
  fullTime: PredictionListPart
  halfTime: PredictionListPart
}

/** One row of the list: one match with what the fan predicted and the points. */
export type PredictionListItem = {
  /** The name of the away club. */
  away: string
  /** The name of the competition, such as `Eredivisie`. */
  competition: string
  /** The day of the match in words, such as `za 21 nov`. */
  date: string
  /** The day as a machine-readable date, such as `2026-11-21`. */
  dateTime: string
  /** The name of the home club. */
  home: string
  /** The points, when the match has any. */
  points?: number | undefined
  /**
   * What the fan predicted: the scores of a match, or a line of words for a choice that has no
   * score, such as the four players of Fjouwer. Words stand under the clubs, small.
   */
  prediction: PredictionListGuess | string
  /** The score as it is shown, such as `2–1`, or none for a match that has no result. */
  score?: string | undefined
  /** What the meta line says between the day and the competition: `Bezig` or `Afgelast`. */
  status?: string | undefined
}

/** One part of a prediction: its score, and whether it earned points. */
export type PredictionListPart = {
  /** `true` when the part earned points, `false` when it did not. Without it: no colour. */
  right?: boolean | undefined
  /** The score as it is shown, such as `3–4`. */
  score: string
}

export type PredictionListProps = Omit<ComponentPropsWithoutRef<'ul'>, 'children'> & {
  items: readonly PredictionListItem[]
}

const verdict = (right: boolean | undefined) => (right === undefined ? '' : right ? ', goed' : ', fout')

/** What a screen reader gets for the prediction: `Jouw voorspelling: eind 3–4, rust 1–2`. */
const guessWords = ({ fullTime, halfTime }: PredictionListGuess) =>
  `Jouw voorspelling: eind ${fullTime.score}${verdict(fullTime.right)}, rust ${halfTime.score}${verdict(halfTime.right)}`

/**
 * The list of what a fan predicted: a row for each match, with the day and the competition
 * small above, the two clubs with the score, and on the right the points and the prediction. A
 * match without points shows only the prediction, in larger type. A part of the prediction that
 * earned points is green with a tick, and a part that did not is red with a cross. The score
 * never breaks: a long club name wraps over more lines, and nothing is ever cut short. It is a
 * list and not a table, because a row is one line of text that reads as one sentence.
 */
export function PredictionList({ className, items, ...props }: PredictionListProps) {
  return (
    <ul className={classNames('hf-prediction-list', className)} {...props}>
      {items.map((item) => (
        <li className="hf-prediction-list-item" key={`${item.dateTime}-${item.home}-${item.away}`}>
          <div className="hf-prediction-list-text">
            <div className="hf-prediction-list-meta">
              <time dateTime={item.dateTime}>{item.date}</time>
              {item.status === undefined ? null : <span>{item.status}</span>}
              <span>{item.competition}</span>
            </div>
            <div className="hf-prediction-list-clubs">
              <span className="hf-prediction-list-club">{item.home}</span>
              <span className="hf-prediction-list-score">{item.score ?? '–'}</span>
              <span className="hf-prediction-list-club">{item.away}</span>
            </div>
            {typeof item.prediction === 'string' ? (
              <div className="hf-prediction-list-prediction">{item.prediction}</div>
            ) : null}
          </div>
          <div className="hf-prediction-list-side">
            {typeof item.prediction === 'string' ? null : (
              <span className="hf-visually-hidden">{guessWords(item.prediction)}</span>
            )}
            {item.points === undefined ? null : (
              <span className="hf-prediction-list-points">
                <span className="hf-prediction-list-number">{item.points}</span>{' '}
                <span className="hf-prediction-list-unit">{item.points === 1 ? 'punt' : 'punten'}</span>
              </span>
            )}
            {typeof item.prediction === 'string' ? null : (
              <span
                aria-hidden="true"
                className={classNames(
                  'hf-prediction-list-guess',
                  item.points === undefined && 'hf-prediction-list-guess-large',
                )}
              >
                <Part part={item.prediction.fullTime} /> (<Part part={item.prediction.halfTime} />)
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
PredictionList.displayName = 'PredictionList'

function Part({ part }: { part: PredictionListPart }) {
  return (
    <span
      className={classNames(
        'hf-prediction-list-part',
        part.right === true && 'hf-prediction-list-right',
        part.right === false && 'hf-prediction-list-wrong',
      )}
    >
      {part.right === undefined ? null : <span className="hf-prediction-list-sign">{part.right ? '✓' : '✗'}</span>}
      {part.score}
    </span>
  )
}
