import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { classNames } from '../classNames'
import { Text } from '../text/Text'

/** The grades a supporter can give, from the lowest to the highest. */
export const ratingGrades = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

export type RatingScaleProps = {
  /**
   * What is wrong with the grade, and how to put it right. Without it, the group has no
   * error. It is text under the legend, and the group points to it with `aria-describedby`.
   */
  error?: string | undefined
  /**
   * The `id` of the group. It is the `id` of the first radio button, so a link in an
   * ErrorSummary goes to it; the others get a number after it.
   */
  id: string
  /** The legend: the name of the one who is graded, such as the name of a player. */
  legend: ReactNode
  /** A small line under the legend, such as "Keeper · 90 min". Without it, there is none. */
  line?: string | undefined
  /** The name the form sends the chosen grade under. */
  name: string
  /**
   * Whether a grade has to be chosen. A group is required unless you say otherwise, as a Field
   * is.
   */
  required?: boolean
  /** The grade that is chosen when the page opens, from 1 to 10. Without it, none is. */
  value?: number | string | undefined
} & Omit<ComponentPropsWithoutRef<'fieldset'>, 'aria-describedby' | 'children' | 'id' | 'name'>

/**
 * Ten buttons with the grades 1 to 10, to give one player, or one coach, a grade: a `fieldset`
 * with a `legend` and ten radio buttons that look like buttons. The buttons are in two rows of
 * five where the card is narrow, and in one row where it is wide enough; that follows the
 * width of the card, not of the screen. Nothing is chosen at first. The chosen button is
 * filled and has a thicker border, so it shows without colour. It works without JavaScript and
 * with the keyboard: the arrow keys move within the group, and the form sends the chosen
 * grade. The line and the error are tied to the group as in a Field. rating-scale.css gives it
 * its look.
 */
export const RatingScale = ({
  className,
  error,
  id,
  legend,
  line,
  name,
  required = true,
  value,
  ...props
}: RatingScaleProps) => {
  const lineId = `${id}-line`
  const errorId = `${id}-error`
  const describedBy = [line ? lineId : undefined, error ? errorId : undefined].filter(Boolean).join(' ')
  const chosen = value === undefined || value === '' ? undefined : String(value)

  return (
    <fieldset
      {...props}
      aria-describedby={describedBy || undefined}
      className={classNames('hf-rating-scale', className)}
      data-invalid={error ? '' : undefined}
    >
      <legend>{legend}</legend>
      {line || error ? (
        <div className="hf-field-text">
          {line ? (
            <Text appearance="meta" id={lineId}>
              {line}
            </Text>
          ) : null}
          {error ? (
            <Text className="hf-field-error" id={errorId}>
              <span className="hf-visually-hidden">Fout:</span> {error}
            </Text>
          ) : null}
        </div>
      ) : null}
      <div className="hf-rating-scale-box">
        <div className="hf-rating-scale-grades">
          {ratingGrades.map((grade, index) => (
            <label className="hf-rating-scale-grade" key={grade}>
              <input
                defaultChecked={String(grade) === chosen}
                id={index === 0 ? id : `${id}-${index + 1}`}
                name={name}
                required={required}
                type="radio"
                value={grade}
              />
              <span>{grade}</span>
            </label>
          ))}
        </div>
      </div>
    </fieldset>
  )
}
