import { fansMenuItems, readFans } from '@fansite/shared/fans-env'

import { fansGames } from './fans-paths'

/** What the main menu needs of Fans: its sub-pages are the games that are on. */
export type FansMenu = { subitems: { href: string; label: string }[] }

/**
 * The item Fans of the main menu, or undefined when accounts are off. The bar of sub-pages has
 * the games that are on; with none on, it is empty and the menu leaves the bar out. The
 * settings are read on each call, through `fans-env` (see the README of the site).
 */
export function fansMenu(source?: Record<string, string | undefined>): FansMenu | undefined {
  if (!readFans(source).accounts) {
    return undefined
  }

  return { subitems: fansMenuItems(fansGames, source).map(({ href, label }) => ({ href, label })) }
}
