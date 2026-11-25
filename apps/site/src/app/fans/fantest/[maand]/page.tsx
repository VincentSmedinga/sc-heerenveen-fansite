import type { Metadata } from 'next'

import { Heading, Link, Page, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound } from 'next/navigation'

import { getDatabase } from '#src/database'
import { archiveCredit, fantestPath, loadQuiz, monthPath, monthTitle, parseMonthSlug } from '#src/fans/fantest'
import { urlOf } from '#src/metadata'
import { pageAreas } from '#src/page-areas'

import { QuizForm } from './QuizForm'

const areas = pageAreas({ back: true, main: ['quiz'] })

// Render on each request: the setting of the Fantest is read when a request comes in, and the
// questions come from the database, so the build knows neither.
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ maand: string }> }

/**
 * The page of one month of the Fantest (issue 1480): the questions of that month of the old
 * fansite, a form without JavaScript that checks them, and after the check the right answers
 * with how the fans of then answered. The page is the same for every visitor, holds nothing
 * personal, sets no cookie and stores no answer. With the Fantest off, or for a month without a
 * quiz, it is "niet gevonden".
 */
export default async function FantestMonthPage({ params }: Params) {
  const quiz = await quizOf((await params).maand)
  const when = monthTitle(quiz.year, quiz.month)

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
        <Text appearance="intro">{archiveCredit}</Text>
      </Page.Cell>
      <Page.Cell area="quiz">
        <QuizForm
          averageTenths={quiz.averageTenths}
          month={quiz.month}
          participants={quiz.participants}
          questions={quiz.questions}
          when={when}
          year={quiz.year}
        />
      </Page.Cell>
    </Page.Main>
  )
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const quiz = await quizOf((await params).maand)
  const title = `Fantest ${monthTitle(quiz.year, quiz.month)}`

  // The page is the same for everyone and holds nothing personal, so it may be indexed.
  return {
    alternates: { canonical: urlOf(monthPath(quiz.year, quiz.month)) },
    description: `${title}: ${quiz.questions.length === 10 ? 'tien' : quiz.questions.length} vragen over sc Heerenveen uit het archief van de Fansite. Speel ze na.`,
    title,
  }
}

async function quizOf(slug: string) {
  requireFansPart('fantest', notFound)

  const month = parseMonthSlug(slug)
  const quiz = month === undefined ? undefined : await loadQuiz(getDatabase().db, month.year, month.month)

  if (quiz === undefined) {
    notFound()
  }

  return quiz
}
