import type { Database } from '@fansite/db/client'
import type { ItemRelevance } from '@fansite/db/schema'
import type { Metadata } from 'next'

import { adminRoles, hiddenReasonMaxLength } from '@fansite/db/schema'
import {
  Button,
  Card,
  CheckboxGroup,
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

import { compact } from '#src/beheer/density'
import {
  findItem,
  type ItemGroup,
  listItems,
  listLength,
  notOnSiteValue,
  parseEditorsOnly,
  parseGroup,
  parseItemId,
  parseSearch,
  searchMaxLength,
} from '#src/beheer/items'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'
import { dateTimeOf, formatNewsTime } from '#src/news'
import { SwitchLinks } from '#src/SwitchLinks'

import { submitApprove, submitHide, submitShow, submitUnapprove } from './actions'
import { itemsPath, type ListView } from './paths'

// Render on each request: who is logged in and which items are hidden are not known when the
// site is built.
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

/**
 * The words that say which group the list shows, after "berichten" (or "bericht" for one):
 * "op de site", or the items that are not, of which the box keeps the ones editors hid.
 */
function groupWords({ editorsOnly, group }: Pick<ListView, 'editorsOnly' | 'group'>, plural: boolean) {
  if (group === 'on-site') {
    return 'op de site'
  }

  if (editorsOnly) {
    return plural ? 'die door de redactie zijn verborgen' : 'dat door de redactie is verborgen'
  }

  return plural ? 'die niet op de site staan' : 'dat niet op de site staat'
}

/** The line above the list: what it holds, and which group and search it is of. */
function listSummary(view: ListView, count: number) {
  const { search } = view
  const quoted = search === '' ? '' : ` met “${search}”`

  if (count === 0) {
    return search === ''
      ? `Er zijn geen berichten ${groupWords(view, true)}.`
      : `Geen berichten gevonden${quoted} ${groupWords(view, true)}.`
  }

  const number = count === listLength ? `De nieuwste ${listLength}` : count

  return `${number} ${count === 1 ? 'bericht' : 'berichten'} ${groupWords(view, count !== 1)}${quoted}.`
}

/** The notice after an action: its heading and what happens to the item on the site. */
const noticeTexts = {
  approved: {
    heading: 'Op de site gezet',
    text: 'Staat binnen vijf minuten op de site, tenzij het bericht verborgen is.',
  },
  hidden: { heading: 'Verborgen', text: 'Staat binnen vijf minuten niet meer op de site.' },
  shown: { heading: 'Weer getoond', text: 'Staat binnen vijf minuten weer op de site.' },
  unapproved: {
    heading: 'Terug naar het oordeel van het filter',
    text: 'Staat binnen vijf minuten niet meer op de site, tenzij het filter het bericht goed vindt.',
  },
} as const

type NoticeKind = keyof typeof noticeTexts

/**
 * What the list says of an item the importer did not find about the club. A `relevant` item
 * has nothing to say. These are not on the site, whatever the moderator does.
 */
const relevanceDetails = {
  doubtful: ['twijfelgeval, niet op de site'],
  irrelevant: ['niet over de club, niet op de site'],
  relevant: [],
} as const satisfies Record<ItemRelevance, readonly string[]>

// The list of the items that a moderator hides and shows. The search is a form with method GET,
// and each action a form that posts, so the page works without JavaScript. An action ends on
// this page again: an error is in the address, and the notice that it worked is written from
// what the database says now, so a made-up address can't claim an action that never happened.
export default async function ItemsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole(...adminRoles)

  const { bericht, fout, getoond, opgenomen, q: rawSearch, redactie, teruggezet, toon, verborgen } = await searchParams
  const search = parseSearch(rawSearch)
  const group: ItemGroup = parseGroup(toon)
  const editorsOnly = parseEditorsOnly(redactie, group)
  const view: ListView = { editorsOnly, group, search }
  const { db } = getDatabase()
  const now = new Date()
  const found = await listItems(db, search, { editorsOnly, group, now })

  const failedId = parseItemId(bericht)
  const fieldError = isFieldError(fout) ? fieldErrors[fout] : undefined
  const failedItem = found.find((item) => item.id === failedId && item.hiddenAt === null)
  // An error about a field that the list doesn't show, such as one the new items pushed out, is
  // still told, without a link.
  const loneError = fieldError !== undefined && failedItem === undefined ? fieldError : undefined
  const gone = fout === 'weg'

  const done =
    (await noticeFor(db, verborgen, 'hidden')) ??
    (await noticeFor(db, getoond, 'shown')) ??
    (await noticeFor(db, opgenomen, 'approved')) ??
    (await noticeFor(db, teruggezet, 'unapproved'))

  return (
    <Page.Main
      className={compact}
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
          <SwitchLinks
            label="Welke berichten"
            options={[
              {
                href: itemsPath({ ...view, editorsOnly: false, group: 'on-site' }),
                label: 'Op de site',
                value: 'on-site',
              },
              {
                href: itemsPath({ ...view, group: 'not-on-site' }),
                label: 'Niet op de site',
                value: 'not-on-site',
              },
            ]}
            size="small"
            value={group}
          />
          <Form action="/beheer/berichten" method="get">
            <Field hint="Een deel van de kop of van de link." id="zoek" label="Zoeken" required={false}>
              <Input defaultValue={search} maxLength={searchMaxLength} name="q" type="search" />
            </Field>
            {group === 'not-on-site' ? (
              <CheckboxGroup
                className="hf-space-end-s"
                legend="Filter"
                name="redactie"
                options={[{ label: 'Alleen door de redactie verborgen', value: '1' }]}
                value={editorsOnly ? ['1'] : []}
              />
            ) : null}
            {/* The button sends the group: the design system has no hidden field. */}
            <Button
              name={group === 'not-on-site' ? 'toon' : undefined}
              type="submit"
              value={group === 'not-on-site' ? notOnSiteValue : undefined}
            >
              Zoeken
            </Button>
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
            {noticeTexts[done.kind].heading}
          </Heading>
          <Text>
            {done.title}. {noticeTexts[done.kind].text}
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
          {listSummary(view, found.length)}
          {search === '' ? null : (
            <>
              {' '}
              <Link href={itemsPath({ ...view, search: '' })}>Toon alle berichten</Link>
            </>
          )}
        </Text>
        {found.length === 0 ? null : (
          <List role="list">
            {found.map((item) => {
              const hidden = item.hiddenAt !== null
              // An item the import leaves off the site is not on it, so hiding it does nothing.
              const approved = item.approvedAt !== null
              const canHide = !hidden && (item.relevance === 'relevant' || approved)
              const canApprove = !hidden && !approved && item.relevance !== 'relevant'
              const error = item.id === failedItem?.id ? fieldError : undefined

              return (
                <List.Item key={item.id}>
                  <NewsItem
                    dateTime={dateTimeOf(item.publishedAt)}
                    details={[
                      ...(hidden ? ['verborgen'] : []),
                      ...(approved ? ['door een moderator op de site gezet'] : relevanceDetails[item.relevance]),
                      ...(!hidden && (item.relevance === 'relevant' || approved) && item.publishedAt > now
                        ? ['nog niet gepubliceerd, niet op de site']
                        : []),
                    ]}
                    headline={item.title}
                    href={item.url}
                    paywalled={item.paywalled}
                    source={item.sourceName}
                    time={formatNewsTime(item.publishedAt, now)}
                  />
                  {canHide ? (
                    <Form action={submitHide.bind(null, item.id, view)}>
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
                  ) : null}
                  {canApprove ? (
                    <Form action={submitApprove.bind(null, item.id, view)}>
                      <Button aria-label={`Op de site zetten: ${item.title}`} type="submit">
                        Op de site zetten
                      </Button>
                    </Form>
                  ) : null}
                  {item.approvedAt === null ? null : (
                    <>
                      <Text>
                        Door een moderator op de site gezet op {formatNewsTime(item.approvedAt, now)} door{' '}
                        {item.approvedByEmail ?? 'een verwijderd account'}.
                      </Text>
                      <Form action={submitUnapprove.bind(null, item.id, view)}>
                        <Button
                          appearance="soft"
                          aria-label={`Terug naar het oordeel van het filter: ${item.title}`}
                          type="submit"
                        >
                          Terug naar het oordeel van het filter
                        </Button>
                      </Form>
                    </>
                  )}
                  {item.hiddenAt === null ? null : (
                    <>
                      <Text>
                        Verborgen op {formatNewsTime(item.hiddenAt, now)} door{' '}
                        {item.hiddenByEmail ?? 'een verwijderd account'}. Reden: {item.hiddenReason}
                      </Text>
                      <Form action={submitShow.bind(null, item.id, view)}>
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
 * The notice for an item, when the item is in the state the notice says: hidden, shown,
 * approved or taken back to the filter's judgement. Undefined for no number, for a number that
 * is no item, and for an item that is not in that state, so the page tells only what is true.
 * An item that is shown again or no longer approved can be hidden or approved by something
 * else, so those two only check the part they change.
 */
async function noticeFor(db: Database, value: string | string[] | undefined, kind: NoticeKind) {
  const id = parseItemId(value)
  const item = id === undefined ? undefined : await findItem(db, id)

  if (item === undefined) {
    return undefined
  }

  const inState = {
    approved: item.approvedAt !== null,
    hidden: item.hiddenAt !== null,
    shown: item.hiddenAt === null,
    unapproved: item.approvedAt === null,
  }[kind]

  return inState ? { kind, title: item.title } : undefined
}
