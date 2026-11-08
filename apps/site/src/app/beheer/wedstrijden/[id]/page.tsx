import type { Metadata } from 'next'

import { conflictStandsMs, partLabels } from '@fansite/db/match-conflicts'
import { describeEntryGoals, describeEntryKickoff, markedParts } from '@fansite/db/match-edits'
import { Breadcrumb, Card, Heading, Link, List, Notice, Page, Strong, Tag, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { compact } from '#src/beheer/density'
import { describeHeldChange, describeWithoutDecision, explainHold } from '#src/beheer/held-changes'
import { parseItemId } from '#src/beheer/items'
import { findMatch } from '#src/beheer/match-entries'
import { goalKinds, isKnockout, statusChoices, valuesOf } from '#src/beheer/match-form'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'
import { wikipediaUrl } from '#src/match-format'
import { describeShowDelay, lacksResult } from '#src/matches'
import { formatVersionTime } from '#src/news'

import { submitConflict, submitHeldChange, submitMatch, submitRemoveEntry } from '../actions'
import { ConflictForm } from '../ConflictForm'
import { HeldChangeForm } from '../HeldChangeForm'
import { MatchErrorSummary, MatchFields, MatchFormProvider, MatchSavePanel } from '../MatchForm'
import { matchesPath, reportPath } from '../paths'
import { RemoveEntryForm } from '../RemoveEntryForm'

// Render on each request: the match changes with every entry and every import.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Wedstrijd invullen' }

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** What the last action says, by the word in the address. */
const notices: Record<string, { text: string; title: string }> = {
  'geen-invoer': { text: 'Er was geen invoer van de redactie om weg te halen.', title: 'Niets weggehaald' },
  gehouden: {
    text: 'Onze invoer blijft staan. De import meldt dit verschil niet nog eens, tenzij Wikipedia iets anders gaat zeggen.',
    title: 'Invoer gehouden',
  },
  'niet-gelukt': {
    text: 'Er is niets veranderd: van deze afwijking is niet te lezen wat Wikipedia zegt. Houd de invoer, of haal hem weg.',
    title: 'Niet overgenomen',
  },
  ongewijzigd: { text: 'Je had niets veranderd, dus er is niets opgeslagen.', title: 'Niets veranderd' },
  overgenomen: {
    text: 'Dit onderdeel is nu wat Wikipedia zegt en volgt Wikipedia weer.',
    title: 'Wikipedia overgenomen',
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

// The form of one match, with what the editors entered of it so far, the differences with
// Wikipedia that wait for a decision, and the block that takes the entry away. The main column
// holds the cards of the form, the sidebar the save panel and what belongs to the entry. The
// page tells what the last action did from the word in the address.
export default async function MatchPage({ params, searchParams }: Props) {
  await requireRole('beheerder')

  const id = parseItemId((await params).id)
  const found = id === undefined ? undefined : await findMatch(getDatabase().db, id)

  if (id === undefined || found === undefined) {
    notFound()
  }

  const { differences, edit, goals, hasReport, held, match, pages, squad } = found
  const { gedaan } = await searchParams
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

  return (
    <MatchFormProvider
      action={submitMatch.bind(null, match.id)}
      choices={{
        goalKinds,
        home: match.home,
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
            <Breadcrumb
              current={clubs}
              items={[
                { href: '/beheer', label: 'Beheer' },
                { href: matchesPath, label: 'Wedstrijden' },
              ]}
              label="Kruimelpad"
            />
            <Heading level={1}>{clubs}</Heading>
            <Text appearance="meta">
              {match.competition}, {match.round} · {describeEntryKickoff(match)}
            </Text>
            {match.status === 'played' ? (
              <Text>
                <Link href={reportPath(match.id)}>{hasReport ? 'Naar het verslag' : 'Het verslag invullen'}</Link>
              </Text>
            ) : null}
            {edit === undefined && !lacking ? null : (
              <Text>
                {edit === undefined ? null : <Tag tone="highlight">{`Aangepast: ${parts}`}</Tag>}{' '}
                {lacking ? <Tag tone="attention">Uitslag ontbreekt</Tag> : null}
              </Text>
            )}
          </>
        }
        wide
      >
        <MatchErrorSummary />
        {notice === undefined ? null : (
          <Notice>
            <Strong>{notice.title}.</Strong> {notice.text}
          </Notice>
        )}
        {differences.map((difference) => (
          <Card aria-labelledby={`afwijking-${difference.id}-kop`} key={difference.id}>
            <Heading id={`afwijking-${difference.id}-kop`} level={2}>
              Wikipedia wijkt af: {partLabels[difference.part]}
            </Heading>
            <List role="list">
              <List.Item>
                <Text>Onze invoer: {difference.oldValue}</Text>
              </List.Item>
              <List.Item>
                <Text>Wikipedia: {difference.newValue}</Text>
              </List.Item>
            </List>
            <Text appearance="meta">
              Onze invoer blijft staan tot je beslist. Beslist niemand, dan neemt de import Wikipedia over op{' '}
              {formatVersionTime(new Date(difference.firstSeenAt.getTime() + conflictStandsMs))}, als Wikipedia dan nog
              hetzelfde zegt.
            </Text>
            <ConflictForm
              action={submitConflict.bind(null, difference.id)}
              id={difference.id}
              part={`de ${partLabels[difference.part]}`}
              title={title}
            />
          </Card>
        ))}
        {held.map((change) => {
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
                  : 'De import leest dit seizoen niet meer. Zonder besluit blijft de huidige waarde staan.'}
              </Text>
              {page === undefined ? null : (
                <Text>
                  <Link href={wikipediaUrl(page.title, page.kind)} icon="external-link">
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
        <MatchFields />
      </Page.Main>
      <Page.Sidebar aria-label="Opslaan en invoer" sticky>
        <MatchSavePanel cancelHref={matchesPath} />
        {edit === undefined ? null : (
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
                  <Text>Door: {edit.editedByEmail}</Text>
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
      </Page.Sidebar>
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
