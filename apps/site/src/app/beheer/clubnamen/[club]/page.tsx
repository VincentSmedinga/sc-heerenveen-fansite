import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
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
  Strong,
  Tag,
  Text,
} from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { sideAreas } from '#src/beheer/areas'
import { emptyNameRow, nameFormId } from '#src/beheer/club-name-fields'
import { rowOf } from '#src/beheer/club-name-form'
import { findAdminClub, headingNotice } from '#src/beheer/club-names'
import { compact } from '#src/beheer/density'
import { requireRole } from '#src/beheer/require-role'
import { SaveButtons } from '#src/beheer/SaveButtons'
import { getDatabase } from '#src/database'
import { describeShowDelay } from '#src/matches'

import { submitNames, submitReset } from '../actions'
import { ClubNameForm } from '../ClubNameForm'
import { clubNamesPath } from '../paths'

// Render on each request: the list changes with every save.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Namen van een club' }

type Props = {
  params: Promise<{ club: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// The form of the names of one club: the name the site shows in the heading now, the lines of
// its own list in the main area, the save buttons in the toolbar and at the end of the form,
// and beside it the spellings Wikipedia has (read only) and the block that takes the list away.
// The page tells what the last action did from the word in the address.
export default async function ClubNamesOfClubPage({ params, searchParams }: Props) {
  await requireRole('owner', 'editor')

  const { club: slug } = await params
  const found = await findAdminClub(getDatabase().db, slug)

  if (found === undefined) {
    notFound()
  }

  const { club, own, spellings } = found
  const { gedaan } = await searchParams
  // The pages of the clubs keep what they read for as long as the current season does.
  const showDelay = describeShowDelay(seasonOf(new Date()))
  const notices: Record<string, { text: string; title: string }> = {
    'geen-lijst': { text: 'Deze club had geen eigen lijst om weg te halen.', title: 'Niets weggehaald' },
    opgeslagen: { text: `De lijst is bewaard. Staat ${showDelay} op de pagina van de club.`, title: 'Opgeslagen' },
    weggehaald: {
      text: `De lijst is weg. De pagina van de club zegt ${showDelay} niets meer over eerdere namen.`,
      title: 'Lijst weggehaald',
    },
  }
  const notice = typeof gedaan === 'string' ? notices[gedaan] : undefined
  const mismatch = headingNotice(club.name, own)

  return (
    <Page.Main areas={sideAreas} className={compact}>
      <Page.Cell area="head">
        <Text>
          <Link href={clubNamesPath} icon="arrow-left">
            Terug naar Clubnamen
          </Link>
        </Text>
        <Heading level={1}>{club.name}</Heading>
        <Text>
          {own.length > 0 ? <Tag tone="highlight">Eigen lijst</Tag> : <Tag>Geen lijst</Tag>}{' '}
          {own.length > 0
            ? 'De pagina van de club zegt "Eerder" uit deze lijst, en de lijsten met wedstrijden tonen de naam van het seizoen.'
            : 'De pagina van de club heeft geen regel "Eerder". Sla een lijst op om die te maken.'}
        </Text>
        <Text>
          De site toont nu de naam <Strong>{club.name}</Strong> in de kop. De import bepaalt die naam en het adres van
          de pagina; de lijst verandert ze niet.
        </Text>
        {mismatch === undefined ? null : <Notice>{mismatch}</Notice>}
      </Page.Cell>
      <Page.Toolbar>
        <SaveButtons
          buttons={[{ label: 'Opslaan', value: 'opslaan' }]}
          cancelHref={clubNamesPath}
          formId={nameFormId}
        />
      </Page.Toolbar>
      <Page.Cell area="main">
        {notice === undefined ? null : (
          <Notice>
            <Strong>{notice.title}.</Strong> {notice.text}
          </Notice>
        )}
        <ClubNameForm
          action={submitNames.bind(null, slug)}
          cancelHref={clubNamesPath}
          initial={own.length > 0 ? own.map(rowOf) : [{ ...emptyNameRow }]}
          key={`${club.id}-${gedaan ?? ''}`}
        />
      </Page.Cell>
      <Page.Section area="side" aria-label="Naast de lijst met namen">
        <Card aria-labelledby="schrijfwijzen-kop" surface="soft">
          <Heading id="schrijfwijzen-kop" level={2}>
            Schrijfwijzen van Wikipedia
          </Heading>
          {spellings.length === 0 ? (
            <Text>Wikipedia schrijft deze club altijd als {club.name}.</Text>
          ) : (
            <>
              <List role="list">
                {spellings.map((spelling) => (
                  <List.Item key={spelling}>{spelling}</List.Item>
                ))}
              </List>
              <Text appearance="meta">
                Dit zijn de andere schrijfwijzen die de import kent, niet per se naamswijzigingen. Elke naam die je hier
                opslaat, komt er ook bij.
              </Text>
            </>
          )}
        </Card>
        {own.length === 0 ? null : (
          <Disclosure summary="Lijst weghalen">
            <Text>
              Dit haalt de hele lijst weg, ook de toelichtingen. Daarna zegt de pagina van de club niets meer over
              eerdere namen, en toont hij de schrijfwijze van Wikipedia. De schrijfwijzen hierboven blijven staan.
            </Text>
            <Form action={submitReset.bind(null, slug)}>
              <Button appearance="danger" aria-label={`Lijst weghalen voor ${club.name}`} type="submit">
                Lijst weghalen
              </Button>
            </Form>
          </Disclosure>
        )}
      </Page.Section>
    </Page.Main>
  )
}
