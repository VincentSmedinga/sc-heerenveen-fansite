import type { PublicSearchHit } from '@fansite/db/queries'

import {
  Button,
  Card,
  Field,
  Form,
  Heading,
  Input,
  Link,
  List,
  NewsItem,
  Text,
  WikipediaCredit,
} from '@fansite/design-system'
import { Fragment } from 'react'

import { moreResults } from './items-per-card'
import { formatReadAt, wikipediaUrl } from './match-format'
import { dateTimeOf, dayOf, episodeDetails, formatArticleDay, formatEpisodeTime, formatNewsTime } from './news'
import { maxQueryLength, maxResults, searchHref, type Squad, squadGroups } from './search'

/**
 * The card of the page: the form and, under it, the results of the search. Before a search
 * there are no results and the card is blue, so the form stands out; with results it is white,
 * like the other cards. The players beside it start level with this card.
 */
export function SearchCard({
  error,
  formText,
  results,
}: {
  error?: string | undefined
  formText: string
  results?: Parameters<typeof SearchResults>[0] | undefined
}) {
  return (
    <Card as="div" surface={results === undefined ? 'soft' : 'default'}>
      <SearchForm error={error} text={formText} />
      {results !== undefined && <SearchResults {...results} />}
    </Card>
  )
}

/**
 * The form of the page: a label, the field and the button, which loads the page again with the
 * search in the address (method GET), so it works without JavaScript and the address can be
 * shared. Under a search that doesn't meet the limits the field says what is wrong. The text is
 * what the visitor wrote, trimmed, and nothing else is kept of it.
 */
export function SearchForm({ error, text }: { error?: string | undefined; text: string }) {
  return (
    <Form action="/zoeken" aria-label="Zoeken in onze koppen" method="get" role="search">
      <Field
        error={error}
        hint="Alle woorden moeten erin staan. Een deel van een woord is genoeg."
        id="zoek"
        label="Zoeken"
      >
        <Input autoComplete="off" defaultValue={text} maxLength={maxQueryLength} name="q" type="search" />
      </Field>
      <Button type="submit">Zoek</Button>
    </Form>
  )
}

/**
 * The card with the players of the squad under their position, each name a link that searches
 * for the surname, and the credit to Wikipedia under it. It is nothing without players.
 */
export function SquadCard({ squad }: { squad: Squad }) {
  const groups = squadGroups(squad.players)

  if (groups.length === 0) {
    return null
  }

  return (
    <>
      <Card aria-labelledby="spelers">
        <Heading id="spelers" level={2}>
          Spelers
        </Heading>
        <Text>Zoek snel op een achternaam.</Text>
        {groups.map((group) => (
          <Fragment key={group.label}>
            <Heading level={3}>{group.label}</Heading>
            <List role="list">
              {group.players.map((player) => (
                <List.Item key={player.name}>
                  <Link href={searchHref(player.searchTerm)}>{player.name}</Link>
                </List.Item>
              ))}
            </List>
          </Fragment>
        ))}
      </Card>
      <SquadCredit squad={squad} />
    </>
  )
}

/** One result, as the page of its own kind shows it. */
function Hit({ hit, now }: { hit: PublicSearchHit; now: Date }) {
  if (hit.kind === 'article') {
    return (
      <NewsItem
        dateTime={dayOf(hit.publishedAt)}
        headline={hit.title}
        href={`/redactie/${hit.slug}`}
        internal
        source="Van de redactie"
        time={formatArticleDay(hit.publishedAt, now)}
      />
    )
  }

  return hit.kind === 'podcast' ? (
    <NewsItem
      dateTime={dateTimeOf(hit.publishedAt)}
      details={episodeDetails(hit)}
      headline={hit.title}
      href={hit.url}
      source={hit.sourceName}
      time={formatEpisodeTime(hit.publishedAt, now)}
    />
  ) : (
    <NewsItem
      dateTime={dateTimeOf(hit.publishedAt)}
      headline={hit.title}
      href={hit.url}
      paywalled={hit.paywalled}
      source={hit.sourceName}
      time={formatNewsTime(hit.publishedAt, now)}
    />
  )
}

/**
 * The results of a search: a heading that says how many there are, the newest `hits` and, when
 * there are more, the button that loads the next ones. It works without JavaScript: the form
 * loads the page again with a larger number in the address, and the part after the hash brings
 * the visitor to the first new result. Without results it says so, and where else to look.
 */
function SearchResults({
  count,
  hasSquad,
  hits,
  now,
  text,
  total,
}: {
  count: number
  hasSquad: boolean
  hits: PublicSearchHit[]
  now: Date
  text: string
  total: number
}) {
  return (
    <>
      <Heading id="resultaten" level={2}>
        {total === 0 ? 'Geen resultaten' : `${total} ${total === 1 ? 'resultaat' : 'resultaten'}`} voor {text}
      </Heading>
      {total === 0 ? (
        <Text>
          Daar hebben we niets over gevonden. Probeer een ander woord
          {hasSquad ? ', of kijk bij de spelers hiernaast.' : '.'}
        </Text>
      ) : (
        <List role="list">
          {hits.map((hit, index) => (
            <List.Item id={`resultaat-${index + 1}`} key={`${hit.kind}-${index}`}>
              <Hit hit={hit} now={now} />
            </List.Item>
          ))}
        </List>
      )}
      {hits.length < total &&
        (count < maxResults ? (
          <Form action={`/zoeken#resultaat-${hits.length + 1}`} method="get">
            <Input name="q" type="hidden" value={text} />
            <Button appearance="soft" icon="plus" name="aantal" type="submit" value={String(count + moreResults)}>
              {`Laad ${moreResults} meer`}
            </Button>
          </Form>
        ) : (
          <Text appearance="meta">
            {`Dit zijn de ${maxResults} nieuwste resultaten. Zoek op meer woorden om er minder te krijgen.`}
          </Text>
        ))}
    </>
  )
}

/**
 * The credit for the list of players, as on the matches page: the page of Wikipedia the squad
 * was read from and the last time it was read, in a card without a border or background to
 * see. It is nothing when no page was read.
 */
function SquadCredit({ squad }: { squad: Squad }) {
  if (squad.page === undefined) {
    return null
  }

  const { readAt, title } = squad.page

  return (
    <Card as="div" surface="transparent">
      <WikipediaCredit
        data="selectiegegevens"
        pages={[{ href: wikipediaUrl(title), name: `Selectie ${squad.season}` }]}
        readAt={formatReadAt(readAt)}
        readAtDateTime={readAt.toISOString()}
      />
    </Card>
  )
}
