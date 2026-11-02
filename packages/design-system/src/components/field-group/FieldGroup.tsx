import { Children, type ComponentPropsWithoutRef, type ReactNode, useId } from 'react'

import { classNames } from '../classNames'
import { Text } from '../text/Text'

export type FieldGroupProps = Omit<ComponentPropsWithoutRef<'fieldset'>, 'aria-describedby' | 'children'> & {
  /** The Fields of the group, two to four. Each has its own label. */
  children: ReactNode
  /**
   * Extra help under the legend, such as when the group applies. Plain text only, as the hint
   * of a Field is.
   */
  hint?: string
  /**
   * The name of the group, as a screen reader says it before the label of each field: "Stand na
   * 90 minuten". It is visible, in the style of a label.
   */
  legend: ReactNode
  /**
   * A sign between the first two fields, such as a dash between the two halves of a score. The
   * sign is for the eye: a screen reader skips it, because the labels of the fields say what
   * they are. A group with a sign keeps its fields side by side on a phone too, where the other
   * groups put them under each other.
   */
  separator?: string
}

/**
 * Two to four fields that belong together, in a `fieldset` with a legend: side by side where
 * they fit, and under each other where they do not. A screen reader reads the legend before the
 * label of each field, so the labels can be short. field-group.css gives it its look.
 */
export const FieldGroup = ({ children, className, hint, legend, separator, ...props }: FieldGroupProps) => {
  const hintId = useId()
  const fields = Children.toArray(children)
  const [first, second, ...rest] = fields

  return (
    <fieldset
      {...props}
      aria-describedby={hint === undefined ? undefined : hintId}
      className={classNames('hf-field-group', className)}
    >
      <legend>{legend}</legend>
      {hint === undefined ? null : (
        <Text appearance="meta" className="hf-field-group-hint" id={hintId}>
          {hint}
        </Text>
      )}
      <div className={classNames('hf-field-group-fields', separator !== undefined && 'hf-field-group-separated')}>
        {separator === undefined ? (
          fields
        ) : (
          <>
            {first}
            <span aria-hidden="true" className="hf-field-group-separator">
              {separator}
            </span>
            {second}
            {rest}
          </>
        )}
      </div>
    </fieldset>
  )
}
