import { describe, expect, it } from 'vitest'

import type { FantestAnswerRow, FantestKeyRow, FantestQuestionRow } from './old-site-fantest-export.ts'

import { buildOldSiteFantest } from './old-site-fantest-export.ts'
import { parseOldSiteFile } from './old-site-file.ts'

const question = (id: number, extra: Partial<FantestQuestionRow> = {}, month = '12', year = '2001') => ({
  dt_m: month,
  dt_y: year,
  opties: `a${id}---b${id}---c${id}---d${id}`,
  qst_id: id,
  qst_img: '',
  qst_txt: `Vraag ${id}?`,
  ...extra,
})

const tenQuestions = (extra: (id: number) => Partial<FantestQuestionRow> = () => ({})) =>
  Array.from({ length: 10 }, (_, index) => question(index + 1, extra(index + 1)))

const answer = (antwoorden: string, month = '12', year = '2001'): FantestAnswerRow => ({
  antwoorden,
  dt_m: month,
  dt_y: year,
})

const key = (sleutel: string, month = '12', year = '2001'): FantestKeyRow => ({
  dt_m: month,
  dt_y: year,
  sleutel,
})

describe('buildOldSiteFantest', () => {
  it('works out the percentage per answer and the average score of a month', () => {
    const { months } = buildOldSiteFantest([key('aaaaaaaaaa')], tenQuestions(), [
      answer('aaaaaaaaaa'),
      answer('aaaaabbbbb'),
      answer('bbbbbbbbbb'),
      answer('aaaaaaaaab'),
    ])

    expect(months).toHaveLength(1)
    expect(months[0]).toMatchObject({ average: 6, month: 12, omitted: 0, participants: 4, year: 2001 })
    expect(months[0]?.questions[0]).toMatchObject({ correct: 0, order: 1, percentages: [75, 25, 0, 0] })
    expect(months[0]?.questions[9]).toMatchObject({ percentages: [25, 75, 0, 0] })
    expect(parseOldSiteFile(JSON.stringify({ months, version: 3 }))).toBeDefined()
  })

  it('reads the right answer of each question from the key', () => {
    const { months } = buildOldSiteFantest([key('badbaabdab')], tenQuestions(), [])

    expect(months[0]?.questions.map((one) => one.correct)).toEqual([1, 0, 3, 1, 0, 0, 1, 3, 0, 1])
  })

  it('gives no percentages and no average when nobody took part', () => {
    const { months } = buildOldSiteFantest([key('aaaaaaaaaa')], tenQuestions(), [])

    expect(months[0]).toMatchObject({ average: null, participants: 0 })
    expect(months[0]?.questions.every((one) => one.percentages === null)).toBe(true)
  })

  it('leaves out a question with a picture, keeps the place of the others and counts it', () => {
    const { months, report } = buildOldSiteFantest(
      [key('aaaaaaaaaa')],
      tenQuestions((id) =>
        id === 2 ? { qst_img: 'x.gif' } : id === 4 ? { qst_txt: '[image align=right]a.gif[/image]Wie?' } : {},
      ),
      [answer('aaaaaaaaaa')],
    )

    expect(months[0]?.omitted).toBe(2)
    expect(months[0]?.questions.map((one) => one.order)).toEqual([1, 3, 5, 6, 7, 8, 9, 10])
    expect(months[0]?.average).toBe(8)
    expect(report[0]).toContain('2 questions left out')
  })

  it('reads the text as latin1 and leaves out months without a key or with empty questions', () => {
    const { months, report } = buildOldSiteFantest(
      [key('aaaaaaaaaa'), key('aaaaaaaaaa', '06', '2004')],
      [
        ...tenQuestions((id) =>
          id === 1
            ? { opties: Buffer.from('Ren\xe9---b---c---d', 'latin1'), qst_txt: Buffer.from('\xe9\xe9n?', 'latin1') }
            : {},
        ),
        ...tenQuestions().map((one) => ({ ...one, dt_m: '11', dt_y: '2001' })),
        ...tenQuestions((id) => ({ opties: '---------', qst_id: id, qst_txt: '' })).map((one) => ({
          ...one,
          dt_m: '06',
          dt_y: '2004',
        })),
      ],
      [],
    )

    expect(months).toHaveLength(1)
    expect(months[0]?.questions[0]).toMatchObject({ answers: ['René', 'b', 'c', 'd'], text: 'één?' })
    expect(report.join('\n')).toContain('1 months with questions but no key left out: 2001-11')
    expect(report.join('\n')).toContain('1 months with empty questions left out: 2004-06')
  })

  it('does not put the string of answers of a visitor in what it returns', () => {
    const { months } = buildOldSiteFantest([key('aaaaaaaaaa')], tenQuestions(), [answer('abcdabcdab')])

    expect(JSON.stringify(months)).not.toContain('abcdabcdab')
  })
})
