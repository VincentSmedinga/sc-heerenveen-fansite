import type { Metadata } from 'next'

import { Card, Filter, Heading, Link, List, NewsItem, Page, Pagination, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { reviewBranch } from '../../env'
import { reasonOf } from '../../errors'
import { pageMetadata } from '../../metadata'
import { dateTimeOf, episodeDetails, formatEpisodeTime } from '../../news'
import { getPodcastPage } from '../../podcasts'
import { ServerError, serverErrorTitle } from '../../ServerError'
import { withBranch } from '../../title'

// Render on each request, so the build never reads the database. getPodcastPage caches the
// lists itself.
export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

/**
 * The podcast and the page that the address asks for, or undefined when the address is wrong: a
 * parameter that is given twice, or a `pagina` that is not a positive whole number written
 * without anything else, such as `0`, `-1`, `2.5` or `abc`.
 */
function parseQuery(searchParams: SearchParams) {
  const { pagina, podcast } = searchParams

  if (Array.isArray(podcast) || Array.isArray(pagina)) {
    return undefined
  }
  if (pagina !== undefined && !/^[1-9]\d{0,8}$/u.test(pagina)) {
    return undefined
  }

  return { page: pagina === undefined ? 1 : Number(pagina), podcast }
}

/**
 * The address of /podcasts for a podcast (its slug) and a page. The first page and all podcasts
 * have no parameter.
 */
function podcastsHref(podcast: string | undefined, page: number) {
  const query = podcastsQuery(podcast, page)

  return query === '' ? '/podcasts' : `/podcasts?${query}`
}

/**
 * The query of /podcasts for a podcast (its slug) and a page, without the question mark. It is
 * empty for the first page of all podcasts.
 */
function podcastsQuery(podcast: string | undefined, page: number) {
  const parameters = new URLSearchParams()

  if (podcast !== undefined) {
    parameters.set('podcast', podcast)
  }
  if (page > 1) {
    parameters.set('pagina', String(page))
  }

  return parameters.toString()
}

/**
 * The page that the address asks for, undefined when the database can't give it, or 'unknown'
 * when there is no such page. A page that throws gets an empty page with a 500 from Next.js,
 * and the text only after JavaScript runs. So this page catches the error and shows the error
 * page itself, in the HTML. `cache` makes the page and its metadata share one call per request;
 * its arguments are plain values, because `cache` compares objects by identity.
 */
const loadPage = cache(async (podcast: string | undefined, page: number) => {
  try {
    return (await getPodcastPage(podcast, page)) ?? 'unknown'
  } catch (error) {
    console.error(`Could not read the episodes for /podcasts: ${reasonOf(error)}`)

    return undefined
  }
})

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const { content, page, podcast } = await loadFor(searchParams)

  // A page that failed answers 200, so noindex keeps search engines from keeping it.
  return content === undefined
    ? { robots: { index: false }, title: withBranch(serverErrorTitle, reviewBranch()) }
    : pageMetadata('/podcasts', page > 1 ? `Podcasts, pagina ${page}` : 'Podcasts', podcastsQuery(podcast, page))
}

export default async function PodcastsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { content, page, podcast } = await loadFor(searchParams)

  if (content === undefined) {
    return <ServerError retryHref={podcastsHref(podcast, page)} />
  }

  const { episodes, pageCount, podcasts, selected } = content
  const now = new Date()
  const filter = [
    { current: podcast === undefined, href: podcastsHref(undefined, 1), label: 'Alle podcasts' },
    ...podcasts.map((item) => ({
      current: item.slug === podcast,
      href: podcastsHref(item.slug, 1),
      label: item.name,
    })),
  ]
  // The addresses of the chosen podcast, as links in words. Each has the name of the podcast in
  // its name for a screen reader.
  const platforms =
    selected === undefined
      ? []
      : [
          { href: selected.applePodcastsUrl, name: 'Apple Podcasts' },
          { href: selected.spotifyUrl, name: 'Spotify' },
        ].filter((platform): platform is { href: string; name: string } => platform.href !== null)

  return (
    <>
      <Page.Main
        intro={
          <>
            <Heading level={1}>Podcasts</Heading>
            <Filter items={filter} label="Podcasts filteren" />
          </>
        }
      >
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
              nextHref={page < pageCount ? podcastsHref(podcast, page + 1) : undefined}
              previousHref={page > 1 ? podcastsHref(podcast, page - 1) : undefined}
              total={pageCount}
            />
          )}
        </Card>
      </Page.Main>
      {selected !== undefined && (
        <Page.Sidebar aria-label={`Over ${selected.name}`}>
          <Card aria-labelledby="about-heading" surface="soft">
            <Heading id="about-heading" level={2}>
              Over {selected.name}
            </Heading>
            {selected.description !== null && selected.description !== '' && <Text>{selected.description}</Text>}
            {platforms.length > 0 && (
              <>
                <Text>Luister ook op</Text>
                <List role="list">
                  {platforms.map((platform) => (
                    <List.Item key={platform.name}>
                      <Link href={platform.href} icon="external-link">
                        <Text as="span" className="hf-visually-hidden">
                          {selected.name} op{' '}
                        </Text>
                        {platform.name}
                      </Link>
                    </List.Item>
                  ))}
                </List>
              </>
            )}
          </Card>
        </Page.Sidebar>
      )}
    </>
  )
}

/**
 * The page for the address in the props, or the page "niet gevonden" when the address is wrong.
 */
async function loadFor(searchParams: Promise<SearchParams>) {
  const query = parseQuery(await searchParams)

  if (query === undefined) {
    notFound()
  }

  const content = await loadPage(query.podcast, query.page)

  if (content === 'unknown') {
    notFound()
  }

  return { content, ...query }
}
