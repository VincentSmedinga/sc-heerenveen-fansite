import type { ComponentPropsWithoutRef } from 'react'

import type { NavigationSubitem } from './Navigation'

import { Form } from '../form/Form'
import { Link } from '../link/Link'
import { ShortcutsRow } from '../page/ShortcutsRow'

export type NavigationBarEnd = {
  /**
   * What the button does, as the `action` of a form: a server action, so the button works
   * without JavaScript.
   */
  action: ComponentPropsWithoutRef<'form'>['action']
  /** The text of the button. It says what it does, such as "Uitloggen". */
  label: string
}

export type NavigationBarProps = (
  | {
      /**
       * One button that is not a screen, such as "Uitloggen", as the last item of the row. On a
       * wide screen it stands at the end of the bar; on a narrow one it scrolls along with the
       * screens. It is a button in a form (a POST) and not a link, because it does something.
       */
      end?: NavigationBarEnd
      /**
       * The name of the navigation for screen readers, such as "Beheer". With a name the bar
       * stands on its own, outside the main menu, so the name differs from the one of the menu.
       */
      label: string
    }
  | {
      /** Only a bar on its own has a button at the end. */
      end?: undefined
      /** Without a name the bar is the one in the main menu, and `Navigation` draws it. */
      label?: undefined
    }
) & {
  /** The screens or pages of the bar, in the order they are shown. */
  subitems: readonly NavigationSubitem[]
}

/**
 * The bar with the sub-pages of a main menu item: a row of links under the menu, the current
 * one with `aria-current="page"`. `Navigation` draws it itself from the `subitems` of an item.
 * A page that has to build the links on the server, such as one that keeps a choice from its
 * address in them, draws it with this and hands it to the item as `bar`.
 *
 * With a `label` the bar stands on its own: a `nav` of its own between the main menu and the
 * Page.Body, outside the Page.Body, for a part of the site that has several screens but is not
 * an item of the main menu on every page, such as the admin. It looks like the bar in the menu,
 * and may have an `end` button in the same `nav`.
 */
export const NavigationBar = ({ end, label, subitems }: NavigationBarProps) => {
  const row = (
    <ShortcutsRow follow={false}>
      <ul className={`hf-page-shortcuts-list${end ? ' hf-navigation-bar-list' : ''}`} role="list">
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
        {end ? (
          <li className="hf-navigation-bar-end" role="listitem">
            <Form action={end.action}>
              <button className="hf-navigation-sublink" type="submit">
                {end.label}
              </button>
            </Form>
          </li>
        ) : null}
      </ul>
    </ShortcutsRow>
  )

  return label === undefined ? (
    <div className="hf-navigation-bar">{row}</div>
  ) : (
    <nav aria-label={label} className="hf-navigation-bar hf-navigation-bar-alone">
      {row}
    </nav>
  )
}
