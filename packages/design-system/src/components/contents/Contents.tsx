import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

/**
 * A wrapper that has no box of its own: its children take part in the layout as if it was not
 * there. It is for a script that needs one element to find a part of the page by, such as the
 * part that a refresh replaces. It adds no space and no style.
 */
export const Contents = ({ className, ...props }: ComponentPropsWithoutRef<'div'>) => (
  <div {...props} className={classNames('hf-contents', className)} />
)
