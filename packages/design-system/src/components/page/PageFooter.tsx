import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type PageFooterProps = ComponentPropsWithoutRef<'footer'>

/** The bottom of the page: a `footer` element, which is the page's contentinfo landmark. */
export const PageFooter = ({ className, ...props }: PageFooterProps) => (
  <footer className={classNames('hf-page-footer', className)} {...props} />
)
