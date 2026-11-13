import type { Metadata } from 'next'

import { persons } from '@fansite/db/schema'
import { Button, Card, Form, Heading, Link, Notice, Page, Text } from '@fansite/design-system'
import { eq } from 'drizzle-orm'

import { adminAreas } from '#src/beheer/areas'
import { compact } from '#src/beheer/density'
import { parseItemId } from '#src/beheer/items'
import { requireRole } from '#src/beheer/require-role'
import { parseSkipped, readNextQuestion, sideQuizPath } from '#src/beheer/side-quiz'
import { usualSlotsPath } from '#src/beheer/usual-slots'
import { getDatabase } from '#src/database'

import { submitSide } from './actions'
import { QuestionHeading } from './QuestionHeading'

// Render on each request: who is logged in and what the database holds are not known when the
// site is built.
export const dynamic = 'force-dynamic'

const title = 'Aan welke kant speelde hij?'

export const metadata: Metadata = { robots: { follow: false, index: false }, title }

const sideWords = { links: 'links', midden: 'midden', rechts: 'rechts' } as const

/** What a button of the quiz says; a screen reader also hears the name of the player. */
const sideLabels = { links: 'Links', midden: 'Midden', rechts: 'Rechts' } as const

/**
 * The quiz for the side of a player (issue 1194): one player at a time, with his usual slot in
 * a 4-3-3 from the old line-ups, and three buttons. The answer and the skip are submit buttons,
 * so it works without JavaScript. After an answer the heading of the next player has the focus,
 * and a note that is a status says what was saved.
 */
export default async function SideQuizPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireRole('owner', 'editor')

  const query = await searchParams
  const { db } = getDatabase()
  const skipped = parseSkipped(typeof query['over'] === 'string' ? query['over'] : undefined)
  const answeredId = parseItemId(typeof query['gedaan'] === 'string' ? query['gedaan'] : undefined)
  const [answered] = answeredId === undefined ? [] : await db.select().from(persons).where(eq(persons.id, answeredId))
  const next = await readNextQuestion(db, skipped)

  return (
    <Page.Main areas={adminAreas} className={compact}>
      <Page.Cell area="head">
        <Text>
          <Link href={usualSlotsPath} icon="arrow-left">
            Vaste plaatsen
          </Link>
        </Text>
        <Heading level={1}>{title}</Heading>
        <Text appearance="intro">Gezien in de richting van de aanval. Een speler zonder vaste kant sla je over.</Text>
      </Page.Cell>
      <Page.Cell area="main">
        {/* Empty until a player was answered, then it says what was saved. */}
        <Notice>
          {answered?.side === null || answered?.side === undefined
            ? ''
            : `${answered.name ?? 'De speler'}: ${sideWords[answered.side]} opgeslagen.`}
        </Notice>
        {next === undefined ? (
          <Card aria-labelledby="vraag-kop">
            <QuestionHeading focus={answeredId !== undefined || skipped.length > 0} personId={0}>
              {skipped.length === 0
                ? 'Alle spelers hebben een kant.'
                : 'Je hebt alle spelers gehad die nog een kant nodig hebben.'}
            </QuestionHeading>
            <Text>
              <Link href={skipped.length === 0 ? usualSlotsPath : sideQuizPath}>
                {skipped.length === 0 ? 'Terug naar de vaste plaatsen' : 'Begin opnieuw met de overgeslagen spelers'}
              </Link>
            </Text>
          </Card>
        ) : (
          <Card aria-labelledby="vraag-kop">
            <QuestionHeading focus={answeredId !== undefined || skipped.length > 0} personId={next.question.personId}>
              {next.question.name}
            </QuestionHeading>
            <Text appearance="meta">
              {[next.question.line, next.question.years].filter((part) => part !== '').join(', ')}
              {next.question.line === '' && next.question.years === '' ? 'Geen linie bekend.' : ''}
            </Text>
            <Text>
              In een 4-3-3 stond hij {next.question.percentage}% van zijn {next.question.matches} wedstrijden als{' '}
              {next.question.slot}. Nog {next.left} {next.left === 1 ? 'speler' : 'spelers'} te gaan.
            </Text>
            <Form action={submitSide.bind(null, next.question.personId, skipped.join(','))}>
              <Form.Buttons>
                {(['links', 'midden', 'rechts'] as const).map((side) => (
                  <Button key={side} name="knop" type="submit" value={side}>
                    {sideLabels[side]}
                    <Text as="span" className="hf-visually-hidden">
                      , {next.question.name}
                    </Text>
                  </Button>
                ))}
                <Button appearance="soft" name="knop" type="submit" value="overslaan">
                  Overslaan
                  <Text as="span" className="hf-visually-hidden">
                    , {next.question.name}
                  </Text>
                </Button>
              </Form.Buttons>
            </Form>
          </Card>
        )}
      </Page.Cell>
    </Page.Main>
  )
}
