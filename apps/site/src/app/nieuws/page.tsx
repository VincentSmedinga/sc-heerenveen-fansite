import type { Metadata } from 'next'

import { Card, Filter, Heading, List, NewsItem, Page, Pagination, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { getArchivePage } from '../../archive'
import { reviewBranch } from '../../env'
import { reasonOf } from '../../errors'
import { pageMetadata } from '../../metadata'
import { dateTimeOf, formatNewsTime } from '../../news'
import { ServerError, serverErrorTitle } from '../../ServerError'
import { withBranch } from '../../title'

// Render on each request, so the build never reads the database. getArchivePage caches the
// lists itself.
export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

/**
 * The address of /nieuws for a source (its slug) and a page. The first page and all sources
 * have no parameter.
 */
function archiveHref(source: string | undefined, page: number) {
  const query = archiveQuery(source, page)

  return query === '' ? '/nieuws' : `/nieuws?${query}`
}

/**
 * The query of /nieuws for a source (its slug) and a page, without the question mark. It is
 * empty for the first page of all sources.
 */
function archiveQuery(source: string | undefined, page: number) {
  const parameters = new URLSearchParams()

  if (source !== undefined) {
    parameters.set('bron', source)
  }
  if (page > 1) {
    parameters.set('pagina', String(page))
  }

  return parameters.toString()
}

/**
 * The title of a page: "Nieuwsarchief", with the source and the page when they are not the
 * first page of all sources.
 */
function archiveTitle(sourceName: string | undefined, page: number) {
  return `Nieuwsarchief${sourceName === undefined ? '' : ` van ${sourceName}`}${page > 1 ? `, pagina ${page}` : ''}`
}

/**
 * The source and the page that the address asks for, or undefined when the address is wrong: a
 * parameter that is given twice, or a `pagina` that is not a positive whole number written
 * without anything else, such as `0`, `-1`, `2.5` or `abc`.
 */
function parseQuery(searchParams: SearchParams) {
  const { bron, pagina } = searchParams

  if (Array.isArray(bron) || Array.isArray(pagina)) {
    return undefined
  }
  if (pagina !== undefined && !/^[1-9]\d{0,8}$/u.test(pagina)) {
    return undefined
  }

  return { page: pagina === undefined ? 1 : Number(pagina), source: bron }
}

/**
 * The page that the address asks for, undefined when the database can't give it, or 'unknown'
 * when there is no such page. A page that throws gets an empty page with a 500 from Next.js,
 * and the text only after JavaScript runs. So this page catches the error and shows the error
 * page itself, in the HTML. `cache` makes the page and its metadata share one call per request;
 * its arguments are plain values, because `cache` compares objects by identity.
 */
const loadPage = cache(async (source: string | undefined, page: number) => {
  try {
    return (await getArchivePage(source, page)) ?? 'unknown'
  } catch (error) {
    console.error(`Could not read the headlines for /nieuws: ${reasonOf(error)}`)

    return undefined
  }
})

export default async function ArchivePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { content, page, source } = await loadFor(searchParams)

  if (content === undefined) {
    return <ServerError retryHref={archiveHref(source, page)} />
  }

  const { headlines, pageCount, sources } = content
  const now = new Date()
  const filter = [
    { current: source === undefined, href: archiveHref(undefined, 1), label: 'Alle bronnen' },
    ...sources.map((item) => ({
      current: item.slug === source,
      href: archiveHref(item.slug, 1),
      label: item.name,
    })),
  ]

  return (
    <Page.Main
      intro={
        <>
          <Heading level={1}>Nieuwsarchief</Heading>
          {sources.length > 0 && <Filter items={filter} label="Bronnen filteren" />}
        </>
      }
    >
      <Card as="div">
        {headlines.length === 0 ? (
          <Text>We hebben nog geen nieuws gevonden.</Text>
        ) : (
          <List role="list">
            {headlines.map((item, index) => (
              <List.Item key={index}>
                <NewsItem
                  dateTime={dateTimeOf(item.publishedAt)}
                  headline={item.title}
                  href={item.url}
                  paywalled={item.paywalled}
                  source={item.sourceName}
                  time={formatNewsTime(item.publishedAt, now)}
                />
              </List.Item>
            ))}
          </List>
        )}
        {pageCount > 1 && (
          <Pagination
            current={page}
            label="Paginering"
            nextHref={page < pageCount ? archiveHref(source, page + 1) : undefined}
            previousHref={page > 1 ? archiveHref(source, page - 1) : undefined}
            total={pageCount}
          />
        )}
      </Card>
    </Page.Main>
  )
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const { content, page, source } = await loadFor(searchParams)

  // A page that failed answers 200, so noindex keeps search engines from keeping it.
  return content === undefined
    ? { robots: { index: false }, title: withBranch(serverErrorTitle, reviewBranch()) }
    : pageMetadata('/nieuws', archiveTitle(content.selected?.name, page), archiveQuery(source, page))
}

/**
 * The page for the address in the props, or the page "niet gevonden" when the address is wrong.
 */
async function loadFor(searchParams: Promise<SearchParams>) {
  const query = parseQuery(await searchParams)

  if (query === undefined) {
    notFound()
  }

  const content = await loadPage(query.source, query.page)

  if (content === 'unknown') {
    notFound()
  }

  return { content, ...query }
}
