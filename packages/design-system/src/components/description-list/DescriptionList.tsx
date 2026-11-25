import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { classNames } from '../classNames'

export type DescriptionListItemProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** The description: plain text or content in a line, such as a `Time`. */
  children: ReactNode
  /**
   * Whether the description says that there is nothing to show, such as `Nog geen`. It is
   * then in the quiet colour, so it does not look like a fact.
   */
  empty?: boolean
  /** What the description is about, such as `Stadion`. */
  term: ReactNode
}

export type DescriptionListProps = ComponentPropsWithoutRef<'dl'> & {
  /**
   * With `stacked`: the term on the left and the description on the right of the same row,
   * for short terms and short values such as a figure.
   */
  aligned?: boolean
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
const Item = ({ children, empty = false, term, ...props }: DescriptionListItemProps) => (
  <div {...props}>
    <dt className="hf-meta">{term}</dt>
    <dd className={empty ? 'hf-description-list-empty' : undefined}>{children}</dd>
  </div>
)

// The name in React's developer tools and in the code examples in Storybook.
Item.displayName = 'DescriptionList.Item'

/**
 * A few short facts as pairs of a term and a description: a `dl` of DescriptionList.Item
 * elements. The term is small and quiet, the description has the weight of running text, and
 * the pairs stand next to each other as far as they fit and wrap where they do not.
 * It does not know where it stands: the head of a match and a card with figures both use it.
 * description-list.css gives it its look.
 */
export const DescriptionList = ({ aligned, className, stacked, ...props }: DescriptionListProps) => (
  <dl
    {...props}
    className={classNames(
      'hf-description-list',
      stacked && 'hf-description-list-stacked',
      stacked && aligned && 'hf-description-list-aligned',
      className,
    )}
  />
)

DescriptionList.Item = Item
