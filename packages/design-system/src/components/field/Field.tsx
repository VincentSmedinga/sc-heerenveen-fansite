import { Children, cloneElement, type ComponentPropsWithoutRef, type ReactElement, type ReactNode } from 'react'

import { classNames } from '../classNames'
import { Text } from '../text/Text'

export type FieldProps = Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'id'> & {
  /**
   * The field: an Input, a Textarea or a Select. Field gives it the `id`, `aria-describedby`, `aria-invalid` and
   * `required` it needs.
   */
  children: ReactElement<FieldControlProps>
  /** What is wrong with the answer, and how to put it right. Without it, the field has no error. */
  error?: string | undefined
  /**
   * Extra help under the label, such as the format of the answer. Plain text only: some screen readers, such as VoiceOver,
   * skip a link or a list in a description, so the reader would not hear it.
   */
  hint?: string
  /** The `id` of the field. The label, the hint and the error are tied to it, and an ErrorSummary links to it. */
  id: string
  /** The visible label. A placeholder is not a label. */
  label: ReactNode
  /**
   * Whether the field has to be filled in. A field is required unless you say otherwise: we only ask what we need.
   * The label only says it when a field is not required, in words: "niet verplicht".
   */
  required?: boolean
}

/** What Field gives its field. */
type FieldControlProps = {
  'aria-describedby'?: string | undefined
  'aria-invalid'?: boolean | undefined
  id?: string
  required?: boolean
}

/**
 * A label with a field and, when there are any, a hint and an error, tied together: the label with `for` and `id`, and the
 * hint and the error with `aria-describedby`. A field with an error also gets `aria-invalid`. The error is text and starts
 * with "Fout:" for a screen reader, so a red border is never the only sign. field.css gives it its look.
 */
export const Field = ({ children, className, error, hint, id, label, required = true, ...props }: FieldProps) => {
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : undefined, error ? errorId : undefined].filter(Boolean).join(' ')

  return (
    <div className={classNames('hf-field', className)} {...props}>
      <label className="hf-field-label" htmlFor={id}>
        {label}
        {required ? null : (
          <>
            {' '}
            <span className="hf-field-status">(niet verplicht)</span>
          </>
        )}
      </label>
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
      {cloneElement(Children.only(children), {
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
        id,
        required,
      })}
    </div>
  )
}
