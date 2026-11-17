import type { UnavailableField } from '@fansite/db/schema'

import { Button, Card, Form, Heading, Link, List, Text } from '@fansite/design-system'

import { longDayOf } from '#src/app/beheer/gap-table'
import { personPartPath } from '#src/app/beheer/personen/paths'

import { submitRemoveMark, submitRenewMark } from './marks-actions'

/** What the card says about a field, and the part of the form where it is filled in. */
const fields = {
  geboren: { name: 'geboortedatum', part: 'leven' },
  wikipedia: { name: 'Wikipedia-pagina', part: 'naam' },
} as const satisfies Record<UnavailableField, { name: string; part: 'leven' | 'naam' }>

export type UnavailableMark = { checkedOn: string; field: UnavailableField; name: string; personId: number }

/**
 * The gaps an editor marked as not available (issue 1308), for each the person, the field and
 * the day of the last check, with a button that checks it again today and a button that takes
 * the mark away. The buttons name the person and the field, because the list repeats them. No
 * marks, no card.
 */
export function UnavailableCard({ marks }: { marks: readonly UnavailableMark[] }) {
  if (marks.length === 0) {
    return null
  }

  return (
    <Card aria-labelledby="niet-beschikbaar-kop">
      <Heading id="niet-beschikbaar-kop" level={2}>
        Niet beschikbaar
      </Heading>
      <Text appearance="meta">
        Gaten die niemand kan vullen. Ze staan niet in de tabel. Komt het feit er alsnog, dan gaat de markering vanzelf
        weg.
      </Text>
      <List className="hf-flow" role="list">
        {marks.map((mark) => {
          const { name, part } = fields[mark.field]
          const about = `${name} van ${mark.name}`

          return (
            <List.Item key={`${mark.personId}-${mark.field}`}>
              <Text>
                <Link href={personPartPath(mark.personId, part)}>{mark.name}</Link>: {name}, laatst gecontroleerd op{' '}
                {longDayOf(mark.checkedOn)}
              </Text>
              <Form action={submitRenewMark.bind(null, mark.personId, mark.field)}>
                <Button appearance="soft" aria-label={`Nog steeds niet beschikbaar: ${about}`} type="submit">
                  Nog steeds niet beschikbaar
                </Button>
              </Form>
              <Form action={submitRemoveMark.bind(null, mark.personId, mark.field)}>
                <Button appearance="danger" aria-label={`Markering weghalen: ${about}`} type="submit">
                  Markering weghalen
                </Button>
              </Form>
            </List.Item>
          )
        })}
      </List>
    </Card>
  )
}
