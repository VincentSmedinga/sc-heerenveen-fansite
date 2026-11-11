import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

/** One key figure: the number, its word and a line that says what it counts. */
export type KeyFigure = {
  /** The number as it is shown, such as `52`, `1,26` or `315`. */
  figure: string
  /** What the number counts, in one word or two, such as `doelpunten`. */
  label: string
  /** A short line that says what the number covers, such as `in alle competities`. */
  note: string
}

export type KeyFiguresProps = Omit<ComponentPropsWithoutRef<'ul'>, 'children'> & {
  /** Two to four figures. */
  figures: readonly KeyFigure[]
}

/**
 * A row of two to four large numbers, each in a card of its own, such as at the top of the page
 * of a player. It is a list, so a screen reader says how many figures there are, and each item
 * reads as one sentence: "52 doelpunten, in alle competities". The number is plain text and not
 * a heading. key-figures.css sets the cards. Four always stand two by two, at every width. Two
 * or three share the row when they fit, and otherwise wrap: three become two and one, never
 * three and one.
 */
export const KeyFigures = ({ className, figures, ...props }: KeyFiguresProps) => (
  <ul
    {...props}
    className={classNames('hf-key-figures', figures.length === 4 && 'hf-key-figures-four', className)}
    role="list"
  >
    {figures.map(({ figure, label, note }) => (
      <li className="hf-card hf-key-figure" key={`${figure} ${label}`}>
        <div className="hf-key-figure-parts">
          <span className="hf-key-figure-number">{figure}</span> <span className="hf-key-figure-label">{label}</span>
          <span className="hf-key-figure-stop">, </span>
          <span className="hf-key-figure-note">{note}</span>
        </div>
      </li>
    ))}
  </ul>
)
