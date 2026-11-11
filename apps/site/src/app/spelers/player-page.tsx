import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import {
  ArchiveCredit,
  Card,
  CountryName,
  countryName,
  Heading,
  KeyFigures,
  Link,
  Page,
  PlayerName,
  Text,
  WikipediaCredit,
} from '@fansite/design-system'
import { notFound, permanentRedirect } from 'next/navigation'
import { Fragment, type ReactNode } from 'react'

import { reviewBranch } from '#src/env'
import { reasonOf } from '#src/errors'
import { formatReadAt, wikipediaUrl } from '#src/match-format'
import { seasonPageMetadata } from '#src/metadata'
import { type CareerMomentChoice, careerMoments } from '#src/player-career'
import { playerKeyFigures } from '#src/player-key-figures'
import { lastArchiveSeason, loadPlayerPage, periodsOf, playerAddress, type PlayerPage } from '#src/player-page'
import { loadPlayerSeasons, type PlayerSeason } from '#src/player-seasons'
import { PlayerCareerCard } from '#src/PlayerCareerCard'
import { PlayerSeasonsCard } from '#src/PlayerSeasonsCard'
import { getReportAddresses } from '#src/report-data'
import { playersPath } from '#src/season-page'
import { seasonAddress } from '#src/seasons'
import { ServerError, serverErrorTitle } from '#src/ServerError'
import { withBranch } from '#src/title'

/**
 * The title and description of the page of a player. The description has his line, country
 * and seasons, and never his date of birth. An unknown player has none: the page is "niet
 * gevonden".
 */
export async function playerMetadata(slug: string): Promise<Metadata> {
  const loaded = await loadPlayerPage(slug)

  // A page that failed answers 200, so noindex keeps search engines from keeping it.
  if (loaded.kind === 'error') {
    return { robots: { index: false }, title: withBranch(serverErrorTitle, reviewBranch()) }
  }
  if (loaded.kind !== 'found') {
    return {}
  }

  const { page } = loaded
  const periods = periodsOf(page.seasons)
  const country = page.country === undefined ? undefined : countryName(page.country)
  const who = [page.line, country === undefined ? undefined : `uit ${country}`]
    .filter((part) => part !== undefined)
    .join(' ')

  return seasonPageMetadata(playersPath, playerAddress(page.slug), {
    description: `${page.name}${who === '' ? '' : `, ${who}`}. Bij sc Heerenveen ${periodsText(periods)}. Met de bron erbij.`,
    title: `${page.name} – Spelers`,
  })
}

/**
 * The page of a player of our club (#1079): a link back to Spelers, his name as the heading
 * (`PlayerName`) with one line beside it, under it on a phone: his line, country and year and
 * place of birth. Then the key figures of his line (#1083), the table Per seizoen (#1082), his
 * career (#1084) and the credit. An old address leads to the address of now (308), and
 * an address of nobody, or of a player of an opponent, is "niet gevonden". The blocks of #1082
 * to #1086 come between the seasons and the credit; the credit moves to the sidebar with #1086.
 */
export async function PlayerPageView({ slug }: { slug: string }) {
  const loaded = await loadPlayerPage(slug)

  if (loaded.kind === 'unknown') {
    notFound()
  }
  if (loaded.kind === 'moved') {
    permanentRedirect(playerAddress(loaded.slug))
  }
  if (loaded.kind === 'error') {
    return <ServerError retryHref={playerAddress(slug)} />
  }

  const { page } = loaded
  const seasons = await readSeasons(page)
  const keyFigures = seasons === undefined ? [] : playerKeyFigures(seasons, page.line)
  const current = seasonOf(new Date())
  const career = seasons === undefined ? undefined : await readCareer(seasons, current)

  return (
    <Page.Main
      intro={
        <Page.Cell>
          <Text>
            <Link href={playersPath} icon="arrow-left">
              Spelers
            </Link>
          </Text>
          <Page.Title wrapped="start">
            <Heading level={1}>
              <PlayerName givenName={page.nameParts.givenName} surname={page.nameParts.surname} />
            </Heading>
            <PlayerFacts page={page} />
          </Page.Title>
        </Page.Cell>
      }
    >
      {keyFigures.length === 0 ? null : (
        <Page.Cell>
          <KeyFigures aria-label="Kerngetallen" figures={keyFigures} />
        </Page.Cell>
      )}
      {seasons === undefined ? null : (
        <Page.Cell>
          <PlayerSeasonsCard
            address={(season) => seasonAddress(playersPath, season, current)}
            goalkeeper={page.line === 'doelman'}
            name={page.name}
            seasons={seasons}
          />
        </Page.Cell>
      )}
      {seasons === undefined || career === undefined ? null : (
        <Page.Cell>
          <PlayerCareerCard options={career} seasons={seasons} />
        </Page.Cell>
      )}
      <PlayerCredit page={page} />
    </Page.Main>
  )
}

/** The line of a player as a word with a capital, such as `Aanvaller`. */
function lineName(line: PlayerPage['line']) {
  return line === undefined ? undefined : `${line.charAt(0).toUpperCase()}${line.slice(1)}`
}

/** Words as a list in Dutch: "a", "a en b", "a, b en c". */
function listText(words: readonly string[]) {
  return words.length < 2 ? (words[0] ?? '') : `${words.slice(0, -1).join(', ')} en ${words.at(-1)}`
}

/** The seasons in words: "in 2004/05", "van 2002/03 tot en met 2003/04 en in 2007/08". */
function periodsText(periods: readonly { first: string; last: string }[]) {
  return listText(
    periods.map(({ first, last }) => (first === last ? `in ${first}` : `van ${first} tot en met ${last}`)),
  )
}

/**
 * The credit: Wikipedia with his article and the licence of our data, with the archive of the
 * old fansite when he played a season up to 2006/07. For a player whose article was not read
 * yet the time of reading falls away; a player of the editors without an article gets the
 * archive or the editors.
 */
function PlayerCredit({ page }: { page: PlayerPage }) {
  const archive = page.seasons.some((season) => season <= lastArchiveSeason)
  const { readAt, wikipedia } = page
  let credit: ReactNode

  if (wikipedia !== undefined) {
    credit = (
      <WikipediaCredit
        archive={archive}
        data="spelersgegevens"
        edited={page.edited}
        pages={[{ href: wikipediaUrl(wikipedia.title, wikipedia.language), name: wikipedia.title }]}
        {...(readAt === undefined ? {} : { readAt: formatReadAt(readAt), readAtDateTime: readAt.toISOString() })}
      />
    )
  } else if (archive) {
    credit = <ArchiveCredit />
  } else {
    credit = <Text appearance="meta">Bron: onze redactie.</Text>
  }

  return (
    <Card as="div" surface="transparent">
      {credit}
    </Card>
  )
}

/**
 * One line under the name: the line, the flag with the country in words (`CountryName`), and
 * the year and place of birth. A part we do not know is left out with its separator.
 */
function PlayerFacts({ page }: { page: PlayerPage }) {
  const born = [
    page.birthYear === undefined ? undefined : `in ${page.birthYear}`,
    page.birthPlace === undefined ? undefined : `in ${page.birthPlace}`,
  ].filter((part) => part !== undefined)
  const parts: ReactNode[] = [
    lineName(page.line),
    page.country === undefined ? undefined : <CountryName country={page.country} />,
    born.length === 0 ? undefined : `geboren ${born.join(' ')}`,
  ].filter((part) => part !== undefined)

  if (parts.length === 0) {
    return null
  }

  // Only the first part starts with a capital: "Geboren in 1974" when it is the only one.
  if (typeof parts[0] === 'string') {
    parts[0] = `${parts[0].charAt(0).toUpperCase()}${parts[0].slice(1)}`
  }

  return (
    <Text appearance="meta">
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && ' · '}
          {part}
        </Fragment>
      ))}
    </Text>
  )
}

/**
 * What the career needs: the moment of each season, and the address of the page of the match
 * where it has one. A season whose matches could not be read has moments without a link, so
 * the career still shows (the error is logged).
 */
async function readCareer(seasons: readonly PlayerSeason[], current: string) {
  const moments = careerMoments(seasons)
  const addresses = new Map<string, ReadonlyMap<string, string>>()

  await Promise.all(
    [...moments.keys()].map(async (season) => {
      try {
        addresses.set(season, await getReportAddresses(season))
      } catch (error) {
        console.error(`Could not read the matches of ${season} for the career of a player: ${reasonOf(error)}`)
      }
    }),
  )

  return {
    current,
    matchHref: ({ competition, round, season }: CareerMomentChoice['match']) =>
      addresses.get(season)?.get(`${competition}|${round}`),
    moments,
    seasonHref: (season: string) => seasonAddress(playersPath, season, current),
  }
}

/** The figures per season, or undefined when they could not be read (the error is logged). */
async function readSeasons(page: PlayerPage): Promise<PlayerSeason[] | undefined> {
  try {
    return await loadPlayerSeasons(page.personId)
  } catch (error) {
    console.error(`Could not read the seasons of a player for ${playerAddress(page.slug)}: ${reasonOf(error)}`)

    return undefined
  }
}
