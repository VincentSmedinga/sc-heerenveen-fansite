import type { Metadata } from 'next'

import {
  Button,
  Card,
  DataTable,
  Field,
  Filter,
  Form,
  Heading,
  Input,
  Link,
  Notice,
  Page,
  Tag,
  Text,
} from '@fansite/design-system'

import { toolbarAreas } from '#src/beheer/areas'
import { compact } from '#src/beheer/density'
import { parseSearch, searchMaxLength } from '#src/beheer/items'
import { requireRole } from '#src/beheer/require-role'
import { listAdminClubs, searchClubs, type StadiumShow } from '#src/beheer/stadiums'
import { getDatabase } from '#src/database'

import { clubPath, clubsPath, listPath, stadiumsPath } from '../paths'

// Render on each request: who is logged in and which clubs have home grounds are not known when
// the site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Clubs en hun stadions' }

type SearchParams = Record<string, string | string[] | undefined>

const shows: readonly StadiumShow[] = ['alles', 'thuisvelden']

const notices: Record<string, string> = {
  weg: 'Deze club bestaat niet. Er is niets veranderd. Kies hieronder een club.',
}

// The clubs we have matches against, to set the home grounds of a club. The search is a form
// with method GET, so the page works without JavaScript. A club with home grounds says so in
// words, never in colour alone.
export default async function StadiumsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole('owner', 'editor')

  const { fout, q: rawSearch, tonen } = await searchParams
  const search = parseSearch(rawSearch)
  const show = shows.find((choice) => choice === tonen) ?? 'alles'
  const found = searchClubs(await listAdminClubs(getDatabase().db), search)
  const withGrounds = found.filter((club) => club.grounds)
  const shown = show === 'thuisvelden' ? withGrounds : found
  const address = (choice: StadiumShow) => listPath(choice === 'alles' ? undefined : choice, search)
  const notice = typeof fout === 'string' ? notices[fout] : undefined

  return (
    <Page.Main areas={toolbarAreas} className={compact}>
      <Page.Cell area="head">
        <Text>
          <Link href={stadiumsPath} icon="arrow-left">
            Terug naar Stadions
          </Link>
        </Text>
        <Heading level={1}>Clubs en hun stadions</Heading>
        <Text appearance="intro">
          Bij een club zet je zijn thuisvelden en zijn Wikidata-nummer. De kaart op de pagina van een club toont zijn
          velden met hun namen. Een club zonder thuisvelden toont wat de wedstrijden zeggen over zijn stadion.
        </Text>
      </Page.Cell>
      <Page.Toolbar>
        <Form action={clubsPath} method="get">
          <Field hint="Een deel van de naam van de club." id="zoek" label="Zoeken" required={false}>
            <Input autoCorrect="off" defaultValue={search} maxLength={searchMaxLength} name="q" type="search" />
          </Field>
          {/* The button sends the filter: the design system has no hidden field. */}
          <Button
            name={show === 'alles' ? undefined : 'tonen'}
            type="submit"
            value={show === 'alles' ? undefined : show}
          >
            Zoeken
          </Button>
        </Form>
      </Page.Toolbar>
      <Page.Cell area="main">
        {notice === undefined ? null : <Notice>{notice}</Notice>}
        <Card aria-labelledby="clubs-kop">
          <Heading className="hf-visually-hidden" id="clubs-kop" level={2}>
            Clubs
          </Heading>
          <Filter
            items={[
              { current: show === 'alles', href: address('alles'), label: `Alles (${found.length})` },
              {
                current: show === 'thuisvelden',
                href: address('thuisvelden'),
                label: `Thuisvelden (${withGrounds.length})`,
              },
            ]}
            label="Clubs filteren"
          />
          {shown.length === 0 ? (
            <Text>
              {search === ''
                ? 'Nog geen club heeft thuisvelden.'
                : `Geen club gevonden met “${search}”${show === 'thuisvelden' ? ' en thuisvelden' : ''}.`}
            </Text>
          ) : (
            <DataTable
              appearance="text"
              caption="Clubs met hun thuisvelden"
              columns={['Club', 'Thuisvelden']}
              rows={shown.map((club) => ({
                cells: [
                  {
                    content: club.grounds ? <Tag tone="highlight">Thuisvelden</Tag> : 'Wikipedia',
                    sortValue: club.grounds ? 'Thuisvelden' : 'Wikipedia',
                  },
                ],
                header: club.name,
                href: clubPath(club.slug),
              }))}
            />
          )}
        </Card>
      </Page.Cell>
    </Page.Main>
  )
}
