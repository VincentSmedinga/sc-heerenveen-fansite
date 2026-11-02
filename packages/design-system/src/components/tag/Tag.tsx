import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

/**
 * The tones a Tag can have: `attention` for what is missing, `highlight` for what the reader
 * should look at, and `neutral` for the rest.
 */
export const tagTones = ['attention', 'highlight', 'neutral'] as const

export type TagProps = Omit<ComponentPropsWithoutRef<'span'>, 'children'> & {
  /** The text of the label. It says what is going on by itself: the tone only adds to it. */
  children: string
  /**
   * `attention` is red, for what is missing or has to be done. `highlight` is blue with a pale
   * fill, for what has changed or deserves a look. `neutral` is quiet, for a fact.
   */
  tone?: (typeof tagTones)[number]
}

/**
 * A small label with a word or two, such as "Uitslag ontbreekt". The text always says what is
 * going on, and the tone only adds colour, so a reader who can't see the colour loses nothing.
 * tag.css gives it its look: a rim in the colour of the text, so the label has an edge in every
 * tone and in forced colours too. The tag has no role: it is text inside a line.
 */
export const Tag = ({ children, className, tone = 'neutral', ...props }: TagProps) => (
  <span className={classNames('hf-tag', tone !== 'neutral' && `hf-tag-${tone}`, className)} {...props}>
    {children}
  </span>
)
