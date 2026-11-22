import type { ComponentPropsWithoutRef } from 'react'

import { attachIcon } from '../icon/attachIcon'
import { Icon } from '../icon/Icon'
import { Text } from '../text/Text'

export type CardLinkProps = Omit<ComponentPropsWithoutRef<'a'>, 'children'> & {
  /** What the link says. It ends with text, so the icon can stay with its last word. */
  children: string
  /**
   * Where the link goes. An address on our own site is a path; a full `http(s)://` address
   * leaves the site.
   */
  href: string
}

/** Whether an address leaves the site: a full `http://` or `https://` address. */
export const leavesTheSite = (href: string): boolean => /^https?:\/\//i.test(href)

/**
 * The link on a line of its own at the bottom of a card (or of a block in a card). It chooses
 * its icon itself, so no card can forget it: `arrow-right` for a link to more or to all of
 * something, `external-link` for a link that leaves the site. The icon is decoration, hidden
 * from assistive technology; a link that leaves the site says so in hidden text behind its
 * name. A link in a sentence, a link back and a link in the navigation are not card links: they
 * stay a `Link`.
 */
export const CardLink = ({ 'aria-label': label, children, href, ...props }: CardLinkProps) => {
  const external = leavesTheSite(href)
  // A label replaces the name the text gives, so a link that leaves the site says so in the
  // label too.
  const name = label !== undefined && external ? `${label} (externe site)` : label

  return (
    <Text>
      <a aria-label={name} href={href} {...props}>
        {attachIcon(children, <Icon name={external ? 'external-link' : 'arrow-right'} />, 'after')}
        {external ? (
          <>
            {' '}
            <span className="hf-visually-hidden">(externe site)</span>
          </>
        ) : null}
      </a>
    </Text>
  )
}
