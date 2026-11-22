import type { Metadata } from 'next'

import {
  Button,
  Card,
  DataTable,
  Field,
  Form,
  Heading,
  Input,
  Notice,
  Page,
  Pagination,
  Tag,
  Text,
} from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound } from 'next/navigation'

import { adminAreas } from '#src/beheer/areas'
import { compact } from '#src/beheer/density'
import { requireRole } from '#src/beheer/require-role'
import { listSupporters } from '#src/beheer/supporter-management'
import { getDatabase } from '#src/database'
import { FocusOnLoad } from '#src/FocusOnLoad'

import { forgetAddress } from './adressen/actions'
import { listPath, supporterPath, supportersPath } from './paths'
import { ForgetAddressForm } from './SupporterForms'

// Render on each request: who is logged in and which accounts exist are not known when the site
// is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Fans' }

type SearchParams = Record<string, string | string[] | undefined>

const timeZone = 'Europe/Amsterdam'
const dateFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', timeZone, year: 'numeric' })
const dayFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', timeZone: 'UTC', year: 'numeric' })

const first = (value: string | string[] | undefined) => (typeof value === 'string' ? value : '')

// The accounts of supporters for the editors (issue 1458): the newest first, a search on a part
// of the screen name, and a page at a time. The list has no e-mail address, for any role. The
// owner also has the form to let a blocked address sign up again. The screen name is text,
// never HTML.
export default async function SupportersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { role } = await requireRole('owner', 'editor')

  requireFansPart('accounts', notFound)

  const { fout, pagina, zoek } = await searchParams
  const query = first(zoek).slice(0, 100)
  const result = await listSupporters(getDatabase().db, query, Number.parseInt(first(pagina), 10))

  return (
    <Page.Main areas={adminAreas} className={compact}>
      <Page.Cell area="head">
        <Heading level={1}>Fans</Heading>
        <Text appearance="intro">
          Zoek een fan op de schermnaam, pas een naam aan die niet kan, of blokkeer een account dat misbruik maakt. Fans
          melden zo&apos;n naam via Contact.
        </Text>
      </Page.Cell>
      <Page.Cell area="main">
        {fout === 'weg' ? (
          <>
            <Notice id="weg" tabIndex={-1}>
              Dit account bestaat niet meer. Er is niets veranderd.
            </Notice>
            <FocusOnLoad id="weg" />
          </>
        ) : null}
        <Form action={supportersPath} method="get">
          <Field
            hint="Een deel van de naam is genoeg. Hoofdletters en accenten tellen niet."
            id="zoek"
            label="Zoek op schermnaam"
            required={false}
          >
            <Input autoComplete="off" defaultValue={query} name="zoek" type="search" />
          </Field>
          <Button type="submit">Zoeken</Button>
        </Form>
        <Card aria-labelledby="supporters-kop">
          <Heading id="supporters-kop" level={2}>
            {query === '' ? 'Nieuwste accounts' : 'Gevonden accounts'}
          </Heading>
          <Text appearance="meta">
            {result.total} {result.total === 1 ? 'account' : 'accounts'}.
          </Text>
          {result.rows.length === 0 ? (
            <Text>{query === '' ? 'Er zijn nog geen accounts.' : 'Geen enkele schermnaam bevat dit.'}</Text>
          ) : (
            <DataTable
              appearance="text"
              caption="Accounts van fans, de nieuwste eerst"
              columns={[
                'Schermnaam',
                { fold: true, name: 'Aangemaakt' },
                { fold: true, name: 'Laatste bezoek' },
                { fold: true, name: 'Status' },
              ]}
              rows={result.rows.map((row) => ({
                cells: [
                  `Aangemaakt op ${dateFormat.format(row.createdAt)}`,
                  row.lastVisitOn === null
                    ? 'Nog niet bezocht'
                    : `Laatste bezoek ${dayFormat.format(new Date(row.lastVisitOn))}`,
                  row.blocked ? <Tag tone="highlight">Geblokkeerd</Tag> : 'Actief',
                ],
                header: row.screenName,
                href: supporterPath(row.id),
              }))}
              // The list is in pages and the server puts the newest first: sorting would only
              // reorder the 25 rows of one page.
              sortable={false}
            />
          )}
          {result.pages > 1 ? (
            <Pagination
              current={result.page}
              label="Pagina's van de accounts"
              nextHref={result.page < result.pages ? listPath(query, result.page + 1) : undefined}
              previousHref={result.page > 1 ? listPath(query, result.page - 1) : undefined}
              total={result.pages}
            />
          ) : null}
        </Card>
        {role === 'owner' ? (
          <Card aria-labelledby="adres-kop" surface="soft">
            <Heading id="adres-kop" level={2}>
              Een geblokkeerd adres weer toelaten
            </Heading>
            <Text>
              Als een geblokkeerd account verdwijnt, bewaart de site 12 maanden de hash van het adres, zodat het niet
              opnieuw kan aanmelden. Hier haal je die eerder weg.
            </Text>
            <ForgetAddressForm action={forgetAddress} />
          </Card>
        ) : null}
      </Page.Cell>
    </Page.Main>
  )
}
