import type { Metadata } from 'next'

import { adminRoles, quizLimits } from '@fansite/db/schema'
import { Card, Heading, Link, Page, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { toolbarAreas } from '#src/beheer/areas'
import { compact } from '#src/beheer/density'
import { quizFormId } from '#src/beheer/form-ids'
import { parseItemId } from '#src/beheer/items'
import { type AdminQuiz, findQuiz, monthPassed } from '#src/beheer/quizzes'
import { requireFantest } from '#src/beheer/require-fantest'
import { requireRole } from '#src/beheer/require-role'
import { SaveButtons } from '#src/beheer/SaveButtons'
import { getDatabase } from '#src/database'
import { capital, monthTitle } from '#src/fans/fantest'

import { submitQuiz } from '../actions'
import { quizPreviewPath, quizzesPath } from '../paths'
import { QuizForm, type QuizFormStage } from '../QuizForm'

// Render on each request: the quiz changes with every save.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Quiz bewerken' }

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// The form of one quiz of the editors (issue 1481), with where it stands and a link to the
// preview. The notice after an action is told only when the quiz is in that state.
export default async function QuizPage({ params, searchParams }: Props) {
  await requireRole(...adminRoles)
  requireFantest()

  const id = parseItemId((await params).id)
  const quiz = id === undefined ? undefined : await findQuiz(getDatabase().db, id)

  if (quiz === undefined) {
    notFound()
  }

  const { month, year } = quiz
  const stage: QuizFormStage = quiz.locked ? 'locked' : quiz.status
  const { gedaan } = await searchParams
  const notice = noticeFor(gedaan, quiz)

  return (
    <Page.Main areas={toolbarAreas} className={compact}>
      <Page.Cell area="head">
        <Heading level={1}>Quiz bewerken</Heading>
        <Text appearance="intro">{capital(monthTitle(year, month))}</Text>
        {/* The error about the month links here: the month is not a field of the form. */}
        <Text id="maand" tabIndex={-1}>
          {stateText(quiz, new Date())} <Link href={quizPreviewPath(quiz.id)}>Voorbeeld</Link>
        </Text>
      </Page.Cell>
      <Page.Toolbar>
        <SaveButtons
          buttons={[
            { label: 'Opslaan' },
            ...(stage === 'draft'
              ? [{ appearance: 'soft' as const, label: 'Quiz publiceren', value: 'publiceren' }]
              : []),
          ]}
          cancelHref={quizzesPath}
          formId={quizFormId}
        />
      </Page.Toolbar>
      <Page.Cell area="main">
        {notice === undefined ? null : (
          <Card aria-labelledby="gedaan-kop" surface="soft">
            <Heading id="gedaan-kop" level={2}>
              {notice.title}
            </Heading>
            <Text>{notice.text}</Text>
          </Card>
        )}
        <QuizForm
          action={submitQuiz.bind(null, quiz.id)}
          initial={quiz.values}
          // A new text from the server, such as after a question moved, starts the form anew.
          key={`${stage}-${JSON.stringify(quiz.values)}`}
          maxLengths={quizLimits}
          stage={stage}
        />
        <Text>
          <Link href={quizzesPath}>Terug naar de quizzen</Link>
        </Text>
      </Page.Cell>
    </Page.Main>
  )
}

/** The notice for what the last action did, or undefined. */
function noticeFor(done: string | string[] | undefined, { locked, status }: AdminQuiz) {
  switch (done) {
    case 'gemaakt':
      return { text: 'De quiz is bewaard als concept. Vul de vragen in.', title: 'Quiz gemaakt' }
    case 'gepubliceerd':
      return status === 'published' ? { text: 'De quiz is gepubliceerd.', title: 'Gepubliceerd' } : undefined
    case 'ongewijzigd':
      return { text: 'Je had niets veranderd, dus er is niets opgeslagen.', title: 'Niets veranderd' }
    case 'opgeslagen':
      return { text: 'Je wijzigingen zijn bewaard.', title: 'Opgeslagen' }
    case 'vergrendeld':
      return locked
        ? { text: 'De slottekst en “alles goed” zijn bewaard. De vragen zijn vergrendeld.', title: 'Opgeslagen' }
        : undefined
    case 'verplaatst':
      return { text: 'De vraag is verplaatst en je wijzigingen zijn bewaard.', title: 'Vraag verplaatst' }
    default:
      return undefined
  }
}

/** Where the quiz stands, in a sentence or two. */
function stateText({ locked, month, status, year }: AdminQuiz, now: Date) {
  if (locked) {
    return 'Deze quiz is ingevuld, dus de vragen en antwoorden zijn vergrendeld. Je kunt de slottekst veranderen en een vraag op “alles goed” zetten.'
  }

  if (status === 'published') {
    return 'Deze quiz is gepubliceerd. Zolang niemand hem heeft ingevuld, kun je hem nog veranderen; alle vragen moeten dan compleet blijven.'
  }

  return monthPassed(year, month, now)
    ? 'Deze quiz is een concept. De maand is voorbij, dus publiceren kan niet meer.'
    : 'Deze quiz is een concept. Je kunt hem onaf opslaan. Publiceren kan als alle tien vragen compleet zijn.'
}
