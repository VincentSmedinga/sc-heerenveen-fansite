import type { Metadata } from 'next'

import { conflictStandsMs, partLabels } from '@fansite/db/match-conflicts'
import { markedParts } from '@fansite/db/match-edits'
import { Card, Heading, Link, List, Page, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { compact } from '../../../../beheer/density'
import { parseItemId } from '../../../../beheer/items'
import { findMatch } from '../../../../beheer/match-entries'
import { goalKinds, statusChoices, valuesOf } from '../../../../beheer/match-form'
import { requireRole } from '../../../../beheer/require-role'
import { getDatabase } from '../../../../database'
import { formatVersionTime } from '../../../../news'
import { submitConflict, submitMatch, submitRemoveEntry } from '../actions'
import { ConflictForm } from '../ConflictForm'
import { MatchForm } from '../MatchForm'
import { matchesPath } from '../paths'
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
  opgeslagen: { text: 'Je invoer is bewaard en staat nu op de site.', title: 'Opgeslagen' },
  overgenomen: {
    text: 'Dit onderdeel is nu wat Wikipedia zegt en volgt Wikipedia weer.',
    title: 'Wikipedia overgenomen',
  },
  weggehaald: {
    text: 'De wedstrijd is teruggezet naar wat er stond voor de eerste invoer. De import leest bij de volgende keer weer wat Wikipedia zegt.',
    title: 'Invoer weggehaald',
  },
}

// The form of one match, with what the editors entered of it so far, the differences with
// Wikipedia that wait for a decision, and the button that takes the entry away. The page tells
// what the last action did from the word in the address.
export default async function MatchPage({ params, searchParams }: Props) {
  await requireRole('beheerder')

  const id = parseItemId((await params).id)
  const found = id === undefined ? undefined : await findMatch(getDatabase().db, id)

  if (id === undefined || found === undefined) {
    notFound()
  }

  const { differences, edit, goals, match, squad } = found
  const { gedaan } = await searchParams
  const notice = typeof gedaan === 'string' ? notices[gedaan] : undefined
  const clubs = match.home ? `sc Heerenveen - ${match.opponent}` : `${match.opponent} - sc Heerenveen`
  const title = `${match.round} (${match.competition}): ${clubs}`
  return (
    <Page.Main
      className={compact}
      intro={
        <>
          <Heading level={1}>Wedstrijd invullen</Heading>
          <Text appearance="intro">{title}</Text>
          <Text>
            Alles wat je hier opslaat, staat meteen op de site. Zegt Wikipedia later hetzelfde, dan neemt de import het
            over. Zegt Wikipedia iets anders, dan blijft jouw invoer staan en beslis je hier wat er gebeurt.
          </Text>
        </>
      }
    >
      {notice === undefined ? null : (
        <Card aria-labelledby="gedaan-kop" surface="soft">
          <Heading id="gedaan-kop" level={2}>
            {notice.title}
          </Heading>
          <Text>{notice.text}</Text>
        </Card>
      )}
      {edit === undefined ? null : (
        <Card aria-labelledby="invoer-kop">
          <Heading id="invoer-kop" level={2}>
            Aangepast door de redactie
          </Heading>
          <Text>
            Van deze wedstrijd heeft de redactie ingevuld:{' '}
            {markedParts(edit)
              .map((part) => partLabels[part])
              .join(', ')}
            . De laatste invoer was van {edit.editedByEmail} op {formatVersionTime(edit.editedAt)}. Reden: {edit.reason}
          </Text>
        </Card>
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
      <MatchForm
        action={submitMatch.bind(null, match.id)}
        choices={{
          goalKinds,
          knockout: match.competition !== 'Eredivisie',
          opponent: match.opponent,
          squad,
          statuses: statusChoices,
        }}
        initial={valuesOf(match, goals)}
        key={`${match.id}-${edit?.editedAt.getTime() ?? 0}-${gedaan ?? ''}`}
      />
      {edit === undefined ? null : (
        <Card aria-labelledby="weghalen-kop" surface="soft">
          <Heading id="weghalen-kop" level={2}>
            Invoer weghalen
          </Heading>
          <Text>
            Dit zet wat de redactie van deze wedstrijd invulde terug naar wat er stond voor de eerste invoer. Daarna
            leest de import weer wat Wikipedia zegt, zoals bij elke andere wedstrijd.
          </Text>
          <RemoveEntryForm action={submitRemoveEntry.bind(null, match.id)} title={title} />
        </Card>
      )}
      <Text>
        <Link href={matchesPath}>Terug naar de wedstrijden</Link>
      </Text>
    </Page.Main>
  )
}
