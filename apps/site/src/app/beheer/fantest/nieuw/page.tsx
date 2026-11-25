import type { Metadata } from 'next'

import { adminRoles } from '@fansite/db/schema'
import { Heading, Link, Page, Text } from '@fansite/design-system'

import { adminAreas } from '#src/beheer/areas'
import { compact } from '#src/beheer/density'
import { requireFantest } from '#src/beheer/require-fantest'
import { requireRole } from '#src/beheer/require-role'
import { monthName } from '#src/fans/fantest'
import { dayOf } from '#src/news'

import { submitNewQuiz } from '../actions'
import { NewQuizForm } from '../NewQuizForm'
import { quizzesPath } from '../paths'

// Render on each request: the months to choose from depend on today.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Nieuwe quiz' }

// The form for a new quiz: a month and a year. It starts at the next month.
export default async function NewQuizPage() {
  await requireRole(...adminRoles)
  requireFantest()

  const today = dayOf(new Date())
  const year = Number(today.slice(0, 4))
  const next = Number(today.slice(5, 7)) % 12

  return (
    <Page.Main areas={adminAreas} className={compact}>
      <Page.Cell area="head">
        <Heading level={1}>Nieuwe quiz</Heading>
        <Text appearance="intro">Kies de maand van de quiz. Per maand is er één quiz.</Text>
      </Page.Cell>
      <Page.Cell area="main">
        <NewQuizForm
          action={submitNewQuiz}
          initial={{ jaar: String(next === 0 ? year + 1 : year), maand: String(next + 1) }}
          months={Array.from({ length: 12 }, (_, index) => monthName(index + 1))}
          years={[year, year + 1]}
        />
        <Text>
          <Link href={quizzesPath}>Terug naar de quizzen</Link>
        </Text>
      </Page.Cell>
    </Page.Main>
  )
}
