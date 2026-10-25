import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { classNames } from '../classNames'

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

export type PageSidebarProps = ComponentPropsWithoutRef<'aside'>

/**
 * The top of the page, on the blue of the header: a `header` element, which is the page's
 * banner landmark.
 */
const Header = ({ className, ...props }: PageHeaderProps) => (
  <header className={classNames('hf-page-header', className)} {...props} />
)

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
 * children is a cell.
 */
const Sidebar = ({ className, ...props }: PageSidebarProps) => (
  <aside className={classNames('hf-page-sidebar', className)} {...props} />
)

/**
 * Puts what belongs together in one cell of a column, such as a heading with its introduction.
 * It has no margin to the outside, and nor does what is in it.
 */
const Cell = ({ className, ...props }: PageCellProps) => (
  <div className={classNames('hf-page-cell', className)} {...props} />
)

/**
 * The bottom of the page, on a band of its own with a line on top: a `footer` element, which is
 * the page's contentinfo landmark. It holds two lines of text, a Text each, then if the page
 * has one a control such as the theme toggle, and the links last: beside the text on a wide
 * screen, under it on a narrow one. Links in it are dark sand.
 */
const Footer = ({ className, ...props }: PageFooterProps) => (
  <footer className={classNames('hf-page-footer', className)} {...props} />
)

// The names in React's developer tools and in the code examples in Storybook.
Header.displayName = 'Page.Header'
Body.displayName = 'Page.Body'
Main.displayName = 'Page.Main'
Sidebar.displayName = 'Page.Sidebar'
Cell.displayName = 'Page.Cell'
Footer.displayName = 'Page.Footer'

/**
 * The page: as wide as the window. The backgrounds of the Page.Header and the Page.Footer run
 * from edge to edge, and what is in them and the Page.Body sit in a centred column of a maximum
 * width, with a margin on either side on a narrow screen. It holds a Page.Header, a Page.Body
 * and a Page.Footer, in that order. The Page.Body holds a Page.Main and, if the page has one, a
 * Page.Sidebar, and in them the cells, some of them a Page.Cell. They only work inside a Page,
 * so they are written as properties of it.
 */
export const Page = ({ className, ...props }: PageProps) => (
  <div className={classNames('hf-page', className)} {...props} />
)

Page.Header = Header
Page.Body = Body
Page.Main = Main
Page.Sidebar = Sidebar
Page.Cell = Cell
Page.Footer = Footer
