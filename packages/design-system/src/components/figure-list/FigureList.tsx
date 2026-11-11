import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { classNames } from '../classNames'

export type FigureListItemProps = ComponentPropsWithoutRef<'li'> & {
  /** What the row is about: a name, or a link to the page of what it names. */
  children: ReactNode
  /** The number that belongs to it, at the end of the row, such as `12`. */
  figure: ReactNode
}

export type FigureListProps = ComponentPropsWithoutRef<'ol'> & {
  /** `ul` (the default), or `ol` when the order is the point, such as the top clubs. */
  as?: 'ol' | 'ul'
}

/**
 * One row of a FigureList: the name and, at the end of the row, its number in bold. It only
 * works inside a FigureList, so it is written as FigureList.Item. A screen reader reads the
 * name and then the number.
 */
const Item = ({ children, className, figure, ...props }: FigureListItemProps) => (
  <li className={classNames('hf-figure-list-item', className)} {...props}>
    <span className="hf-figure-list-name">{children}</span>
    <span className="hf-figure-list-figure">{figure}</span>
  </li>
)

// The name in React's developer tools and in the code examples in Storybook.
Item.displayName = 'FigureList.Item'

/**
 * A short list of names that each have a number, in rows with a line between them: the name on
 * the left and the number in bold on the right. It is for the small cards in a sidebar, such as
 * the goals of a player in each competition. A long name wraps and the number stays on the
 * row. figure-list.css gives it its look.
 */
export const FigureList = ({ as: Element = 'ul', className, ...props }: FigureListProps) => (
  <Element className={classNames('hf-figure-list', className)} role="list" {...props} />
)

FigureList.Item = Item
