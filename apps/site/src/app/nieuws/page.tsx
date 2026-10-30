import type { Metadata } from 'next'

import {
  Button,
  Card,
  CheckboxGroup,
  Form,
  Heading,
  List,
  NewsItem,
  Page,
  Pagination,
  Text,
} from '@fansite/design-system'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { getArchivePage } from '../../archive'
import {
  archiveHeading,
  archiveHref,
  archiveQuery,
  archiveTitle,
  parseArchiveQuery,
  type SearchParams,
} from '../../archive-query'
import { reviewBranch } from '../../env'
import { reasonOf } from '../../errors'
import { pageMetadata } from '../../metadata'
import { dateTimeOf, formatNewsTime } from '../../news'
import { ServerError, serverErrorTitle } from '../../ServerError'
import { withBranch } from '../../title'

// Render on each request, so the build never reads the database. getArchivePage caches the
// lists itself.
export const dynamic = 'force-dynamic'

/**
 * The page that the address asks for, undefined when the database can't give it, or 'unknown'
 * when there is no such page. A page that throws gets an empty page with a 500 from Next.js,
 * and the text only after JavaScript runs. So this page catches the error and shows the error
 * page itself, in the HTML. `cache` makes the page and its metadata share one call per request;
 * its arguments are plain values, because `cache` compares objects by identity: the slugs are
 * a JSON text, so that an empty slug stays one.
 */
const loadPage = cache(async (sources: string, page: number) => {
  try {
    return (await getArchivePage(JSON.parse(sources) as string[], page)) ?? 'unknown'
  } catch (error) {
    console.error(`Could not read the headlines for /nieuws: ${reasonOf(error)}`)

    return undefined
  }
})

export default async function ArchivePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { chosen, content, page } = await loadFor(searchParams)

  if (content === undefined) {
    return <ServerError retryHref={archiveHref(chosen, page)} />
  }

  const { headlines, pageCount, selected, sources } = content
  const now = new Date()
  // The addresses of the pages are those of the sources that limit the list: all sources have
  // none, so the address of the list is the same however the visitor reached it.
  const slugs = selected.map((item) => item.slug)
  // With one source the name is the same on every line, and the heading says it.
  const showSource = selected.length !== 1

  return (
    <>
      <Page.Main intro={<Heading level={1}>{archiveHeading(selected.map((item) => item.name))}</Heading>}>
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
                    showSource={showSource}
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
              nextHref={page < pageCount ? archiveHref(slugs, page + 1) : undefined}
              previousHref={page > 1 ? archiveHref(slugs, page - 1) : undefined}
              total={pageCount}
            />
          )}
        </Card>
      </Page.Main>
      {sources.length > 0 && (
        // The sidebar is second in the source, so on a narrow screen the filter sits under the
        // list and the pagination. The form is a GET to this page, so it works without
        // JavaScript and a choice is an address that can be shared. The button stays with
        // JavaScript too: a page that reloads at each tick takes the focus with it.
        <Page.Sidebar aria-label="Bronnen">
          <Card as="div" surface="soft">
            <Form action="/nieuws" autoComplete="off" method="get">
              <CheckboxGroup
                legend="Bronnen"
                name="bron"
                options={sources.map((item) => ({ label: item.name, value: item.slug }))}
                value={chosen}
              />
              <Button type="submit">Toon</Button>
            </Form>
          </Card>
        </Page.Sidebar>
      )}
    </>
  )
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const { content, page } = await loadFor(searchParams)

  // A page that failed answers 200, so noindex keeps search engines from keeping it.
  return content === undefined
    ? { robots: { index: false }, title: withBranch(serverErrorTitle, reviewBranch()) }
    : pageMetadata(
        '/nieuws',
        archiveTitle(
          content.selected.map((item) => item.name),
          page,
        ),
        archiveQuery(
          content.selected.map((item) => item.slug),
          page,
        ),
      )
}

/**
 * The page for the address in the props, or the page "niet gevonden" when the address is wrong.
 */
async function loadFor(searchParams: Promise<SearchParams>) {
  const query = parseArchiveQuery(await searchParams)

  if (query === undefined) {
    notFound()
  }

  const content = await loadPage(JSON.stringify(query.sources), query.page)

  if (content === 'unknown') {
    notFound()
  }

  return { chosen: query.sources, content, page: query.page }
}
