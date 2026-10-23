import type { Metadata } from 'next'

import { originOf } from './env'
import { type PagePath, pages, shareImage, siteName } from './pages'

/**
 * The description, the canonical URL and the Open Graph tags of a page. Without a title the page has the title of the
 * layout, which is the name of the site. The addresses come from originOf, which reads SITE_ENV when the server runs, so
 * a page that uses this must render on each request (`dynamic = 'force-dynamic'`), or Next.js puts the address of the
 * build into it. The page sets no Twitter tags itself, but Next.js copies the Open Graph tags into `twitter:` tags whenever
 * a page has Open Graph tags, and has no way to turn that off.
 */
export function pageMetadata(path: PagePath, title?: string): Metadata {
  const { description } = pages.find((page) => page.path === path) ?? { description: undefined }
  const url = urlOf(path)

  return {
    alternates: { canonical: url },
    description,
    openGraph: {
      description,
      images: [
        { alt: shareImage.alt, height: shareImage.height, url: urlOf(shareImage.path), width: shareImage.width },
      ],
      locale: 'nl_NL',
      siteName,
      title: title ?? siteName,
      type: 'website',
      url,
    },
    ...(title === undefined ? {} : { title }),
  }
}

/** The full address of a path in this environment, such as https://sc.heerenveen.org/bronnen. It has no query or anchor. */
export function urlOf(path: string) {
  return new URL(path, originOf()).href
}
