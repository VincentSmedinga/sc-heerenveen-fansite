import type { Metadata } from 'next'

import { ArticleCard, Card, Heading, Link, List, NewsItem, Page, Text } from '@fansite/design-system'
import { cache } from 'react'

import { getDiscussions } from '../discussions'
import { reviewBranch } from '../env'
import { reasonOf } from '../errors'
import { getHeadlines } from '../headlines'
import { getMatchData, type MatchData } from '../matches'
import { MatchesCard, StandingsCard } from '../MatchViews'
import { pageMetadata } from '../metadata'
import { dateTimeOf, dayOf, formatArticleDate, formatNewsTime } from '../news'
import { DiscussionsCard, EpisodesCard, loadArticle } from '../NewsCards'
import { getLatestEpisodes } from '../podcasts'
import { ServerError, serverErrorTitle } from '../ServerError'
import { withBranch } from '../title'

// Render on each request, so the build never reads the database. getHeadlines caches the list
// itself.
export const dynamic = 'force-dynamic'

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
      loadArticle('the homepage'),
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
              Alle nieuws
            </Link>
          </Text>
        </Card>
      </Page.Main>
      <Page.Sidebar aria-label="Het forum, de wedstrijden, de stand en de podcasts">
        <DiscussionsCard discussions={discussions} now={now} />
        {matches !== undefined && (
          <>
            <MatchesCard data={matches} now={now} />
            <StandingsCard data={matches} />
          </>
        )}
        <EpisodesCard episodes={episodes} heading="Nieuwste podcasts" now={now} />
      </Page.Sidebar>
    </>
  )
}
