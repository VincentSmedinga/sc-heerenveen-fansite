import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type PageHeaderProps = ComponentPropsWithoutRef<'header'>

/** The top of the page, on the blue of the header: a `header` element, which is the page's banner landmark. */
export const PageHeader = ({ className, ...props }: PageHeaderProps) => (
  <header className={classNames('hf-page-header', className)} {...props} />
)
