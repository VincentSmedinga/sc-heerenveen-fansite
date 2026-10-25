import type { ComponentPropsWithoutRef } from 'react'

import { attachIcon } from '../icon/attachIcon'
import { Icon } from '../icon/Icon'

/**
 * The icons a Link can have, and where each stands: behind the text, because it points forward,
 * to where the link goes. The exceptions stand in front: the arrow to the left, which points
 * back, and the envelope, which says what the link does (open a mail) and not where it goes.
 */
export const linkIcons = {
  'arrow-left': 'before',
  'arrow-right': 'after',
  envelope: 'before',
  'external-link': 'after',
} as const

export type LinkIcon = keyof typeof linkIcons

export type LinkProps = ComponentPropsWithoutRef<'a'> & {
  /** Where the link goes. A link without a destination is not a link, so it is required. */
  href: string
  /**
   * An icon beside the text. `arrow-right` is for a link to more or to all of something,
   * `external-link` for a link that leaves the site, `arrow-left` for the way back and
   * `envelope` for a link that opens a mail (`mailto:`). The link is named by its text alone:
   * the icon is hidden from assistive technology. End the content of the link with text, so the
   * icon can stay with its last word.
   */
  icon?: LinkIcon
}

/** A link, underlined as link.css makes it. Its text says where it goes, also on its own. */
export const Link = ({ children, icon, ...props }: LinkProps) => (
  <a {...props}>
    {icon === undefined
      ? children
      : // An address is one long word that has to be able to break on a narrow screen (see link.css), so
        // the envelope only keeps its first letter.
        attachIcon(children, <Icon name={icon} />, linkIcons[icon], icon === 'envelope' ? 'letter' : 'word')}
  </a>
)
