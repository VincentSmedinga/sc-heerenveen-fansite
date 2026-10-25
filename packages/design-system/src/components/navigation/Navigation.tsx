import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { Icon } from '../icon/Icon'
import { Link } from '../link/Link'

export type NavigationItem = {
  /** Whether this is the page the visitor is on. At most one item can be. */
  current?: boolean
  /**
   * Whether the link goes to another site. The link then gets an icon behind its text, the same as the headline of a
   * news line.
   */
  external?: boolean
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
            {item.external && <Icon name="external-link" />}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
)
