import type { Metadata } from 'next'

import { Heading, Link, Page, Pagination, Text } from '@fansite/design-system'

import { countryChoices } from '#src/beheer/countries'
import { compact } from '#src/beheer/density'
import {
  countPersonsWithout,
  listPersonsWithout,
  ourCountries,
  type PersonFact,
  personFacts,
  personFactsPath,
  personListLength,
} from '#src/beheer/person-facts'
import { qualityPath } from '#src/beheer/quality'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'
import { wikipediaUrl } from '#src/match-format'

import { submitPersonFact } from './actions'
import { PersonWorkList } from './PersonWorkList'

// Render on each request: who is logged in and what the database holds are not known when the
// site is built.
export const dynamic = 'force-dynamic'

const title = 'Personen zonder linie of land'

export const metadata: Metadata = { robots: { follow: false, index: false }, title }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

// The persons without a line or without a country (issue 1053), for a beheerder: two lists,
// each in parts of fifty, the persons of the newest seasons first. The list itself is a client
// component, so a choice saves one row and leaves the others as they are. A part that does not
// exist shows the last one.
export default async function PersonFactsPage({ searchParams }: Props) {
  await requireRole('beheerder')

  const { deel, lijst } = await searchParams
  const fact = personFacts.find((choice) => choice === lijst) ?? 'linie'
  const { db } = getDatabase()
  const totals = await countPersonsWithout(db)
  const parts = Math.max(1, Math.ceil(totals[fact] / personListLength))
  const asked = typeof deel === 'string' && /^[1-9]\d{0,3}$/u.test(deel) ? Number(deel) : 1
  const part = Math.min(asked, parts)
  const found = await listPersonsWithout(db, fact, { offset: (part - 1) * personListLength })
  const ours = new Set(fact === 'land' ? await ourCountries(db) : [])
  const choices = fact === 'land' ? countryChoices() : []

  return (
    <Page.Main
      className={compact}
      intro={
        <>
          <Text>
            <Link href={qualityPath} icon="arrow-left">
              Terug naar de kwaliteit van de gegevens
            </Link>
          </Text>
          <Heading level={1}>{title}</Heading>
          <Text appearance="intro">
            Van deze personen weten we de linie of het land niet. Kies het hier: een keuze is meteen opgeslagen, en de
            import laat haar staan.
          </Text>
        </>
      }
      wide
    >
      <PersonWorkList
        action={submitPersonFact}
        countries={{
          others: choices.filter(({ code }) => !ours.has(code)),
          ours: choices.filter(({ code }) => ours.has(code)),
        }}
        fact={fact}
        key={`${fact}-${part}`}
        paths={{ land: address('land'), linie: address('linie') }}
        rows={found.map((person) => ({
          id: person.id,
          name: person.name,
          ...(person.firstSeason === null || person.lastSeason === null
            ? {}
            : {
                seasons:
                  person.firstSeason === person.lastSeason
                    ? person.firstSeason
                    : `${person.firstSeason} tot en met ${person.lastSeason}`,
              }),
          ...(person.wikipediaPage === null
            ? {}
            : { wikipedia: wikipediaUrl(person.wikipediaPage, person.englishTitle ? 'en' : 'nl') }),
        }))}
        totals={totals}
      />
      {parts === 1 ? null : (
        <Pagination
          current={part}
          label="Delen van de lijst"
          nextHref={part < parts ? address(fact, part + 1) : undefined}
          previousHref={part > 1 ? address(fact, part - 1) : undefined}
          total={parts}
        />
      )}
    </Page.Main>
  )
}

/** The address of a list and a part of it: the first list and the first part are left out. */
function address(fact: PersonFact, part = 1) {
  const query = new URLSearchParams({
    ...(fact === 'linie' ? {} : { lijst: fact }),
    ...(part === 1 ? {} : { deel: String(part) }),
  })

  return query.size === 0 ? personFactsPath : `${personFactsPath}?${query.toString()}`
}
