import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { Card, Heading, Link, List, Page, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound } from 'next/navigation'

import { getDatabase } from '#src/database'
import {
  archiveCredit,
  type ArchiveMonth,
  averageText,
  capital,
  fantestPath,
  loadArchive,
  monthPath,
  monthSlug,
  monthTitle,
} from '#src/fans/fantest'
import { currentMonth, findEntry, loadMonthQuiz, type MonthQuiz } from '#src/fans/fantest-entry'
import { currentSupporter } from '#src/fans/require-supporter'
import { mayTakePart } from '#src/fans/take-part'
import { FocusOnLoad } from '#src/FocusOnLoad'
import { pageMetadata } from '#src/metadata'
import { pageAreas } from '#src/page-areas'

import { BlockedCard, JoinCard, Message, messages, ScoreCard } from './MonthQuizCards'
import { MonthQuizForm } from './MonthQuizForm'

const areas = pageAreas({ main: ['month', 'archive'] })

const messageId = 'fantest-melding'

// Render on each request: the setting of the Fantest is read when a request comes in, the quiz
// and the months come from the database, and who is logged in decides what the page shows.
export const dynamic = 'force-dynamic'

export const generateMetadata = async (): Promise<Metadata> => {
  requireFansPart('fantest', notFound)

  const metadata = pageMetadata(fantestPath, 'Fantest')

  // A visitor, such as a search engine, gets the page that is the same for everyone. What a
  // supporter sees is personal.
  return (await currentSupporter()) === undefined ? metadata : { ...metadata, robots: { follow: false, index: false } }
}

/**
 * The page of the Fantest. First the quiz of the editors for the running month (issue 1482): a
 * supporter who is logged in and may take part answers it once and then sees the score, a
 * visitor sees the introduction and the way in, and a blocked account an explanation. No right
 * answer is read for this page. Under it the archive (issue 1480): one card for each year, the
 * newest first, with a link for each month that has a quiz of the old fansite and, under it,
 * how the fans of then did on average. With the Fantest off the page is "niet gevonden".
 */
export default async function FantestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  requireFansPart('fantest', notFound)

  const now = new Date()
  const { db } = getDatabase()
  const [quiz, supporter, parameters, archive] = await Promise.all([
    loadMonthQuiz(db, now),
    currentSupporter(now),
    searchParams,
    loadArchive(db),
  ])
  const { month, year } = currentMonth(now)
  const when = monthTitle(year, month)
  const message = (Object.keys(messages) as (keyof typeof messages)[]).find((name) => parameters[name] === '1')

  let card: ReactNode = null

  if (quiz !== undefined) {
    card = await cardOf(quiz, supporter, monthSlug(year, month))
  }

  return (
    <Page.Main areas={areas}>
      <Page.Cell area="head">
        <Heading level={1}>Fantest</Heading>
        <Text appearance="intro">Elke maand tien vragen over sc Heerenveen.</Text>
      </Page.Cell>
      <Page.Cell area="month">
        <Heading id="fantest-maand" level={2}>
          {capital(when)}
        </Heading>
        {/* A notice is about this supporter, so a visitor with the same address sees none. A
            quiz that closed may leave a month without a new one. */}
        {message === undefined || supporter === undefined ? null : (
          <>
            <Message id={messageId}>{messages[message]}</Message>
            <FocusOnLoad id={messageId} />
          </>
        )}
        {quiz === undefined ? (
          <Text>Voor {when} staat er geen Fantest klaar.</Text>
        ) : (
          <>
            <Paragraphs text={quiz.intro} />
            {card}
          </>
        )}
      </Page.Cell>
      <Page.Cell area="archive">
        <Heading level={2}>Fantest van toen</Heading>
        <Text>
          Van december 2001 tot oktober 2005 had de Fansite elke maand een Fantest: tien vragen over de club. Speel ze
          na. Je score van deze oude quizzen bewaren we niet.
        </Text>
        <Text appearance="meta">{archiveCredit}</Text>
        {byYear(archive).map(({ months, year: archiveYear }) => (
          <Card aria-labelledby={`fantest-${archiveYear}`} key={archiveYear}>
            <Heading id={`fantest-${archiveYear}`} level={3}>
              {archiveYear}
            </Heading>
            <List>
              {months.map((item) => (
                <List.Item key={item.month}>
                  <Link href={monthPath(item.year, item.month)}>{capital(monthTitle(item.year, item.month))}</Link>
                  {item.averageTenths === undefined ? null : (
                    <Text appearance="meta">
                      Toen gemiddeld {averageText(item.averageTenths)} van {item.questions}
                    </Text>
                  )}
                </List.Item>
              ))}
            </List>
          </Card>
        ))}
      </Page.Cell>
    </Page.Main>
  )
}

/** The months by year: the newest first, in the years and in each year. */
function byYear(months: readonly ArchiveMonth[]) {
  const years = new Map<number, ArchiveMonth[]>()

  for (const month of months) {
    years.set(month.year, [...(years.get(month.year) ?? []), month])
  }

  return [...years]
    .sort(([a], [b]) => b - a)
    .map(([year, list]) => ({ months: list.sort((a, b) => b.month - a.month), year }))
}

/** What stands under the introduction, for who is looking. */
async function cardOf(quiz: MonthQuiz, supporter: Awaited<ReturnType<typeof currentSupporter>>, month: string) {
  if (supporter === undefined) {
    return <JoinCard />
  }

  if (!mayTakePart(supporter)) {
    return <BlockedCard />
  }

  const entry = await findEntry(getDatabase().db, supporter.id, quiz.id)

  if (entry !== undefined) {
    return <ScoreCard questions={quiz.questions.length} score={entry.score} />
  }

  return (
    <>
      <Text>
        Kies bij elke vraag één antwoord. Je doet één keer mee: wat je verstuurt, kun je niet meer wijzigen. Daarna zie
        je je score.
      </Text>
      <MonthQuizForm month={month} questions={quiz.questions} version={quiz.version} />
    </>
  )
}

/** Plain text as paragraphs: every line with text is one. */
function Paragraphs({ text }: { text: string }) {
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line, index) => <Text key={index}>{line}</Text>)
}
