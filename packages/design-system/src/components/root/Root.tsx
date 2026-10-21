import type { ComponentPropsWithoutRef } from 'react'

/** Everything the `html` element accepts, except `lang`: the site is Dutch. */
export type RootProps = Omit<ComponentPropsWithoutRef<'html'>, 'lang'>

/**
 * The `html` element of a page, in Dutch. There is no place for a `head` in it: Next.js owns that, through its
 * Metadata API.
 */
export const Root = (props: RootProps) => <html {...props} lang="nl" />
