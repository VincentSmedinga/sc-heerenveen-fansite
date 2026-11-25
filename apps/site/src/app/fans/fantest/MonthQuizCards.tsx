import { Card, Heading, Link, Notice, Strong, Text } from '@fansite/design-system'

// The cards around the quiz of the running month (issue 1482). None of them gets a right
// answer.

/** What the page says after a form that was sent, by the name in the address. */
export const messages = {
  al: 'Je hebt al meegedaan aan deze Fantest. Er is niets opnieuw bewaard.',
  gesloten: 'De Fantest van je formulier is gesloten. Je antwoorden zijn niet bewaard.',
  gewijzigd: 'De redactie heeft de vragen net gewijzigd. Je antwoorden zijn niet bewaard. Beantwoord ze opnieuw.',
  verstuurd: 'Je antwoorden zijn verstuurd.',
} as const

/** Why a blocked account gets no questions. */
export function BlockedCard() {
  return (
    <Card aria-labelledby="fantest-geblokkeerd">
      <Heading id="fantest-geblokkeerd" level={3}>
        Je account is geblokkeerd
      </Heading>
      <Text>
        De redactie heeft je account geblokkeerd. Daarom doe je niet mee aan de Fantest. Denk je dat dit niet klopt? Dat
        kun je melden via <Link href="/contact">Contact</Link>.
      </Text>
    </Card>
  )
}

/** The notice after a form that was sent, which says what happened. */
export function Message({ children, id }: { children: string; id: string }) {
  return (
    <Notice id={id} tabIndex={-1}>
      {children}
    </Notice>
  )
}

/** The score of a supporter who took part. Which answers were right stays unsaid. */
export function ScoreCard({ questions, score }: { questions: number; score: number }) {
  return (
    <Card aria-labelledby="fantest-score-kop" game="fantest">
      <Heading id="fantest-score-kop" level={3}>
        Je score
      </Heading>
      <Text>
        <Strong>
          {score} van {questions}
        </Strong>
      </Text>
      <Text>Welke antwoorden goed waren, zie je als de maand voorbij is. Je doet één keer mee.</Text>
    </Card>
  )
}
