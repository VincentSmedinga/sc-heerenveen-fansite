import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type FilterListProps = ComponentPropsWithoutRef<'div'>

/**
 * The filters of a search as one list of rows that open and close. Put a `Disclosure` in it for
 * each filter, with the choice as its `value`, so a closed row still says what is chosen.
 */
export const FilterList = ({ children, className, ...props }: FilterListProps) => (
  <div className={classNames('hf-filter-list', className)} {...props}>
    {children}
  </div>
)
