import type { ComponentPropsWithoutRef } from 'react'

/** Everything the `html` element accepts, except `lang`: the site is Dutch. */
export type RootProps = Omit<ComponentPropsWithoutRef<'html'>, 'lang'>

/**
 * The `html` element of a page, in Dutch. There is no place for a `head` in it: Next.js owns
 * that, through its Metadata API.
 *
 * `data-scroll-behavior="smooth"` tells Next.js that `html` scrolls smoothly (see root.css), so
 * it can switch that off for the moment of a page change. Without it Next.js warns, and a new
 * page scrolls up from the old place. Keep the attribute and the rule in root.css together.
 * Like `lang`, it comes after the props, so a caller can't change it.
 */
export const Root = (props: RootProps) => <html {...props} data-scroll-behavior="smooth" lang="nl" />
