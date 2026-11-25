import type { Metadata } from 'next'

import { adminRoles } from '@fansite/db/schema'
import { Card, Heading, Link, Notice, Page, QuizQuestion, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { quizPath } from '#src/app/beheer/fantest/paths'
import { singleAreas } from '#src/beheer/areas'
import { compact } from '#src/beheer/density'
import { parseItemId } from '#src/beheer/items'
import { questionField, type QuestionValues } from '#src/beheer/quiz-fields'
import { findQuiz } from '#src/beheer/quizzes'
import { requireFantest } from '#src/beheer/require-fantest'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'
import { monthTitle } from '#src/fans/fantest'

// Render on each request, and never keep it: a preview shows a draft. The admin sends
// `Cache-Control: no-store` and `X-Robots-Tag: noindex` for every path under /beheer.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Voorbeeld van een quiz' }

// The quiz as a supporter sees it before sending it in, made of the same `QuizQuestion`, from
// what is saved (issue 1481). There is no form around the questions and no button to send them,
// so a choice here is stored nowhere. The right answers are not in the page.
export default async function QuizPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(...adminRoles)
  requireFantest()

  const id = parseItemId((await params).id)
  const quiz = id === undefined ? undefined : await findQuiz(getDatabase().db, id)

  if (quiz === undefined) {
    notFound()
  }

  const { intro, slottekst, vragen } = quiz.values

  return (
    <Page.Main areas={singleAreas} className={compact}>
      <Page.Cell area="main">
        <Card aria-labelledby="voorbeeld-kop" surface="soft">
          <Heading id="voorbeeld-kop" level={2}>
            Voorbeeld
          </Heading>
          <Text>
            Zo ziet een fan deze quiz, met wat nu is opgeslagen. Je keuzes worden niet bewaard.{' '}
            <Link href={quizPath(quiz.id)}>Terug naar het formulier</Link>
          </Text>
        </Card>
        <Heading level={1}>Fantest {monthTitle(quiz.year, quiz.month)}</Heading>
        <Paragraphs text={intro} />
        {vragen.map((question, index) =>
          isComplete(question) ? (
            <QuizQuestion
              answers={question.antwoorden}
              id={questionField(index + 1)}
              key={index}
              name={questionField(index + 1)}
              number={index + 1}
              question={question.tekst}
              total={vragen.length}
            />
          ) : (
            <Notice key={index}>Vraag {index + 1} is nog niet compleet.</Notice>
          ),
        )}
        <Card aria-labelledby="slot-kop">
          <Heading id="slot-kop" level={2}>
            Na het insturen
          </Heading>
          {slottekst === '' ? <Text appearance="meta">Er is geen slottekst.</Text> : <Paragraphs text={slottekst} />}
        </Card>
      </Page.Cell>
    </Page.Main>
  )
}

/** A question a supporter can answer: a text and four answers. */
const isComplete = ({ antwoorden, tekst }: QuestionValues) =>
  tekst !== '' && antwoorden.every((answer) => answer !== '')

/** Plain text as paragraphs: every line with text is one. */
function Paragraphs({ text }: { text: string }) {
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line, index) => <Text key={index}>{line}</Text>)
}
