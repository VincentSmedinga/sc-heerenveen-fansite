import type { ComponentPropsWithoutRef } from 'react'

import { attachIcon } from '../icon/attachIcon'
import { Icon } from '../icon/Icon'

/**
 * The icons a Link can have, and where each stands: behind the text, because it points forward,
 * to where the link goes. The exception is the arrow to the left, which points back, so it
 * stands in front.
 */
export const linkIcons = { 'arrow-left': 'before', 'arrow-right': 'after', 'external-link': 'after' } as const

export type LinkIcon = keyof typeof linkIcons

export type LinkProps = ComponentPropsWithoutRef<'a'> & {
  /** Where the link goes. A link without a destination is not a link, so it is required. */
  href: string
  /**
   * An icon beside the text. `arrow-right` is for a link to more or to all of something,
   * `external-link` for a link that leaves the site, `arrow-left` for the way back. The link is
   * named by its text alone: the icon is hidden from assistive technology. End the content of
   * the link with text, so the icon can stay with its last word.
   */
  icon?: LinkIcon
}

/** A link, underlined as link.css makes it. Its text says where it goes, also on its own. */
export const Link = ({ children, icon, ...props }: LinkProps) => (
  <a {...props}>{icon === undefined ? children : attachIcon(children, <Icon name={icon} />, linkIcons[icon])}</a>
)
