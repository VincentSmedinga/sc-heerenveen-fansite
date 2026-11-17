import type { PlayerListReport } from '@fansite/db/persons'
import type { Metadata } from 'next'

import { playerListReport, similarPersons } from '@fansite/db/persons'
import { Card, Heading, Link, List, Page, Text } from '@fansite/design-system'
import { Fragment } from 'react'

import { adminAreas } from '#src/beheer/areas'
import { compact } from '#src/beheer/density'
import { personQualityPath } from '#src/beheer/person-table'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

// Render on each request: who is logged in and what the database holds are not known when the
// site is built.
export const dynamic = 'force-dynamic'

const title = 'Namen die op elkaar lijken en de lijst van Wikipedia'

export const metadata: Metadata = { robots: { follow: false, index: false }, title }

/**
 * The persons whose names look alike and what the list of players of Wikipedia says about our
 * names (issue 1165): lists to read, not gaps to fill in, so they have a page of their own,
 * linked from the table of the persons.
 */
export default async function NamesQualityPage() {
  await requireRole('owner', 'editor')

  const { db } = getDatabase()
  const alike = await similarPersons(db)
  const list = await playerListReport(db)

  return (
    <Page.Main areas={adminAreas} className={compact}>
      <Page.Cell area="head">
        <Text>
          <Link href={personQualityPath} icon="arrow-left">
            Personen
          </Link>
        </Text>
        <Heading level={1}>{title}</Heading>
      </Page.Cell>
      <Page.Cell area="main">
        <Card aria-labelledby="personen-kop">
          <Heading id="personen-kop" level={2}>
            Personen die op elkaar lijken
          </Heading>
          {alike.length === 0 ? (
            <Text>Er zijn geen personen die op elkaar lijken.</Text>
          ) : (
            <>
              <Text>
                Deze personen hebben bijna dezelfde naam op Wikipedia, op accenten, hoofdletters en streepjes na. We
                voegen ze niet vanzelf samen, want twee spelers kunnen dezelfde naam hebben.
              </Text>
              <List role="list">
                {alike.map((titles) => (
                  <List.Item key={titles.join('|')}>{sentenceList(titles)}</List.Item>
                ))}
              </List>
            </>
          )}
        </Card>
        <PlayerListCard report={list} />
      </Page.Cell>
    </Page.Main>
  )
}

/**
 * What the list of players of sc Heerenveen on Wikipedia says about our names. It is
 * information: nothing is made, changed or merged from it.
 */
function PlayerListCard({ report }: { report: PlayerListReport }) {
  const groups = [
    {
      empty: 'Elke persoon van ons staat op de lijst.',
      text: 'Deze personen staan niet op de lijst van spelers van sc Heerenveen. Dat kan kloppen: de lijst is niet altijd compleet.',
      titles: report.notOnList,
    },
    {
      empty: 'Elke titel op de lijst is een persoon van ons.',
      text: 'Deze titels staan op de lijst en zijn geen persoon van ons. Het kan een speler zijn die we nog niet hebben.',
      titles: report.notOurs,
    },
    {
      empty: 'Geen titel verschilt alleen in een teken.',
      text: 'Deze titels verschillen alleen in een teken: onze titel en die van de lijst.',
      titles: report.spelling.map(([ours, listed]) => sentenceList([ours, listed])),
    },
  ]

  return (
    <Card aria-labelledby="lijst-kop">
      <Heading id="lijst-kop" level={2}>
        Namen en de lijst van spelers
      </Heading>
      {report.read === 0 ? (
        <Text>De lijst van spelers van sc Heerenveen is nog niet gelezen.</Text>
      ) : (
        groups.map(({ empty, text, titles }) =>
          titles.length === 0 ? (
            <Text key={empty}>{empty}</Text>
          ) : (
            <Fragment key={empty}>
              <Text>
                {text} Er zijn er {titles.length}.
              </Text>
              <List role="list">
                {titles.slice(0, 20).map((title) => (
                  <List.Item key={title}>{title}</List.Item>
                ))}
              </List>
              {titles.length > 20 ? <Text>En nog {titles.length - 20}.</Text> : null}
            </Fragment>
          ),
        )
      )}
    </Card>
  )
}

/** Names in a sentence: "A en B", "A, B en C". */
function sentenceList(names: readonly string[]) {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} en ${names.at(-1)}`
}
