import type { Metadata } from 'next'

import { Card, DataTable, DescriptionList, Heading, Link, Page, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { getDatabase } from '#src/database'
import { accountData, myDataPath, playedGames, slugOf } from '#src/fans/my-data'
import { requireSupporter } from '#src/fans/require-supporter'

import { BackToAccount } from '../BackToAccount'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: 'Alles wat we van je bewaren',
}

const timeZone = 'Europe/Amsterdam'
const dateFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', timeZone, year: 'numeric' })
const dayFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', timeZone: 'UTC', year: 'numeric' })

// Everything the site keeps of the supporter who is logged in: the account, and per game that
// is on what the supporter filled in there. A blocked supporter sees it too.
export default async function MyDataPage() {
  const { supporterId } = await requireSupporter({ blocked: 'allow', from: myDataPath })
  const { db } = getDatabase()
  const account = await accountData(db, supporterId)

  if (account === undefined) {
    notFound()
  }

  const games = await playedGames(db, supporterId)
  const first = games[0]
  const played = games.filter((game) => game.data !== undefined)

  return (
    <Page.Main>
      <Page.Cell>
        <BackToAccount />
        <Heading level={1}>Alles wat we van je bewaren</Heading>
        <Text appearance="intro">
          Andere supporters zien alleen je schermnaam en je punten in de standen. <Link href="/privacy">Privacy</Link>
        </Text>
        <Card aria-labelledby="account-kop">
          <Heading id="account-kop" level={2}>
            Je account
          </Heading>
          <DescriptionList aligned stacked>
            <DescriptionList.Item term="Schermnaam">{account.screenName}</DescriptionList.Item>
            <DescriptionList.Item term="E-mailadres">{account.email}</DescriptionList.Item>
            <DescriptionList.Item term="Gemaakt op">{dateFormat.format(account.createdAt)}</DescriptionList.Item>
            <DescriptionList.Item term="Laatste bezoek">
              {account.lastVisitOn === null ? 'Nog niet' : dayFormat.format(new Date(account.lastVisitOn))}
            </DescriptionList.Item>
            <DescriptionList.Item term="In de standen">{account.inRankings ? 'Ja' : 'Nee'}</DescriptionList.Item>
            <DescriptionList.Item term="Naam gewijzigd">
              {account.screenNameChangedAt === null ? 'Nooit' : dateFormat.format(account.screenNameChangedAt)}
            </DescriptionList.Item>
            {account.blockedAt === null ? null : (
              <DescriptionList.Item term="Geblokkeerd">
                {`Sinds ${dateFormat.format(account.blockedAt)}`}
                {account.blockedReason === null ? '' : `: ${account.blockedReason}`}
              </DescriptionList.Item>
            )}
          </DescriptionList>
        </Card>
        {played.length === 0 ? (
          <Card aria-labelledby="gespeeld-kop">
            <Heading id="gespeeld-kop" level={2}>
              Wat je speelde
            </Heading>
            <Text>
              Nog niets.
              {first === undefined ? null : (
                <>
                  {' '}
                  <Link href={first.href}>Doe mee aan de {first.label}</Link>
                </>
              )}
            </Text>
          </Card>
        ) : (
          games.map((game) => (
            <Card aria-labelledby={slugOf(game.label)} key={game.label}>
              <Heading id={slugOf(game.label)} level={2}>
                {game.label}
              </Heading>
              {game.data === undefined ? (
                <Text>Hier heb je nog niets ingevuld.</Text>
              ) : (
                <DataTable
                  appearance="text"
                  caption={`Wat je invulde bij de ${game.label}`}
                  columns={game.data.columns}
                  rows={game.data.rows}
                  sortable={false}
                />
              )}
            </Card>
          ))
        )}
        <Text appearance="meta">
          Geen IP-adres, geen browser, geen echte naam: die bewaren we niet. <Link href="/privacy">Privacy</Link>
        </Text>
      </Page.Cell>
    </Page.Main>
  )
}
