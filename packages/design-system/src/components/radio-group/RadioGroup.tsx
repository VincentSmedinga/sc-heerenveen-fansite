import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { classNames } from '../classNames'
import { Text } from '../text/Text'

export type RadioGroupOption = {
  /** What the radio button says, such as `Ja`. */
  label: string
  /** What the form sends when it is chosen, such as `ja`. */
  value: string
}

export type RadioGroupProps = Omit<
  ComponentPropsWithoutRef<'fieldset'>,
  'aria-describedby' | 'children' | 'id' | 'name'
> & {
  /**
   * What is wrong with the answer, and how to put it right. Without it, the group has no error.
   */
  error?: string | undefined
  /** Leaves "(niet verplicht)" out of the legend of a group that is not required. */
  hideOptional?: boolean
  /**
   * Extra help under the legend, such as when the choice applies. Plain text only, as the hint
   * of a Field is.
   */
  hint?: string
  /**
   * The `id` of the group. It is the `id` of the first radio button, so a link in an
   * ErrorSummary goes to it; the others get a number after it.
   */
  id: string
  /** The name of the group, which a screen reader reads before each radio button. */
  legend: ReactNode
  /** The name the form sends the chosen value under. */
  name: string
  /** The radio buttons, in the order shown. Two or three: for more, use a Select. */
  options: readonly RadioGroupOption[]
  /**
   * Whether one has to be chosen. A group is required unless you say otherwise, as a Field is:
   * the legend only says it when it is not required, in words: "niet verplicht".
   */
  required?: boolean
  /** The value that is chosen when the page opens. Without it, none is. */
  value?: string
}

/**
 * A choice of one from two or three values, such as yes or no: a `fieldset` with a `legend` and
 * a radio button for each option, next to each other where they fit. Each radio button has a
 * label that is part of the click target. For more choices, or long ones, use a Select. It
 * works without JavaScript and with the keyboard: the browser keeps the choice and sends it
 * with the form, and the arrow keys move between the buttons. The error, the hint and the
 * legend are tied together as in a Field. radio-group.css gives it its look.
 */
export const RadioGroup = ({
  className,
  error,
  hideOptional = false,
  hint,
  id,
  legend,
  name,
  options,
  required = true,
  value,
  ...props
}: RadioGroupProps) => {
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : undefined, error ? errorId : undefined].filter(Boolean).join(' ')

  return (
    <fieldset
      {...props}
      aria-describedby={describedBy || undefined}
      className={classNames('hf-radio-group', className)}
    >
      <legend>
        {legend}
        {required || hideOptional ? null : (
          <>
            {' '}
            <span className="hf-field-status">(niet verplicht)</span>
          </>
        )}
      </legend>
      {hint || error ? (
        <div className="hf-field-text">
          {hint ? (
            <Text appearance="meta" className="hf-field-hint" id={hintId}>
              {hint}
            </Text>
          ) : null}
          {error ? (
            <Text className="hf-field-error" id={errorId}>
              <span className="hf-visually-hidden">Fout:</span> {error}
            </Text>
          ) : null}
        </div>
      ) : null}
      <div className="hf-radio-group-options">
        {options.map((option, index) => (
          <label className="hf-radio-group-label" key={option.value}>
            <input
              defaultChecked={option.value === value}
              id={index === 0 ? id : `${id}-${index + 1}`}
              name={name}
              required={required}
              type="radio"
              value={option.value}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
