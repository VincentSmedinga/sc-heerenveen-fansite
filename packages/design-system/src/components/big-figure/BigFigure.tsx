import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type BigFigureProps = Omit<ComponentPropsWithoutRef<'p'>, 'children'> & {
  /** The number as it is shown, with its word if it has one, such as `9 keer`. */
  figure: string
  /** What the number counts, read after the number by a screen reader: `de nul gehouden`. */
  label: string
}

/**
 * One large number in a card, without a card of its own, such as the number of clean sheets of
 * a season. The number is plain text, not a heading. Its meaning is part of the same
 * paragraph but out of sight, so a screen reader reads "9 keer de nul gehouden" and not a loose
 * "9 keer". big-figure.css gives the look, the same as the numbers of `KeyFigures`.
 */
export const BigFigure = ({ className, figure, label, ...props }: BigFigureProps) => (
  <p {...props} className={classNames('hf-big-figure', className)}>
    {figure}
    <span className="hf-visually-hidden"> {label}</span>
  </p>
)
