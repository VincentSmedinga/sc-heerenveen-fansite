import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

/** One row of the list: one match with what the supporter predicted and the points. */
export type PredictionListItem = {
  /** The name of the away club. */
  away: string
  /** The day of the match in words, such as `za 21 nov`. */
  date: string
  /** The day as a machine-readable date, such as `2026-11-21`. */
  dateTime: string
  /** The name of the home club. */
  home: string
  /** The points, when the match has any. Without them the row shows the state in `status`. */
  points?: number | undefined
  /** What the supporter predicted, in words, such as `Jij: 0–0 bij rust, 1–2 eind`. */
  prediction: string
  /** The score as it is shown, such as `2–1`, or none for a match that has no result. */
  score?: string | undefined
  /** What the right column says without points: `Nog niet gespeeld`, `Bezig` or `Afgelast`. */
  status?: string | undefined
}

export type PredictionListProps = Omit<ComponentPropsWithoutRef<'ul'>, 'children'> & {
  items: readonly PredictionListItem[]
}

/**
 * The list of what a supporter predicted: a row for each match, with the day small above, the
 * two clubs with the score, what the supporter predicted, and the points in a column of their
 * own on the right. The score never breaks: a long club name is cut short first. It is a list
 * and not a table, because a row is one line of text that reads as one sentence.
 */
export function PredictionList({ className, items, ...props }: PredictionListProps) {
  return (
    <ul className={classNames('hf-prediction-list', className)} {...props}>
      {items.map((item) => (
        <li className="hf-prediction-list-item" key={`${item.dateTime}-${item.home}-${item.away}`}>
          <div className="hf-prediction-list-text">
            <time className="hf-prediction-list-date" dateTime={item.dateTime}>
              {item.date}
            </time>
            <div className="hf-prediction-list-clubs">
              <span className="hf-prediction-list-club">{item.home}</span>
              <span className="hf-prediction-list-score">{item.score ?? '–'}</span>
              <span className="hf-prediction-list-club">{item.away}</span>
            </div>
            <div className="hf-prediction-list-prediction">{item.prediction}</div>
          </div>
          <div className="hf-prediction-list-points">
            {item.points === undefined ? (
              <span className="hf-prediction-list-status">{item.status}</span>
            ) : (
              <>
                <span className="hf-prediction-list-number">{item.points}</span>
                <span className="hf-prediction-list-unit">{item.points === 1 ? 'punt' : 'punten'}</span>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
PredictionList.displayName = 'PredictionList'
