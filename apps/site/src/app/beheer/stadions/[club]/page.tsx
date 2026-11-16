import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { listAdminStadiums } from '@fansite/db/stadium-admin'
import {
  Button,
  Card,
  Disclosure,
  Form,
  Heading,
  Link,
  List,
  Notice,
  Page,
  ShortStaff,
  Strong,
  Tag,
  Text,
} from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { sideAreas } from '#src/beheer/areas'
import { compact } from '#src/beheer/density'
import { requireRole } from '#src/beheer/require-role'
import { SaveButtons } from '#src/beheer/SaveButtons'
import { emptyRow, stadiumFormId } from '#src/beheer/stadium-fields'
import { rowOf } from '#src/beheer/stadium-form'
import { findAdminClub, stadiumChoices } from '#src/beheer/stadiums'
import { getDatabase } from '#src/database'
import { describeShowDelay } from '#src/matches'

import { submitClubWikidata, submitHomeGrounds, submitReset, submitStadiums } from '../actions'
import { ClubWikidataForm } from '../ClubWikidataForm'
import { HomeGroundsForm } from '../HomeGroundsForm'
import { clubsPath } from '../paths'
import { StadiumForm } from '../StadiumForm'

// Render on each request: the list changes with every save.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Stadions van een club' }

type Props = {
  params: Promise<{ club: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// The form of the stadiums of one club: the lines of its own list in the main area, the save
// buttons in the toolbar and at the end of the form, and beside it what the matches say with
// the button that takes it over, and the block that goes back to Wikipedia. The page tells what
// the last action did from the word in the address.
export default async function ClubStadiumsPage({ params, searchParams }: Props) {
  await requireRole('owner', 'editor')

  const { club: slug } = await params
  const { db } = getDatabase()
  const found = await findAdminClub(db, slug)

  if (found === undefined) {
    notFound()
  }

  const { club, homeGrounds, own, wikipedia } = found
  const choices = stadiumChoices(await listAdminStadiums(db))
  const { gedaan } = await searchParams
  // The pages of the clubs keep what they read for as long as the current season does.
  const showDelay = describeShowDelay(seasonOf(new Date()))
  const notices: Record<string, { text: string; title: string }> = {
    'geen-lijst': { text: 'Deze club had geen eigen lijst om weg te halen.', title: 'Niets weggehaald' },
    opgeslagen: { text: `De lijst is bewaard. Staat ${showDelay} op de pagina van de club.`, title: 'Opgeslagen' },
    teruggezet: {
      text: `De eigen lijst is weg. De kaart toont ${showDelay} weer wat de wedstrijden zeggen.`,
      title: 'Terug naar Wikipedia',
    },
    'thuisvelden-opgeslagen': {
      text: 'De thuisvelden zijn bewaard. Ze zijn nu van de redactie: de import laat ze staan.',
      title: 'Opgeslagen',
    },
  }
  const notice = typeof gedaan === 'string' ? notices[gedaan] : undefined

  return (
    <Page.Main areas={sideAreas} className={compact}>
      <Page.Cell area="head">
        <Text>
          <Link href={clubsPath} icon="arrow-left">
            Terug naar Clubs
          </Link>
        </Text>
        <Heading level={1}>{club.name}</Heading>
        <Text>
          {own.length > 0 ? <Tag tone="highlight">Eigen lijst</Tag> : <Tag>Wikipedia</Tag>}{' '}
          {own.length > 0
            ? 'De kaart op de pagina van de club toont alleen deze lijst.'
            : 'De kaart toont wat de wedstrijden zeggen. Sla een lijst op om dat te vervangen.'}
        </Text>
      </Page.Cell>
      <Page.Toolbar>
        <SaveButtons
          buttons={[{ label: 'Eigen lijst opslaan', value: 'opslaan' }]}
          cancelHref={clubsPath}
          formId={stadiumFormId}
        />
      </Page.Toolbar>
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
        />
        <StadiumForm
          action={submitStadiums.bind(null, slug)}
          cancelHref={clubsPath}
          initial={own.length > 0 ? own.map(rowOf) : [{ ...emptyRow }]}
          key={`${club.id}-${gedaan ?? ''}`}
        />
      </Page.Cell>
      <Page.Section area="side" aria-label="Naast de lijst met stadions">
        <Card aria-labelledby="wedstrijden-kop" surface="soft">
          <Heading id="wedstrijden-kop" level={2}>
            Wat de wedstrijden zeggen
          </Heading>
          {wikipedia.length === 0 ? (
            <Text>De wedstrijden noemen geen stadion van deze club.</Text>
          ) : (
            <>
              <List role="list">
                {wikipedia.map((stadium, index) => (
                  <List.Item key={`${index}-${stadium.name}`}>
                    <ShortStaff period={stadium.period} surname={stadium.name} />
                  </List.Item>
                ))}
              </List>
              <Text appearance="meta">
                Overnemen vult het formulier met deze namen en seizoenen. Er wordt niets opgeslagen tot je Opslaan
                kiest.
              </Text>
              <Button appearance="soft" form={stadiumFormId} name="knop" type="submit" value="overnemen">
                Overnemen
              </Button>
            </>
          )}
        </Card>
        {own.length === 0 ? null : (
          <Disclosure summary="Terug naar Wikipedia">
            <Text>
              Dit haalt de hele lijst van de redactie weg, ook de toelichtingen. Daarna toont de kaart weer wat de
              wedstrijden zeggen.
            </Text>
            <Form action={submitReset.bind(null, slug)}>
              <Button appearance="danger" aria-label={`Terug naar Wikipedia voor ${club.name}`} type="submit">
                Terug naar Wikipedia
              </Button>
            </Form>
          </Disclosure>
        )}
      </Page.Section>
    </Page.Main>
  )
}
