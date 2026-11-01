import { Card, DiscussionItem, Heading, Link, List, NewsItem, Text } from '@fansite/design-system'

import type { getDiscussions } from './discussions'

import { getNewestArticle } from './articles'
import { reasonOf } from './errors'
import { forumUrl } from './forum'
import { dateTimeOf, episodeDetails, formatDiscussionTime, formatEpisodeTime } from './news'
import { getLatestEpisodes } from './podcasts'

/** The card with the newest discussions of the forum, our sister site, and the link to it. */
export function DiscussionsCard({
  discussions,
  now,
}: {
  discussions: Awaited<ReturnType<typeof getDiscussions>>
  now: Date
}) {
  return (
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
  )
}

/**
 * The card with the newest podcast episodes and the link to all of them. The heading is
 * "Nieuwste podcasts" on the homepage and "Podcasts" on the news page, where the page already
 * says they are the newest.
 */
export function EpisodesCard({
  episodes,
  heading,
  now,
}: {
  episodes: Awaited<ReturnType<typeof getLatestEpisodes>>
  heading: string
  now: Date
}) {
  return (
    <Card aria-labelledby="episodes-heading">
      <Heading id="episodes-heading" level={2}>
        {heading}
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
  )
}

/**
 * The newest article of our own editors, or undefined when there is none or the database can't
 * give it. The card is an extra: the page shows the news without it, and the log says why it is
 * missing. `page` names the page for the log.
 */
export async function loadArticle(page: string) {
  try {
    return await getNewestArticle()
  } catch (error) {
    console.error(`Could not read the newest article for ${page}: ${reasonOf(error)}`)

    return undefined
  }
}

/**
 * The newest podcast episodes, or undefined when the database can't give them. The card is an
 * extra on the page of the news, which shows the headlines without it; the log says why it is
 * missing. `page` names the page for the log.
 */
export async function loadEpisodes(page: string) {
  try {
    return await getLatestEpisodes()
  } catch (error) {
    console.error(`Could not read the newest podcast episodes for ${page}: ${reasonOf(error)}`)

    return undefined
  }
}
