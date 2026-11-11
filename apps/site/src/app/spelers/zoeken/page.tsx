import type { Metadata } from 'next'

import { Card, Heading, Link, Page, PlayerList, Text } from '@fansite/design-system'
import { cache } from 'react'

import { reviewBranch } from '#src/env'
import { reasonOf } from '#src/errors'
import { factsOf, findPlayers, nameOf, playerSearchPath, shownPlayers } from '#src/player-search'
import { parseSearch } from '#src/search'
import { SearchForm } from '#src/SearchViews'
import { playersPath } from '#src/season-page'
import { ServerError, serverErrorTitle } from '#src/ServerError'
import { withBranch } from '#src/title'

type SearchParams = Record<string, string | string[] | undefined>

// Render on each request, so the build never reads the database.
export const dynamic = 'force-dynamic'

/**
 * The players for the text of a valid search (an empty text asks nothing of the database), or
 * undefined when the database can't give them. A page that throws gets an empty page with a
 * 500, so this page catches the error and shows the error page in the HTML. The log says
 * what failed and never what was searched for. `cache` makes the page and its metadata share
 * one call per request; its argument is a plain value, because `cache` compares objects by
 * identity.
 */
const loadPlayers = cache(async (text: string) => {
  if (text === '') {
    return { found: undefined }
  }

  try {
    return { found: await findPlayers(text.split(' ')) }
  } catch (error) {
    console.error(`Could not search for ${playerSearchPath}: ${reasonOf(error)}`)

    return undefined
  }
})

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const { q } = await searchParams
  const search = parseSearch(q)
  const content = await loadPlayers(search.kind === 'valid' ? search.text : '')

  // noindex with a search too: a search engine has no use for a page of results.
  return {
    robots: { follow: false, index: false },
    title:
      content === undefined
        ? withBranch(serverErrorTitle, reviewBranch())
        : search.kind === 'valid'
          ? `Zoeken naar een speler: ${search.text}`
          : 'Zoeken naar een speler',
  }
}

export default async function PlayerSearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { q } = await searchParams
  const search = parseSearch(q)
  const content = await loadPlayers(search.kind === 'valid' ? search.text : '')

  if (content === undefined) {
    return (
      <ServerError
        retryHref={
          search.kind === 'valid' ? `${playerSearchPath}?${new URLSearchParams({ q: search.text })}` : playerSearchPath
        }
      />
    )
  }

  const { found } = content

  return (
    <Page.Main
      intro={
        <Page.Cell>
          <Page.Title>
            <Heading level={1}>Zoeken naar een speler</Heading>
          </Page.Title>
          <Text appearance="intro">Zoek een speler van sc Heerenveen op zijn naam.</Text>
        </Page.Cell>
      }
    >
      <Card as="div" surface={found === undefined ? 'soft' : 'default'}>
        <SearchForm
          action={playerSearchPath}
          ariaLabel="Zoeken naar een speler"
          error={search.kind === 'invalid' ? search.message : undefined}
          label="Naam van de speler"
          text={search.kind === 'none' ? '' : search.text}
        />
        {found !== undefined && search.kind === 'valid' && (
          <>
            <Heading id="resultaten" level={2}>
              {found.total === 0 ? 'Geen spelers' : `${found.total} ${found.total === 1 ? 'speler' : 'spelers'}`} voor ‘
              {search.text}’
            </Heading>
            {found.total === 0 ? (
              <Text>
                Daar hebben we geen speler onder gevonden. Probeer een ander deel van de naam, of kijk bij de{' '}
                <Link href={playersPath}>spelers van dit seizoen</Link>.
              </Text>
            ) : (
              <PlayerList
                aria-labelledby="resultaten"
                order="given-first"
                players={found.players.map((player) => {
                  const { givenName, surname } = nameOf(player)

                  return {
                    facts: factsOf(player),
                    href: `${playersPath}/${player.slug}`,
                    key: String(player.id),
                    rest: givenName,
                    surname,
                  }
                })}
              />
            )}
            {found.total > shownPlayers && (
              <Text appearance="meta">
                {`Dit zijn ${shownPlayers} van de ${found.total} spelers. Zoek op meer van de naam om er minder te krijgen.`}
              </Text>
            )}
          </>
        )}
      </Card>
    </Page.Main>
  )
}
