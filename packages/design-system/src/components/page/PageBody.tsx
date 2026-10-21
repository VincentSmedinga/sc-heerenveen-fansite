import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

/** The elements a PageBody can be. */
export const pageBodyElements = ['main', 'div'] as const

export type PageBodyElement = (typeof pageBodyElements)[number]

export type PageBodyProps = ComponentPropsWithoutRef<'main'> & {
  /**
   * `main` makes the PageBody the page's main landmark, which is what most pages want. Use `div` when the page has
   * more than the main content in its body, such as a sidebar: then the `main` goes inside the PageBody.
   */
  as?: PageBodyElement
}

/** The part of the page between the header and the footer. It grows to fill the screen, so the footer stays down. */
export const PageBody = ({ as: Element = 'main', className, ...props }: PageBodyProps) => (
  <Element className={classNames('hf-page-body', className)} {...props} />
)
