import type { Metadata } from 'next'

import { Breadcrumb, Button, Disclosure, Form, Heading, Notice, Page, Strong, Tag, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { countryChoices } from '#src/beheer/countries'
import { compact } from '#src/beheer/density'
import { parseItemId } from '#src/beheer/items'
import { findAdminPlayer, playerValuesOf } from '#src/beheer/players'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'
import { describeShowDelay } from '#src/matches'

import { submitPlayer, submitRemovePlayer } from '../actions'
import { listPath } from '../paths'
import { PlayerForm } from '../PlayerForm'

// Render on each request: the player changes with every save and every import.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Speler aanpassen' }

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// The form of one player of a season: his name, Wikipedia page, shirt number and position, and
// the line and the country of his person. Below it is the block that takes him out of the
// squad. A player with a goal or an appearance belongs to the season, so he has no such block
// and the page says why. The page tells what the last action did from the word in the address.
export default async function PlayerPage({ params, searchParams }: Props) {
  await requireRole('beheerder')

  const id = parseItemId((await params).id)
  const found = id === undefined ? undefined : await findAdminPlayer(getDatabase().db, id)

  if (id === undefined || found === undefined) {
    notFound()
  }

  const { appearances, goals, person, player } = found
  const { gedaan } = await searchParams
  const showDelay = describeShowDelay(player.season)
  const inUse = appearances > 0 || goals > 0
  const stays = `${player.name} heeft in ${player.season} doelpunten of wedstrijden op zijn naam. Hij hoort dus bij het seizoen en blijft in de selectie.`
  const notices: Record<string, { text: string; title: string }> = {
    blijft: { text: stays, title: 'Niet weggehaald' },
    ongewijzigd: { text: 'Je hebt niets veranderd, dus er is niets opgeslagen.', title: 'Niets veranderd' },
    opgeslagen: { text: `De speler is bewaard. Staat ${showDelay} op de site.`, title: 'Opgeslagen' },
    'was-al-weg': { text: 'Deze speler was al uit de selectie.', title: 'Niets veranderd' },
  }
  // Only a word the page knows: the address is input, and `__proto__` is no notice.
  const notice = typeof gedaan === 'string' && Object.hasOwn(notices, gedaan) ? notices[gedaan] : undefined

  return (
    <Page.Main
      className={compact}
      intro={
        <>
          <Breadcrumb
            current={player.name}
            items={[
              { href: '/beheer', label: 'Beheer' },
              { href: listPath(player.season), label: `Spelers ${player.season}` },
            ]}
            label="Kruimelpad"
          />
          <Heading level={1}>{player.name}</Heading>
          <Text>
            {player.source === 'redactie' ? <Tag tone="highlight">Redactie</Tag> : <Tag>Import</Tag>} Speler in het
            seizoen {player.season}, {player.inSquad ? 'in de selectie' : 'uit de selectie'}.{' '}
            {person === undefined
              ? 'Hij heeft nog geen persoon: met een Wikipedia-pagina krijgt hij er een.'
              : 'Zijn persoon is in elk seizoen dezelfde.'}
          </Text>
        </>
      }
      wide
    >
      {notice === undefined ? null : (
        <Notice>
          <Strong>{notice.title}.</Strong> {notice.text}
        </Notice>
      )}
      <PlayerForm
        action={submitPlayer.bind(null, id)}
        cancelHref={listPath(player.season)}
        countries={countryChoices()}
        initial={playerValuesOf(found)}
        key={`${id}-${gedaan ?? ''}`}
        nameHint={person === undefined ? undefined : 'Een andere naam geldt voor deze persoon in elk seizoen.'}
        submitLabel="Opslaan"
        withoutPerson={person === undefined}
      />
      {!player.inSquad ? null : inUse ? (
        <Text>
          <Strong>Uit de selectie halen kan niet.</Strong> {stays}
        </Text>
      ) : (
        <Disclosure summary="Uit de selectie halen">
          <Text>
            Dit haalt {player.name} uit de selectie van {player.season}. Hij blijft in de lijst van het seizoen staan,
            als speler die is vertrokken. Doe dit alleen als hij niet in de selectie hoort.
          </Text>
          <Form action={submitRemovePlayer.bind(null, id)}>
            <Button appearance="danger" aria-label={`${player.name} uit de selectie halen`} type="submit">
              Uit de selectie halen
            </Button>
          </Form>
        </Disclosure>
      )}
    </Page.Main>
  )
}
