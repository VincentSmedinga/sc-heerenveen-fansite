import { type ComponentPropsWithoutRef, type ReactNode, useId } from 'react'

import { classNames } from '../classNames'
import { Icon } from '../icon/Icon'
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

export type PageTitleProps = ComponentPropsWithoutRef<'div'>

export type PageTopLinkProps = Omit<ComponentPropsWithoutRef<'a'>, 'aria-label' | 'children' | 'href'> & {
  /**
   * The name of the link for a screen reader, such as "Naar boven". There is no visible text,
   * so the name is what a visitor hears. It does not say "link", which the screen reader
   * adds itself.
   */
  label: string
}

/**
 * The top of the page, on the blue of the header: a `header` element, which is the page's
 * banner landmark. It holds the logo and, if the page has one, the ThemeButton. The main menu
 * is not in it: it is a Navigation with `appearance="header"` right after it, on the same
 * blue, so the two look like one band, and the menu is a navigation of its own and not part of
 * the banner.
 */
const Header = ({ className, ...props }: PageHeaderProps) => (
  <header className={classNames('hf-page-header', className)} {...props} />
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
 * of links as well. It comes between the main menu (the Navigation after the Page.Header) and
 * the Page.Body, so the reading order and the focus order are the page's: the menu, this bar,
 * then the content.
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
 * The title row of a page, for the `intro` of a Page.Main: the heading of the page and, beside
 * it, one control that belongs to the whole page, such as the SeasonPicker. The control sits at
 * the end of the row, on the right. Where the two do not fit side by side the control goes
 * under the heading and stays on the right. A row with the heading alone is the heading.
 */
const Title = ({ className, ...props }: PageTitleProps) => (
  <div className={classNames('hf-page-title', className)} {...props} />
)

/**
 * The bottom of the page, on a band of its own that only its colour sets apart from the body: a
 * `footer` element, which is the page's contentinfo landmark. It holds two lines of text, a
 * Text each, and the links: beside the text on a wide screen, under it on a narrow one. If the
 * page has a Page.TopLink, it comes last. Links in it are the blue of links elsewhere.
 */
const Footer = ({ className, ...props }: PageFooterProps) => (
  <footer className={classNames('hf-page-footer', className)} {...props} />
)

/**
 * A round button in the Page.Footer that takes the visitor back to the top of the page: a link
 * to `#top`, the top of the document, so it works without script. It looks like the ThemeButton
 * of the header, with an arrow pointing up, in the blue of the links in the footer. The
 * `label` is its name, and there is no visible text.
 *
 * It is only there where it helps: when the page can scroll further than the height of the
 * window, that is when the page is more than twice as high as the window. Short pages, such as
 * an error page, never show it. A scroll-driven animation in top-link.css makes it
 * `visibility: hidden` until then, so a hidden link is not reached with Tab and not read out.
 * That needs no script. A browser that does not know scroll-driven animations always shows it.
 *
 * Put it last in the Page.Footer, after the links. A visitor who tabs to the end of a long page
 * then meets it after the other links, once it has appeared. The footer puts it on the right,
 * above the links on a narrow screen, so the order on the screen differs from the order of the
 * keyboard. The link is not part of a text, and a screen reader hears no more than "Naar
 * boven, link".
 */
const TopLink = ({ className, label, ...props }: PageTopLinkProps) => (
  <a {...props} aria-label={label} className={classNames('hf-page-top-link', className)} href="#top">
    <Icon name="arrow-up" />
  </a>
)

// The names in React's developer tools and in the code examples in Storybook.
Header.displayName = 'Page.Header'
Shortcuts.displayName = 'Page.Shortcuts'
Body.displayName = 'Page.Body'
Main.displayName = 'Page.Main'
Sidebar.displayName = 'Page.Sidebar'
Title.displayName = 'Page.Title'
Cell.displayName = 'Page.Cell'
Footer.displayName = 'Page.Footer'
TopLink.displayName = 'Page.TopLink'

/**
 * The page: as wide as the window. The backgrounds of the Page.Header and the Page.Footer run
 * from edge to edge, and what is in them and the Page.Body sit in a centred column of a maximum
 * width, with a margin on either side on a narrow screen. It holds a Page.Header, a Page.Body
 * and a Page.Footer, in that order, and between the first two the main menu, a Navigation with
 * `appearance="header"`, and a Page.Shortcuts, in that order, if the page has one. The
 * Page.Body holds a Page.Main and, if the page has one, a Page.Sidebar, and in them the cells,
 * some of them a Page.Cell. They only work inside a Page, so they are written as properties of
 * it. Before them the page has an empty `div` that is
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
Page.Shortcuts = Shortcuts
Page.Body = Body
Page.Main = Main
Page.Sidebar = Sidebar
Page.Title = Title
Page.Cell = Cell
Page.Footer = Footer
Page.TopLink = TopLink
