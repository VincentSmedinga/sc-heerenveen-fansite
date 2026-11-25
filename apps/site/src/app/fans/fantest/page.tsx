import type { Metadata } from 'next'

import { Card, CardLink, Heading, KeyFigures, Link, List, Page, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound } from 'next/navigation'
import { Fragment } from 'react'

import { getDatabase } from '#src/database'
import {
  archiveCredit,
  averageText,
  capital,
  fantestPath,
  fantestRankingPath,
  mixedArchiveCredit,
  monthPath,
  monthSlug,
  monthTitle,
  quizMinimum,
} from '#src/fans/fantest'
import { currentMonth, findEntry, loadMonthQuiz, type MonthQuiz } from '#src/fans/fantest-entry'
import { type ArchiveMonth, averageOf, closedFigures, loadArchive, type MonthFigures } from '#src/fans/fantest-months'
import { currentSupporter } from '#src/fans/require-supporter'
import { mayTakePart } from '#src/fans/take-part'
import { FocusOnLoad } from '#src/FocusOnLoad'
import { pageMetadata } from '#src/metadata'
import { pageAreas } from '#src/page-areas'

import { LogInCard } from '../inloggen/LogInCard'
import { BlockedCard, Message, messages, ScoreCard } from './MonthQuizCards'
import { MonthQuizForm } from './MonthQuizForm'
import { Paragraphs } from './Paragraphs'
import { participantsText } from './QuizResult'

const areas = pageAreas({ main: ['month', 'latest', 'archive'] })
const areasWithoutLatest = pageAreas({ main: ['month', 'archive'] })

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
 * answer is read for this page. Then the figures of the last quiz of the editors that is over
 * (issue 1484), with a link to its right answers. Under that the months that are over: one card
 * for each year, the newest first, with a link for each month that has a quiz of the old
 * fansite (issue 1480) or of the editors and, under it, the average. With the Fantest off the
 * page is "niet gevonden".
 */
export default async function FantestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  requireFansPart('fantest', notFound)

  const now = new Date()
  const { db } = getDatabase()
  const [quiz, supporter, parameters, archive, figures] = await Promise.all([
    loadMonthQuiz(db, now),
    currentSupporter(now),
    searchParams,
    loadArchive(db, now),
    closedFigures(),
  ])
  const latest = archive.find((item) => item.source === 'redactie')
  const { month, year } = currentMonth(now)
  const when = monthTitle(year, month)
  // Only a supporter who may take part and did has an entry.
  const entry =
    quiz !== undefined && supporter !== undefined && mayTakePart(supporter)
      ? await findEntry(db, supporter.id, quiz.id)
      : undefined
  // A notice is about this supporter, so a visitor with the same address sees none. That the
  // answers are stored is only said when they are.
  const message = (Object.keys(messages) as (keyof typeof messages)[]).find(
    (name) =>
      parameters[name] === '1' &&
      supporter !== undefined &&
      (entry !== undefined || (name !== 'al' && name !== 'verstuurd')),
  )

  return (
    <Page.Main areas={latest === undefined ? areasWithoutLatest : areas}>
      <Page.Cell area="head">
        <Heading level={1}>Fantest</Heading>
        <Text appearance="intro">Elke maand tien vragen over sc Heerenveen.</Text>
      </Page.Cell>
      <Page.Cell area="month">
        <Heading id="fantest-maand" level={2}>
          {capital(when)}
        </Heading>
        {/* The key gives each notice the focus, also when one follows another. */}
        {message === undefined ? null : (
          <Fragment key={message}>
            <Message id={messageId}>{messages[message]}</Message>
            <FocusOnLoad id={messageId} />
          </Fragment>
        )}
        {quiz === undefined ? (
          <Text>Voor {when} staat er geen Fantest klaar.</Text>
        ) : (
          <>
            <Paragraphs text={quiz.intro} />
            {cardOf(quiz, supporter, entry, monthSlug(year, month))}
          </>
        )}
        <Text>
          <Link href={fantestRankingPath}>Ranglijst per jaar</Link>
        </Text>
      </Page.Cell>
      {latest === undefined ? null : (
        <Page.Cell area="latest">
          <LatestResult figures={figures.get(latest.id)} month={latest} />
        </Page.Cell>
      )}
      <Page.Cell area="archive">
        {latest === undefined ? (
          <>
            <Heading level={2}>Fantest van toen</Heading>
            <Text>
              Van december 2001 tot oktober 2005 had de Fansite elke maand een Fantest: tien vragen over de club. Speel
              ze na. Je score van deze oude quizzen bewaren we niet.
            </Text>
          </>
        ) : (
          <>
            <Heading level={2}>Eerdere maanden</Heading>
            <Text>
              Speel een maand die voorbij is na: we bewaren je score dan niet. Van december 2001 tot oktober 2005 had de
              Fansite elke maand een Fantest.
            </Text>
          </>
        )}
        <Text appearance="meta">{latest === undefined ? archiveCredit : mixedArchiveCredit}</Text>
        {byYear(archive).map(({ months, year: archiveYear }) => (
          <Card aria-labelledby={`fantest-${archiveYear}`} key={archiveYear}>
            <Heading id={`fantest-${archiveYear}`} level={3}>
              {archiveYear}
            </Heading>
            <List>
              {months.map((item) => (
                <List.Item key={item.month}>
                  <Link href={monthPath(item.year, item.month)}>{capital(monthTitle(item.year, item.month))}</Link>
                  <Average figures={figures.get(item.id)} month={item} />
                </List.Item>
              ))}
            </List>
          </Card>
        ))}
      </Page.Cell>
    </Page.Main>
  )
}

/** The line under a month in the list: how those who took part did on average. */
function Average({ figures, month }: { figures: MonthFigures | undefined; month: ArchiveMonth }) {
  const old = month.source === 'oude-fansite'
  const tenths = old ? month.averageTenths : averageOf(figures)

  return tenths === undefined ? null : (
    <Text appearance="meta">
      {old ? 'Toen gemiddeld' : 'Gemiddeld'} {averageText(tenths)} van {month.questions}
    </Text>
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
function cardOf(
  quiz: MonthQuiz,
  supporter: Awaited<ReturnType<typeof currentSupporter>>,
  entry: undefined | { score: number },
  month: string,
) {
  if (supporter === undefined) {
    return <LogInCard level={3} message="Log in om mee te doen." returnTo={fantestPath} />
  }

  if (!mayTakePart(supporter)) {
    return <BlockedCard />
  }

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

/** How everybody did on the last quiz of the editors that is over, and the way to it. */
function LatestResult({ figures, month }: { figures: MonthFigures | undefined; month: ArchiveMonth }) {
  const when = monthTitle(month.year, month.month)
  const average = averageOf(figures)
  const participants = figures?.participants ?? 0

  return (
    <Card aria-labelledby="fantest-uitslag" surface="strong">
      <Heading id="fantest-uitslag" level={2}>
        Uitslag van {when}
      </Heading>
      {figures === undefined || average === undefined || participants < quizMinimum ? (
        <Text>{participantsText(participants)}</Text>
      ) : (
        <KeyFigures
          figures={[
            { figure: averageText(average), label: 'gemiddeld', note: `van ${month.questions}` },
            { figure: String(participants), label: 'deden mee', note: `in ${when}` },
            { figure: String(figures.allRight), label: 'keer alles goed', note: `alle ${month.questions} goed` },
          ]}
        />
      )}
      <CardLink href={monthPath(month.year, month.month)}>Bekijk de goede antwoorden</CardLink>
    </Card>
  )
}
