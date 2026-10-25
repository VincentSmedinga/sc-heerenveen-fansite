import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

/** The heading levels a Heading can have. Levels 5 and 6 are only a fallback in CSS. */
export const headingLevels = [1, 2, 3, 4] as const

export type HeadingLevel = (typeof headingLevels)[number]

export type HeadingProps = ComponentPropsWithoutRef<'h1'> & {
  /**
   * The style, as the number of the type style: 2 looks like Kop 2. Without it, the style
   * follows the level.
   */
  appearance?: HeadingLevel
  /** The level in the structure of the page. It follows the content, not the look. */
  level: HeadingLevel
}

/**
 * A heading. The level (`h1` to `h4`) is separate from the style, so a card title can be an
 * `h2` that looks like Kop 3.
 */
export const Heading = ({ appearance, className, level, ...props }: HeadingProps) => {
  const Element = `h${level}` as const

  return <Element className={classNames(`hf-heading-${appearance ?? level}`, className)} {...props} />
}
