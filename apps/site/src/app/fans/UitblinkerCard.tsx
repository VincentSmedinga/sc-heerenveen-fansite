import { Button, Card, Form, Heading, Link, Tag, Text } from '@fansite/design-system'
import { isFansPartOn } from '@fansite/shared/fans-env'

import { getDatabase } from '#src/database'
import { reasonOf } from '#src/errors'
import {
  closingText,
  deadlineTag,
  findOwnRatings,
  findRatingWindow,
  ratingPath,
  type RatingWindow,
} from '#src/fans/rating'

// The card of the game Uitblinker on the page Fans (issue 1470): a Tag that says how the game
// stands, and for a supporter who is logged in and has grades to give, the button that goes to
// the form. It exists only while the game is on.

/** What the card shows: the tag, the text, and whether it has the button. */
export type UitblinkerCardData = {
  button: boolean
  tag: { text: string; tone: 'closed' | 'neutral' | 'open' | 'todo' }
  text: string
}

/**
 * Reads what the card needs: the window, and how many grades the supporter gave. A failure is
 * logged and leaves the card out, so the page of Fans goes on.
 */
export async function readUitblinkerCard(
  supporter: undefined | { createdAt: Date; id: number },
  now = new Date(),
): Promise<UitblinkerCardData | undefined> {
  if (!isFansPartOn('uitblinker')) {
    return undefined
  }

  try {
    const { db } = getDatabase()
    const window = await findRatingWindow(db, now)
    const grades =
      supporter === undefined || window.state !== 'open'
        ? 0
        : (await findOwnRatings(db, supporter.id, window.match.id)).size

    return uitblinkerCardData(
      window,
      supporter === undefined ? undefined : { createdAt: supporter.createdAt, grades },
      now,
    )
  } catch (error) {
    console.error(`Could not read the game Uitblinker for the page Fans: ${reasonOf(error)}`)

    return undefined
  }
}

/** The card of the game, with its watermark. */
export function UitblinkerCard({ button, tag, text }: UitblinkerCardData) {
  return (
    <Card aria-labelledby="fans-uitblinker" game="uitblinker">
      <Heading id="fans-uitblinker" level={2}>
        Uitblinker
      </Heading>
      <Text>
        <Tag tone={tag.tone}>{tag.text}</Tag>
      </Text>
      <Text>{text}</Text>
      {button ? (
        // A form that only goes to the page: the design system has no link as a button.
        <Form action={ratingPath} method="get">
          <Button type="submit">Cijfers geven</Button>
        </Form>
      ) : (
        <Text>
          <Link href={ratingPath}>Naar de Uitblinker</Link>
        </Text>
      )}
    </Card>
  )
}

/**
 * Works out what the card says from the window and from what the supporter did. `supporter`
 * is empty for a visitor who is not logged in. An account that was made after the match began
 * does not take part in it, so it gets no button and no "Nog te doen".
 */
export function uitblinkerCardData(
  window: RatingWindow,
  supporter: undefined | { createdAt: Date; grades: number },
  now = new Date(),
): UitblinkerCardData {
  if (window.state === 'none' || window.state === 'closed') {
    return {
      button: false,
      tag: { text: 'Gesloten', tone: 'closed' },
      text: 'Geef de spelers na elke wedstrijd een cijfer. Het venster van de laatste wedstrijd is dicht.',
    }
  }

  if (window.state === 'waiting') {
    return {
      button: false,
      tag: { text: 'Nog niet open', tone: 'neutral' },
      text: 'Het verslag van de laatste wedstrijd is nog niet af. Zodra de redactie weet wie hoe lang speelde, kun je cijfers geven.',
    }
  }

  const players = window.players.length
  const takesPart = supporter !== undefined && supporter.createdAt.getTime() < window.startsAt.getTime()
  const done = takesPart && supporter.grades >= players
  const open = { text: deadlineTag(window.closesAt, now), tone: 'open' } as const

  if (!takesPart) {
    return { button: false, tag: open, text: 'Geef de spelers van de laatste wedstrijd een cijfer.' }
  }

  return {
    button: true,
    tag: done ? open : { text: 'Nog te doen', tone: 'todo' },
    text: `Geef ${players} spelers een cijfer. Kan tot ${closingText(window.closesAt)}.`,
  }
}
