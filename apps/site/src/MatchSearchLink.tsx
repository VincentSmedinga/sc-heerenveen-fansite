import type { ReactNode } from 'react'

import { Link, Text } from '@fansite/design-system'

import { type MatchLink, showWords } from './cijfers-search'

/**
 * A line under a figure of Cijfers with a link to the matches behind it in the search of
 * matches, such as "Toon de 111 wedstrijden met 0–0". It is an ordinary link, so it works
 * without JavaScript, and its words say where it goes and how many matches it finds.
 */
export function MatchSearchLink({ link, what }: { link: MatchLink | undefined; what: string }) {
  return link === undefined ? null : (
    <Text appearance="meta">
      <Link href={link.href}>{showWords(link, what)}</Link>
    </Text>
  )
}

/**
 * The text of a link in the header of a table row, which shows `shown` and tells a screen
 * reader where the link goes after it: "1–1" and "toon de 111 wedstrijden met 1–1".
 */
export const rowLinkText = (shown: ReactNode, link: MatchLink, what: string) => (
  <>
    {shown}
    <Text as="span" className="hf-visually-hidden">{`, ${showWords(link, what).toLowerCase()}`}</Text>
  </>
)
