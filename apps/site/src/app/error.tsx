'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

import { ServerError, serverErrorTitle } from '../ServerError'
import { withBranch } from '../title'

/**
 * The page for an error that nothing caught: Next.js shows it inside the layout, in place of the page that failed. It
 * comes after the browser has run JavaScript, because Next.js sends an empty page with a 500 when a page throws. A page
 * that expects an error, like the sources page, catches it and shows ServerError itself, so a visitor without JavaScript
 * sees the text too.
 */
export default function ErrorPage() {
  const pathname = usePathname()

  // The title is still the one of the page that failed, and a client component can't export metadata. In the dev server
  // that `pnpm review` starts, the layout has put the branch in a meta tag, and the title keeps it.
  useEffect(() => {
    const branch = document.querySelector<HTMLMetaElement>('meta[name="review-branch"]')?.content

    document.title = withBranch(`${serverErrorTitle} – sc Heerenveen Fansite`, branch)
  }, [])

  return <ServerError retryHref={pathname} />
}
