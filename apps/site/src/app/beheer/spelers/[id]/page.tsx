import type { Metadata } from 'next'

import {
  Button,
  Card,
  Disclosure,
  Field,
  Form,
  Heading,
  Input,
  Link,
  Notice,
  Page,
  Select,
  Strong,
  Tag,
  Text,
} from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { personPath } from '#src/app/beheer/personen/paths'
import { toolbarAreas } from '#src/beheer/areas'
import { countryChoices } from '#src/beheer/countries'
import { compact } from '#src/beheer/density'
import { playerFormId } from '#src/beheer/form-ids'
import { parseItemId, parseSearch, searchMaxLength } from '#src/beheer/items'
import { findAdminPlayer, mostPersonChoices, playerValuesOf, searchPersons } from '#src/beheer/players'
import { requireRole } from '#src/beheer/require-role'
import { SaveButtons } from '#src/beheer/SaveButtons'
import { getDatabase } from '#src/database'
import { describeShowDelay } from '#src/matches'

import { submitPlayer, submitRemovePlayer } from '../actions'
import { listPath, mergePagePath, playerPath } from '../paths'
import { PlayerForm } from '../PlayerForm'
import { FocusOnLoad } from './FocusOnLoad'

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
// Between the two is "Dezelfde persoon als" (issue 977), for a player whose person is there
// twice: a search with method GET (`zoek`), and the list of what it found, which leads to the
// page that merges the two persons. Both are forms of their own, and work without JavaScript.
// After a search the focus is on the list, or on the search field when nobody was found.
export default async function PlayerPage({ params, searchParams }: Props) {
  await requireRole('owner', 'editor')

  const id = parseItemId((await params).id)
  const found = id === undefined ? undefined : await findAdminPlayer(getDatabase().db, id)

  if (id === undefined || found === undefined) {
    notFound()
  }

  const { appearances, goals, person, player } = found
  const { gedaan, zoek } = await searchParams
  const search = person === undefined ? '' : parseSearch(zoek)
  const others = (await searchPersons(getDatabase().db, search)).filter((other) => other.id !== person?.id)
  const showDelay = describeShowDelay(player.season)
  const inUse = appearances > 0 || goals > 0
  const stays = `${player.name} heeft in ${player.season} doelpunten of wedstrijden op zijn naam. Hij hoort dus bij het seizoen en blijft in de selectie.`
  const notices: Record<string, { text: string; title: string }> = {
    blijft: { text: stays, title: 'Niet weggehaald' },
    ongewijzigd: { text: 'Je hebt niets veranderd, dus er is niets opgeslagen.', title: 'Niets veranderd' },
    opgeslagen: { text: `De speler is bewaard. Staat ${showDelay} op de site.`, title: 'Opgeslagen' },
    samengevoegd: {
      text: `De twee personen zijn één persoon. Staat ${showDelay} op de site.`,
      title: 'Samengevoegd',
    },
    'was-al-weg': { text: 'Deze speler was al uit de selectie.', title: 'Niets veranderd' },
  }
  // Only a word the page knows: the address is input, and `__proto__` is no notice.
  const notice = typeof gedaan === 'string' && Object.hasOwn(notices, gedaan) ? notices[gedaan] : undefined

  return (
    <Page.Main areas={toolbarAreas} className={compact}>
      <Page.Cell area="head">
        <Text>
          <Link href={listPath(player.season)} icon="arrow-left">
            Terug naar Spelers
          </Link>
        </Text>
        <Heading level={1}>{player.name}</Heading>
        <Text>
          {player.source === 'redactie' ? <Tag tone="highlight">Redactie</Tag> : <Tag>Import</Tag>} Speler in het
          seizoen {player.season}, {player.inSquad ? 'in de selectie' : 'uit de selectie'}.{' '}
          {person === undefined
            ? 'Hij heeft nog geen persoon: met een Wikipedia-pagina krijgt hij er een.'
            : 'Zijn persoon is in elk seizoen dezelfde.'}
        </Text>
      </Page.Cell>
      <Page.Toolbar>
        <SaveButtons buttons={[{ label: 'Opslaan' }]} cancelHref={listPath(player.season)} formId={playerFormId} />
      </Page.Toolbar>
      <Page.Cell area="main">
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
          personHref={person === undefined ? undefined : personPath(person.id, { back: playerPath(id) })}
          submitLabel="Opslaan"
          withoutPerson={person === undefined}
        />
        {person === undefined ? null : (
          <Card aria-labelledby="zelfde-persoon-kop">
            <Heading id="zelfde-persoon-kop" level={2}>
              Dezelfde persoon als
            </Heading>
            <Text>
              Staat deze speler er twee keer in, als twee personen? Dat gebeurt bij een speler die van naam veranderde.
              Zoek de andere persoon en voeg de twee samen. Je leest eerst wat er dan gebeurt.
            </Text>
            <Form action={playerPath(id)} method="get">
              <Field
                hint="Een deel van de naam of van de titel van de Wikipedia-pagina."
                id="zoek"
                label="Zoek de andere persoon"
                required={false}
              >
                <Input autoCorrect="off" defaultValue={search} maxLength={searchMaxLength} name="zoek" type="search" />
              </Field>
              <Button appearance="soft" type="submit">
                Zoeken
              </Button>
            </Form>
            {/*
             * The answer to a search gets the focus: the list, or the field to search
             * again.
             */}
            {search === '' ? null : <FocusOnLoad id={others.length === 0 ? 'zoek' : 'met'} />}
            {search === '' ? null : others.length === 0 ? (
              <Text>Geen andere persoon gevonden met “{search}”. Zoek op een ander deel van de naam.</Text>
            ) : (
              <Form action={mergePagePath} method="get">
                <Input name="persoon" type="hidden" value={String(person.id)} />
                <Input name="speler" type="hidden" value={String(id)} />
                <Field
                  hint={`${others.length >= mostPersonChoices - 1 ? 'De eerste personen die we vonden; zoek preciezer als hij er niet bij staat. ' : ''}Bij elke persoon staan zijn seizoenen en zijn Wikipedia-pagina, zodat je twee personen met dezelfde naam uit elkaar houdt.`}
                  id="met"
                  label="Dezelfde persoon als"
                >
                  <Select name="met">
                    {others.map((other) => (
                      <Select.Option key={other.id} value={String(other.id)}>
                        {other.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Field>
                <Button appearance="soft" type="submit">
                  Bekijk wat samenvoegen doet
                </Button>
              </Form>
            )}
          </Card>
        )}
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
      </Page.Cell>
    </Page.Main>
  )
}
