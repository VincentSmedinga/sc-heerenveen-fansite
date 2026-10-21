import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { Link } from '../link/Link'

export type NavigationItem = {
  /** Whether this is the page the visitor is on. At most one item can be. */
  current?: boolean
  href: string
  /** The text of the link. It says where the link goes. */
  label: string
}

export type NavigationProps = Omit<ComponentPropsWithoutRef<'nav'>, 'aria-label' | 'aria-labelledby' | 'children'> & {
  items: readonly NavigationItem[]
  /**
   * The name of the navigation for screen readers, such as "Hoofdmenu". A page with more than one navigation gives each
   * a different name.
   */
  label: string
}

/** A navigation: a `nav` with a name, holding a list of links. The link to the current page gets `aria-current="page"`. */
export const Navigation = ({ className, items, label, ...props }: NavigationProps) => (
  <nav {...props} aria-label={label} className={classNames('hf-navigation', className)}>
    <ul className="hf-navigation-list">
      {items.map((item) => (
        <li key={item.href}>
          <Link aria-current={item.current ? 'page' : undefined} className="hf-navigation-link" href={item.href}>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
)
