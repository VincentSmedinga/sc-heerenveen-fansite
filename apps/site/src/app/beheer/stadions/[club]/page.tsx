import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { listAdminStadiums } from '@fansite/db/stadium-admin'
import { Heading, Link, Notice, Page, Strong, Tag, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { toolbarAreas } from '#src/beheer/areas'
import { compact } from '#src/beheer/density'
import { requireRole } from '#src/beheer/require-role'
import { findAdminClub, stadiumChoices } from '#src/beheer/stadiums'
import { getDatabase } from '#src/database'
import { describeShowDelay } from '#src/matches'

import { submitClubWikidata, submitHomeGrounds } from '../actions'
import { ClubWikidataForm } from '../ClubWikidataForm'
import { HomeGroundsForm } from '../HomeGroundsForm'
import { clubsPath } from '../paths'

// Render on each request: the list changes with every save.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Stadions van een club' }

type Props = {
  params: Promise<{ club: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// The page of one club: its home grounds in the main area and its Wikidata number. The card on
// the page of the club reads the grounds and the names of their stadiums. The page tells what
// the last action did from the word in the address.
export default async function ClubStadiumsPage({ params, searchParams }: Props) {
  await requireRole('owner', 'editor')

  const { club: slug } = await params
  const { db } = getDatabase()
  const found = await findAdminClub(db, slug)

  if (found === undefined) {
    notFound()
  }

  const { club, homeGrounds } = found
  const choices = stadiumChoices(await listAdminStadiums(db))
  const { gedaan } = await searchParams
  // The pages of the clubs keep what they read for as long as the current season does.
  const showDelay = describeShowDelay(seasonOf(new Date()))
  const notices: Record<string, { text: string; title: string }> = {
    'thuisvelden-opgeslagen': {
      text: `De thuisvelden zijn bewaard. Ze zijn nu van de redactie: de import laat ze staan. De kaart op de pagina van de club toont ze ${showDelay}.`,
      title: 'Opgeslagen',
    },
  }
  const notice = typeof gedaan === 'string' ? notices[gedaan] : undefined

  return (
    <Page.Main areas={toolbarAreas} className={compact}>
      <Page.Cell area="head">
        <Text>
          <Link href={clubsPath} icon="arrow-left">
            Terug naar Clubs
          </Link>
        </Text>
        <Heading level={1}>{club.name}</Heading>
        <Text>
          {homeGrounds.rows.length > 0 ? <Tag tone="highlight">Thuisvelden</Tag> : <Tag>Geen thuisvelden</Tag>}{' '}
          {homeGrounds.rows.length > 0
            ? 'De kaart op de pagina van de club toont deze velden met hun namen.'
            : 'De kaart toont wat de wedstrijden zeggen. Zet hieronder de velden waar de club speelde om dat te vervangen.'}
        </Text>
      </Page.Cell>
      <Page.Cell area="main">
        {notice === undefined ? null : (
          <Notice>
            <Strong>{notice.title}.</Strong> {notice.text}
          </Notice>
        )}
        <HomeGroundsForm
          action={submitHomeGrounds.bind(null, slug)}
          clubName={club.name}
          initial={homeGrounds.rows}
          key={`thuis-${club.id}-${gedaan ?? ''}`}
          stadiums={choices}
        />
        <ClubWikidataForm
          action={submitClubWikidata.bind(null, slug)}
          clubName={club.name}
          key={`wikidata-${club.id}`}
          number={club.wikidataId}
          source={club.wikidataSource}
        />
      </Page.Cell>
    </Page.Main>
  )
}
