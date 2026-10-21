import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

/** The elements a Text can be. */
export const textElements = ['p', 'span'] as const

export type TextElement = (typeof textElements)[number]

/** The type styles of running text: Tekst and Meta. */
export const textAppearances = ['body', 'meta'] as const

export type TextAppearance = (typeof textAppearances)[number]

export type TextProps = ComponentPropsWithoutRef<'p'> & {
  /** The type style. Without it, the text takes the style of its surroundings. */
  appearance?: TextAppearance
  /** `p` for a paragraph, `span` for text inside a line. */
  as?: TextElement
}

/** Running text: a paragraph, or a span inside a line. */
export const Text = ({ appearance, as: Element = 'p', className, ...props }: TextProps) => (
  <Element className={classNames(appearance && `hf-${appearance}`, className)} {...props} />
)
