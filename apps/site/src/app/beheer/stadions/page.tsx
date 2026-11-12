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

import { clubPath, listPath, stadiumsPath } from './paths'

// Render on each request: who is logged in and which clubs have a list are not known when the
// site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Stadions' }

type SearchParams = Record<string, string | string[] | undefined>

const shows: readonly StadiumShow[] = ['alles', 'eigen-lijst']

const notices: Record<string, string> = {
  weg: 'Deze club bestaat niet. Er is niets veranderd. Kies hieronder een club.',
}

// The clubs we have matches against, to give the stadium of a club a list of its own. The
// search is a form with method GET, so the page works without JavaScript. A club with a list of
// its own says so in words, never in colour alone.
export default async function StadiumsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole('owner', 'editor')

  const { fout, q: rawSearch, tonen } = await searchParams
  const search = parseSearch(rawSearch)
  const show = shows.find((choice) => choice === tonen) ?? 'alles'
  const found = searchClubs(await listAdminClubs(getDatabase().db), search)
  const own = found.filter((club) => club.own)
  const shown = show === 'eigen-lijst' ? own : found
  const address = (choice: StadiumShow) => listPath(choice === 'alles' ? undefined : choice, search)
  const notice = typeof fout === 'string' ? notices[fout] : undefined

  return (
    <Page.Main areas={toolbarAreas} className={compact}>
      <Page.Cell area="head">
        <Heading level={1}>Stadions</Heading>
        <Text appearance="intro">
          De kaart op de pagina van een club toont wat de wedstrijden zeggen over zijn stadion. Geef een club hier een
          eigen lijst, met een toelichting, als dat niet genoeg is.
        </Text>
      </Page.Cell>
      <Page.Toolbar>
        <Form action={stadiumsPath} method="get">
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
              { current: show === 'eigen-lijst', href: address('eigen-lijst'), label: `Eigen lijst (${own.length})` },
            ]}
            label="Clubs filteren"
          />
          {shown.length === 0 ? (
            <Text>
              {search === ''
                ? 'Nog geen club heeft een eigen lijst.'
                : `Geen club gevonden met “${search}”${show === 'eigen-lijst' ? ' en een eigen lijst' : ''}.`}
            </Text>
          ) : (
            <DataTable
              appearance="text"
              caption="Clubs met hun lijst van stadions"
              columns={['Club', 'Lijst']}
              rows={shown.map((club) => ({
                cells: [club.own ? <Tag tone="highlight">Eigen lijst</Tag> : 'Wikipedia'],
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
