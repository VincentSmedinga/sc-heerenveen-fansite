import type { Database } from '@fansite/db/client'
import type { Metadata } from 'next'

import { adminRoles, hiddenReasonMaxLength } from '@fansite/db/schema'
import {
  Button,
  Card,
  ErrorSummary,
  Field,
  Form,
  Heading,
  Input,
  Link,
  List,
  NewsItem,
  Page,
  Text,
} from '@fansite/design-system'

import { findItem, listItems, listLength, parseItemId, parseSearch, searchMaxLength } from '../../../beheer/items'
import { requireRole } from '../../../beheer/require-role'
import { getDatabase } from '../../../database'
import { dateTimeOf, formatNewsTime } from '../../../news'
import { submitHide, submitShow } from './actions'

// Render on each request: who is logged in and which items are hidden are not known when the site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Berichten' }

type SearchParams = Record<string, string | string[] | undefined>

/** What the address says went wrong with the last action. Anything else is no error. */
const fieldErrors = {
  'reden-lang': `Schrijf een kortere reden, van hoogstens ${hiddenReasonMaxLength} tekens.`,
  'reden-leeg': 'Schrijf een reden, bijvoorbeeld “Fout in het bericht”.',
} as const

const isFieldError = (value: string | string[] | undefined): value is keyof typeof fieldErrors =>
  typeof value === 'string' && Object.hasOwn(fieldErrors, value)

const summaryId = 'fouten'

// The list of the items that a moderator hides and shows. The search is a form with method GET, and each action a form that
// posts, so the page works without JavaScript. An action ends on this page again: an error is in the address, and the
// notice that it worked is written from what the database says now, so a made-up address can't claim an action that never happened.
export default async function ItemsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole(...adminRoles)

  const { bericht, fout, getoond, q: rawSearch, verborgen } = await searchParams
  const search = parseSearch(rawSearch)
  const { db } = getDatabase()
  const found = await listItems(db, search)
  const now = new Date()

  const failedId = parseItemId(bericht)
  const fieldError = isFieldError(fout) ? fieldErrors[fout] : undefined
  const failedItem = found.find((item) => item.id === failedId && item.hiddenAt === null)
  // An error about a field that the list doesn't show, such as one the new items pushed out, is still told, without a link.
  const loneError = fieldError !== undefined && failedItem === undefined ? fieldError : undefined
  const gone = fout === 'weg'

  const done = (await noticeFor(db, verborgen, true)) ?? (await noticeFor(db, getoond, false))

  return (
    <Page.Main
      intro={
        <>
          <Heading level={1}>Berichten</Heading>
          <Text appearance="intro">
            Verberg een bericht dat niet op de site hoort, met een reden. Een verborgen bericht staat binnen vijf
            minuten niet meer op de site, en de import zet het niet terug.
          </Text>
          <Text>
            Schrijf bij de reden kort wat er mis is, in hoogstens {hiddenReasonMaxLength} tekens. Bijvoorbeeld “Fout in
            het bericht”, “Past niet bij de site” of “Op verzoek van de bron”.
          </Text>
          <Form action="/beheer/berichten" method="get">
            <Field hint="Een deel van de kop of van de link." id="zoek" label="Zoeken" required={false}>
              <Input defaultValue={search} maxLength={searchMaxLength} name="q" type="search" />
            </Field>
            <Button type="submit">Zoeken</Button>
          </Form>
        </>
      }
    >
      <ErrorSummary
        errors={
          fieldError !== undefined && failedItem !== undefined
            ? [{ id: `reden-${failedItem.id}`, message: fieldError }]
            : []
        }
        id={summaryId}
        level={2}
      />
      {done === undefined ? null : (
        <Card aria-labelledby="gedaan-kop" surface="soft">
          <Heading id="gedaan-kop" level={2}>
            {done.hidden ? 'Verborgen' : 'Weer getoond'}
          </Heading>
          <Text>
            {done.title}.{' '}
            {done.hidden
              ? 'Staat binnen vijf minuten niet meer op de site.'
              : 'Staat binnen vijf minuten weer op de site.'}
          </Text>
        </Card>
      )}
      {loneError === undefined ? null : (
        <Card aria-labelledby="fout-kop" surface="soft">
          <Heading id="fout-kop" level={2}>
            Het verbergen is niet gelukt
          </Heading>
          <Text>{loneError}</Text>
        </Card>
      )}
      {gone ? (
        <Card aria-labelledby="weg-kop" surface="soft">
          <Heading id="weg-kop" level={2}>
            Dit bericht bestaat niet meer
          </Heading>
          <Text>Er is niets veranderd. Zoek het bericht hieronder opnieuw.</Text>
        </Card>
      ) : null}
      <Card as="div">
        <Text appearance="meta">
          {found.length === 0
            ? search === ''
              ? 'Er zijn nog geen berichten.'
              : `Geen berichten gevonden met “${search}”.`
            : `${found.length === listLength ? `De nieuwste ${listLength}` : found.length} ${found.length === 1 ? 'bericht' : 'berichten'}${search === '' ? '' : ` met “${search}”`}.`}
          {search === '' ? null : (
            <>
              {' '}
              <Link href="/beheer/berichten">Toon alle berichten</Link>
            </>
          )}
        </Text>
        {found.length === 0 ? null : (
          <List role="list">
            {found.map((item) => {
              const hidden = item.hiddenAt !== null
              const error = item.id === failedItem?.id ? fieldError : undefined

              return (
                <List.Item key={item.id}>
                  <NewsItem
                    dateTime={dateTimeOf(item.publishedAt)}
                    details={hidden ? ['verborgen'] : []}
                    headline={item.title}
                    href={item.url}
                    paywalled={item.paywalled}
                    source={item.sourceName}
                    time={formatNewsTime(item.publishedAt, now)}
                  />
                  {item.hiddenAt === null ? (
                    <Form action={submitHide.bind(null, item.id, search)}>
                      <Field
                        error={error}
                        id={`reden-${item.id}`}
                        label={
                          <>
                            Reden{' '}
                            <Text as="span" className="hf-visually-hidden">
                              om “{item.title}” te verbergen
                            </Text>
                          </>
                        }
                      >
                        <Input autoComplete="off" maxLength={hiddenReasonMaxLength} name="reden" />
                      </Field>
                      <Button aria-label={`Verberg: ${item.title}`} type="submit">
                        Verberg
                      </Button>
                    </Form>
                  ) : (
                    <>
                      <Text>
                        Verborgen op {formatNewsTime(item.hiddenAt, now)}. Reden: {item.hiddenReason}
                      </Text>
                      <Form action={submitShow.bind(null, item.id, search)}>
                        <Button appearance="soft" aria-label={`Toon weer: ${item.title}`} type="submit">
                          Toon weer
                        </Button>
                      </Form>
                    </>
                  )}
                </List.Item>
              )
            })}
          </List>
        )}
      </Card>
      <Text>
        <Link href="/beheer">Terug naar het beheer</Link>
      </Text>
    </Page.Main>
  )
}

/**
 * The notice for an item, when the item is in the state the notice says: hidden for `verborgen`, shown for `getoond`.
 * Undefined for no number, for a number that is no item, and for an item that is not in that state, so the page tells
 * only what is true.
 */
async function noticeFor(db: Database, value: string | string[] | undefined, hidden: boolean) {
  const id = parseItemId(value)
  const item = id === undefined ? undefined : await findItem(db, id)

  return item === undefined || (item.hiddenAt !== null) !== hidden ? undefined : { hidden, title: item.title }
}
