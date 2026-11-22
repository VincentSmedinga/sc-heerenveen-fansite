import type { OldSiteFantestMonth, OldSiteFantestQuestion } from './old-site-file.ts'

/**
 * The part of `pnpm export:old-site` that reads the Fantest of the old fansite (#1480): a quiz
 * of ten questions each month, from December 2001 to October 2005. It turns the rows of
 * `fantest` (the key: the letter of the right answer for each question), `fantest_qst` (the
 * questions) and `fantest_inz` (the answers of the visitors) into the months of `fantest.json`.
 *
 * The old tables hold names, times and the answers of each visitor. The queries ask for the
 * string of answers only, never the name, the time or the score, and the string does not leave
 * this function: what it returns holds the questions, the answers, the right answer and
 * percentages of a group. The introduction and the closing text of a month (`txt_bef` and
 * `txt_aft`) are not read. A question with a picture is left out, because the pictures are not
 * on the site: it is the one that has a file in `qst_img` or an `[image` in its text.
 */

/** The answers of one visitor, as a string of ten letters. No name, no time, no score. */
export type FantestAnswerRow = { antwoorden: string; dt_m: string; dt_y: string }

/** The columns of `fantest` that are read: the month and the key, no text of the month. */
export type FantestKeyRow = { dt_m: string; dt_y: string; sleutel: string }

/** One question. The text and the options are blobs in latin1, so they can come as a buffer. */
export type FantestQuestionRow = {
  dt_m: string
  dt_y: string
  opties: Buffer | string
  qst_id: number
  qst_img: Buffer | string
  qst_txt: Buffer | string
}

export type OldSiteFantest = {
  months: OldSiteFantestMonth[]
  /** Lines for the person who runs the export. */
  report: string[]
}

const letters = ['a', 'b', 'c', 'd']

/** The old database wrote latin1 into a blob; a string is taken as it is. */
const textOf = (value: Buffer | string) => (typeof value === 'string' ? value : value.toString('latin1')).trim()

const monthKey = (year: string, month: string) => `${year}-${month}`

export function buildOldSiteFantest(
  keys: readonly FantestKeyRow[],
  questions: readonly FantestQuestionRow[],
  answers: readonly FantestAnswerRow[],
): OldSiteFantest {
  const report: string[] = []
  const keyByMonth = new Map(keys.map((row) => [monthKey(row.dt_y, row.dt_m), row.sleutel]))
  const answersByMonth = new Map<string, string[]>()

  for (const row of answers) {
    const key = monthKey(row.dt_y, row.dt_m)

    answersByMonth.set(key, [...(answersByMonth.get(key) ?? []), row.antwoorden])
  }

  const questionsByMonth = new Map<string, FantestQuestionRow[]>()

  for (const row of questions) {
    const key = monthKey(row.dt_y, row.dt_m)

    questionsByMonth.set(key, [...(questionsByMonth.get(key) ?? []), row])
  }

  const months: OldSiteFantestMonth[] = []
  const withoutKey: string[] = []
  const empty: string[] = []
  let omitted = 0
  let questionCount = 0

  for (const [key, rows] of [...questionsByMonth].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const sleutel = keyByMonth.get(key)

    // A month without a key has no right answers, so it can't be played. These are the months
    // before December 2001 and the test month of 1999.
    if (sleutel === undefined) {
      withoutKey.push(key)
      continue
    }

    // A month that was set up with empty questions was never played.
    if (rows.every((row) => textOf(row.qst_txt) === '')) {
      empty.push(key)
      continue
    }

    const given = answersByMonth.get(key) ?? []
    const visitors = given.filter((one) => one.length === sleutel.length)
    const built: OldSiteFantestQuestion[] = []
    let left = 0
    let rightTotal = 0

    for (const row of [...rows].sort((a, b) => a.qst_id - b.qst_id)) {
      if (textOf(row.qst_img) !== '' || textOf(row.qst_txt).includes('[image')) {
        left += 1
        continue
      }

      const options = textOf(row.opties)
        .split('---')
        .map((option) => option.trim())
      const correct = letters.indexOf(sleutel[row.qst_id - 1] ?? '')

      if (options.length !== 4 || correct === -1) {
        throw new Error(`The Fantest of ${key} has a question ${row.qst_id} without four answers or a right one.`)
      }

      const chosen = letters.map((letter) => visitors.filter((one) => one[row.qst_id - 1] === letter).length)

      rightTotal += chosen[correct] ?? 0
      built.push({
        answers: options as OldSiteFantestQuestion['answers'],
        correct,
        order: row.qst_id,
        percentages:
          visitors.length === 0
            ? null
            : (chosen.map((number) => Math.round((number / visitors.length) * 100)) as NonNullable<
                OldSiteFantestQuestion['percentages']
              >),
        text: textOf(row.qst_txt),
      })
    }

    omitted += left
    questionCount += built.length
    months.push({
      average: visitors.length === 0 ? null : Math.round((rightTotal / visitors.length) * 10) / 10,
      month: Number(key.slice(5)),
      omitted: left,
      participants: visitors.length,
      questions: built,
      year: Number(key.slice(0, 4)),
    })
  }

  report.push(`Fantest: ${months.length} months, ${questionCount} questions, ${omitted} questions left out (a picture)`)
  if (withoutKey.length > 0) {
    report.push(`Fantest: ${withoutKey.length} months with questions but no key left out: ${withoutKey.join(', ')}`)
  }
  if (empty.length > 0) {
    report.push(`Fantest: ${empty.length} months with empty questions left out: ${empty.join(', ')}`)
  }

  return { months, report }
}
