import type { ComponentPropsWithoutRef } from 'react'

/**
 * The types of a text field an Input can be, and `hidden`, which is no field to see but carries
 * a value along with a form, such as the search that a button to load more results repeats. A
 * checkbox, a radio button and a file field are other components.
 */
export const inputTypes = [
  'date',
  'datetime-local',
  'email',
  'hidden',
  'month',
  'number',
  'password',
  'search',
  'tel',
  'text',
  'time',
  'url',
  'week',
] as const

export type InputProps = Omit<ComponentPropsWithoutRef<'input'>, 'type'> & {
  /** The kind of text field. Without it, it is `text`. */
  type?: InputType
}

export type InputType = (typeof inputTypes)[number]

/**
 * A text field of one line. Put it in a Field, which gives it its label, hint and error. For a
 * field with personal data pass `autoComplete`, such as `name` or `email`, so the browser can
 * fill it in.
 */
export const Input = ({ type = 'text', ...props }: InputProps) => <input type={type} {...props} />
