import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type PageProps = ComponentPropsWithoutRef<'div'>

/**
 * The page: a centred column of a maximum width, with a margin on either side on a narrow screen.
 * It holds a PageHeader, a PageBody and a PageFooter, in that order.
 */
export const Page = ({ className, ...props }: PageProps) => (
  <div className={classNames('hf-page', className)} {...props} />
)
