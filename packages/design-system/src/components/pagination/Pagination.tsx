import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { Link } from '../link/Link'

export type PaginationProps = Omit<ComponentPropsWithoutRef<'nav'>, 'aria-label' | 'aria-labelledby' | 'children'> & {
  /** The number of the page the visitor is on, counting from 1. */
  current: number
  /**
   * The name of the pagination for screen readers, such as "Pagina's". A page with more than one navigation gives each
   * a different name.
   */
  label: string
  /** The address of the next page. Leave it out on the last page: then there is no link. */
  nextHref?: string | undefined
  /** The address of the previous page. Leave it out on the first page: then there is no link. */
  previousHref?: string | undefined
  /** The number of pages in all. */
  total: number
}

/**
 * Pagination: a `nav` with a name, a link to the previous page, the text "Pagina 2 van 9", and a link to the next
 * page. The two links are words with an arrow, and not only arrows: the arrow to the left in front of "Vorige", the
 * arrow to the right behind "Volgende". On the first page there is no previous link and on the last page no next link;
 * the text stays in the middle either way.
 */
export const Pagination = ({ className, current, label, nextHref, previousHref, total, ...props }: PaginationProps) => (
  <nav {...props} aria-label={label} className={classNames('hf-pagination', className)}>
    {previousHref === undefined ? null : (
      <Link className="hf-pagination-link hf-pagination-previous" href={previousHref} icon="arrow-left" rel="prev">
        Vorige
      </Link>
    )}
    <span className="hf-pagination-status">
      Pagina {current} van {total}
    </span>
    {nextHref === undefined ? null : (
      <Link className="hf-pagination-link hf-pagination-next" href={nextHref} icon="arrow-right" rel="next">
        Volgende
      </Link>
    )}
  </nav>
)
