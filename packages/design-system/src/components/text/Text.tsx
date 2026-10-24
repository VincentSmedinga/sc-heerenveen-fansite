import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

/** The elements a Text can be. */
export const textElements = ['p', 'span'] as const

export type TextElement = (typeof textElements)[number]

/** The type styles of running text: Tekst, Inleiding and Meta. */
export const textAppearances = ['body', 'intro', 'meta'] as const

export type TextAppearance = (typeof textAppearances)[number]

export type TextProps = ComponentPropsWithoutRef<'p'> &
  (
    | {
        /** Inleiding: the first paragraph under the heading of the page. Only for a paragraph. */
        appearance: 'intro'
        as?: 'p'
      }
    | {
        /** The type style. Without it, the text takes the style of its surroundings. */
        appearance?: Exclude<TextAppearance, 'intro'>
        /** `p` for a paragraph, `span` for text inside a line. */
        as?: TextElement
      }
  )

/**
 * Running text: a paragraph, or a span inside a line.
 *
 * An intro puts all its content in one `b`, so `<p class="hf-intro"><b>…</b></p>`. With the stylesheet the `b` has the
 * weight of the text around it and the larger type makes the intro stand out. Without it the browser shows the `b` in
 * bold, so the intro stands out then too. A `b` says nothing about meaning, unlike a `strong`, so a screen reader reads
 * it without emphasis.
 */
export const Text = ({ appearance, as: Element = 'p', children, className, ...props }: TextProps) => (
  <Element className={classNames(appearance && `hf-${appearance}`, className)} {...props}>
    {appearance === 'intro' ? <b>{children}</b> : children}
  </Element>
)
