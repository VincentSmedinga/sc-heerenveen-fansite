import type { Database } from '@fansite/db/client'
import type { ItemRelevance } from '@fansite/db/schema'
import type { Metadata } from 'next'

import { editorRoles } from '@fansite/db/schema'
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
  Pagination,
  Text,
} from '@fansite/design-system'

import { toolbarAreas } from '#src/beheer/areas'
import { compact } from '#src/beheer/density'
import { type HideReasonError, hideReasonErrors, otherReasonKey } from '#src/beheer/hide-reasons'
import {
  countItems,
  findItem,
  type ItemGroup,
  listItems,
  listLength,
  notOnSiteValue,
  parseEditorsOnly,
  parseGroup,
  parseItemId,
  parsePage,
  parseSearch,
  searchMaxLength,
} from '#src/beheer/items'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'
import { dateTimeOf, formatNewsTime } from '#src/news'
import { SwitchLinks } from '#src/SwitchLinks'

import { submitApprove, submitHide, submitShow, submitUnapprove } from './actions'
import { HideForm } from './HideForm'
import { itemsPath, type ListView } from './paths'

// Render on each request: who is logged in and which items are hidden are not known when the
// site is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Berichten' }

type SearchParams = Record<string, string | string[] | undefined>

/**
 * What the address says went wrong with the last action: `reden-kies`, `reden-anders` or
 * `reden-lang`: a `HideReasonError` with `reden-` before it. Anything else is no error.
 */
const fieldErrors = {
  'reden-anders': hideReasonErrors.anders,
  'reden-kies': hideReasonErrors.kies,
  'reden-lang': hideReasonErrors.lang,
} as const satisfies Record<`reden-${HideReasonError}`, string>

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

/**
 * The line above the list: how many items it holds in all, which group and search it is of,
 * and, when there is more than a page, the page.
 */
function listSummary(view: ListView, total: number, pages: number) {
  const { page, search } = view
  const quoted = search === '' ? '' : ` met “${search}”`

  if (total === 0) {
    return search === ''
      ? `Er zijn geen berichten ${groupWords(view, true)}.`
      : `Geen berichten gevonden${quoted} ${groupWords(view, true)}.`
  }

  const which = pages > 1 ? ` Je ziet pagina ${page} van ${pages}.` : ''

  return `${total} ${total === 1 ? 'bericht' : 'berichten'} ${groupWords(view, total !== 1)}${quoted}.${which}`
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
 * has nothing to say. These are not on the site, whatever the editor does.
 */
const relevanceDetails = {
  doubtful: ['twijfelgeval, niet op de site'],
  irrelevant: ['niet over de club, niet op de site'],
  relevant: [],
} as const satisfies Record<ItemRelevance, readonly string[]>

// The list of the items that an editor hides and shows. The search is a form with method GET,
// and each action a form that posts, so the page works without JavaScript. An action ends on
// this page again: an error is in the address, and the notice that it worked is written from
// what the database says now, so a made-up address can't claim an action that never happened.
export default async function ItemsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole(...editorRoles)

  const {
    bericht,
    fout,
    getoond,
    keuze,
    opgenomen,
    pagina,
    q: rawSearch,
    redactie,
    teruggezet,
    toon,
    verborgen,
  } = await searchParams
  const search = parseSearch(rawSearch)
  const group: ItemGroup = parseGroup(toon)
  const editorsOnly = parseEditorsOnly(redactie, group)
  const { db } = getDatabase()
  const now = new Date()
  // A page beyond the last shows the last one.
  const total = await countItems(db, search, { editorsOnly, group, now })
  const pages = Math.max(1, Math.ceil(total / listLength))
  const page = Math.min(parsePage(pagina), pages)
  const view: ListView = { editorsOnly, group, page, search }
  const found = await listItems(db, search, { editorsOnly, group, now, offset: (page - 1) * listLength })

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
    <Page.Main areas={toolbarAreas} className={compact}>
      <Page.Cell area="head">
        <Heading level={1}>Berichten</Heading>
        <Text appearance="intro">
          Verberg een bericht dat niet op de site hoort, met een reden. Een verborgen bericht staat binnen vijf minuten
          niet meer op de site, en de import zet het niet terug.
        </Text>
        <Text>
          Kies bij het verbergen de reden uit de lijst. Past geen enkele reden, kies dan Anders en schrijf kort wat er
          mis is.
        </Text>
      </Page.Cell>
      <Page.Toolbar>
        <SwitchLinks
          label="Welke berichten"
          options={[
            {
              href: itemsPath({ ...view, editorsOnly: false, group: 'on-site', page: 1 }),
              label: 'Op de site',
              value: 'on-site',
            },
            {
              href: itemsPath({ ...view, group: 'not-on-site', page: 1 }),
              label: 'Niet op de site',
              value: 'not-on-site',
            },
          ]}
          size="small"
          value={group}
        />
        <Form action="/beheer/berichten" inline method="get">
          <Field hint="Een deel van de kop of van de link." id="zoek" label="Zoeken" required={false}>
            <Input autoCorrect="off" defaultValue={search} maxLength={searchMaxLength} name="q" type="search" />
          </Field>
          {group === 'not-on-site' ? (
            <CheckboxGroup
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
      </Page.Toolbar>
      <Page.Cell area="main">
        <ErrorSummary
          errors={
            fieldError !== undefined && failedItem !== undefined
              ? [{ id: failedFieldId(failedItem.id, fout), message: fieldError }]
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
            {listSummary(view, total, pages)}
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
                // An item the import leaves off the site is not on it, so hiding it does
                // nothing.
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
                        ...(approved ? ['door de redactie op de site gezet'] : relevanceDetails[item.relevance]),
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
                      <HideForm
                        action={submitHide.bind(null, item.id, view)}
                        chosen={error === undefined || keuze !== otherReasonKey ? undefined : otherReasonKey}
                        errors={{
                          choice: fout === 'reden-kies' ? error : undefined,
                          note: fout === 'reden-kies' ? undefined : error,
                        }}
                        itemId={item.id}
                        title={item.title}
                      />
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
                          Door de redactie op de site gezet op {formatNewsTime(item.approvedAt, now)} door{' '}
                          {item.approvedByName ?? 'een verwijderd account'}.
                        </Text>
                        <Form action={submitUnapprove.bind(null, item.id, view)}>
                          <Button
                            appearance="soft"
                            aria-label={`Herstellen, terug naar het oordeel van het filter: ${item.title}`}
                            type="submit"
                          >
                            Herstellen
                          </Button>
                        </Form>
                      </>
                    )}
                    {item.hiddenAt === null ? null : (
                      <>
                        <Text>
                          Verborgen op {formatNewsTime(item.hiddenAt, now)} door{' '}
                          {item.hiddenByName ?? 'een verwijderd account'}. Reden: {item.hiddenReason}
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
        {pages === 1 ? null : (
          <Pagination
            current={page}
            label="Pagina’s van de lijst"
            nextHref={page < pages ? itemsPath({ ...view, page: page + 1 }) : undefined}
            previousHref={page > 1 ? itemsPath({ ...view, page: page - 1 }) : undefined}
            total={pages}
          />
        )}
        <Text>
          <Link href="/beheer">Terug naar het beheer</Link>
        </Text>
      </Page.Cell>
    </Page.Main>
  )
}

/**
 * The id of the field that has the error, which the summary links to: the list of reasons for
 * no choice, and the text field for "Anders" without a text or with one that is too long.
 */
function failedFieldId(itemId: number, error: string | string[] | undefined) {
  return error === 'reden-kies' ? `reden-${itemId}` : `toelichting-${itemId}`
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
