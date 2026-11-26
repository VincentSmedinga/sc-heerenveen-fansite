import { Card, Heading, Notice, Text } from '@fansite/design-system'

import type { SquadMark } from '#src/beheer/squad-mark'

import { submitMarkSquad, submitUnmarkSquad } from './actions'
import { SquadMarkForm } from './SquadMarkForm'

const dayFormat = new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeZone: 'Europe/Amsterdam' })

const names = new Intl.ListFormat('nl-NL')

/**
 * The card on the page Spelers of the admin where the editors mark the squad of a season as
 * complete, or take the mark back (issue 1675). It is not there for a season that has no mark
 * and can't get one: the running season, and a season without players. A mark that does not
 * count on the site says why, with the scorers who are missing.
 */
export function SquadMarkCard({ season, squad }: { season: string; squad: SquadMark }) {
  const { canMark, mark } = squad

  if (mark === undefined && !canMark) {
    return null
  }

  return (
    <Card aria-labelledby="selectie-compleet-kop">
      <Heading id="selectie-compleet-kop" level={2}>
        Selectie compleet
      </Heading>
      {mark === undefined ? (
        <>
          <Text>
            Weet je dat iedereen uit de selectie van {season} in de lijst staat? Markeer haar dan als compleet. De site
            zegt dat dan op de pagina Spelers.
          </Text>
          <SquadMarkForm
            action={submitMarkSquad.bind(null, season)}
            key={`markeren-${season}`}
            label={`Markeer de selectie van ${season} als compleet`}
          />
        </>
      ) : (
        <>
          <Text>
            {mark.by === null
              ? `Gemarkeerd als compleet op ${dayFormat.format(mark.markedAt)}, door een account dat niet meer bestaat.`
              : `Gemarkeerd als compleet door ${mark.by} op ${dayFormat.format(mark.markedAt)}.`}
          </Text>
          {mark.missing.length === 0 ? null : (
            <Notice>
              De markering telt nu niet op de site. In de lijst ontbreekt wie voor ons scoorde:{' '}
              {names.format(mark.missing)}.
            </Notice>
          )}
          <SquadMarkForm
            action={submitUnmarkSquad.bind(null, season)}
            key={`intrekken-${season}`}
            label={`Trek de markering van de selectie van ${season} in`}
          />
        </>
      )}
    </Card>
  )
}
