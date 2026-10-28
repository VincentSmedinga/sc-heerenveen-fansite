import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { Icon } from '../icon/Icon'
import { Link } from '../link/Link'
import { ShortcutsRow } from '../page/ShortcutsRow'

export type NavigationItem = {
  /** Whether this is the page the visitor is on. At most one item can be. */
  current?: boolean
  /**
   * Whether the link goes to another site. The link then gets an icon behind its text, the same
   * as the headline of a news line.
   */
  external?: boolean
  href: string
  /** The text of the link. It says where the link goes. */
  label: string
  /**
   * The sub-pages of this item, in the order they are shown. They are shown in a bar under the
   * menu, only while the visitor is on this item or on one of them. Only the menu in the header
   * has them.
   */
  subitems?: readonly NavigationSubitem[]
}

export type NavigationProps = Omit<ComponentPropsWithoutRef<'nav'>, 'aria-label' | 'aria-labelledby' | 'children'> & {
  /**
   * `header` is the main menu of the site: it goes under the Page.Header, on the same blue, and
   * is the only one that shows `subitems`. Without it the navigation is a plain row of links,
   * such as the one in the footer.
   */
  appearance?: 'default' | 'header'
  items: readonly NavigationItem[]
  /**
   * The name of the navigation for screen readers, such as "Hoofdmenu". A page with more than
   * one navigation gives each a different name.
   */
  label: string
}

export type NavigationSubitem = {
  /** Whether this is the page the visitor is on. If one is, no item is the current page. */
  current?: boolean
  /** Where the link goes: a sub-page of the item. */
  href: string
  /** The text of the link. It says where the link goes: the name of the sub-page. */
  label: string
}

/**
 * A navigation: a `nav` with a name, holding a list of links. The link to the current page gets
 * `aria-current="page"`.
 *
 * The main menu of the site (`appearance="header"`) can also show the sub-pages of the item the
 * visitor is on. They are a list in the `li` of that item, so one navigation holds both levels
 * and a screen reader finds one landmark. The list is shown as a bar over the whole width under
 * the row of the menu. While the visitor is on a sub-page, the item has `aria-current="true"`
 * and the sub-page has `aria-current="page"`.
 */
export const Navigation = ({ appearance = 'default', className, items, label, ...props }: NavigationProps) => {
  const header = appearance === 'header'

  return (
    <nav
      {...props}
      aria-label={label}
      className={classNames('hf-navigation', header && 'hf-navigation-header', className)}
    >
      {/*
       * In the header the list and its items take no box of their own (display: contents, see
       * navigation.css), so the bar can go under all the links, and a browser that drops the
       * list from the accessibility tree for that gets the roles back.
       */}
      <ul className="hf-navigation-list" role={header ? 'list' : undefined}>
        {items.map((item) => {
          const subitems = header ? (item.subitems ?? []) : []
          const onSubitem = subitems.some((subitem) => subitem.current)
          const showSubitems = subitems.length > 0 && (item.current || onSubitem)

          return (
            <li key={item.href} role={header ? 'listitem' : undefined}>
              <Link
                aria-current={item.current ? 'page' : onSubitem ? 'true' : undefined}
                className="hf-navigation-link"
                href={item.href}
              >
                {item.label}
                {item.external && <Icon name="external-link" />}
              </Link>
              {showSubitems && (
                <div className="hf-navigation-bar">
                  <ShortcutsRow follow={false}>
                    <ul className="hf-page-shortcuts-list">
                      {subitems.map((subitem) => (
                        <li key={subitem.href}>
                          <Link
                            aria-current={subitem.current ? 'page' : undefined}
                            className="hf-navigation-sublink"
                            href={subitem.href}
                          >
                            {subitem.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </ShortcutsRow>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
