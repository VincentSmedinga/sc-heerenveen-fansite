import type { NavigationProps } from '../navigation/Navigation'

import { classNames } from '../classNames'
import { Navigation } from '../navigation/Navigation'

export type FilterProps = NavigationProps

/**
 * A filter: a row of links that each show the same list, limited to one kind of item. It is a `Navigation` with its
 * own class: the link to the choice the visitor made gets `aria-current="page"`, and every link goes to an address, so
 * the filter works without JavaScript.
 */
export const Filter = ({ className, ...props }: FilterProps) => (
  <Navigation {...props} className={classNames('hf-filter', className)} />
)
