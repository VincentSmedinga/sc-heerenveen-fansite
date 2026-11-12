import type { Metadata } from 'next'

import { Filter, Heading, Link, Notice, Page, Strong, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'
import { Fragment } from 'react'

import { submitPerson } from '#src/app/beheer/personen/actions'
import { personPartPath, personPath } from '#src/app/beheer/personen/paths'
import { PersonForm } from '#src/app/beheer/personen/PersonForm'
import { playerPath, playersPath } from '#src/app/beheer/spelers/paths'
import { backPathOf } from '#src/app/beheer/wedstrijden/paths'
import { countryChoices } from '#src/beheer/countries'
import { compact } from '#src/beheer/density'
import { parseItemId } from '#src/beheer/items'
import { isPersonPart, type PersonPart, personPartLabels, personParts } from '#src/beheer/person-fields'
import { findAdminPerson, personNameOf, personValuesOf } from '#src/beheer/person-form'
import { isPersonGapColumn, personColumnParts } from '#src/beheer/person-table'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

type Props = {
  params: Promise<{ deel?: string[]; id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// Render on each request: the person changes with every save and every import.
export const dynamic = 'force-dynamic'

/** What the tab says: "Persoon bewerken", or with a part "Persoon bewerken: leven". */
export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const part = partOf((await params).deel)

  return {
    robots: { follow: false, index: false },
    title: part === undefined || part === null ? 'Persoon bewerken' : `Persoon bewerken: ${part}`,
  }
}

/** What the last action says, by the word in the address. */
const notices: Record<string, { text: string; title: string }> = {
  ongewijzigd: { text: 'Je had niets veranderd, dus er is niets opgeslagen.', title: 'Niets veranderd' },
  opgeslagen: { text: 'Je invoer is bewaard.', title: 'Opgeslagen' },
  'volgende-ongewijzigd': {
    text: 'Bij de vorige persoon had je niets veranderd. Dit is de volgende persoon met een gat in deze kolom.',
    title: 'Volgende',
  },
  'volgende-opgeslagen': {
    text: 'De vorige persoon is opgeslagen. Dit is de volgende persoon met een gat in deze kolom.',
    title: 'Volgende',
  },
}

/**
 * The form of one person in one column (issue 1164): his name as the heading, the seasons he
 * played in as links to the form of his player in that season, a navigation to the parts, and
 * the cards of the form with the card Opslaan. A part shows only its own card with the card
 * Opslaan, and saves only its own fields. The page tells what the last action did from the
 * word in the address.
 */
export default async function PersonPage({ params, searchParams }: Props) {
  await requireRole('owner', 'editor')

  const { deel, id: rawId } = await params
  const part = partOf(deel)

  if (part === null) {
    notFound()
  }

  const id = parseItemId(rawId)
  const found = id === undefined ? undefined : await findAdminPerson(getDatabase().db, id)

  if (id === undefined || found === undefined) {
    notFound()
  }

  const { gedaan, kolom, terug } = await searchParams
  const back = backPathOf(terug)
  // The column of the table of Kwaliteit the editor works through, when it leads to this part.
  const column = isPersonGapColumn(kolom) && part === personColumnParts[kolom] ? kolom : undefined
  const initial = personValuesOf(found)
  const notice = typeof gedaan === 'string' && Object.hasOwn(notices, gedaan) ? notices[gedaan] : undefined
  const navigation = [
    { current: part === undefined, href: personPath(id, { back }), label: 'Alles' },
    ...personParts.map((shown) => ({
      current: part === shown,
      href: personPartPath(id, shown, { back }),
      label: personPartLabels[shown],
    })),
  ]

  return (
    <Page.Main
      className={compact}
      intro={
        <>
          <Text>
            <Link href={back ?? playersPath} icon="arrow-left">
              {back === undefined ? 'Terug naar Spelers' : 'Terug'}
            </Link>
          </Text>
          <Heading level={1}>{personNameOf(found.person)}</Heading>
          <Text appearance="meta">
            {found.seasons.length === 0 ? (
              'Nog in geen seizoen in onze selectie.'
            ) : (
              <>
                In onze selectie:{' '}
                {found.seasons.map((player, index) => (
                  <Fragment key={player.id}>
                    {index === 0 ? null : ', '}
                    <Link href={playerPath(player.id)}>{player.season}</Link>
                  </Fragment>
                ))}
              </>
            )}
          </Text>
          <Filter items={navigation} label="Delen van de persoon" />
          {part === undefined ? null : (
            <Text>
              <Link href={personPath(id, { back })}>Hele persoon bewerken</Link>
            </Text>
          )}
        </>
      }
      wide
    >
      {notice === undefined ? null : (
        <Notice>
          <Strong>{notice.title}.</Strong> {notice.text}
        </Notice>
      )}
      <PersonForm
        action={submitPerson.bind(null, id, part, back, column)}
        cancelHref={back ?? playersPath}
        countries={countryChoices()}
        initial={initial}
        // A second save on the same address must open the form anew, with what is stored now.
        key={`${id}-${part ?? ''}-${gedaan ?? ''}-${JSON.stringify(initial)}`}
        next={column !== undefined}
        part={part}
      />
    </Page.Main>
  )
}

/**
 * The part an address names: `undefined` for the whole form, and `null` for an address that is
 * no part, which is not found.
 */
function partOf(deel: string[] | undefined): null | PersonPart | undefined {
  if (deel === undefined || deel.length === 0) {
    return undefined
  }

  const [name] = deel

  return deel.length === 1 && name !== undefined && isPersonPart(name) ? name : null
}
