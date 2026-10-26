import type { Metadata } from 'next'

import { Card, DataTable, Heading, Link, List, Page, Text } from '@fansite/design-system'

import { requireRole } from '../../../beheer/require-role'
import { days, shortDays, topLength, visitNumbers } from '../../../beheer/visits'
import { getDatabase } from '../../../database'

// Render on each request: who is logged in and what the counters say are not known when the
// site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Bezoek' }

const dayFormat = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
  weekday: 'short',
})

/** A day as `2026-10-26`, written for a reader: `ma 26 okt`. */
const formatDay = (day: string) => dayFormat.format(new Date(`${day}T12:00:00Z`))

// The numbers of the visit of the last 30 days, for a beheerder: the totals of the last 7 and
// 30 days, every day on its own line and the most viewed pages, with in plain words what the
// numbers are and are not. The tables have a caption that only a screen reader gets, because
// the heading above each one says what it is.
export default async function VisitPage() {
  await requireRole('beheerder')

  const { perDay, topPages, total, totalShort } = await visitNumbers(getDatabase().db)
  const counted = total.views > 0 || total.visitors > 0

  return (
    <Page.Main
      intro={
        <>
          <Heading level={1}>Bezoek</Heading>
          <Text appearance="intro">
            Hoeveel mensen de site bezochten en welke pagina’s ze bekeken, de laatste {days} dagen. Het zijn ruwe
            cijfers: lees eerst <Link href="#uitleg">wat ze zijn en wat niet</Link>.
          </Text>
        </>
      }
    >
      {counted ? (
        <>
          <Card aria-labelledby="totalen-kop">
            <Heading id="totalen-kop" level={2}>
              Totalen
            </Heading>
            <DataTable
              caption={`Unieke bezoekers en paginaweergaven van de laatste ${shortDays} en ${days} dagen`}
              columns={['Periode', 'Unieke bezoekers', 'Weergaven']}
              rows={[
                { cells: [totalShort.visitors, totalShort.views], header: `Laatste ${shortDays} dagen` },
                { cells: [total.visitors, total.views], header: `Laatste ${days} dagen` },
              ]}
            />
          </Card>
          <Card aria-labelledby="dagen-kop">
            <Heading id="dagen-kop" level={2}>
              Per dag
            </Heading>
            <DataTable
              caption={`Unieke bezoekers en paginaweergaven per dag, de laatste ${days} dagen, de nieuwste dag bovenaan`}
              columns={['Dag', 'Unieke bezoekers', 'Weergaven']}
              rows={perDay.map((row) => ({ cells: [row.visitors, row.views], header: formatDay(row.day) }))}
            />
          </Card>
          <Card aria-labelledby="pagina-kop">
            <Heading id="pagina-kop" level={2}>
              Meest bekeken pagina’s
            </Heading>
            <DataTable
              caption={`De ${topLength} meest bekeken pagina’s van de laatste ${days} dagen, met het aantal weergaven`}
              columns={['Pagina', 'Weergaven']}
              rows={topPages.map((row) => ({ cells: [row.views], header: row.path }))}
            />
          </Card>
        </>
      ) : (
        <Card aria-labelledby="leeg-kop" surface="soft">
          <Heading id="leeg-kop" level={2}>
            Nog geen cijfers
          </Heading>
          <Text>
            In de laatste {days} dagen is er nog geen bezoek geteld. Zodra iemand een pagina opent, staan hier de
            cijfers.
          </Text>
        </Card>
      )}
      <Card aria-labelledby="uitleg">
        <Heading id="uitleg" level={2}>
          Wat deze cijfers zijn
        </Heading>
        <List role="list">
          <List.Item>Een paginaweergave is één keer een pagina openen. Een bezoeker telt één keer per dag.</List.Item>
          <List.Item>
            De cijfers zijn ruw. Ze laten zien of de site groeit en welke pagina’s gelezen worden, niet hoeveel mensen
            er precies kwamen.
          </List.Item>
          <List.Item>
            Een bezoeker die op twee dagen komt, telt in de totalen twee keer: een totaal is de som van de dagen. Een
            bezoeker met een ander apparaat telt als een andere bezoeker.
          </List.Item>
          <List.Item>
            Er staan geen bots en geen zoekmachines in. Bezoekers die “Niet volgen” (Do Not Track) of Global Privacy
            Control aanzetten, tellen niet mee. Hoeveel dat er zijn, weten we niet.
          </List.Item>
          <List.Item>
            Kent de site het adres van een bezoeker niet, dan telt de paginaweergave wel en de bezoeker niet.
          </List.Item>
          <List.Item>De pagina’s van het beheer, bestanden en pagina’s die niet bestaan, tellen niet.</List.Item>
          <List.Item>We bewaren alleen de tellers per dag, zonder persoonsgegevens. Ze blijven bewaard.</List.Item>
        </List>
      </Card>
      <Text>
        <Link href="/beheer">Terug naar het beheer</Link>
      </Text>
    </Page.Main>
  )
}
