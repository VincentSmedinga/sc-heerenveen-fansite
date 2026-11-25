import { Card, Heading, KeyFigures, QuizQuestion, Strong, Text } from '@fansite/design-system'
import { type ReactNode } from 'react'

import {
  answerField,
  averageText,
  monthTitle,
  questionId,
  type QuizState,
  type QuizView,
  scoreOf,
} from '#src/fans/fantest'

import { Paragraphs } from './Paragraphs'

/**
 * The result of a month that is over: a card with the score and the figures of everybody, a
 * card for each question with the right answer, and the closing text of the editors. The same
 * for the archive of the old fansite (issue 1480) and for a quiz of the editors (issue 1484).
 * Without `answers` it is the result for somebody to read, who has no score. `notice` stands
 * between the figures and the questions.
 */
export function QuizResult({
  answers,
  notice,
  quiz,
}: {
  /** The chosen answer of each question, by its position. */
  answers?: QuizState['answers'] | undefined
  notice?: ReactNode
  quiz: QuizView
}) {
  const { averageTenths, month, participants, questions, recent, year } = quiz
  const score = answers === undefined ? undefined : scoreOf(questions, answers)
  const figures =
    participants === undefined || averageTenths === undefined
      ? undefined
      : [
          ...(score === undefined
            ? []
            : [{ figure: String(score), label: `van ${questions.length}`, note: 'jouw score' }]),
          {
            figure: averageText(averageTenths),
            label: recent === undefined ? 'toen gemiddeld' : 'gemiddeld',
            note: `van ${questions.length}`,
          },
          {
            figure: String(participants),
            label: recent === undefined ? 'deden toen mee' : 'deden mee',
            note: `in ${monthTitle(year, month)}`,
          },
          ...(recent?.allRight === undefined
            ? []
            : [{ figure: String(recent.allRight), label: 'keer alles goed', note: `alle ${questions.length} goed` }]),
        ]

  return (
    <>
      {score === undefined && recent === undefined ? null : (
        <Card aria-labelledby="fantest-score-kop" game="fantest" id="fantest-score" tabIndex={-1}>
          <Heading id="fantest-score-kop" level={2}>
            {score === undefined ? 'Zo deed iedereen het' : 'Je score'}
          </Heading>
          {score !== undefined && figures === undefined ? (
            <Text>
              <Strong>
                {score} van {questions.length}
              </Strong>
            </Text>
          ) : null}
          {figures === undefined ? null : <KeyFigures figures={figures} />}
          {recent !== undefined && figures === undefined ? <Text>{participantsText(recent.count)}</Text> : null}
        </Card>
      )}
      {participants === undefined ? null : (
        <Text appearance="meta">
          {recent === undefined
            ? 'Bij elke vraag: hoe fans het toen deden.'
            : 'Bij elke vraag: welk deel van de deelnemers elk antwoord koos.'}
        </Text>
      )}
      {notice}
      {questions.map((question, index) => (
        <QuizQuestion
          answers={question.answers}
          id={questionId(question.position)}
          key={question.position}
          name={answerField(question.position)}
          number={index + 1}
          question={question.text}
          result={{
            allCorrect: question.allCorrect,
            chosen: answers?.[question.position],
            correct: question.correct,
            percentages: question.percentages,
          }}
          total={questions.length}
        />
      ))}
      {recent === undefined || recent.closingText.trim() === '' ? null : (
        <Card aria-labelledby="fantest-slot-kop">
          <Heading id="fantest-slot-kop" level={2}>
            Tot slot
          </Heading>
          <Paragraphs text={recent.closingText} />
        </Card>
      )}
    </>
  )
}

/** "3 deelnemers": what shows of a month that too few took part in for the other figures. */
export const participantsText = (count: number) => `${count} ${count === 1 ? 'deelnemer' : 'deelnemers'}`
