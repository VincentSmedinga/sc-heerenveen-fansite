import type { ComponentPropsWithoutRef } from 'react'

import type { ChartTone } from '../chart/tones'

import { classNames } from '../classNames'

/** One mark: a short sign in the colour of its tone, and the word for a screen reader. */
export type MarkRowMark = {
  /** The word for a screen reader, such as `winst`. */
  label: string
  /** The sign, one to three letters, such as `W`. */
  mark: string
  tone: ChartTone
}

export type MarkRowProps = Omit<ComponentPropsWithoutRef<'p'>, 'children'> & {
  /** A mark row has no children: everything it shows comes from the props below. */
  children?: never
  /** What to show when there are no marks yet, such as `Nog geen wedstrijden gespeeld.`. */
  empty?: string
  /** The marks, the oldest first, so the newest is at the end. */
  marks: readonly MarkRowMark[]
  /** The word in front of the marks, such as `Vorm`. */
  title: string
}

/**
 * A line with a title and a few coloured signs, such as the form of a team: `Vorm  W V G G W`.
 * The signs are the short form that fans know. They are hidden from a screen reader
 * (`aria-hidden`), which gets a sentence in words instead (`Vorm: winst, verlies, gelijk`),
 * and a colour is never the only sign: the letter says the same. Without marks it shows the
 * text of `empty`, or nothing if there is none. mark-row.css gives the look.
 */
export const MarkRow = ({ className, empty, marks, title, ...props }: MarkRowProps) => {
  if (marks.length === 0 && !empty) return null

  return (
    <p {...props} className={classNames('hf-mark-row', className)}>
      <span aria-hidden={marks.length > 0 || undefined} className="hf-mark-row-title">
        {title}
      </span>
      {marks.length === 0 ? (
        <span className="hf-mark-row-empty">{empty}</span>
      ) : (
        <>
          <span aria-hidden="true" className="hf-mark-row-marks">
            {marks.map((mark, index) => (
              // The marks never change order, and two can be the same, so the place is the key.
              <b className={`hf-mark-row-mark hf-chart-tone-${mark.tone}`} key={index}>
                {mark.mark}
              </b>
            ))}
          </span>
          <span className="hf-visually-hidden">{`${title}: ${marks.map((mark) => mark.label).join(', ')}`}</span>
        </>
      )}
    </p>
  )
}
