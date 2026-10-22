import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type PageBodyProps = ComponentPropsWithoutRef<'div'>

export type PageCellProps = ComponentPropsWithoutRef<'div'>

export type PageFooterProps = ComponentPropsWithoutRef<'footer'>

export type PageHeaderProps = ComponentPropsWithoutRef<'header'>

export type PageMainProps = ComponentPropsWithoutRef<'main'>

export type PageProps = ComponentPropsWithoutRef<'div'>

export type PageSidebarProps = ComponentPropsWithoutRef<'aside'>

/** The top of the page, on the blue of the header: a `header` element, which is the page's banner landmark. */
const Header = ({ className, ...props }: PageHeaderProps) => (
  <header className={classNames('hf-page-header', className)} {...props} />
)

/**
 * The grid of the page between the header and the footer, always a `div`. It holds a Page.Main and, on a page that has
 * one, a Page.Sidebar, in that order. It grows to fill the screen, so the footer stays down, and it sets all the space:
 * between the columns and between the cells in a column.
 */
const Body = ({ className, ...props }: PageBodyProps) => (
  <div className={classNames('hf-page-body', className)} {...props} />
)

/** The main column and the `main` of the page, so every page has exactly one. Each of its children is a cell. */
const Main = ({ className, ...props }: PageMainProps) => (
  <main className={classNames('hf-page-main', className)} {...props} />
)

/** The sidebar, an `aside`, beside the Page.Main or under it on a narrow screen. Each of its children is a cell. */
const Sidebar = ({ className, ...props }: PageSidebarProps) => (
  <aside className={classNames('hf-page-sidebar', className)} {...props} />
)

/**
 * Puts what belongs together in one cell of a column, such as a heading with its introduction. Every child of a column
 * is a cell already; a Page.Cell makes several things one. It has no margin to the outside, and nor does what is in it.
 */
const Cell = ({ className, ...props }: PageCellProps) => (
  <div className={classNames('hf-page-cell', className)} {...props} />
)

/** The bottom of the page: a `footer` element, which is the page's contentinfo landmark. */
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
 * The page: as wide as the window. The background of the Page.Header runs from edge to edge, and what is in the header,
 * the Page.Body and the Page.Footer sit in a centred column of a maximum width, with a margin on either side on a
 * narrow screen.
 * It holds a Page.Header, a Page.Body and a Page.Footer, in that order. The Page.Body holds a Page.Main and, if the page
 * has one, a Page.Sidebar, and in them the cells, some of them a Page.Cell. They only work inside a Page, so they are
 * written as properties of it.
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
