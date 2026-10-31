import type { NavigationSubitem } from './Navigation'

import { Link } from '../link/Link'
import { ShortcutsRow } from '../page/ShortcutsRow'

/**
 * The bar with the sub-pages of a main menu item: a row of links under the menu, the current
 * one with `aria-current="page"`. `Navigation` draws it itself from the `subitems` of an item.
 * A page that has to build the links on the server, such as one that keeps a choice from its
 * address in them, draws it with this and hands it to the item as `bar`.
 */
export const NavigationBar = ({ subitems }: { subitems: readonly NavigationSubitem[] }) => (
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
)
