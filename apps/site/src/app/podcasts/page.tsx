import type { Metadata } from 'next'

import {
  Button,
  Card,
  CheckboxGroup,
  Form,
  Heading,
  Link,
  List,
  NewsItem,
  Page,
  Pagination,
  Text,
} from '@fansite/design-system'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import type { SearchParams } from '../../filter-query'

import { reviewBranch } from '../../env'
import { reasonOf } from '../../errors'
import { pageMetadata } from '../../metadata'
import { dateTimeOf, episodeDetails, formatEpisodeTime } from '../../news'
import { getPodcastPage } from '../../podcasts'
import { parsePodcastsQuery, podcastsHeading, podcastsHref, podcastsQuery, podcastsTitle } from '../../podcasts-query'
import { ServerError, serverErrorTitle } from '../../ServerError'
import { withBranch } from '../../title'

// Render on each request, so the build never reads the database. getPodcastPage caches the
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
const loadPage = cache(async (podcasts: string, page: number) => {
  try {
    return (await getPodcastPage(JSON.parse(podcasts) as string[], page)) ?? 'unknown'
  } catch (error) {
    console.error(`Could not read the episodes for /podcasts: ${reasonOf(error)}`)

    return undefined
  }
})

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const { content, page } = await loadFor(searchParams)

  // A page that failed answers 200, so noindex keeps search engines from keeping it.
  return content === undefined
    ? { robots: { index: false }, title: withBranch(serverErrorTitle, reviewBranch()) }
    : pageMetadata(
        '/podcasts',
        podcastsTitle(
          content.selected.map((item) => item.name),
          page,
        ),
        podcastsQuery(
          content.selected.map((item) => item.slug),
          page,
        ),
      )
}

export default async function PodcastsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { chosen, content, page } = await loadFor(searchParams)

  if (content === undefined) {
    return <ServerError retryHref={podcastsHref(chosen, page)} />
  }

  const { about, episodes, pageCount, podcasts, selected } = content
  const now = new Date()
  // The addresses of the pages are those of the podcasts that limit the list: all podcasts have
  // none, so the address of the list is the same however the visitor reached it.
  const slugs = selected.map((item) => item.slug)
  // With one podcast the name is the same on every line, and the heading says it.
  const showSource = selected.length !== 1
  // The addresses of the chosen podcast, as links in words. Each has the name of the podcast in
  // its name for a screen reader.
  const platforms =
    about === undefined
      ? []
      : [
          { href: about.applePodcastsUrl, name: 'Apple Podcasts' },
          { href: about.spotifyUrl, name: 'Spotify' },
        ].filter((platform): platform is { href: string; name: string } => platform.href !== null)

  return (
    <>
      <Page.Main intro={<Heading level={1}>{podcastsHeading(selected.map((item) => item.name))}</Heading>}>
        <Card as="div">
          {episodes.length === 0 ? (
            <Text>We hebben nog geen podcastafleveringen gevonden.</Text>
          ) : (
            <List role="list">
              {episodes.map((episode, index) => (
                <List.Item key={index}>
                  <NewsItem
                    dateTime={dateTimeOf(episode.publishedAt)}
                    details={episodeDetails(episode)}
                    headline={episode.title}
                    href={episode.url}
                    showSource={showSource}
                    source={episode.sourceName}
                    time={formatEpisodeTime(episode.publishedAt, now)}
                  />
                </List.Item>
              ))}
            </List>
          )}
          {pageCount > 1 && (
            <Pagination
              current={page}
              label="Paginering"
              nextHref={page < pageCount ? podcastsHref(slugs, page + 1) : undefined}
              previousHref={page > 1 ? podcastsHref(slugs, page - 1) : undefined}
              total={pageCount}
            />
          )}
        </Card>
      </Page.Main>
      {podcasts.length > 0 && (
        // The sidebar is second in the source, so on a narrow screen the filter sits under the
        // list and the pagination. The form is a GET to this page, so it works without
        // JavaScript and a choice is an address that can be shared. The button stays with
        // JavaScript too: a page that reloads at each tick takes the focus with it.
        <Page.Sidebar aria-label="Podcasts">
          <Card as="div" surface="soft">
            <Form action="/podcasts" autoComplete="off" method="get">
              <CheckboxGroup
                legend="Podcasts"
                name="podcast"
                options={podcasts.map((item) => ({ label: item.name, value: item.slug }))}
                value={chosen}
              />
              <Button type="submit">Toon</Button>
            </Form>
          </Card>
          {about !== undefined && (
            <Card aria-labelledby="about-heading" surface="warm">
              <Heading id="about-heading" level={2}>
                Over {about.name}
              </Heading>
              {about.description !== null && about.description !== '' && <Text>{about.description}</Text>}
              {platforms.length > 0 && (
                <>
                  <Text>Luister ook op</Text>
                  <List role="list">
                    {platforms.map((platform) => (
                      <List.Item key={platform.name}>
                        <Link href={platform.href} icon="external-link">
                          <Text as="span" className="hf-visually-hidden">
                            {about.name} op{' '}
                          </Text>
                          {platform.name}
                        </Link>
                      </List.Item>
                    ))}
                  </List>
                </>
              )}
            </Card>
          )}
        </Page.Sidebar>
      )}
    </>
  )
}

/**
 * The page for the address in the props, or the page "niet gevonden" when the address is wrong.
 */
async function loadFor(searchParams: Promise<SearchParams>) {
  const query = parsePodcastsQuery(await searchParams)

  if (query === undefined) {
    notFound()
  }

  const content = await loadPage(JSON.stringify(query.podcasts), query.page)

  if (content === 'unknown') {
    notFound()
  }

  return { chosen: query.podcasts, content, page: query.page }
}
