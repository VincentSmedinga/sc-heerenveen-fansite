/*
 * The score of a quiz of the Fantest: how many of the answers are the right one. It needs no
 * database. The archive of the old Fansite (#1480) and the monthly quiz after it (#1482) use
 * the same function, so a score means the same everywhere.
 */

/**
 * The score of a quiz. `answers` and `correct` are the places (0 to 3) of the chosen answer and
 * of the right answer, one for each question and in the same order. A question without an
 * answer (`undefined`) scores nothing. It throws when the lists differ in length, because a
 * score against the wrong questions is wrong.
 */
export function scoreQuiz(answers: readonly (number | undefined)[], correct: readonly number[]): number {
  if (answers.length !== correct.length) {
    throw new Error(`A quiz of ${correct.length} questions got ${answers.length} answers.`)
  }

  return correct.filter((place, index) => answers[index] === place).length
}
