import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import {
  Breadcrumb,
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

import { compact } from '#src/beheer/density'
import { requireRole } from '#src/beheer/require-role'
import { emptyRow, stadiumFormId } from '#src/beheer/stadium-fields'
import { rowOf } from '#src/beheer/stadium-form'
import { findAdminClub } from '#src/beheer/stadiums'
import { getDatabase } from '#src/database'
import { describeShowDelay } from '#src/matches'

import { submitReset, submitStadiums } from '../actions'
import { stadiumsPath } from '../paths'
import { StadiumForm } from '../StadiumForm'

// Render on each request: the list changes with every save.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Stadions van een club' }

type Props = {
  params: Promise<{ club: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// The form of the stadiums of one club: the lines of its own list in the main column, and in
// the sidebar the save button, what the matches say with the button that takes it over, and the
// block that goes back to Wikipedia. The page tells what the last action did from the word in
// the address.
export default async function ClubStadiumsPage({ params, searchParams }: Props) {
  await requireRole('beheerder')

  const { club: slug } = await params
  const found = await findAdminClub(getDatabase().db, slug)

  if (found === undefined) {
    notFound()
  }

  const { club, own, wikipedia } = found
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
  }
  const notice = typeof gedaan === 'string' ? notices[gedaan] : undefined

  return (
    <>
      <Page.Main
        className={compact}
        intro={
          <>
            <Breadcrumb
              current={club.name}
              items={[
                { href: '/beheer', label: 'Beheer' },
                { href: stadiumsPath, label: 'Stadions' },
              ]}
              label="Kruimelpad"
            />
            <Heading level={1}>{club.name}</Heading>
            <Text>
              {own.length > 0 ? <Tag tone="highlight">Eigen lijst</Tag> : <Tag>Wikipedia</Tag>}{' '}
              {own.length > 0
                ? 'De kaart op de pagina van de club toont alleen deze lijst.'
                : 'De kaart toont wat de wedstrijden zeggen. Sla een lijst op om dat te vervangen.'}
            </Text>
          </>
        }
        wide
      >
        {notice === undefined ? null : (
          <Notice>
            <Strong>{notice.title}.</Strong> {notice.text}
          </Notice>
        )}
        <StadiumForm
          action={submitStadiums.bind(null, slug)}
          initial={own.length > 0 ? own.map(rowOf) : [{ ...emptyRow }]}
          key={`${club.id}-${gedaan ?? ''}`}
        />
      </Page.Main>
      <Page.Sidebar aria-label="Opslaan en wat de wedstrijden zeggen" sticky>
        <Card aria-labelledby="opslaan-kop">
          <Heading id="opslaan-kop" level={2}>
            Opslaan
          </Heading>
          <Text appearance="meta">Staat {showDelay} op de pagina van de club.</Text>
          <Button form={stadiumFormId} icon="save" name="knop" type="submit" value="opslaan">
            Opslaan
          </Button>
        </Card>
        <Text>
          <Link href={stadiumsPath}>Annuleren</Link>
        </Text>
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
      </Page.Sidebar>
    </>
  )
}
