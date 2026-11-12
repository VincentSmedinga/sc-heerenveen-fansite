import { type ComponentPropsWithoutRef, type CSSProperties, useId } from 'react'

import { classNames } from '../classNames'
import { Icon } from '../icon/Icon'
import { Link } from '../link/Link'
import { ShortcutsRow } from './ShortcutsRow'

/**
 * The areas of a page, as the rows of the grid, one string per row with a name for each column,
 * such as `'main side'`: the same name in two columns, or in two rows, is one area. `narrow` is
 * for a screen under 52rem, with one column, and `wide` for the screen from there on, with two
 * columns. The rows come in a fixed order: the heading (`head`), the toolbar (`toolbar`), the
 * content and last the credit (`source`). A row of a page without a toolbar is left out.
 */
export type PageAreas = {
  /** The rows under 52rem, with one column, in the order of the source. */
  narrow: readonly string[]
  /** The rows from 52rem, with two columns. Use `.` for an empty place. */
  wide: readonly string[]
}

export type PageBodyProps = ComponentPropsWithoutRef<'div'>

export type PageCellProps = ComponentPropsWithoutRef<'div'> & {
  /**
   * The area of the grid of the Page.Main that the cell sits in, as it is named in its `areas`.
   * Without it the cell takes the next free place, which is only right in a Page.Main without
   * `areas`.
   */
  area?: string
}

/** How the page divides its width from 52rem, a set of tokens in layout.css. */
export type PageColumns = 'equal' | 'narrow-side' | 'side' | 'start-side'

export type PageFooterProps = ComponentPropsWithoutRef<'footer'>

export type PageHeaderProps = ComponentPropsWithoutRef<'header'>

export type PageMainProps = ComponentPropsWithoutRef<'main'> & {
  /**
   * The areas of the page. With them the Page.Main is a grid of its own, as wide as the page,
   * and each cell names its area (see `area` of the Page.Cell). Without them the Page.Main is
   * one column, as wide as the content, and each child is a cell.
   */
  areas?: PageAreas
  /** How the width is divided from 52rem, with `areas`. Defaults to `side`. */
  columns?: PageColumns
}

export type PageProps = ComponentPropsWithoutRef<'div'>

export type PageSectionProps = Omit<ComponentPropsWithoutRef<'section'>, 'aria-label' | 'aria-labelledby'> &
  ({ 'aria-label': string; 'aria-labelledby'?: never } | { 'aria-label'?: never; 'aria-labelledby': string }) & {
    /** The area of the grid of the Page.Main that the section sits in. */
    area: string
  }

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

export type PageTitleProps = ComponentPropsWithoutRef<'div'> & {
  /**
   * Where what is beside the heading goes when it does not fit there: `end` (the default) keeps
   * it on the right under the heading, `start` puts it under the heading on the left, as a line
   * of text that belongs to the name, such as the line, country and year of birth of a player.
   */
  wrapped?: 'end' | 'start'
}

export type PageToolbarProps = ComponentPropsWithoutRef<'div'>

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

const rowsToAreas = (rows: readonly string[]) => rows.map((row) => `"${row.trim()}"`).join(' ')

// The custom properties that page.css reads. The last row of the wide grid takes the height
// that a tall main needs, so the rows above it stay as tall as their cells.
const areaProperties = ({ narrow, wide }: PageAreas, columns: PageColumns) =>
  ({
    '--hf-page-areas-narrow': rowsToAreas(narrow),
    '--hf-page-areas-wide': rowsToAreas(wide),
    '--hf-page-columns': `var(--hf-page-columns-${columns})`,
    '--hf-page-rows-wide': `${'auto '.repeat(Math.max(wide.length - 1, 0))}1fr`,
  }) as CSSProperties

/**
 * The space of the page between the header and the footer: a `div` with the Page.Main in it. It
 * sets the space around the main and between the cells.
 */
const Body = ({ className, ...props }: PageBodyProps) => (
  <div className={classNames('hf-page-body', className)} {...props} />
)

/**
 * The `main` of the page, so every page has exactly one. Each of its children is a cell. With
 * `areas` it is the grid of the page, as wide as the page; without them it is one column.
 */
const Main = ({ areas, className, columns = 'side', style, ...props }: PageMainProps) => (
  <main
    className={classNames('hf-page-main', areas !== undefined && 'hf-page-main-grid', className)}
    style={areas === undefined ? style : { ...areaProperties(areas, columns), ...style }}
    {...props}
  />
)

/**
 * Puts what belongs together in one cell of a column, such as a heading with its introduction.
 * It has no margin to the outside, and nor does what is in it.
 */
const Cell = ({ area, className, style, ...props }: PageCellProps) => (
  <div
    className={classNames('hf-page-cell', className)}
    style={area === undefined ? style : { gridArea: area, ...style }}
    {...props}
  />
)

/**
 * A cell of a Page.Main with `areas` that is a section with a name, a landmark `region`: for
 * what stands beside the main content, such as a filter or the cards of a sidebar. It has a
 * name, which is `aria-labelledby` pointing to its heading, or `aria-label`. Cards that only
 * stand under each other go in one section, which is a grid with rows of its own, so a tall
 * card does not stretch the row of the main content beside it.
 */
const Section = ({ area, className, style, ...props }: PageSectionProps) => (
  <section className={classNames('hf-page-section', className)} style={{ gridArea: area, ...style }} {...props} />
)

/**
 * The row under the heading, as wide as the page, for what steers the whole page: the choice of
 * a season, a switch, and in the admin the filter and the buttons to save. It wraps on a phone
 * and does not stick. It is no landmark and has no role `toolbar`, which promises arrow keys
 * between its controls: each control in it has a name of its own. It sits in the area `toolbar`
 * of a Page.Main with `areas`, and comes after the heading in the source. A page without one
 * has no row for it, so there is no empty space.
 */
const Toolbar = ({ className, style, ...props }: PageToolbarProps) => (
  <div className={classNames('hf-page-toolbar', className)} style={{ gridArea: 'toolbar', ...style }} {...props} />
)

/**
 * The title row of a page, for the heading cell of a Page.Main: the heading of the page and,
 * beside it, one control that belongs to the whole page, such as the SeasonPicker. The control
 * sits at the end of the row, on the right. Where the two do not fit side by side the control
 * goes under the heading and stays on the right, or, with `wrapped="start"`, on the left. A row
 * with the heading alone is the heading.
 */
const Title = ({ className, wrapped = 'end', ...props }: PageTitleProps) => (
  <div className={classNames('hf-page-title', wrapped === 'start' && 'hf-page-title-start', className)} {...props} />
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
Title.displayName = 'Page.Title'
Cell.displayName = 'Page.Cell'
Section.displayName = 'Page.Section'
Toolbar.displayName = 'Page.Toolbar'
Footer.displayName = 'Page.Footer'
TopLink.displayName = 'Page.TopLink'

/**
 * The page: as wide as the window. The backgrounds of the Page.Header and the Page.Footer run
 * from edge to edge, and what is in them and the Page.Body sit in a centred column of a maximum
 * width, with a margin on either side on a narrow screen. It holds a Page.Header, a Page.Body
 * and a Page.Footer, in that order, and between the first two the main menu, a Navigation with
 * `appearance="header"`, and a Page.Shortcuts, in that order, if the page has one. The
 * Page.Body holds a Page.Main, and in it the cells, some of them a Page.Cell or a Page.Section.
 * They only work inside a Page, so they are written as properties of it. Before them the page
 * has an empty `div` that is fixed to the top of the screen in the colour of the header, for
 * the status bar of a phone (see page.css).
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
Page.Title = Title
Page.Cell = Cell
Page.Section = Section
Page.Toolbar = Toolbar
Page.Footer = Footer
Page.TopLink = TopLink
