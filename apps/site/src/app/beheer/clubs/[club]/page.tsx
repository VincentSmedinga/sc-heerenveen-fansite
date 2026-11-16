import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import {
  Button,
  Card,
  Disclosure,
  Field,
  Form,
  Heading,
  Input,
  Link,
  List,
  Notice,
  Page,
  Select,
  Strong,
  Tag,
  Text,
} from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { submitClubCountry } from '#src/app/beheer/clubs/kwaliteit/actions'
import { sideAreas } from '#src/beheer/areas'
import { listMergeChoices } from '#src/beheer/club-merge'
import { emptyNameRow, nameFormId } from '#src/beheer/club-name-fields'
import { rowOf } from '#src/beheer/club-name-form'
import { findAdminClub, headingNotice } from '#src/beheer/club-names'
import { countryChoices } from '#src/beheer/countries'
import { compact } from '#src/beheer/density'
import { requireRole } from '#src/beheer/require-role'
import { SaveButtons } from '#src/beheer/SaveButtons'
import { getDatabase } from '#src/database'
import { describeShowDelay } from '#src/matches'

import { submitNames, submitReset } from '../actions'
import { ClubCountryForm } from '../ClubCountryForm'
import { ClubNameForm } from '../ClubNameForm'
import { clubsPath, mergePagePath } from '../paths'

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
    samengevoegd: {
      text: 'De twee clubs zijn één club. De wedstrijden, namen en andere gegevens van de club die verdween staan nu hier, en zijn naam is een andere naam van deze club.',
      title: 'Samengevoegd',
    },
    weggehaald: {
      text: `De lijst is weg. De pagina van de club zegt ${showDelay} niets meer over eerdere namen.`,
      title: 'Lijst weggehaald',
    },
  }
  const notice = typeof gedaan === 'string' ? notices[gedaan] : undefined
  const mismatch = headingNotice(club.name, own)
  const others = await listMergeChoices(getDatabase().db, club.id)

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
        <SaveButtons buttons={[{ label: 'Opslaan', value: 'opslaan' }]} cancelHref={clubsPath} formId={nameFormId} />
      </Page.Toolbar>
      <Page.Cell area="main">
        {notice === undefined ? null : (
          <Notice>
            <Strong>{notice.title}.</Strong> {notice.text}
          </Notice>
        )}
        <ClubNameForm
          action={submitNames.bind(null, slug)}
          cancelHref={clubsPath}
          initial={own.length > 0 ? own.map(rowOf) : [{ ...emptyNameRow }]}
          key={`${club.id}-${gedaan ?? ''}`}
        />
      </Page.Cell>
      <Page.Section area="side" aria-label="Naast de lijst met namen">
        <ClubCountryForm
          action={submitClubCountry.bind(null, slug)}
          countries={countryChoices()}
          country={club.country}
          key={`${club.id}-${club.country ?? ''}`}
          name={club.name}
          source={
            club.countrySource === null ? null : club.countrySource === 'manual' ? 'van de redactie' : 'uit Wikidata'
          }
        />
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
        {others.length === 0 ? null : (
          <Disclosure summary="Samenvoegen met een andere club">
            <Text>
              Staat dezelfde club twee keer in de lijst, bijvoorbeeld onder een eerdere naam? Kies de andere club. Je
              leest eerst wat samenvoegen doet; er verandert niets voor je daar op de knop drukt.
            </Text>
            <Form action={mergePagePath} method="get">
              <Input name="club" type="hidden" value={String(club.id)} />
              <Field id="met" label="Dezelfde club als">
                <Select name="met">
                  {others.map((other) => (
                    <Select.Option key={other.id} value={String(other.id)}>
                      {other.label}
                    </Select.Option>
                  ))}
                </Select>
              </Field>
              <Button appearance="soft" type="submit">
                Bekijk wat samenvoegen doet
              </Button>
            </Form>
          </Disclosure>
        )}
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
