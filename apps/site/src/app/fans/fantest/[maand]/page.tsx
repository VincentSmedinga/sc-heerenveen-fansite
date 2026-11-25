import type { Metadata } from 'next'

import { CardLink, Heading, Link, Page, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound } from 'next/navigation'

import { getDatabase } from '#src/database'
import { archiveCredit, fantestPath, monthPath, monthTitle, parseMonthSlug } from '#src/fans/fantest'
import { closedFigures, findAnswers, loadQuiz, withFigures } from '#src/fans/fantest-months'
import { currentSupporter } from '#src/fans/require-supporter'
import { mayTakePart } from '#src/fans/take-part'
import { urlOf } from '#src/metadata'
import { pageAreas } from '#src/page-areas'

import { Paragraphs } from '../Paragraphs'
import { QuizResult } from '../QuizResult'
import { QuizForm } from './QuizForm'

const areas = pageAreas({ back: true, main: ['quiz'] })

// Render on each request: the setting of the Fantest is read when a request comes in, the
// questions come from the database, and who is logged in decides what the page shows.
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ maand: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * The page of one month of the Fantest that is over.
 *
 * A month of the old fansite (issue 1480) is a form without JavaScript that checks the answers,
 * and after the check the right answers with how the fans of then answered.
 *
 * A month of the editors (issue 1484) opens with the result, for everybody: the right answer of
 * each question, how everybody did and the closing text. A supporter who took part also sees
 * their own answers and score, counted with the key as it is now. Anybody else can play it
 * (`?spelen=1`) with the same form as the old months, outside the ranking.
 *
 * Playing sets no cookie and stores no answer. With the Fantest off, for a month without a quiz
 * and for the running month it is "niet gevonden".
 */
export default async function FantestMonthPage({ params, searchParams }: Props) {
  const { quiz: found, supporter } = await quizOf((await params).maand)
  const when = monthTitle(found.year, found.month)
  const quiz = found.recent === undefined ? found : withFigures(found, (await closedFigures()).get(found.id))
  const answers = await answersOf(supporter, found)
  // Who took part reads their own result: there is nothing left to play.
  const playing = quiz.recent === undefined || (answers === undefined && (await searchParams)['spelen'] === '1')
  const path = monthPath(quiz.year, quiz.month)
  const play = `${path}?spelen=1`

  return (
    <Page.Main areas={areas}>
      <Page.Back>
        <Text>
          <Link href={fantestPath} icon="arrow-left">
            Fantest
          </Link>
        </Text>
      </Page.Back>
      <Page.Cell area="head">
        <Heading level={1}>Fantest {when}</Heading>
        {quiz.recent === undefined ? (
          <Text appearance="intro">{archiveCredit}</Text>
        ) : (
          <Paragraphs text={quiz.recent.intro} />
        )}
      </Page.Cell>
      <Page.Cell area="quiz">
        {playing ? (
          <QuizForm again={quiz.recent === undefined ? path : play} quiz={quiz} />
        ) : (
          <>
            {answers === undefined ? <CardLink href={play}>Speel deze quiz zelf</CardLink> : null}
            <QuizResult answers={answers} quiz={quiz} />
          </>
        )}
      </Page.Cell>
    </Page.Main>
  )
}

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { quiz, supporter } = await quizOf((await params).maand)
  const title = `Fantest ${monthTitle(quiz.year, quiz.month)}`
  const questions = `${quiz.questions.length === 10 ? 'tien' : quiz.questions.length} vragen over sc Heerenveen`
  const metadata: Metadata = {
    alternates: { canonical: urlOf(monthPath(quiz.year, quiz.month)) },
    description:
      quiz.recent === undefined
        ? `${title}: ${questions} uit het archief van de Fansite. Speel ze na.`
        : `${title}: ${questions}, met de goede antwoorden.`,
    title,
  }

  // The page of a visitor is the same for everyone, so it may be indexed. What a supporter who
  // took part sees is personal.
  return (await answersOf(supporter, quiz)) === undefined
    ? metadata
    : { ...metadata, robots: { follow: false, index: false } }
}

/** The answers of a supporter who took part and may still take part, of the editors only. */
async function answersOf(
  supporter: Awaited<ReturnType<typeof currentSupporter>>,
  quiz: { id: number; recent?: unknown },
) {
  return quiz.recent === undefined || supporter === undefined || !mayTakePart(supporter)
    ? undefined
    : findAnswers(getDatabase().db, supporter.id, quiz.id)
}

async function quizOf(slug: string) {
  requireFansPart('fantest', notFound)

  const month = parseMonthSlug(slug)
  const quiz = month === undefined ? undefined : await loadQuiz(getDatabase().db, month.year, month.month)

  if (quiz === undefined) {
    notFound()
  }

  // An old month shows nothing personal, so it doesn't look who is there.
  return { quiz, supporter: quiz.recent === undefined ? undefined : await currentSupporter() }
}
