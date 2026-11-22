import type { Metadata } from 'next'

import { ArticleCard, Card, Heading, Link, List, NewsItem, Page, Text } from '@fansite/design-system'
import { cache } from 'react'

import { getDiscussions } from '../discussions'
import { reviewBranch } from '../env'
import { reasonOf } from '../errors'
import { FansCard, loadOpenGames } from '../FansCard'
import { getHeadlines, headlineCount, headlinesOfTheWindow } from '../headlines'
import { getMatchData, type MatchData } from '../matches'
import { MatchesCard, StandingsCard } from '../MatchViews'
import { pageMetadata } from '../metadata'
import { dateTimeOf, dayOf, formatArticleDate, formatNewsTime } from '../news'
import { DiscussionsCard, EpisodesCard, loadArticle } from '../NewsCards'
import { pageAreas } from '../page-areas'
import { getLatestEpisodes } from '../podcasts'
import { getLiveReports, getPreviewAddresses, getReportAddresses } from '../report-data'
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
 * The addresses of the pages of the matches, of their Voorbeschouwing and of the ones that
 * are live, for the links of the lines of the card Wedstrijden, or undefined when the database
 * can't give them: the lines are then plain text, and the log says why.
 */
async function loadMatchLinks(data: MatchData | undefined) {
  if (data === undefined) {
    return undefined
  }

  try {
    const [reportAddresses, previewAddresses, liveReports] = await Promise.all([
      getReportAddresses(data.season),
      getPreviewAddresses(data.season),
      getLiveReports(data.season, new Date()),
    ])

    return { liveReports, previewAddresses, reportAddresses }
  } catch (error) {
    console.error(`Could not read the pages of the matches for the homepage: ${reasonOf(error)}`)

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
    const [headlines, discussions, episodes, article, matches, openGames] = await Promise.all([
      getHeadlines(),
      getDiscussions(),
      getLatestEpisodes(),
      loadArticle('the homepage'),
      loadMatches(),
      loadOpenGames(),
    ])

    const matchLinks = await loadMatchLinks(matches)

    return { article, discussions, episodes, headlines, matches, matchLinks, openGames }
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

  const { article, discussions, episodes, headlines, matches, matchLinks, openGames } = content
  const now = new Date()
  const news = headlinesOfTheWindow(headlines, now)

  return (
    <>
      <Page.Main
        areas={pageAreas({
          after: ['side'],
          head: false,
          main: ['article', 'news'].slice(article === undefined ? 1 : 0),
        })}
      >
        {/* The logo just above already shows the name, so the h1 is for screen readers only.
            Every page has one h1. */}
        {article !== undefined && (
          <Page.Cell area="article">
            <Heading className="hf-visually-hidden" level={1}>
              sc Heerenveen Fansite
            </Heading>
            <ArticleCard
              date={formatArticleDate(article.publishedAt)}
              dateTime={dayOf(article.publishedAt)}
              href={`/redactie/${article.slug}`}
              intro={article.intro}
              title={article.title}
            />
          </Page.Cell>
        )}
        <Page.Cell area="news">
          {article === undefined && (
            <Heading className="hf-visually-hidden" level={1}>
              sc Heerenveen Fansite
            </Heading>
          )}
          <Card aria-labelledby="media-heading">
            <Heading id="media-heading" level={2}>
              Laatste nieuws
            </Heading>
            {news.items.length === 0 ? (
              <Text>We hebben nog geen nieuws gevonden. Kijk straks nog eens.</Text>
            ) : (
              <>
                <Text appearance="meta">{headlineCount(news.items.length, news.days)}</Text>
                <List role="list">
                  {news.items.map((item, index) => (
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
              </>
            )}
            <Text>
              <Link href="/nieuws" icon="arrow-right">
                Al het nieuws
              </Link>
            </Text>
          </Card>
        </Page.Cell>
        <Page.Section area="side" aria-label="De wedstrijden, de stand, het forum en de podcasts">
          {matches !== undefined && (
            <>
              <MatchesCard
                data={matches}
                liveReports={matchLinks?.liveReports}
                now={now}
                previewAddresses={matchLinks?.previewAddresses}
                reportAddresses={matchLinks?.reportAddresses}
              />
              <StandingsCard data={matches} now={now} />
            </>
          )}
          <FansCard items={openGames} />
          <DiscussionsCard discussions={discussions} now={now} />
          <EpisodesCard episodes={episodes} heading="Nieuwste podcasts" now={now} />
        </Page.Section>
      </Page.Main>
    </>
  )
}
