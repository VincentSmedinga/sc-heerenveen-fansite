import type { Metadata } from 'next'

import { originOf } from './env'
import { type PagePath, pages, shareImage, siteName } from './pages'

/**
 * The same for an article of our own editors: its title, the intro as the description, the
 * address of its page as the canonical URL, and Open Graph tags of the type `article` with the
 * time of publication. The picture is the shield of the site, as on every page; an article has
 * none of its own yet. Like `pageMetadata`, it needs a page that renders on each request.
 */
export function articleMetadata({
  intro,
  publishedAt,
  slug,
  title,
}: {
  intro: string
  publishedAt: Date
  slug: string
  title: string
}): Metadata {
  const url = urlOf(`/redactie/${slug}`)

  return {
    alternates: { canonical: url },
    description: intro,
    openGraph: {
      description: intro,
      images: [
        { alt: shareImage.alt, height: shareImage.height, url: urlOf(shareImage.path), width: shareImage.width },
      ],
      locale: 'nl_NL',
      publishedTime: publishedAt.toISOString(),
      siteName,
      title,
      type: 'article',
      url,
    },
    title,
  }
}

/**
 * The description, the canonical URL and the Open Graph tags of a page. Without a title the
 * page has the title of the layout, which is the name of the site. The addresses come from
 * originOf, which reads SITE_ENV when the server runs, so a page that uses this must render on
 * each request (`dynamic = 'force-dynamic'`), or Next.js puts the address of the build into it.
 * The page sets no Twitter tags itself, but Next.js copies the Open Graph tags into `twitter:`
 * tags whenever a page has Open Graph tags, and has no way to turn that off. A page whose
 * content depends on its query, such as a page of a list, gives the query as `search`, without
 * the question mark, so each page is its own canonical URL.
 */
export function pageMetadata(path: PagePath, title?: string, search?: string): Metadata {
  const { description } = pages.find((page) => page.path === path) ?? { description: undefined }
  const url = search === undefined || search === '' ? urlOf(path) : `${urlOf(path)}?${search}`

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

/**
 * The same for the page of one season of a page: the title and description of that season, and
 * its own address as the canonical URL. The page is `path` for the current season and has an
 * address of its own (`/wedstrijden/2025-26`) for another, which is the canonical one. Like
 * `pageMetadata`, it needs a page that renders on each request.
 */
export function seasonPageMetadata(
  path: PagePath,
  address: string,
  { description, title }: { description: string; title: string },
): Metadata {
  const url = urlOf(address)
  const { openGraph, ...metadata } = pageMetadata(path, title)

  return { ...metadata, alternates: { canonical: url }, description, openGraph: { ...openGraph, description, url } }
}

/** The full address of a path in this environment, such as https://sc.heerenveen.org/bronnen. It has no query or anchor. */
export function urlOf(path: string) {
  return new URL(path, originOf()).href
}
