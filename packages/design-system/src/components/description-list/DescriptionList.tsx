import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { classNames } from '../classNames'

export type DescriptionListItemProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** The description: plain text or content in a line, such as a `Time`. */
  children: ReactNode
  /** What the description is about, such as `Stadion`. */
  term: ReactNode
}

export type DescriptionListProps = ComponentPropsWithoutRef<'dl'> & {
  /**
   * Puts the pairs under each other with a line between them, the term above its description,
   * for a narrow column such as a sidebar. Without it the pairs stand next to each other as
   * far as they fit.
   */
  stacked?: boolean
}

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
 * elements. The term is small and quiet, the description is a little heavier than running
 * text, and the pairs stand next to each other as far as they fit and wrap where they do not.
 * It does not know where it stands: the head of a match and a card with figures both use it.
 * description-list.css gives it its look.
 */
export const DescriptionList = ({ className, stacked, ...props }: DescriptionListProps) => (
  <dl {...props} className={classNames('hf-description-list', stacked && 'hf-description-list-stacked', className)} />
)

DescriptionList.Item = Item
