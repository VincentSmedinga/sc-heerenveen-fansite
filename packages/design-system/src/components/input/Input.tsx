import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { type Size, sizeClassName } from '../size'

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

/**
 * The widths an Input can have. `default` is the whole line, up to a maximum. `narrow` is for a
 * few characters, such as a score or a minute. `natural` is the width the browser gives the
 * kind of answer, such as a date or a time.
 */
export const inputWidths = ['default', 'narrow', 'natural'] as const

export type InputProps = Omit<ComponentPropsWithoutRef<'input'>, 'size' | 'type'> & {
  /**
   * `default` is the standard size. `small` is lower, for a field next to the content. It takes
   * the place of the `size` of the HTML element, which is a width in characters.
   */
  size?: Size
  /** The kind of text field. Without it, it is `text`. */
  type?: InputType
  /**
   * How wide the field is, to fit the answer: `narrow` for a few characters, `natural` for a
   * date or a time. A field that is too narrow for what people write is worse than one that is
   * too wide, so use `default` for a name or a sentence.
   */
  width?: InputWidth
}

export type InputWidth = (typeof inputWidths)[number]

/** The class for a width. The standard width has none, so nothing changes without `width`. */
const widthClassName = (width: InputWidth) => (width === 'default' ? undefined : `hf-width-${width}`)

export type InputType = (typeof inputTypes)[number]

/**
 * A text field of one line. Put it in a Field, which gives it its label, hint and error. For a
 * field with personal data pass `autoComplete`, such as `name` or `email`, so the browser can
 * fill it in.
 */
export const Input = ({ className, size = 'default', type = 'text', width = 'default', ...props }: InputProps) => (
  <input className={classNames(sizeClassName(size), widthClassName(width), className)} type={type} {...props} />
)
