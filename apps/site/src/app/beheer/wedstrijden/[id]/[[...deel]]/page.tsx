import type { Metadata } from 'next'

import { partLabels } from '@fansite/db/match-conflicts'
import { describeEntryGoals, describeEntryKickoff, markedParts } from '@fansite/db/match-edits'
import { mayHaveReport } from '@fansite/db/match-reports'
import { Card, Filter, Heading, Link, List, Notice, Page, Strong, Tag, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import type { FormPart } from '#src/beheer/match-fields'

import { addPlayerPath } from '#src/app/beheer/spelers/paths'
import {
  submitConflict,
  submitDeleteMatch,
  submitHeldChange,
  submitMatch,
  submitMatchPart,
  submitRemoveEntry,
} from '#src/app/beheer/wedstrijden/actions'
import { ConflictForm } from '#src/app/beheer/wedstrijden/ConflictForm'
import { HeldChangeForm } from '#src/app/beheer/wedstrijden/HeldChangeForm'
import {
  MatchErrorSummary,
  MatchFields,
  MatchFormProvider,
  MatchSavePanel,
  wholeFormId,
} from '#src/app/beheer/wedstrijden/MatchForm'
import { backPathOf, matchesPath, matchPartPath, matchPath, reportPath } from '#src/app/beheer/wedstrijden/paths'
import { RemoveEntryForm } from '#src/app/beheer/wedstrijden/RemoveEntryForm'
import { RemoveMatchForm } from '#src/app/beheer/wedstrijden/RemoveMatchForm'
import { compact } from '#src/beheer/density'
import { differenceWords } from '#src/beheer/difference-words'
import { describeHeldChange, describeWithoutDecision, explainHold } from '#src/beheer/held-changes'
import { parseItemId } from '#src/beheer/items'
import { findMatch } from '#src/beheer/match-entries'
import { goalKinds, isKnockout, statusChoices, valuesOf } from '#src/beheer/match-form'
import { columnParts, isFormColumn } from '#src/beheer/quality-table'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'
import { wikipediaUrl } from '#src/match-format'
import { describeShowDelay, lacksResult } from '#src/matches'
import { formatVersionTime } from '#src/news'

/** A part of the page of a match: one of the form, or the changes that wait (issue 1162). */
type MatchPagePart = 'wijzigingen' | FormPart

/** The parts in the navigation, in order, with what they say. */
const pageLabels: Record<MatchPagePart, string> = {
  doelpunten: 'Doelpunten',
  gegevens: 'Gegevens',
  uitslag: 'Uitslag',
  wijzigingen: 'Wijzigingen',
}

type Props = {
  params: Promise<{ deel?: string[]; id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// Render on each request: the match changes with every entry and every import.
export const dynamic = 'force-dynamic'

/** What the tab says: "Wedstrijd invullen", or with a part "Wedstrijd invullen: doelpunten". */
export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const part = partOf((await params).deel)

  return {
    robots: { follow: false, index: false },
    title: part === undefined || part === null ? 'Wedstrijd invullen' : `Wedstrijd invullen: ${part}`,
  }
}

/** What the last action says, by the word in the address. */
const notices: Record<string, { text: string; title: string }> = {
  'bron-gehouden': {
    text: 'De wedstrijd blijft zoals hij is. De import meldt dit verschil niet nog eens, zolang beide bronnen hetzelfde blijven zeggen.',
    title: 'Niet overgenomen',
  },
  'bron-overgenomen': {
    text: 'Dit onderdeel is nu wat de andere bron zegt.',
    title: 'Overgenomen',
  },
  'geen-invoer': { text: 'Er was geen invoer van de redactie om weg te halen.', title: 'Niets weggehaald' },
  gehouden: {
    text: 'Onze invoer blijft staan. De import meldt dit verschil niet nog eens, tenzij Wikipedia iets anders gaat zeggen.',
    title: 'Invoer gehouden',
  },
  'niet-gelukt': {
    text: 'Er is niets veranderd: van deze afwijking is niet te lezen wat Wikipedia zegt. Houd de invoer, of haal hem weg.',
    title: 'Niet overgenomen',
  },
  'niet-van-ons': {
    text: 'Alleen een wedstrijd die de redactie toevoegde, kan worden verwijderd. Deze komt van een import.',
    title: 'Niet verwijderd',
  },
  ongewijzigd: { text: 'Je had niets veranderd, dus er is niets opgeslagen.', title: 'Niets veranderd' },
  overgenomen: {
    text: 'Dit onderdeel is nu wat Wikipedia zegt en volgt Wikipedia weer.',
    title: 'Wikipedia overgenomen',
  },
  'speler-toegevoegd': {
    text: 'De speler staat nu in de kiezer bij de doelpunten. Had je in het andere tabblad al iets ingevuld? Ga daar dan verder en sluit dit tabblad: de speler staat daar ook in de kiezer.',
    title: 'Speler toegevoegd',
  },
  toegevoegd: {
    text: 'De wedstrijd is toegevoegd. Vul hieronder de doelpunten en de gegevens in, en maak daarna het verslag.',
    title: 'Toegevoegd',
  },
  'van-het-verslag': {
    text: 'Er is niets veranderd: de doelpunten van deze wedstrijd zijn van het verslag. Heeft Wikipedia gelijk? Pas dan het verslag aan. Anders houd je onze invoer.',
    title: 'Niet overgenomen',
  },
  'volgende-ongewijzigd': {
    text: 'Bij de vorige wedstrijd had je niets veranderd. Dit is de volgende wedstrijd met een gat in deze kolom.',
    title: 'Volgende',
  },
  'volgende-opgeslagen': {
    text: 'De vorige wedstrijd is opgeslagen. Dit is de volgende wedstrijd met een gat in deze kolom.',
    title: 'Volgende',
  },
  weggehaald: {
    text: 'De wedstrijd is teruggezet naar wat er stond voor de eerste invoer. De import leest bij de volgende keer weer wat Wikipedia zegt.',
    title: 'Invoer weggehaald',
  },
  'wijziging-afgewezen': {
    text: 'De wedstrijd blijft zoals hij is. De import meldt deze wijziging niet nog eens, zolang Wikipedia dezelfde waarde toont.',
    title: 'Wijziging afgewezen',
  },
  'wijziging-niet-gelukt': {
    text: 'Er is niets veranderd: van deze wijziging is niet te lezen wat Wikipedia zegt. Wijs haar af.',
    title: 'Niet overgenomen',
  },
  'wikipedia-overgenomen': {
    text: 'De wedstrijd en de doelpunten zijn nu wat Wikipedia zegt.',
    title: 'Wikipedia overgenomen',
  },
}

/**
 * The form of one match in one column (issue 1162): a navigation to its parts, the changes of
 * Wikipedia that wait for a decision, the cards of the form, the save panel, and what the
 * editors entered of it so far with the blocks that take it away. A part shows only its own
 * cards with the save panel, and saves only its own fields. The page tells what the last action
 * did from the word in the address.
 */
export default async function MatchPage({ params, searchParams }: Props) {
  await requireRole('owner', 'editor')

  const { deel, id: rawId } = await params
  const part = partOf(deel)

  if (part === null) {
    notFound()
  }

  const id = parseItemId(rawId)
  const found = id === undefined ? undefined : await findMatch(getDatabase().db, id)

  if (id === undefined || found === undefined) {
    notFound()
  }

  const { differences, edit, goals, hasReport, held, match, pages, squad } = found
  const waiting = differences.length + held.length > 0

  if (part === 'wijzigingen' && !waiting) {
    notFound()
  }

  const { gedaan, kolom, terug } = await searchParams
  const back = backPathOf(terug)
  const formPart = part === 'wijzigingen' ? undefined : part
  const shows = (shown: MatchPagePart) => part === undefined || part === shown
  // The column of the table of Kwaliteit the editor works through, when it leads to this part.
  const column = isFormColumn(kolom) && part === columnParts[kolom] ? kolom : undefined
  const showDelay = describeShowDelay(match.season)
  const notice =
    gedaan === 'opgeslagen'
      ? { text: `Je invoer is bewaard. Staat ${showDelay} op de site.`, title: 'Opgeslagen' }
      : typeof gedaan === 'string'
        ? notices[gedaan]
        : undefined
  const clubs = match.home ? `sc Heerenveen - ${match.opponent}` : `${match.opponent} - sc Heerenveen`
  const title = `${match.round} (${match.competition}): ${clubs}`
  const now = new Date()
  const lacking = lacksResult(match, now)
  const parts =
    edit === undefined
      ? ''
      : markedParts(edit)
          .map((part) => partLabels[part])
          .join(', ')

  const incoming = goals.flatMap((goal, index) =>
    goal.playerId === null && goal.ours !== goal.ownGoal && goal.player.trim() !== ''
      ? [{ name: goal.player.trim(), number: index + 1 }]
      : [],
  )
  const navigation = [
    { current: part === undefined, href: matchPath(match.id), label: 'Alles' },
    ...(['uitslag', 'gegevens', 'doelpunten'] as const).map((shown) => ({
      current: part === shown,
      href: matchPartPath(match.id, shown, { back }),
      label: pageLabels[shown],
    })),
    ...(mayHaveReport(match, now) ? [{ href: reportPath(match.id), label: 'Verslag' }] : []),
    ...(waiting
      ? [
          {
            current: part === 'wijzigingen',
            href: matchPartPath(match.id, 'wijzigingen', { back }),
            label: pageLabels.wijzigingen,
          },
        ]
      : []),
  ]

  return (
    <MatchFormProvider
      action={
        part === undefined || part === 'wijzigingen'
          ? submitMatch.bind(null, match.id)
          : submitMatchPart.bind(null, match.id, part, back, column)
      }
      choices={{
        addPlayer: {
          href: addPlayerPath(match.season, undefined, match.id, part === 'doelpunten'),
          season: match.season,
        },
        goalKinds,
        home: match.home,
        incoming,
        knockout: isKnockout(match.competition),
        opponent: match.opponent,
        report: hasReport
          ? { goals: goals.map((goal) => describeEntryGoals([goal])), href: reportPath(match.id) }
          : undefined,
        showDelay,
        squad,
        statuses: statusChoices,
        timeOptional: match.dataSource === 'oude-fansite',
      }}
      initial={hasReport ? { ...valuesOf(match, []), doelpunten: [] } : valuesOf(match, goals)}
      key={`${match.id}-${edit?.editedAt.getTime() ?? 0}-${gedaan ?? ''}`}
    >
      <Page.Main
        className={compact}
        intro={
          <>
            <Text>
              <Link href={back ?? matchesPath} icon="arrow-left">
                {back === undefined ? 'Terug naar Wedstrijden' : 'Terug'}
              </Link>
            </Text>
            <Heading level={1}>{clubs}</Heading>
            <Text appearance="meta">
              {match.competition}, {match.round} · {describeEntryKickoff(match)}
            </Text>
            {match.dataSource === 'redactie' ? (
              <Text appearance="meta">Toegevoegd door de redactie. Bron: {match.sourceLine}</Text>
            ) : null}
            {edit === undefined && !lacking ? null : (
              <Text>
                {edit === undefined ? null : <Tag tone="highlight">{`Aangepast: ${parts}`}</Tag>}{' '}
                {lacking ? <Tag tone="attention">Uitslag ontbreekt</Tag> : null}
              </Text>
            )}
            <Filter items={navigation} label="Delen van de wedstrijd" />
            {part === undefined ? null : (
              <Text>
                <Link href={matchPath(match.id)} id={wholeFormId}>
                  Hele wedstrijd bewerken
                </Link>
              </Text>
            )}
          </>
        }
        wide
      >
        <MatchErrorSummary part={formPart} />
        {notice === undefined ? null : (
          <Notice>
            <Strong>{notice.title}.</Strong> {notice.text}
          </Notice>
        )}
        {!shows('wijzigingen')
          ? null
          : differences.map((difference) => {
              const words = differenceWords(difference, match, now, hasReport)

              return (
                <Card aria-labelledby={`afwijking-${difference.id}-kop`} key={difference.id}>
                  <Heading id={`afwijking-${difference.id}-kop`} level={2}>
                    {words.heading}
                  </Heading>
                  <List role="list">
                    <List.Item>
                      <Text>
                        {words.ours}: {difference.oldValue}
                      </Text>
                    </List.Item>
                    <List.Item>
                      <Text>
                        {words.theirs}: {difference.newValue}
                      </Text>
                    </List.Item>
                  </List>
                  <Text appearance="meta">{words.note}</Text>
                  <ConflictForm
                    action={submitConflict.bind(null, difference.id)}
                    id={difference.id}
                    labels={{ keep: words.keep, takeOver: words.takeOver }}
                    part={`de ${partLabels[difference.part]}`}
                    title={title}
                  />
                </Card>
              )
            })}
        {!shows('wijzigingen')
          ? null
          : held.map((change) => {
              const summary = describeHeldChange(change, match, goals)
              const outcome = describeWithoutDecision(change, now)
              const page = pages.find((candidate) => candidate.kind === pageKindOf(match.competition))
              const what = summary.removal
                ? 'het weghalen van de wedstrijd'
                : summary.differences.length === 0
                  ? 'de wijziging'
                  : listWords(summary.differences.map((difference) => difference.label.toLowerCase()))

              return (
                <Card aria-labelledby={`wijziging-${change.id}-kop`} key={change.id}>
                  <Heading id={`wijziging-${change.id}-kop`} level={2}>
                    Wikipedia wacht: {what}
                  </Heading>
                  <Text>{explainHold(change.reason)}</Text>
                  {summary.removal ? (
                    <List role="list">
                      <List.Item>
                        <Text>Op de site: de wedstrijd staat er.</Text>
                      </List.Item>
                      <List.Item>
                        <Text>Wikipedia: de wedstrijd staat niet meer op de pagina.</Text>
                      </List.Item>
                    </List>
                  ) : summary.differences.length === 0 ? (
                    <Text>Alleen een verwijzing is anders, zoals de pagina van een speler of van de tegenstander.</Text>
                  ) : (
                    <List role="list">
                      {summary.differences.map((difference) => (
                        <List.Item key={difference.label}>
                          <Text>
                            <Strong>{difference.label}.</Strong> Op de site: {difference.site}. Wikipedia:{' '}
                            {difference.wikipedia}.
                          </Text>
                        </List.Item>
                      ))}
                    </List>
                  )}
                  <Text appearance="meta">
                    Wikipedia zegt dit sinds {formatVersionTime(change.firstSeenAt)}. De import zag het{' '}
                    {change.timesSeen === 1 ? 'één keer' : `${change.timesSeen} keer`}, voor het laatst op{' '}
                    {formatVersionTime(change.lastSeenAt)}.{' '}
                    {outcome.kind === 'taken-over'
                      ? `Zonder besluit neemt de import dit over op ${formatVersionTime(outcome.at)}, als Wikipedia dan nog hetzelfde zegt.`
                      : 'Het seizoen is voorbij of bijna voorbij, dus de import neemt dit niet vanzelf over. Zonder besluit blijft de huidige waarde staan.'}
                  </Text>
                  {page === undefined ? null : (
                    <Text>
                      <Link href={wikipediaUrl(page.title, page.language)} icon="external-link">
                        Bekijk {page.title} op Wikipedia
                      </Link>
                    </Text>
                  )}
                  <HeldChangeForm
                    action={submitHeldChange.bind(null, change.id)}
                    id={change.id}
                    title={title}
                    what={what}
                  />
                </Card>
              )
            })}
        {part === 'wijzigingen' ? null : (
          <>
            <MatchFields part={formPart} />
            <MatchSavePanel cancelHref={back ?? matchesPath} next={column !== undefined} />
          </>
        )}
        {part !== undefined ? null : match.dataSource === 'redactie' ? (
          <RemoveMatchForm action={submitDeleteMatch.bind(null, match.id)} title={title} />
        ) : null}
        {part !== undefined || edit === undefined ? null : (
          <>
            <Card aria-labelledby="invoer-kop" surface="soft">
              <Heading id="invoer-kop" level={2}>
                Laatste invoer
              </Heading>
              <List role="list">
                <List.Item>
                  <Text>Onderdelen: {parts}</Text>
                </List.Item>
                <List.Item>
                  <Text>Door: {edit.editedByName}</Text>
                </List.Item>
                <List.Item>
                  <Text>Op: {formatVersionTime(edit.editedAt)}</Text>
                </List.Item>
                <List.Item>
                  <Text>Reden: {edit.reason}</Text>
                </List.Item>
              </List>
            </Card>
            <RemoveEntryForm action={submitRemoveEntry.bind(null, match.id)} title={title} />
          </>
        )}
      </Page.Main>
    </MatchFormProvider>
  )
}

/** Words in a row: "a", "a en b", "a, b en c". */
function listWords(words: string[]) {
  const last = words.at(-1)

  return words.length < 2 ? (last ?? '') : `${words.slice(0, -1).join(', ')} en ${last}`
}

/** The page of Wikipedia that holds the matches of a competition. */
function pageKindOf(competition: string) {
  return competition === 'Eredivisie'
    ? 'programme'
    : competition === 'KNVB Beker'
      ? 'cup'
      : competition === 'Europa League'
        ? 'europa-league'
        : 'playoffs'
}

/**
 * The part an address names: `undefined` for the whole form, and `null` for an address that is
 * no part, which is not found.
 */
function partOf(deel: string[] | undefined): MatchPagePart | null | undefined {
  if (deel === undefined || deel.length === 0) {
    return undefined
  }

  const [name] = deel

  return deel.length === 1 && name !== undefined && Object.hasOwn(pageLabels, name) ? (name as MatchPagePart) : null
}
