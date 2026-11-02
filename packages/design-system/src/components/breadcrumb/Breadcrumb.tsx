import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { Link } from '../link/Link'

export type BreadcrumbItem = {
  /** Where the link goes: the page above the current one. */
  href: string
  /** The text of the link. It says where the link goes. */
  label: string
}

export type BreadcrumbProps = Omit<ComponentPropsWithoutRef<'nav'>, 'aria-label' | 'aria-labelledby' | 'children'> & {
  /** The current page, as text: it is the last crumb and has no link. */
  current: string
  /** The pages above the current one, the highest first. */
  items: readonly BreadcrumbItem[]
  /**
   * The name of the breadcrumb for screen readers, such as "Kruimelpad". A page with more than
   * one navigation gives each a different name.
   */
  label: string
}

/**
 * A breadcrumb: a navigation with the way from the top of a section to the page the visitor is
 * on, as an ordered list of links. The last crumb is the current page: text, without a link,
 * with `aria-current="page"`. The marks between the crumbs are drawn by breadcrumb.css and are
 * no text, so a screen reader reads the list as a list and does not read a sign between items.
 * On a narrow screen the crumbs wrap to the next line.
 */
export const Breadcrumb = ({ className, current, items, label, ...props }: BreadcrumbProps) => (
  <nav {...props} aria-label={label} className={classNames('hf-navigation', 'hf-breadcrumb', className)}>
    <ol className="hf-breadcrumb-list">
      {items.map((item) => (
        <li key={item.href}>
          <Link className="hf-navigation-link" href={item.href}>
            {item.label}
          </Link>
        </li>
      ))}
      <li>
        <span aria-current="page" className="hf-breadcrumb-current">
          {current}
        </span>
      </li>
    </ol>
  </nav>
)
