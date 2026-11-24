import type { Metadata } from 'next'

import { Card, DataTable, Heading, Link, List, Page, Text } from '@fansite/design-system'

import { adminAreas } from '#src/beheer/areas'
import { compact } from '#src/beheer/density'
import { requireRole } from '#src/beheer/require-role'
import { days, shortDays, topLength, transitionsLength, visitNumbers } from '#src/beheer/visits'
import { getDatabase } from '#src/database'

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

/** What each reason is called in the table, and what it means in plain words. */
const skipReasonTexts = {
  bot: {
    explanation:
      'Een bot, een zoekmachine, een controle van de host of ons eigen programma, aan de browsertekst herkend.',
    name: 'Bot of controle',
  },
  'geen-taal': {
    explanation:
      'De browser stuurde geen taalinstelling mee. Gewone browsers doen dat altijd, bots die zich als browser voordoen vaak niet.',
    name: 'Geen taalinstelling',
  },
  'niet-volgen': {
    explanation: 'De bezoeker heeft Do Not Track of Global Privacy Control aangezet.',
    name: 'Niet gevolgd willen worden',
  },
  vooruitladen: {
    explanation: 'De browser laadde de pagina vooraf, voor het geval de bezoeker hem opent.',
    name: 'Vooraf geladen',
  },
} as const

/** What each kind of origin is called in the table. */
const originNames = {
  direct: 'Rechtstreeks',
  forum: 'Het forum',
  overig: 'Een andere site of pagina',
  sociaal: 'Sociale media',
  zoekmachine: 'Een zoekmachine',
} as const

const percentFormat = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0, style: 'percent' })

/** A day as `2026-10-26`, written for a reader: `ma 26 okt`. */
const formatDay = (day: string) => dayFormat.format(new Date(`${day}T12:00:00Z`))

// The numbers of the visit of the last 30 days, for an editor: the totals of the last 7 and
// 30 days, every day on its own line and the most viewed pages, with in plain words what the
// numbers are and are not. The tables have a caption that only a screen reader gets, because
// the heading above each one says what it is.
export default async function VisitPage() {
  await requireRole('owner', 'editor')

  const { browsers, origins, perDay, skipped, topPages, total, totalShort, transitions } = await visitNumbers(
    getDatabase().db,
  )
  const counted = total.views > 0 || total.visitors > 0
  const anySkipped = skipped.some((row) => row.total > 0)

  return (
    <Page.Main areas={adminAreas} className={compact}>
      <Page.Cell area="head">
        <Heading level={1}>Bezoek</Heading>
        <Text appearance="intro">
          Hoeveel mensen de site bezochten en welke pagina’s ze bekeken, de laatste {days} dagen. Het zijn ruwe cijfers:
          lees eerst <Link href="#uitleg">wat ze zijn en wat niet</Link>.
        </Text>
      </Page.Cell>
      <Page.Cell area="main">
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
                // Two periods, the shorter first: a fixed series, so no sorting.
                sortable={false}
              />
            </Card>
            <Card aria-labelledby="dagen-kop">
              <Heading id="dagen-kop" level={2}>
                Per dag
              </Heading>
              <DataTable
                caption={`Unieke bezoekers en paginaweergaven per dag, de laatste ${days} dagen, de nieuwste dag bovenaan`}
                columns={['Dag', 'Unieke bezoekers', 'Weergaven']}
                rows={perDay.map((row) => ({
                  cells: [row.visitors, row.views],
                  header: formatDay(row.day),
                  // The days sort by the date, not by the words of the day.
                  sortHeader: row.day,
                }))}
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
            <Card aria-labelledby="stappen-kop">
              <Heading id="stappen-kop" level={2}>
                Van pagina naar pagina
              </Heading>
              <Text>
                Hoe vaak een pagina werd geopend na een andere pagina van de site, of na een herkomst van buiten. Een
                pagina die opnieuw wordt geladen telt niet.
              </Text>
              <DataTable
                caption={`De ${transitionsLength} vaakste stappen van een pagina of herkomst naar een pagina, de laatste ${days} dagen, met het aantal keren`}
                columns={['Van → naar', 'Keren']}
                rows={transitions.map((row) => ({ cells: [row.views], header: `${row.source} → ${row.path}` }))}
              />
            </Card>
            <Card aria-labelledby="herkomst-kop">
              <Heading id="herkomst-kop" level={2}>
                Waar bezoekers vandaan komen
              </Heading>
              <Text>
                Van een andere site bewaren we alleen de soort, nooit het adres. Rechtstreeks is ook een bezoeker van
                wie de browser of een app niet laat weten waar die vandaan komt. Een andere site of pagina is ook een
                pagina van onze eigen site die we niet tellen.
              </Text>
              <DataTable
                caption={`Weergaven per soort herkomst, de laatste ${days} dagen`}
                columns={['Herkomst', 'Weergaven']}
                rows={origins.map((row) => ({ cells: [row.views], header: originNames[row.origin] }))}
                // Five kinds in a fixed order: no sorting.
                sortable={false}
              />
            </Card>
            <Card aria-labelledby="browsers-kop">
              <Heading id="browsers-kop" level={2}>
                Browsers en apparaten
              </Heading>
              <Text>
                Per soort browser, besturingssysteem en apparaat hoeveel bezoekers er waren, zonder versienummers. Een
                bezoeker die op twee apparaten kijkt, telt twee keer.
              </Text>
              <DataTable
                caption={`Bezoekers per browser, besturingssysteem en apparaat, de laatste ${days} dagen, met het aandeel van alle bezoekers`}
                columns={['Browser, systeem, apparaat', 'Bezoekers', 'Aandeel']}
                rows={browsers.map((row) => ({
                  cells: [row.visitors, { sortValue: row.share, text: percentFormat.format(row.share) }],
                  header: `${row.browser}, ${row.os}, ${row.device}`,
                }))}
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
        <Card aria-labelledby="overgeslagen-kop">
          <Heading id="overgeslagen-kop" level={2}>
            Niet meegeteld
          </Heading>
          {anySkipped ? (
            <>
              <DataTable
                caption={`Verzoeken om een pagina die niet meetelden, per reden, van de laatste ${shortDays} en ${days} dagen`}
                columns={['Reden', `Laatste ${shortDays} dagen`, `Laatste ${days} dagen`]}
                rows={skipped.map((row) => ({
                  cells: [row.totalShort, row.total],
                  header: skipReasonTexts[row.reason].name,
                }))}
                // One row for each reason, in the order the site tries them: a fixed series.
                sortable={false}
              />
              <List role="list">
                {skipped.map((row) => (
                  <List.Item key={row.reason}>
                    {skipReasonTexts[row.reason].name}: {skipReasonTexts[row.reason].explanation}
                  </List.Item>
                ))}
              </List>
            </>
          ) : (
            <Text>
              Er is nog niets overgeslagen. Zodra de site een verzoek om een pagina niet meetelt, staat hier hoeveel en
              waarom.
            </Text>
          )}
        </Card>
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
              Control aanzetten, tellen niet mee, en een verzoek zonder taalinstelling ook niet. Hoeveel dat er zijn,
              staat bij Niet meegeteld.
            </List.Item>
            <List.Item>
              Ons eigen bezoek telt mee, met elk apparaat en elke browser apart. Wie dat niet wil, kan Do Not Track of
              Global Privacy Control in de eigen browser aanzetten.
            </List.Item>
            <List.Item>
              Alle pagina’s van seizoenen en wedstrijden onder /wedstrijden tellen mee bij /wedstrijden, of bij
              /wedstrijden/cijfers voor de cijfers.
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
      </Page.Cell>
    </Page.Main>
  )
}
