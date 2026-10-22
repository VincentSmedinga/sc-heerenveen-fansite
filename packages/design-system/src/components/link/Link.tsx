import type { ComponentPropsWithoutRef } from 'react'

export type LinkProps = ComponentPropsWithoutRef<'a'> & {
  /** Where the link goes. A link without a destination is not a link, so it is required. */
  href: string
}

/** A link, underlined as link.css makes it. Its text says where it goes, also on its own. */
export const Link = (props: LinkProps) => <a {...props} />
