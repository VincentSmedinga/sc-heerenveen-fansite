import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { classNames } from '../classNames'
import { Disclosure } from '../disclosure/Disclosure'

export type FilterCardProps = {
  children: ReactNode
  /**
   * Whether the card is closed on a narrow screen, such as when a search has results and the
   * visitor wants to read them first. It is always open on a wide screen.
   */
  collapsed?: boolean
  /** The line that opens and closes the card on a narrow screen: `Filters · 2 gekozen`. */
  summary: ReactNode
} & Omit<ComponentPropsWithoutRef<'details'>, 'children' | 'open'>

/**
 * The card with the filters of a search. On a narrow screen it is a disclosure above the
 * results, and on a wide screen it is a card with the filters always in view and the summary
 * gone. Where the browser can't open a closed card on a wide screen, it stays a disclosure.
 */
export const FilterCard = ({ children, className, collapsed = false, summary, ...props }: FilterCardProps) => (
  <Disclosure {...props} className={classNames('hf-filter-card', className)} open={!collapsed} summary={summary}>
    {children}
  </Disclosure>
)
