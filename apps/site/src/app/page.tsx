import type { Metadata } from 'next'

import { ArticleCard, Card, DiscussionItem, Heading, Link, List, NewsItem, Page, Text } from '@fansite/design-system'
import { cache } from 'react'

import { getNewestArticle } from '../articles'
import { getDiscussions } from '../discussions'
import { reviewBranch } from '../env'
import { reasonOf } from '../errors'
import { forumUrl } from '../forum'
import { getHeadlines } from '../headlines'
import { getMatchData, type MatchData } from '../matches'
import { MatchesCard, StandingsCard } from '../MatchViews'
import { pageMetadata } from '../metadata'
import {
  dateTimeOf,
  dayOf,
  episodeDetails,
  formatArticleDate,
  formatDiscussionTime,
  formatEpisodeTime,
  formatNewsTime,
} from '../news'
import { getLatestEpisodes } from '../podcasts'
import { ServerError, serverErrorTitle } from '../ServerError'
import { withBranch } from '../title'

// Render on each request, so the build never reads the database. getHeadlines caches the list
// itself.
export const dynamic = 'force-dynamic'

/**
 * The newest article of our own editors, or undefined when there is none or the database can't
 * give it. The card is an extra: the homepage shows the news without it, and the log says why
 * it is missing.
 */
async function loadArticle() {
  try {
    return await getNewestArticle()
  } catch (error) {
    console.error(`Could not read the newest article for the homepage: ${reasonOf(error)}`)

    return undefined
  }
}

/**
 * The matches and the league table of the current season, or undefined when the database can't
 * give them. The two blocks are extras, like the card of the article: the homepage shows the
 * news without them, and the log says why they are missing.
 */
async function loadMatches(): Promise<MatchData | undefined> {
  try {
    return await getMatchData()
  } catch (error) {
    console.error(`Could not read the matches and the table for the homepage: ${reasonOf(error)}`)

    return undefined
  }
}

/**
 * The newest headlines, the newest discussions of the forum and the newest podcast
 * episodes, and the newest article of the editors and the matches, or undefined when the
 * database can't give them. A page that throws gets an empty page with a 500 from Next.js, and
 * the text only after JavaScript runs. So this page catches the error and shows the error page
 * itself, in the HTML. `cache` makes the page and its metadata share one call per request.
 */
const loadContent = cache(async () => {
  try {
    const [headlines, discussions, episodes, article, matches] = await Promise.all([
      getHeadlines(),
      getDiscussions(),
      getLatestEpisodes(),
      loadArticle(),
      loadMatches(),
    ])

    return { article, discussions, episodes, headlines, matches }
  } catch (error) {
    console.error(`Could not read the headlines, discussions and episodes for the homepage: ${reasonOf(error)}`)

    return undefined
  }
})

export async function generateMetadata(): Promise<Metadata> {
  // A page that failed answers 200, so noindex keeps search engines from keeping it. The title
  // of the error page is the title alone, without the template of the layout: the slot of the
  // layout (@shortcuts) is a segment under it, which brings the template to this page too.
  return (await loadContent()) === undefined
    ? { robots: { index: false }, title: { absolute: withBranch(serverErrorTitle, reviewBranch()) } }
    : pageMetadata('/')
}

export default async function HomePage() {
  const content = await loadContent()

  if (content === undefined) {
    return <ServerError retryHref="/" />
  }

  const { article, discussions, episodes, headlines, matches } = content
  const now = new Date()

  return (
    <>
      <Page.Main>
        {/* The logo just above already shows the name, so the h1 is for screen readers only.
            Every page has one h1. */}
        <Heading className="hf-visually-hidden" level={1}>
          sc Heerenveen Fansite
        </Heading>
        {article !== undefined && (
          <ArticleCard
            date={formatArticleDate(article.publishedAt)}
            dateTime={dayOf(article.publishedAt)}
            href={`/redactie/${article.slug}`}
            intro={article.intro}
            title={article.title}
          />
        )}
        <Card aria-labelledby="media-heading">
          <Heading id="media-heading" level={2}>
            Laatste nieuws
          </Heading>
          {headlines.length === 0 ? (
            <Text>We hebben nog geen nieuws gevonden. Kijk straks nog eens.</Text>
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
          <Text>
            <Link href="/nieuws" icon="arrow-right">
              Alle koppen
            </Link>
          </Text>
        </Card>
      </Page.Main>
      <Page.Sidebar aria-label="Het forum, de podcasts en de wedstrijden">
        <Card aria-labelledby="discussions-heading">
          <Heading id="discussions-heading" level={2}>
            Nieuwste discussies
          </Heading>
          {discussions.length === 0 ? (
            <Text>We hebben nog geen discussies van het forum.</Text>
          ) : (
            <List role="list">
              {discussions.map((discussion, index) => (
                <List.Item key={index}>
                  <DiscussionItem
                    dateTime={dateTimeOf(discussion.lastPostedAt)}
                    href={discussion.url}
                    lastPostedBy={discussion.lastPostedBy}
                    replies={discussion.replyCount}
                    time={formatDiscussionTime(discussion.lastPostedAt, now)}
                    title={discussion.title}
                  />
                </List.Item>
              ))}
            </List>
          )}
          <Text>
            <Link href={forumUrl} icon="external-link">
              Naar het forum
            </Link>
          </Text>
        </Card>
        <Card aria-labelledby="episodes-heading">
          <Heading id="episodes-heading" level={2}>
            Nieuwste podcasts
          </Heading>
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
          <Text>
            <Link href="/nieuws/podcasts" icon="arrow-right">
              Alle podcasts
            </Link>
          </Text>
        </Card>
        {matches !== undefined && (
          <>
            <MatchesCard data={matches} now={now} />
            <StandingsCard data={matches} />
          </>
        )}
      </Page.Sidebar>
    </>
  )
}
