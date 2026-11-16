import type { Metadata } from 'next'

import { findAdminStadium } from '@fansite/db/stadium-admin'
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

import { clubPath, stadiumsPath } from '#src/app/beheer/stadions/paths'
import { sideAreas } from '#src/beheer/areas'
import { compact } from '#src/beheer/density'
import { groundFormId, type GroundValues } from '#src/beheer/ground-fields'
import { requireRole } from '#src/beheer/require-role'
import { SaveButtons } from '#src/beheer/SaveButtons'
import { emptyRow } from '#src/beheer/stadium-fields'
import { rowOf } from '#src/beheer/stadium-form'
import { getDatabase } from '#src/database'

import { submitGround, submitGroundReset } from '../actions'
import { GroundForm } from '../GroundForm'

// Render on each request: the stadium changes with every save.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Stadion' }

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const notices: Record<string, { text: string; title: string }> = {
  gemaakt: { text: 'Het stadion is gemaakt. Kies bij een club dit stadion als thuisveld.', title: 'Gemaakt' },
  'niet-teruggezet': {
    text: 'Er was niets terug te zetten: dit stadion heeft geen nummer van Wikidata, of zijn plaats komt al van Wikidata.',
    title: 'Niets veranderd',
  },
  opgeslagen: { text: 'Het stadion is bewaard.', title: 'Opgeslagen' },
  teruggezet: {
    text: 'De plaats en de coördinaten zijn weg. De import vult ze bij zijn volgende run weer in met wat Wikidata zegt.',
    title: 'Terug naar Wikidata',
  },
  'teruggezet-zonder-import': {
    text: 'De plaats en de coördinaten zijn weg. Alleen clubs waarvan de redactie de thuisvelden zette spelen hier, en de import leest die niet. Vul ze met de hand in, of zet bij de club de thuisvelden terug.',
    title: 'Terug naar Wikidata',
  },
}

// The form of one stadium, or of a new one (`nieuw`): the place, the coordinates, the address
// and the names in the main area with the save buttons in the toolbar, and beside it where the
// data comes from and the clubs that play there. The page tells what the last action did from
// the word in the address.
export default async function StadiumPage({ params, searchParams }: Props) {
  await requireRole('owner', 'editor')

  const { id } = await params
  const isNew = id === 'nieuw'
  const found = isNew
    ? undefined
    : /^\d{1,10}$/u.test(id)
      ? await findAdminStadium(getDatabase().db, Number(id))
      : undefined

  if (!isNew && found === undefined) {
    notFound()
  }

  const { gedaan } = await searchParams
  const notice = typeof gedaan === 'string' ? notices[gedaan] : undefined
  const stadium = found?.stadium
  const initial: GroundValues = {
    breedtegraad: stadium?.latitude ?? '',
    lengtegraad: stadium?.longitude ?? '',
    plaats: stadium?.place ?? '',
    postcode: stadium?.postcode ?? '',
    rows: found === undefined || found.names.length === 0 ? [{ ...emptyRow }] : found.names.map(rowOf),
    straat: stadium?.street ?? '',
  }
  const name = found?.names.at(-1)?.name

  return (
    <Page.Main areas={sideAreas} className={compact}>
      <Page.Cell area="head">
        <Text>
          <Link href={stadiumsPath} icon="arrow-left">
            Terug naar Stadions
          </Link>
        </Text>
        <Heading level={1}>{isNew ? 'Nieuw stadion' : (name ?? 'Stadion')}</Heading>
        {stadium === undefined ? null : (
          <Text>
            {stadium.placeSource === 'manual' ? (
              <Tag tone="highlight">Plaats van de redactie</Tag>
            ) : stadium.placeSource === 'wikidata' ? (
              <Tag>Plaats van Wikidata</Tag>
            ) : (
              <Tag>Nog geen plaats</Tag>
            )}
          </Text>
        )}
      </Page.Cell>
      <Page.Toolbar>
        <SaveButtons
          buttons={[{ label: 'Opslaan', value: 'opslaan' }]}
          cancelHref={stadiumsPath}
          formId={groundFormId}
        />
      </Page.Toolbar>
      <Page.Cell area="main">
        {notice === undefined ? null : (
          <Notice>
            <Strong>{notice.title}.</Strong> {notice.text}
          </Notice>
        )}
        <GroundForm
          action={submitGround.bind(null, id)}
          cancelHref={stadiumsPath}
          initial={initial}
          key={`${id}-${gedaan ?? ''}`}
        />
      </Page.Cell>
      <Page.Section area="side" aria-label="Naast het stadion">
        <Card aria-labelledby="clubs-kop" surface="soft">
          <Heading id="clubs-kop" level={2}>
            Clubs die hier spelen
          </Heading>
          {found === undefined || found.clubs.length === 0 ? (
            <Text>Geen club heeft dit stadion als thuisveld.</Text>
          ) : (
            <List role="list">
              {found.clubs.map((club) => (
                <List.Item key={club.slug}>
                  <Link href={clubPath(club.slug)}>{club.name}</Link>
                </List.Item>
              ))}
            </List>
          )}
        </Card>
        {stadium === undefined || stadium.wikidataId === null || stadium.placeSource !== 'manual' ? null : (
          <Disclosure summary="Terug naar Wikidata">
            <Text>
              Dit haalt de plaats en de coördinaten van de redactie weg. De import vult ze weer in met wat Wikidata zegt
              ({stadium.wikidataId}). Het adres blijft.
            </Text>
            <Form action={submitGroundReset.bind(null, id)}>
              <Button
                appearance="danger"
                aria-label={`Terug naar Wikidata voor ${name ?? 'dit stadion'}`}
                type="submit"
              >
                Terug naar Wikidata
              </Button>
            </Form>
          </Disclosure>
        )}
      </Page.Section>
    </Page.Main>
  )
}
