import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { seasonOf } from '@fansite/db/season'
import {
  BarList,
  Breadcrumb,
  Card,
  Heading,
  Link,
  Page,
  PlayerList,
  SegmentedLinks,
  Text,
  WikipediaCredit,
} from '@fansite/design-system'
import { Fragment } from 'react'

import { reviewBranch } from '#src/env'
import { reasonOf } from '#src/errors'
import { pageMetadata } from '#src/metadata'
import {
  byCountry,
  byLetter,
  countryAnchor,
  type CountryGroup,
  factsOf,
  getPlayersOverview,
  northernCountries,
  overviewCountryPath,
  overviewPath,
  type OverviewPlayer,
  type PlayersOverview,
} from '#src/players-overview'
import { playersPath } from '#src/season-page'
import { ServerError, serverErrorTitle } from '#src/ServerError'
import { withBranch } from '#src/title'

/** The two views of the overview. */
export type OverviewView = 'land' | 'naam'

const addressOf = (view: OverviewView) => (view === 'naam' ? overviewPath : overviewCountryPath)

/** The title, description and canonical address of a view. */
export async function overviewMetadata(view: OverviewView): Promise<Metadata> {
  const loaded = await load()

  // A page that failed answers 200, so noindex keeps search engines from keeping it.
  if (loaded.kind === 'error') {
    return { robots: { index: false }, title: withBranch(serverErrorTitle, reviewBranch()) }
  }

  return pageMetadata(addressOf(view), view === 'naam' ? 'Alle spelers op naam' : 'Alle spelers op land')
}

/** What the overview reads, or that it went wrong: the page shows the error page itself. */
async function load(): Promise<{ kind: 'error' } | { kind: 'found'; overview: PlayersOverview }> {
  try {
    return { kind: 'found', overview: await getPlayersOverview() }
  } catch (error) {
    console.error(`Could not read the players for ${overviewPath}: ${reasonOf(error)}`)

    return { kind: 'error' }
  }
}

const letterAnchor = (letter: string) => `letter-${letter === '#' ? 'overig' : letter.toLowerCase()}`

const countText = (count: number) => `${count} ${count === 1 ? 'speler' : 'spelers'}`

/** The links of the bar under the header: a letter or a country for each section. */
export async function overviewShortcuts(view: OverviewView) {
  const loaded = await load()

  if (loaded.kind === 'error') {
    return null
  }

  const { players } = loaded.overview
  const items =
    view === 'naam'
      ? byLetter(players).map(({ letter }) => ({ href: `#${letterAnchor(letter)}`, label: letter }))
      : byCountry(players).map((group) => ({ href: `#${countryAnchor(group)}`, label: group.name }))

  return items.length < 2 ? null : <Page.Shortcuts items={items} label="Op deze pagina:" />
}

function Rows({ current, players }: { current: string; players: readonly OverviewPlayer[] }) {
  return (
    <PlayerList
      players={players.map((player) => ({
        facts: factsOf(player, current),
        href: player.slug === undefined ? undefined : `${playersPath}/${player.slug}`,
        key: String(player.id),
        rest: player.rest,
        surname: player.surname,
      }))}
    />
  )
}

function Section({
  anchor,
  children,
  count,
  title,
}: {
  anchor: string
  children: ReactNode
  count: number
  title: string
}) {
  return (
    <Card aria-labelledby={anchor}>
      <Heading id={anchor} level={2}>
        {title}{' '}
        <Text appearance="meta" as="span">
          {countText(count)}
        </Text>
      </Heading>
      {children}
    </Card>
  )
}

const biggest = 12
const biggestOnPhone = 8

/**
 * The overview of all players of sc Heerenveen (#1138): `/spelers/overzicht` by the letter of
 * the family name, and `/spelers/overzicht/land` by country. A person with a row in `players`
 * counts. The page reads the data on every request and shows the error page when it cannot.
 */
export async function OverviewPage({ view }: { view: OverviewView }) {
  const loaded = await load()

  if (loaded.kind === 'error') {
    return <ServerError retryHref={addressOf(view)} />
  }

  const { players, since } = loaded.overview
  const current = seasonOf(new Date())
  const total = players.length
  const countries = view === 'land' ? byCountry(players) : []
  const intro =
    view === 'naam'
      ? `Alle ${total} spelers die sinds ${since} in de selectie van sc Heerenveen stonden, op achternaam. Een voorvoegsel telt niet mee: Joost van Aken staat bij de A.`
      : `Alle ${total} spelers die sinds ${since} in de selectie van sc Heerenveen stonden, per land van de speler.`

  return (
    <>
      <Page.Main
        intro={
          <Page.Cell>
            <Breadcrumb current="Overzicht" items={[{ href: playersPath, label: 'Spelers' }]} label="Kruimelpad" />
            <Page.Title>
              <Heading level={1}>Alle spelers</Heading>
            </Page.Title>
            <Text>{intro}</Text>
            <SegmentedLinks
              label="Hoe de spelers staan"
              options={[
                { href: overviewPath, label: 'Op naam', value: 'naam' },
                { href: overviewCountryPath, label: 'Op land', value: 'land' },
              ]}
              value={view}
            />
          </Page.Cell>
        }
      >
        {view === 'land' && <CountriesCard groups={countries} />}
        {view === 'naam'
          ? byLetter(players).map(({ letter, players: group }) => (
              <Section
                anchor={letterAnchor(letter)}
                count={group.length}
                key={letter}
                title={letter === '#' ? 'Overig' : letter}
              >
                <Rows current={current} players={group} />
              </Section>
            ))
          : countries.map((group) => (
              <Section
                anchor={countryAnchor(group)}
                count={group.players.length}
                key={countryAnchor(group)}
                title={group.name}
              >
                <Rows current={current} players={group.players} />
              </Section>
            ))}
      </Page.Main>
      <Page.Sidebar aria-label={view === 'land' ? 'Uit het noorden en de bron' : 'De bron'}>
        {view === 'land' && <NorthCard groups={countries} />}
        <Card as="div" surface="transparent">
          <WikipediaCredit archive compact />
        </Card>
      </Page.Sidebar>
    </>
  )
}

/** The card with a bar for each of the largest countries, and the others in one sentence. */
function CountriesCard({ groups }: { groups: readonly CountryGroup[] }) {
  const known = groups.filter((group) => group.country !== undefined)
  const shown = known.slice(0, biggest)
  const linkOf = (group: CountryGroup) => <Link href={`#${countryAnchor(group)}`}>{group.name}</Link>
  const others = (from: number) => known.slice(from).map(linkOf)
  const list = (items: readonly ReactNode[]) =>
    items.map((item, index) => (
      <Fragment key={index}>
        {index === 0 ? '' : index === items.length - 1 ? ' en ' : ', '}
        {item}
      </Fragment>
    ))

  return (
    <Card aria-labelledby="landen">
      <Heading id="landen" level={2}>
        De grootste landen
      </Heading>
      <BarList
        rows={shown.map((group, index) => ({
          label: linkOf(group),
          value: group.players.length,
          ...(index >= biggestOnPhone ? { wideOnly: true } : {}),
        }))}
        wide
      />
      {known.length > biggestOnPhone && (
        <Text>
          <Text as="span" className="hf-bar-list-narrow-only">
            En verder: {list(others(biggestOnPhone))}.
          </Text>
          {known.length > biggest && (
            <Text as="span" className="hf-bar-list-wide-only">
              En verder: {list(others(biggest))}.
            </Text>
          )}
        </Text>
      )}
    </Card>
  )
}

/** The card Uit het noorden: how many players came from the five countries of the north. */
function NorthCard({ groups }: { groups: readonly CountryGroup[] }) {
  const north = northernCountries.flatMap((code) => groups.filter((group) => group.country === code))
  const total = north.reduce((sum, group) => sum + group.players.length, 0)

  if (north.length === 0) {
    return null
  }

  const names = north.map((group) => group.name)

  return (
    <Card aria-labelledby="uit-het-noorden" surface="soft">
      <Heading id="uit-het-noorden" level={2}>
        Uit het noorden
      </Heading>
      <Text>
        {total} spelers uit {names.length < 2 ? names[0] : `${names.slice(0, -1).join(', ')} en ${names.at(-1)}`}.
      </Text>
    </Card>
  )
}
