import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

/**
 * The tones a Tag can have: `attention` for what is missing, `highlight` for what the reader
 * should look at, and `neutral` for the rest. `open`, `todo` and `closed` say how a game
 * stands.
 */
export const tagTones = ['attention', 'highlight', 'neutral', 'open', 'todo', 'closed'] as const

export type TagProps = Omit<ComponentPropsWithoutRef<'span'>, 'children'> & {
  /** The text of the label. It says what is going on by itself: the tone only adds to it. */
  children: string
  /**
   * `attention` is red, for what is missing or has to be done. `highlight` is blue with a pale
   * fill, for what has changed or deserves a look. `neutral` is quiet, for a fact. `open` is
   * green, for what is open ("Open tot za 16.45"), `todo` is amber, for what the reader still
   * has to do ("Nog te doen"), and `closed` is grey, for what is over ("Gesloten").
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
  <span className={classNames('hf-meta', 'hf-tag', tone !== 'neutral' && `hf-tag-${tone}`, className)} {...props}>
    {children}
  </span>
)
