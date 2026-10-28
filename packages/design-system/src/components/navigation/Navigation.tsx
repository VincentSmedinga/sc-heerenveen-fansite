import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { Icon } from '../icon/Icon'
import { Link } from '../link/Link'
import { ShortcutsRow } from '../page/ShortcutsRow'
import { NavigationMore } from './NavigationMore'

/**
 * From this many items the main menu puts the ones in between behind a button, when it has a
 * `moreLabel`. Up to five the row stays as it is.
 */
const itemsFromMore = 6

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
  /**
   * The text of the button that holds the items of a long main menu, such as "Meer". With it,
   * the main menu (`appearance="header"`) of six or more items shows the first item, the
   * button and the last item on a screen too narrow for one row, and the items in between in a
   * list under the button. On a wide screen all items stand in the row, and with five or fewer
   * items, or without this, nothing changes. The text comes from the caller, as `label` does.
   */
  moreLabel?: string
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
 *
 * A main menu of six or more items with a `moreLabel` puts the items between the first and the
 * last behind a button on a narrow screen (see `NavigationMore`). Those items are in the HTML
 * twice, once for the row and once for the list, and the stylesheet shows the one that fits the
 * width: the other is `display: none`, so a screen reader and the keyboard meet each item once.
 * The copy in the row has the sub-pages, the copy in the list does not.
 */
export const Navigation = ({
  appearance = 'default',
  className,
  items,
  label,
  moreLabel,
  ...props
}: NavigationProps) => {
  const header = appearance === 'header'
  const folded = header && moreLabel !== undefined && items.length >= itemsFromMore
  const inner = folded ? items.slice(1, -1) : []
  // The page the visitor is on, to close the list under the button on a new page.
  const here = items.flatMap((item) => [item, ...(item.subitems ?? [])]).find((item) => item.current)

  const renderItem = (item: NavigationItem, itemClassName?: string) => {
    const subitems = header ? (item.subitems ?? []) : []
    const onSubitem = subitems.some((subitem) => subitem.current)
    const showSubitems = subitems.length > 0 && (item.current || onSubitem)

    return (
      <li className={itemClassName} key={item.href} role={header ? 'listitem' : undefined}>
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
              <ul className="hf-page-shortcuts-list" role="list">
                {subitems.map((subitem) => (
                  <li key={subitem.href} role="listitem">
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
  }

  // Whether the visitor is on the item or on one of its sub-pages.
  const isHere = (item: NavigationItem) => item.current || item.subitems?.some((subitem) => subitem.current)

  return (
    <nav
      {...props}
      aria-label={label}
      className={classNames(
        'hf-navigation',
        header && 'hf-navigation-header',
        folded && 'hf-navigation-folded',
        className,
      )}
    >
      {/*
       * In the header the list and its items take no box of their own (display: contents, see
       * navigation.css), so the bar can go under all the links, and a browser that drops the
       * list from the accessibility tree for that gets the roles back. The list in the bar has
       * the roles too: Safari also drops a list without bullets.
       */}
      <ul className="hf-navigation-list" role={header ? 'list' : undefined}>
        {folded ? (
          <>
            {renderItem(items[0]!)}
            {inner.map((item) =>
              renderItem(item, classNames('hf-navigation-wide', isHere(item) && 'hf-navigation-wide-here')),
            )}
            <li className="hf-navigation-more" role="listitem">
              <NavigationMore key={here?.href} label={moreLabel}>
                {inner.map((item) => (
                  <li className={isHere(item) ? 'hf-navigation-more-here' : undefined} key={item.href} role="listitem">
                    <Link
                      aria-current={item.current ? 'page' : isHere(item) ? 'true' : undefined}
                      className="hf-navigation-link"
                      href={item.href}
                    >
                      {item.label}
                      {item.external && <Icon name="external-link" />}
                    </Link>
                  </li>
                ))}
              </NavigationMore>
            </li>
            {renderItem(items.at(-1)!)}
          </>
        ) : (
          items.map((item) => renderItem(item))
        )}
      </ul>
    </nav>
  )
}
