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
  Select,
  Tag,
  Text,
} from '@fansite/design-system'

import { toolbarAreas } from '#src/beheer/areas'
import { clubCountryListPath, countClubsWithoutCountry } from '#src/beheer/club-country'
import { listMergeChoices } from '#src/beheer/club-merge'
import { listAdminClubs, type NamesShow, searchClubs } from '#src/beheer/club-names'
import { compact } from '#src/beheer/density'
import { parseSearch, searchMaxLength } from '#src/beheer/items'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

import { clubPath, clubsPath, listPath, mergePagePath } from './paths'

// Render on each request: who is logged in and which clubs have a list are not known when the
// site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Clubs' }

type SearchParams = Record<string, string | string[] | undefined>

const shows: readonly NamesShow[] = ['alles', 'eigen-lijst']

const notices: Record<string, string> = {
  weg: 'Deze club bestaat niet. Er is niets veranderd. Kies hieronder een club.',
}

// The clubs we have matches against, to give the names of a club a list of its own. The
// search is a form with method GET, so the page works without JavaScript. A club with a list of
// its own says so in words, never in colour alone.
export default async function ClubNamesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole('owner', 'editor')

  const { fout, q: rawSearch, tonen } = await searchParams
  const search = parseSearch(rawSearch)
  const show = shows.find((choice) => choice === tonen) ?? 'alles'
  const found = searchClubs(await listAdminClubs(getDatabase().db), search)
  const own = found.filter((club) => club.own)
  const shown = show === 'eigen-lijst' ? own : found
  const address = (choice: NamesShow) => listPath(choice === 'alles' ? undefined : choice, search)
  const withoutCountry = await countClubsWithoutCountry(getDatabase().db)
  const choices = await listMergeChoices(getDatabase().db, 0)
  const notice = typeof fout === 'string' ? notices[fout] : undefined

  return (
    <Page.Main areas={toolbarAreas} className={compact}>
      <Page.Cell area="head">
        <Heading level={1}>Clubs</Heading>
        <Text appearance="intro">
          De pagina van een club zegt "Eerder" met de namen die de club droeg, als je hier de lijst invult. Een club
          zonder lijst heeft die regel niet.
        </Text>
        <Text>
          <Link href={clubCountryListPath}>Clubs zonder land ({withoutCountry.total})</Link>
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
              caption="Clubs met hun lijst van namen"
              columns={['Club', 'Lijst']}
              rows={shown.map((club) => ({
                cells: [
                  {
                    content: club.own ? <Tag tone="highlight">Eigen lijst</Tag> : 'Geen lijst',
                    sortValue: club.own ? 'Eigen lijst' : 'Geen lijst',
                  },
                ],
                header: club.name,
                href: clubPath(club.slug),
              }))}
            />
          )}
        </Card>
        <Card aria-labelledby="samenvoegen-kop">
          <Heading id="samenvoegen-kop" level={2}>
            Twee clubs samenvoegen
          </Heading>
          <Text>
            Staat dezelfde club twee keer in de lijst? Kies de twee. Je leest eerst wat samenvoegen doet; er verandert
            niets voor je daar op de knop drukt.
          </Text>
          <Form action={mergePagePath} method="get">
            <Field id="club" label="Eerste club">
              <Select name="club">
                {choices.map((choice) => (
                  <Select.Option key={choice.id} value={String(choice.id)}>
                    {choice.label}
                  </Select.Option>
                ))}
              </Select>
            </Field>
            <Field id="met" label="Dezelfde club als">
              <Select name="met">
                {choices.map((choice) => (
                  <Select.Option key={choice.id} value={String(choice.id)}>
                    {choice.label}
                  </Select.Option>
                ))}
              </Select>
            </Field>
            <Button appearance="soft" type="submit">
              Bekijk wat samenvoegen doet
            </Button>
          </Form>
        </Card>
      </Page.Cell>
    </Page.Main>
  )
}
