import type { Metadata } from 'next'

import { Card, Heading, Link, List, Page, Pagination, Text, Time } from '@fansite/design-system'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import type { SearchParams } from '#src/filter-query'

import { getArticlesPage } from '#src/articles'
import { reviewBranch } from '#src/env'
import { reasonOf } from '#src/errors'
import { filterHref, filterQuery, parseFilterQuery } from '#src/filter-query'
import { pageMetadata } from '#src/metadata'
import { dayOf, formatArticleDate } from '#src/news'
import { ServerError, serverErrorTitle } from '#src/ServerError'
import { withBranch } from '#src/title'

// Render on each request, so the build never reads the database, and a withdrawn article is
// gone at once. The canonical URL and the Open Graph address come from SITE_ENV too.
export const dynamic = 'force-dynamic'

const path = '/redactie'

/** The address of a page of the overview: the path alone for the first page. */
const pageHref = (page: number) => filterHref(path, filterQuery('', [], page))

/**
 * The page that the address asks for, undefined when the database can't give it, or 'unknown'
 * when there is none. A page that throws gets an empty page with a 500 from Next.js, and the
 * text only after JavaScript runs. So this page catches the error and shows the error page
 * itself, in the HTML. `cache` makes the page and its metadata share one call per request.
 */
const loadPage = cache(async (page: number) => {
  try {
    return (await getArticlesPage(page)) ?? 'unknown'
  } catch (error) {
    console.error(`Could not read the articles for ${path}: ${reasonOf(error)}`)

    return undefined
  }
})

export default async function EditorsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { content, page } = await loadFor(searchParams)

  if (content === undefined) {
    return <ServerError retryHref={pageHref(page)} />
  }

  const { articles, pageCount } = content

  return (
    <Page.Main intro={<Heading level={1}>Redactie</Heading>}>
      <Card as="div">
        {articles.length === 0 ? (
          <Text>We hebben nog geen artikelen.</Text>
        ) : (
          <List role="list">
            {articles.map((article) => (
              <List.Item key={article.slug}>
                <Heading appearance={3} className="hf-space-end-xs" level={2}>
                  <Link href={`/redactie/${article.slug}`}>{article.title}</Link>
                </Heading>
                <Text appearance="meta">
                  <Time dateTime={dayOf(article.publishedAt)}>{formatArticleDate(article.publishedAt)}</Time>
                </Text>
                <Text>{article.intro}</Text>
              </List.Item>
            ))}
          </List>
        )}
        {pageCount > 1 && (
          <Pagination
            current={page}
            label="Paginering"
            nextHref={page < pageCount ? pageHref(page + 1) : undefined}
            previousHref={page > 1 ? pageHref(page - 1) : undefined}
            total={pageCount}
          />
        )}
      </Card>
    </Page.Main>
  )
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const { content, page } = await loadFor(searchParams)

  // A page that failed answers 200, so noindex keeps search engines from keeping it.
  return content === undefined
    ? { robots: { index: false }, title: withBranch(serverErrorTitle, reviewBranch()) }
    : pageMetadata(path, page > 1 ? `Redactie, pagina ${page}` : 'Redactie', filterQuery('', [], page))
}

/**
 * The page for the address in the props, or the page "niet gevonden" when the address is wrong
 * or asks for a page after the last one. The page has no filter, so a value in the address
 * that the page doesn't know is left out of the reading, as on the other pages.
 */
async function loadFor(searchParams: Promise<SearchParams>) {
  const query = parseFilterQuery(await searchParams, 'artikel')

  if (query === undefined) {
    notFound()
  }

  const content = await loadPage(query.page)

  if (content === 'unknown') {
    notFound()
  }

  return { content, page: query.page }
}
