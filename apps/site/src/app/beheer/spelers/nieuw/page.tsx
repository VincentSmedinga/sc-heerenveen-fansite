import type { Metadata } from 'next'

import { Button, Card, Field, Form, Heading, Input, Link, Page, Text } from '@fansite/design-system'
import { redirect } from 'next/navigation'

import { matchPath } from '#src/app/beheer/wedstrijden/paths'
import { countryChoices } from '#src/beheer/countries'
import { compact } from '#src/beheer/density'
import { parseSearch, searchMaxLength } from '#src/beheer/items'
import { emptyPlayerValues, newPersonChoice } from '#src/beheer/player-fields'
import { findReturnMatch } from '#src/beheer/player-return'
import { listPlayerSeasons, mostPersonChoices, searchPersons } from '#src/beheer/players'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'
import { seasonFromSlug, seasonSlug } from '#src/seasons'

import { submitAddPlayer } from '../actions'
import { addPlayerPath, listPath, playersPath } from '../paths'
import { PlayerForm } from '../PlayerForm'

// Render on each request: the persons to choose from change with every import.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Speler toevoegen' }

type SearchParams = Record<string, string | string[] | undefined>

// The form that adds a player to the squad of a season (issue 1020). The season comes from the
// address and is one we have a match of. The search for a person we know is a form of its own
// with method GET, above the form of the player: it works without JavaScript, and what it finds
// is the list the editor chooses from. The player gets the source `redactie`. An editor who
// comes from the form of a match (`wedstrijd` in the address, issue 1021) goes back to it after
// the save, and with "Annuleren".
export default async function AddPlayerPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole('beheerder')

  const { db } = getDatabase()
  const { q, seizoen, wedstrijd } = await searchParams
  const season = typeof seizoen === 'string' ? seasonFromSlug(seizoen) : undefined

  if (season === undefined || !(await listPlayerSeasons(db)).includes(season)) {
    redirect(`${playersPath}?fout=seizoen`)
  }

  const search = parseSearch(q)
  const back = await findReturnMatch(db, wedstrijd, season)
  const people = await searchPersons(db, search, season)
  const [first] = people

  return (
    <Page.Main
      className={compact}
      intro={
        <>
          <Text>
            <Link href={listPath(season)} icon="arrow-left">
              Terug naar Spelers
            </Link>
          </Text>
          <Heading level={1}>Speler toevoegen aan {season}</Heading>
          <Text appearance="intro">
            Voeg een speler toe die in de selectie van {season} ontbreekt. Zoek eerst of we de persoon al kennen uit een
            ander seizoen. Staat hij er niet bij, dan maak je een nieuwe persoon.
          </Text>
          {back === undefined ? null : (
            <Text>Na het opslaan ga je terug naar het formulier van de wedstrijd {back.clubs}.</Text>
          )}
        </>
      }
      wide
    >
      <Card aria-labelledby="zoek-kop">
        <Heading id="zoek-kop" level={2}>
          Kennen we hem al?
        </Heading>
        <Form action={`${playersPath}/nieuw`} method="get">
          <Field
            hint="Een deel van de naam. Zoek eerst: wat je hieronder al invulde, gaat bij het zoeken verloren."
            id="zoek"
            label="Zoek een persoon"
            required={false}
          >
            <Input defaultValue={search} maxLength={searchMaxLength} name="q" type="search" />
          </Field>
          {/* The button sends the season, and a hidden field the match to go back to. */}
          {back === undefined ? null : <Input name="wedstrijd" type="hidden" value={String(back.id)} />}
          <Button appearance="soft" name="seizoen" type="submit" value={seasonSlug(season)}>
            Zoeken
          </Button>
        </Form>
        {search === '' ? null : (
          <Text>
            {people.length === 0
              ? `Geen persoon gevonden met “${search}”. Maak hieronder een nieuwe persoon.`
              : people.length === mostPersonChoices
                ? `De eerste ${mostPersonChoices} personen met “${search}” staan in de lijst hieronder. Staat hij er niet bij? Zoek dan preciezer.`
                : `${people.length === 1 ? '1 persoon' : `${people.length} personen`} met “${search}” in de lijst hieronder.`}
          </Text>
        )}
      </Card>
      <PlayerForm
        action={submitAddPlayer.bind(null, season, back?.id)}
        cancelHref={back === undefined ? listPath(season) : matchPath(back.id)}
        countries={countryChoices()}
        initial={{
          ...emptyPlayerValues,
          persoon: first === undefined ? newPersonChoice : String(first.id),
          rugnummer: first?.suggestion === undefined ? '' : String(first.suggestion.number),
        }}
        key={addPlayerPath(season, search, back?.id)}
        people={people}
        submitLabel="Speler toevoegen"
      />
    </Page.Main>
  )
}
