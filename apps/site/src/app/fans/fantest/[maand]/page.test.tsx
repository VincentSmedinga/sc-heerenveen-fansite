import type * as React from 'react'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QuizState, QuizView } from '#src/fans/fantest'

import FantestMonthPage, { generateMetadata } from './page'

const { closedFigures, currentSupporter, findAnswers, loadQuiz, useActionState } = vi.hoisted(() => ({
  closedFigures: vi.fn(),
  currentSupporter: vi.fn(),
  findAnswers: vi.fn(),
  loadQuiz: vi.fn(),
  useActionState: vi.fn(),
}))

vi.mock('react', async (importOriginal) => ({ ...(await importOriginal<typeof React>()), useActionState }))
vi.mock('./actions', () => ({ checkQuizAction: vi.fn() }))
vi.mock('#src/database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('#src/fans/require-supporter', () => ({ currentSupporter }))
vi.mock('#src/fans/fantest-months', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  closedFigures,
  findAnswers,
  loadQuiz,
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

const questionsOf = (count: number): QuizView['questions'] =>
  Array.from({ length: count }, (_, index) => ({
    answers: ['Een', 'Twee', 'Drie', 'Vier'],
    correct: 2,
    percentages: [10, 60, 20, 10],
    position: index + 1,
    text: `Testvraag ${index + 1}?`,
  }))

const quiz = (count = 10, extra: Partial<QuizView> = {}): QuizView => ({
  averageTenths: 41,
  month: 5,
  participants: 38,
  questions: questionsOf(count),
  year: 2003,
  ...extra,
})

const empty: QuizState = { answers: {}, checked: false, errors: {} }
const params = (maand: string, query: Record<string, string> = {}) => ({
  params: Promise.resolve({ maand }),
  searchParams: Promise.resolve(query),
})

beforeEach(() => {
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  vi.stubEnv('FANS_FANTEST', 'on')
  loadQuiz.mockResolvedValue(quiz())
  useActionState.mockReturnValue([empty, vi.fn()])
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetAllMocks()
})

const render = async (maand = '2003-05', query: Record<string, string> = {}) =>
  renderToStaticMarkup(await FantestMonthPage(params(maand, query)))

describe('the page of a month of the Fantest', () => {
  it('starts with the way back, the heading and the card "Tien vragen", with fans and not supporters', async () => {
    const html = await render()

    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toContain('Fantest mei 2003')
    expect(html).toContain('href="/fans/fantest"')
    expect(html).toContain('Tien vragen')
    expect(html).toContain(
      'Kies bij elke vraag één antwoord. Daarna zie je meteen hoe je het deed, en hoe fans het in 2003 deden.',
    )
    expect(html).not.toMatch(/supporter/i)
  })

  it('has a card for each question as a group with four radio buttons, numbered "Vraag 1 van 10"', async () => {
    const html = await render()

    expect(html.match(/<fieldset/g)).toHaveLength(10)
    expect(html.match(/type="radio"/g)).toHaveLength(40)
    expect(html).toContain('Vraag 1 van 10')
    expect(html).toContain('Vraag 10 van 10')
    expect(html).toContain('<legend class="hf-quiz-question-text">Testvraag 1?</legend>')
  })

  it('has one button that sends the answers and says what is needed', async () => {
    const html = await render()

    expect(html.match(/<button/g)).toHaveLength(1)
    expect(html).toContain('Kijk mijn antwoorden na')
    expect(html).toContain('Beantwoord alle 10 vragen')
    expect(html).toContain('name="maand"')
    expect(html).toContain('value="2003-05"')
  })

  it('shows a notice above the questions, and numbers them from 1 to 9, for a month with a question left out', async () => {
    loadQuiz.mockResolvedValue(quiz(9, { questions: questionsOf(10).filter((one) => one.position !== 4) }))
    const html = await render()

    expect(html).toContain('class="hf-notice"')
    expect(html).toContain('Bij deze maand ontbreekt een vraag')
    expect(html.indexOf('hf-notice')).toBeLessThan(html.indexOf('<fieldset'))
    expect(html).toContain('Vraag 9 van 9')
    expect(html).not.toContain('Vraag 10 van')
    expect(html).toContain('Beantwoord alle 9 vragen')
  })

  it('shows the own error of each question and the summary with a link to it after a failed try', async () => {
    useActionState.mockReturnValue([
      {
        answers: { 1: 2 },
        checked: false,
        errors: { 2: 'Kies een antwoord bij vraag 2.', 3: 'Kies een antwoord bij vraag 3.' },
      },
      vi.fn(),
    ])
    const html = await render()

    expect(html).toContain('Nog 2 vragen zonder antwoord')
    expect(html).toContain('href="#vraag-2"')
    expect(html).toContain('href="#vraag-3"')
    expect(html.match(/Kies een antwoord bij vraag 2\./g)).toHaveLength(2)
    expect(html).toContain('id="fantest-fouten"')
    expect(html).toContain('checked="" value="2"')
  })

  describe('after the check', () => {
    const checked: QuizState = {
      answers: { 1: 2, 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2, 10: 2 },
      checked: true,
      errors: {},
    }

    beforeEach(() => {
      useActionState.mockReturnValue([checked, vi.fn()])
    })

    it('shows the score "9", "van 10" and what the fans of then did, in a strong card', async () => {
      const html = await render()

      expect(html).toContain('Je score')
      expect(html).toContain('hf-card-strong')
      expect(html).toContain('>9<')
      expect(html).toContain('van 10')
      expect(html).toContain('>4,1<')
      expect(html).toContain('>38<')
      expect(html).toContain('deden toen mee')
      expect(html).toContain('toen gemiddeld')
      expect(html).toContain('Bij elke vraag: hoe fans het toen deden.')
    })

    it('shows each question as checked, with the percentages, and no form', async () => {
      const html = await render()

      expect(html).not.toContain('<form')
      expect(html).not.toContain('type="radio"')
      expect(html.match(/Goed\./g)).toHaveLength(9)
      expect(html).toContain('Fout.')
      expect(html).toContain('Het goede antwoord is Twee.')
      expect(html).toContain('60%')
    })

    it('ends with the link "Opnieuw" to the empty quiz of the same month', async () => {
      const html = await render()

      expect(html).toContain('href="/fans/fantest/2003-05"')
      expect(html).toContain('Opnieuw')
    })

    it('has no percentages and no average for a month with too few participants', async () => {
      loadQuiz.mockResolvedValue(
        quiz(10, {
          averageTenths: undefined,
          participants: undefined,
          questions: questionsOf(10).map((one) => ({ ...one, percentages: undefined })),
        }),
      )
      const html = await render()

      expect(html).toContain('9 van 10')
      expect(html).not.toContain('%')
      expect(html).not.toContain('gemiddeld')
      expect(html).not.toContain('Bij elke vraag')
    })

    it('scores "van 9" for a month with a question left out', async () => {
      loadQuiz.mockResolvedValue(quiz(9, { questions: questionsOf(9) }))
      useActionState.mockReturnValue([
        { answers: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [i + 1, 2])), checked: true, errors: {} },
        vi.fn(),
      ])
      const html = await render()

      expect(html).toContain('>9<')
      expect(html).toContain('van 9')
      expect(html).toContain('Bij deze maand ontbreekt een vraag')
    })
  })

  it('stores nothing: no cookie is set and the page holds no storage', async () => {
    const html = await render()

    expect(html).not.toMatch(/localStorage|sessionStorage|document\.cookie|set-cookie/i)
  })

  it('is "not found" for a month that is no month, a month without a quiz and with the Fantest off', async () => {
    await expect(render('2003-13')).rejects.toThrow('NEXT_NOT_FOUND')
    loadQuiz.mockResolvedValue(undefined)
    await expect(render('2003-07')).rejects.toThrow('NEXT_NOT_FOUND')
    loadQuiz.mockResolvedValue(quiz())
    vi.stubEnv('FANS_FANTEST', 'off')
    await expect(render()).rejects.toThrow('NEXT_NOT_FOUND')
    await expect(generateMetadata(params('2003-05'))).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('says in the description how many questions there are', async () => {
    loadQuiz.mockResolvedValue(quiz(9, { questions: questionsOf(9) }))
    vi.stubEnv('SITE_ENV', 'production')

    expect((await generateMetadata(params('2003-05'))).description).toContain('9 vragen')
  })

  it('promises the figures of then only for a month that has them', async () => {
    expect(await render()).toContain('en hoe fans het in 2003 deden.')
    loadQuiz.mockResolvedValue(quiz(10, { averageTenths: undefined, participants: undefined }))
    const html = await render()

    expect(html).not.toContain('hoe fans het in')
    expect(html).toContain('hoe je het deed.')
  })

  it('may be indexed and names its own address, with the title of the month', async () => {
    vi.stubEnv('SITE_ENV', 'production')
    const metadata = await generateMetadata(params('2003-05'))

    expect(metadata.title).toBe('Fantest mei 2003')
    expect(metadata.robots).toBeUndefined()
    expect(String(metadata.alternates?.canonical)).toMatch(/\/fans\/fantest\/2003-05$/)
  })
})

describe('the page of a closed month of the editors', () => {
  const editors = {
    ...quiz(10, { averageTenths: undefined, month: 10, participants: undefined, year: 2026 }),
    id: 4,
    questions: questionsOf(10).map((one) => ({ ...one, percentages: undefined })),
    recent: {
      allRight: undefined,
      closingText: 'Een verzonnen slottekst.',
      count: 0,
      intro: 'Een verzonnen inleiding.',
    },
  }
  /** Of `participants`, six in ten chose the right answer 2 of each question. */
  const figuresOf = (participants: number) =>
    new Map([
      [
        4,
        {
          allRight: 2,
          chosen: Object.fromEntries(Array.from({ length: 10 }, (_, index) => [index + 1, [0, participants, 0, 0]])),
          participants,
          total: participants * 7,
        },
      ],
    ])
  const supporter = { disabledAt: null, id: 7 }
  /** Nine right, the second wrong. */
  const own = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [index + 1, index === 1 ? 1 : 2]))

  beforeEach(() => {
    loadQuiz.mockResolvedValue(editors)
    closedFigures.mockResolvedValue(figuresOf(5))
  })

  it('shows a visitor the right answers, how everybody did and the closing text, without a form', async () => {
    const html = await render('2026-10')

    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toContain('Fantest oktober 2026')
    expect(html).toContain('Een verzonnen inleiding.')
    expect(html).toContain('Zo deed iedereen het')
    expect(html).toContain('>7,0<')
    expect(html).toContain('>5<')
    expect(html).toContain('keer alles goed')
    expect(html.match(/Het goede antwoord is Twee\./g)).toHaveLength(10)
    expect(html).toContain('100%')
    expect(html).toContain('Een verzonnen slottekst.')
    expect(html).toContain('href="/fans/fantest/2026-10?spelen=1"')
    expect(html).not.toContain('<form')
    expect(html).not.toMatch(/Jouw keuze|Goed\.|Fout\./)
    expect(findAnswers).not.toHaveBeenCalled()
  })

  it('shows only the number of participants below five: no percentage, average or "alles goed"', async () => {
    closedFigures.mockResolvedValue(figuresOf(4))
    const html = await render('2026-10')

    expect(html).toContain('4 deelnemers')
    expect(html).not.toContain('%')
    expect(html).not.toContain('gemiddeld')
    expect(html).not.toContain('alles goed')
    expect(html).toContain('Het goede antwoord is Twee.')
  })

  it('says "0 deelnemers" for a month that nobody did', async () => {
    closedFigures.mockResolvedValue(new Map())

    expect(await render('2026-10')).toContain('0 deelnemers')
  })

  it('shows a supporter who took part the own answers and score, in words, and nothing to play', async () => {
    currentSupporter.mockResolvedValue(supporter)
    findAnswers.mockResolvedValue(own)
    const html = await render('2026-10', { spelen: '1' })

    expect(findAnswers).toHaveBeenCalledWith({}, 7, 4)
    expect(html).toContain('Je score')
    expect(html).toContain('jouw score')
    expect(html).toContain('>9<')
    expect(html.match(/Jouw keuze/g)).toHaveLength(10)
    expect(html.match(/Goed\./g)).toHaveLength(9)
    expect(html).toContain('Fout.')
    expect(html).not.toContain('spelen=1')
    expect(html).not.toContain('<form')
  })

  it('shows the own score also below five participants', async () => {
    currentSupporter.mockResolvedValue(supporter)
    findAnswers.mockResolvedValue(own)
    closedFigures.mockResolvedValue(figuresOf(3))
    const html = await render('2026-10')

    expect(html).toContain('9 van 10')
    expect(html).toContain('3 deelnemers')
    expect(html).not.toContain('%')
  })

  it('reads nothing of a blocked account', async () => {
    currentSupporter.mockResolvedValue({ disabledAt: new Date(), id: 7 })
    const html = await render('2026-10')

    expect(findAnswers).not.toHaveBeenCalled()
    expect(html).toContain('Zo deed iedereen het')
    expect(html).not.toContain('Jouw keuze')
  })

  it('lets somebody who did not take part play it, without a right answer on that page', async () => {
    currentSupporter.mockResolvedValue(supporter)
    const html = await render('2026-10', { spelen: '1' })

    expect(html.match(/<fieldset/g)).toHaveLength(10)
    expect(html).toContain('Kijk mijn antwoorden na')
    expect(html).toContain('en hoe de deelnemers het deden.')
    expect(html).not.toContain('Het goede antwoord')
  })

  it('shows the figures after playing, and "Opnieuw" gives the empty quiz again', async () => {
    useActionState.mockReturnValue([{ answers: own, checked: true, errors: {} }, vi.fn()])
    const html = await render('2026-10', { spelen: '1' })

    expect(html).toContain('Je score')
    expect(html).toContain('deden mee')
    expect(html).not.toContain('deden toen mee')
    expect(html).toContain('href="/fans/fantest/2026-10?spelen=1"')
    expect(html).toContain('Een verzonnen slottekst.')
  })

  it('is noindex for a supporter who took part, and may be found by everybody else', async () => {
    vi.stubEnv('SITE_ENV', 'production')

    expect((await generateMetadata(params('2026-10'))).robots).toBeUndefined()
    currentSupporter.mockResolvedValue(supporter)
    expect((await generateMetadata(params('2026-10'))).robots).toBeUndefined()
    findAnswers.mockResolvedValue(own)
    expect((await generateMetadata(params('2026-10'))).robots).toEqual({ follow: false, index: false })
  })
})
