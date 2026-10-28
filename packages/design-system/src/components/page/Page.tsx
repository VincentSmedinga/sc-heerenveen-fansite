import { type ComponentPropsWithoutRef, type ReactNode, useId } from 'react'

import { classNames } from '../classNames'
import { Link } from '../link/Link'
import { ShortcutsRow } from './ShortcutsRow'

export type PageBodyProps = ComponentPropsWithoutRef<'div'>

export type PageCellProps = ComponentPropsWithoutRef<'div'>

export type PageFooterProps = ComponentPropsWithoutRef<'footer'>

export type PageHeaderProps = ComponentPropsWithoutRef<'header'>

export type PageMainProps = ComponentPropsWithoutRef<'main'> & {
  /**
   * The introduction of the page, such as its heading with a text: one cell at the top of the
   * main column, which the children follow. On a wide screen the Page.Sidebar starts under it,
   * level with the first child. Without an `intro` the children are the cells of the column and
   * the sidebar starts at the top.
   */
  intro?: ReactNode
}

export type PageProps = ComponentPropsWithoutRef<'div'>

export type PageShortcutsItem = {
  /** Where the link goes, such as `#stand` for a card on the page. */
  href: string
  /** The text of the link. It says where the link goes: for a card, the name of the card. */
  label: string
}

export type PageShortcutsProps = Omit<
  ComponentPropsWithoutRef<'nav'>,
  'aria-label' | 'aria-labelledby' | 'children'
> & {
  /** The links, in the order they are shown. At least two make a row. */
  items: readonly PageShortcutsItem[]
  /**
   * The label in front of the links. It is also the name of the navigation for screen readers,
   * so it says what the links are: "Op deze pagina:" for links to the cards of the page.
   */
  label: string
}

export type PageSidebarProps = ComponentPropsWithoutRef<'aside'> & {
  /**
   * Puts the cells next to each other, in two columns, where two of them fit, which is under
   * the main column on a middle screen. For a sidebar of small cells. Without it the cells sit
   * under each other at every width, which suits cells with a list.
   */
  split?: boolean
  /**
   * A sidebar as wide as the main column, which is narrower than on other pages, for a page
   * whose sidebar holds a table or another cell that needs the width. The columns stay as wide
   * together as without it. It is the Page.Sidebar that tells the Page.Body, so a page can
   * choose it without owning the Page.Body, which the layout of the site renders.
   */
  wide?: boolean
}

export type PageSubmenuItem = {
  /** Whether this is the page the visitor is on. At most one item can be. */
  current?: boolean
  /** Where the link goes: a sub-page of the section. */
  href: string
  /** The text of the link. It says where the link goes: the name of the sub-page. */
  label: string
}

export type PageSubmenuProps = Omit<ComponentPropsWithoutRef<'nav'>, 'aria-label' | 'aria-labelledby' | 'children'> & {
  /** The links, in the order they are shown. */
  items: readonly PageSubmenuItem[]
  /**
   * The name of the navigation for screen readers, such as the name of the section
   * ("Wedstrijden"). The bar has no visible label. A page with more than one navigation under
   * the header gives each a different name.
   */
  label: string
}

/**
 * The top of the page, on the blue of the header: a `header` element, which is the page's
 * banner landmark. It holds the logo and, if the page has one, the ThemeButton in the first
 * row, and the main menu (a Navigation) in a row of its own under them.
 */
const Header = ({ className, ...props }: PageHeaderProps) => (
  <header className={classNames('hf-page-header', className)} {...props} />
)

/**
 * A bar under the main menu with the sub-pages of a section, in a `nav` of its own, outside the
 * `main`, as wide as the page. It is a tint of the header, so it is seen to belong to the menu,
 * and it has no visible label: the page already names the section, in the menu and in its
 * title. The name for screen readers is the `label`. It is there on every width and never
 * sticks, so it scrolls away with the header. The row scrolls sideways when it is too long,
 * with a fade at the edge and snapping, as the Page.Shortcuts bar does, and begins scrolled so
 * that the link to the current page is in view. On a very narrow screen, or where the text is
 * much larger, the row wraps instead.
 *
 * The link to the current page has `aria-current="page"`, a heavier weight and the red line of
 * the menu. It comes between the Page.Header and the Page.Shortcuts, if the page has one, so
 * the reading order and the focus order are the page's: the menu, the sub-pages, the anchors,
 * then the content.
 */
const Submenu = ({ className, items, label, ...props }: PageSubmenuProps) => (
  <nav {...props} aria-label={label} className={classNames('hf-page-submenu', className)}>
    <ShortcutsRow follow={false}>
      <ul className="hf-page-shortcuts-list">
        {items.map((item) => (
          <li key={item.href}>
            <Link aria-current={item.current ? 'page' : undefined} className="hf-page-submenu-link" href={item.href}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </ShortcutsRow>
  </nav>
)

/**
 * A bar under the header with a label and a row of links, in a `nav` of its own, outside the
 * `main`, as wide as the page. It is for a narrow screen, where the cells of a page sit under
 * each other and a long one hides the next: the links jump to the cells. From the width where
 * the Page.Body has two columns the bar is gone, also for a screen reader (`display: none`).
 * The label stays and the row scrolls sideways when it is too long, snapping to the start of a
 * link, with the last link cut off and a fade at the edge, so the reader sees there is more.
 * The bar sticks to the top of the window when the page scrolls. On a very narrow screen, or
 * where the text is much larger, the row wraps instead, and the bar does not stick.
 *
 * It holds a label and a list of links and is not bound to anchors, so it can serve other rows
 * of links as well. It comes between the Page.Header and the Page.Body, so the reading order
 * and the focus order are the page's: the menu, this bar, then the content.
 *
 * The bar follows the page. The link to the heading that came past a line under the bar last
 * is the current place: it gets `aria-current="location"` and a red line, and the row scrolls
 * it to the start, never the page. Before the first heading there is no current link, and
 * without script there is none either. A link that points to no element is never the current
 * one. A link goes to `#id`, so an item that is not an anchor does not take part.
 */
const Shortcuts = ({ className, items, label, ...props }: PageShortcutsProps) => {
  const labelId = useId()

  return (
    <nav {...props} aria-labelledby={labelId} className={classNames('hf-page-shortcuts', className)}>
      <span className="hf-page-shortcuts-label" id={labelId}>
        {label}
      </span>
      <ShortcutsRow>
        <ul className="hf-page-shortcuts-list">
          {items.map((item) => (
            <li key={item.href}>
              <Link className="hf-page-shortcuts-link" href={item.href}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </ShortcutsRow>
    </nav>
  )
}

/**
 * The grid of the page between the header and the footer: a `div` with a Page.Main and, if the
 * page has one, a Page.Sidebar. It sets the space between the columns and between the cells. If
 * the Page.Main has an `intro`, the Page.Sidebar starts under it on a wide screen.
 */
const Body = ({ className, ...props }: PageBodyProps) => (
  <div className={classNames('hf-page-body', className)} {...props} />
)

/**
 * The main column and the `main` of the page, so every page has exactly one. Each of its
 * children is a cell. With an `intro` the column holds the introduction in a `div` of its own,
 * and the children in a second `div`, which stacks them like the column does without an
 * introduction. The Page.Body needs the two to start the Page.Sidebar under the introduction.
 * The `intro` prop adds them, so a page can't leave one out.
 */
const Main = ({ children, className, intro, ...props }: PageMainProps) => (
  <main className={classNames('hf-page-main', className)} {...props}>
    {intro === undefined || intro === null || intro === false ? (
      children
    ) : (
      <>
        <div className="hf-page-intro">{intro}</div>
        <div className="hf-page-cells">{children}</div>
      </>
    )}
  </main>
)

/**
 * The sidebar, an `aside`: beside the Page.Main, or under it on a narrow screen. Each of its
 * children is a cell, and the cells sit under each other. With `split` they sit side by side
 * where two fit, and with `wide` the sidebar is as wide as the main column.
 */
const Sidebar = ({ className, split = false, wide = false, ...props }: PageSidebarProps) => (
  <aside
    className={classNames(
      'hf-page-sidebar',
      split && 'hf-page-sidebar-split',
      wide && 'hf-page-sidebar-wide',
      className,
    )}
    {...props}
  />
)

/**
 * Puts what belongs together in one cell of a column, such as a heading with its introduction.
 * It has no margin to the outside, and nor does what is in it.
 */
const Cell = ({ className, ...props }: PageCellProps) => (
  <div className={classNames('hf-page-cell', className)} {...props} />
)

/**
 * The bottom of the page, on a band of its own that only its colour sets apart from the body: a
 * `footer` element, which is the page's contentinfo landmark. It holds two lines of text, a
 * Text each, and the links last: beside the text on a wide screen, under it on a narrow one.
 * Links in it are the blue of links elsewhere.
 */
const Footer = ({ className, ...props }: PageFooterProps) => (
  <footer className={classNames('hf-page-footer', className)} {...props} />
)

// The names in React's developer tools and in the code examples in Storybook.
Header.displayName = 'Page.Header'
Submenu.displayName = 'Page.Submenu'
Shortcuts.displayName = 'Page.Shortcuts'
Body.displayName = 'Page.Body'
Main.displayName = 'Page.Main'
Sidebar.displayName = 'Page.Sidebar'
Cell.displayName = 'Page.Cell'
Footer.displayName = 'Page.Footer'

/**
 * The page: as wide as the window. The backgrounds of the Page.Header and the Page.Footer run
 * from edge to edge, and what is in them and the Page.Body sit in a centred column of a maximum
 * width, with a margin on either side on a narrow screen. It holds a Page.Header, a Page.Body
 * and a Page.Footer, in that order, and between the first two a Page.Submenu and a
 * Page.Shortcuts, in that order, if the page has them. The Page.Body holds a Page.Main and, if
 * the page has one, a Page.Sidebar, and in them the cells, some of them a Page.Cell. They only
 * work inside a Page,
 * so they are written as properties of it. Before them the page has an empty `div` that is
 * fixed to the top of the screen in the colour of the header, for the status bar of a phone
 * (see page.css).
 */
export const Page = ({ children, className, ...props }: PageProps) => (
  <div className={classNames('hf-page', className)} {...props}>
    <div aria-hidden="true" className="hf-page-top-edge" />
    {children}
  </div>
)

Page.Header = Header
Page.Submenu = Submenu
Page.Shortcuts = Shortcuts
Page.Body = Body
Page.Main = Main
Page.Sidebar = Sidebar
Page.Cell = Cell
Page.Footer = Footer
