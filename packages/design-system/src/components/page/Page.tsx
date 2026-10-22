import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

/** The elements a Page.Body can be. */
export const pageBodyElements = ['main', 'div'] as const

export type PageProps = ComponentPropsWithoutRef<'div'>

/** The top of the page, on the blue of the header: a `header` element, which is the page's banner landmark. */
const Header = ({ className, ...props }: ComponentPropsWithoutRef<'header'>) => (
  <header className={classNames('hf-page-header', className)} {...props} />
)

/** The part of the page between the header and the footer. It grows to fill the screen, so the footer stays down. */
const Body = ({
  as: Element = 'main',
  className,
  ...props
}: ComponentPropsWithoutRef<'main'> & {
  /**
   * `main` makes the Page.Body the page's main landmark, which is what most pages want. Use `div` when the page has
   * more than the main content in its body, such as a sidebar: then the `main` goes inside the Page.Body.
   */
  as?: (typeof pageBodyElements)[number]
}) => <Element className={classNames('hf-page-body', className)} {...props} />

/** The bottom of the page: a `footer` element, which is the page's contentinfo landmark. */
const Footer = ({ className, ...props }: ComponentPropsWithoutRef<'footer'>) => (
  <footer className={classNames('hf-page-footer', className)} {...props} />
)

// The names in React's developer tools and in the code examples in Storybook.
Header.displayName = 'Page.Header'
Body.displayName = 'Page.Body'
Footer.displayName = 'Page.Footer'

/**
 * The page: a centred column of a maximum width, with a margin on either side on a narrow screen.
 * It holds a Page.Header, a Page.Body and a Page.Footer, in that order. They only work inside a Page, so they are
 * written as properties of it.
 */
export const Page = ({ className, ...props }: PageProps) => (
  <div className={classNames('hf-page', className)} {...props} />
)

Page.Header = Header
Page.Body = Body
Page.Footer = Footer
