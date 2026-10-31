import type { CSSProperties, ReactNode } from 'react'

import { type Size, sizeClassName } from '../size'

/**
 * What a segmented control and its links have in common: the class of the group and the two
 * custom properties that place the thumb. The thumb is drawn by segmented-control.css, in a
 * pseudo-element of the group, and finds its place from the number of options and the index of
 * the chosen one, so it needs no script and no element of its own, also on a page that was
 * rendered on the server. A value that is none of the options leaves the thumb out.
 */
export const segmentedGroup = (
  values: readonly string[],
  value: string,
  size: Size,
  style: CSSProperties | undefined,
) => {
  const index = values.indexOf(value)

  return {
    'data-empty': index === -1 ? '' : undefined,
    sizeClass: sizeClassName(size),
    style: {
      ...style,
      '--hf-segmented-count': values.length,
      '--hf-segmented-index': Math.max(index, 0),
    } as CSSProperties,
  }
}

/**
 * The text of an option. A second copy of it in bold is laid over the first, invisible and
 * without height, so the option is as wide for its regular text as for its bold text: the
 * chosen option gets heavier letters, and the group must not change its width with the choice.
 */
export const SegmentedLabel = ({ children, text }: { children: ReactNode; text: string }) => (
  <span className="hf-segmented-label" data-label={text}>
    {children}
  </span>
)
