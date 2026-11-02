import type { ComponentPropsWithoutRef } from 'react'

import { Form } from '../form/Form'
import { Link } from '../link/Link'
import { ShortcutsRow } from '../page/ShortcutsRow'

export type SectionBarEnd = {
  /**
   * What the button does, as the `action` of a form: a server action, so the button works
   * without JavaScript.
   */
  action: ComponentPropsWithoutRef<'form'>['action']
  /** The text of the button. It says what it does, such as "Uitloggen". */
  label: string
}

export type SectionBarItem = {
  /** Whether this is the page the visitor is on. At most one item can be. */
  current?: boolean
  /** Where the link goes. */
  href: string
  /** The text of the link. It says where the link goes: the name of the screen. */
  label: string
}

export type SectionBarProps = {
  /**
   * One button that is not a screen, such as "Uitloggen", as the last item of the row. On a
   * wide screen it stands at the end of the bar; on a narrow one it scrolls along with the
   * screens. It is a button in a form (a POST) and not a link, because it does something.
   */
  end?: SectionBarEnd
  /** The screens of the section, in the order they are shown. */
  items: readonly SectionBarItem[]
  /**
   * The name of the navigation for screen readers, such as "Beheer". It differs from the name
   * of the main menu, which is on the same page.
   */
  label: string
}

/**
 * The bar with the screens of a part of the site that has several, such as the admin. It goes
 * between the main menu and the Page.Body, outside the Page.Body, and looks like the bar with
 * the sub-pages of the main menu (`NavigationBar`), but it is a navigation of its own, for a
 * part that is not an item of the main menu on every page. The current screen has
 * `aria-current="page"`. An `end` button is the last item of the row, in the same `nav`.
 */
export const SectionBar = ({ end, items, label }: SectionBarProps) => (
  <nav aria-label={label} className="hf-section-bar">
    <ShortcutsRow follow={false}>
      <ul className="hf-page-shortcuts-list hf-section-bar-list" role="list">
        {items.map((item) => (
          <li key={item.href} role="listitem">
            <Link aria-current={item.current ? 'page' : undefined} className="hf-navigation-sublink" href={item.href}>
              {item.label}
            </Link>
          </li>
        ))}
        {end ? (
          <li className="hf-section-bar-end" role="listitem">
            <Form action={end.action}>
              <button className="hf-navigation-sublink" type="submit">
                {end.label}
              </button>
            </Form>
          </li>
        ) : null}
      </ul>
    </ShortcutsRow>
  </nav>
)
