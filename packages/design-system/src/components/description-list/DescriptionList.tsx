import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { classNames } from '../classNames'

export type DescriptionListItemProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** The description: plain text or content in a line, such as a `Time`. */
  children: ReactNode
  /** What the description is about, such as `Stadion`. */
  term: ReactNode
}

export type DescriptionListProps = ComponentPropsWithoutRef<'dl'>

/**
 * One pair of a DescriptionList: a `dt` with the term and a `dd` with the description, in a
 * `div` that keeps the two together. It only works inside a DescriptionList, so it is written
 * as DescriptionList.Item.
 */
const Item = ({ children, term, ...props }: DescriptionListItemProps) => (
  <div {...props}>
    <dt>{term}</dt>
    <dd>{children}</dd>
  </div>
)

// The name in React's developer tools and in the code examples in Storybook.
Item.displayName = 'DescriptionList.Item'

/**
 * A few short facts as pairs of a term and a description: a `dl` of DescriptionList.Item
 * elements. The term is small and quiet and the description is heavy, and the pairs stand next
 * to each other as far as they fit and wrap where they do not. It does not know where it
 * stands: the head of a match and a card with figures both use it. description-list.css gives
 * it its look.
 */
export const DescriptionList = ({ className, ...props }: DescriptionListProps) => (
  <dl {...props} className={classNames('hf-description-list', className)} />
)

DescriptionList.Item = Item
