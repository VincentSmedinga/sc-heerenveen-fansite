import type { Metadata } from 'next'

import { Heading, Link, Page, Pagination, Text } from '@fansite/design-system'

import { clubNamesPath } from '#src/app/beheer/clubnamen/paths'
import { adminAreas } from '#src/beheer/areas'
import {
  clubCountryListPath,
  clubListLength,
  countClubsWithoutCountry,
  listClubsWithoutCountry,
} from '#src/beheer/club-country'
import { countryChoices } from '#src/beheer/countries'
import { compact } from '#src/beheer/density'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

import { submitClubCountryFromList } from './actions'
import { ClubCountryList } from './ClubCountryList'

// Render on each request: who is logged in and what the database holds are not known when the
// site is built.
export const dynamic = 'force-dynamic'

const title = 'Clubs zonder land'

export const metadata: Metadata = { robots: { follow: false, index: false }, title }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

// The clubs without a country (#1265), for an editor: the import fills in the clubs that have a
// Wikipedia article with a country on Wikidata, and the editors do the rest. The clubs of
// matches in Europe come first, then A to Z, in parts of fifty. The list itself is a client
// component, so a choice saves one club and leaves the others as they are. A part that does not
// exist shows the last one.
export default async function ClubsWithoutCountryPage({ searchParams }: Props) {
  await requireRole('owner', 'editor')

  const { deel } = await searchParams
  const { db } = getDatabase()
  const totals = await countClubsWithoutCountry(db)
  const parts = Math.max(1, Math.ceil(totals.total / clubListLength))
  const asked = typeof deel === 'string' && /^[1-9]\d{0,3}$/u.test(deel) ? Number(deel) : 1
  const part = Math.min(asked, parts)
  const found = await listClubsWithoutCountry(db, { offset: (part - 1) * clubListLength })
  const address = (number: number) => (number === 1 ? clubCountryListPath : `${clubCountryListPath}?deel=${number}`)

  return (
    <Page.Main areas={adminAreas} className={compact}>
      <Page.Cell area="head">
        <Text>
          <Link href={clubNamesPath} icon="arrow-left">
            Clubnamen
          </Link>
        </Text>
        <Heading level={1}>{title}</Heading>
        <Text appearance="intro">
          Van deze clubs weten we het land niet: de import vindt het alleen voor clubs met een Wikipedia-pagina en een
          land op Wikidata. Kies het hier: een keuze is meteen opgeslagen, en de import laat haar staan.
        </Text>
      </Page.Cell>
      <Page.Cell area="main">
        <ClubCountryList
          action={submitClubCountryFromList}
          countries={countryChoices()}
          key={part}
          path={address(part)}
          rows={found}
          totals={totals}
        />
        {parts === 1 ? null : (
          <Pagination
            current={part}
            label="Delen van de lijst"
            nextHref={part < parts ? address(part + 1) : undefined}
            previousHref={part > 1 ? address(part - 1) : undefined}
            total={parts}
          />
        )}
      </Page.Cell>
    </Page.Main>
  )
}
