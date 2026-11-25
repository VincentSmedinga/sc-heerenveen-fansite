import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import FantestPage, { generateMetadata } from './page'

const { closedFigures, currentSupporter, findEntry, loadArchive, loadMonthQuiz } = vi.hoisted(() => ({
  closedFigures: vi.fn(),
  currentSupporter: vi.fn(),
  findEntry: vi.fn(),
  loadArchive: vi.fn(),
  loadMonthQuiz: vi.fn(),
}))

vi.mock('#src/database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('#src/fans/fantest-months', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  closedFigures,
  loadArchive,
}))
vi.mock('#src/fans/require-supporter', () => ({ currentSupporter }))
vi.mock('#src/fans/fantest-entry', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  findEntry,
  loadMonthQuiz,
}))
vi.mock('./actions', () => ({ submitQuizAction: () => undefined }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

const quiz = {
  id: 4,
  intro: 'Een verzonnen inleiding.\nEn nog een regel.',
  month: 11,
  questions: Array.from({ length: 10 }, (_, index) => ({
    answers: ['a', 'b', 'c', 'd'],
    position: index + 1,
    text: `Redactievraag ${index + 1}?`,
  })),
  version: 'abc',
  year: 2026,
}
const supporter = { disabledAt: null, id: 7 }

const render = async (parameters: Record<string, string> = {}) =>
  renderToStaticMarkup(await FantestPage({ searchParams: Promise.resolve(parameters) }))

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-11-25T12:00:00Z') })
  currentSupporter.mockResolvedValue(undefined)
  loadMonthQuiz.mockResolvedValue(quiz)
  findEntry.mockResolvedValue(undefined)
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  vi.stubEnv('FANS_FANTEST', 'on')
  vi.stubEnv('SITE_ENV', 'local')
  closedFigures.mockResolvedValue(new Map())
  loadArchive.mockResolvedValue(
    [
      { averageTenths: 43, month: 1, questions: 10, year: 2003 },
      { averageTenths: undefined, month: 12, questions: 10, year: 2002 },
      { averageTenths: 38, month: 12, questions: 9, year: 2003 },
      { averageTenths: 41, month: 5, questions: 10, year: 2003 },
    ].map((month, id) => ({ ...month, id, source: 'oude-fansite' })),
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('the quiz of the month', () => {
  it('shows a visitor the introduction and the way in, and no question', async () => {
    const html = await render()

    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toMatch(/<h2[^>]*>November 2026<\/h2>/)
    expect(html).toContain('Een verzonnen inleiding.')
    expect(html).toContain('href="/fans/inloggen?terug=%2Ffans%2Ffantest"')
    expect(html).toContain('href="/fans/aanmelden"')
    expect(html).not.toContain('Redactievraag')
    expect(html).not.toContain('type="radio"')
  })

  it('stands above the archive', async () => {
    const html = await render()

    expect(html.indexOf('November 2026')).toBeLessThan(html.indexOf('Fantest van toen'))
  })

  it('says that there is no quiz this month', async () => {
    loadMonthQuiz.mockResolvedValue(undefined)

    expect(await render()).toContain('Voor november 2026 staat er geen Fantest klaar.')
  })

  it('gives a supporter ten groups of four radio buttons, and no timer', async () => {
    currentSupporter.mockResolvedValue(supporter)
    const html = await render()

    expect(html.match(/<fieldset/g)).toHaveLength(10)
    expect(html.match(/type="radio"/g)).toHaveLength(40)
    expect(html).toContain('Verstuur mijn antwoorden')
    expect(html).toContain('wat je verstuurt, kun je niet meer wijzigen')
    expect(html).toContain('name="versie"')
    expect(html).not.toMatch(/snel|seconden|minuten/i)
  })

  it('gives a supporter who took part the score and no question', async () => {
    currentSupporter.mockResolvedValue(supporter)
    findEntry.mockResolvedValue({ score: 6 })
    const html = await render({ verstuurd: '1' })

    expect(findEntry).toHaveBeenCalledWith({}, 7, 4)
    expect(html).toContain('6 van 10')
    expect(html).toContain('Je antwoorden zijn verstuurd.')
    expect(html).not.toContain('Redactievraag')
    expect(html).not.toContain('type="radio"')
    expect(html).not.toMatch(/Goed\.|Fout\./)
  })

  it('says nothing about stored answers to a supporter without any', async () => {
    currentSupporter.mockResolvedValue(supporter)

    const html = await render({ al: '1', verstuurd: '1' })

    expect(html).not.toContain('Je antwoorden zijn verstuurd.')
    expect(html).not.toContain('Je hebt al meegedaan')
  })

  it.each([
    ['al', 'Je hebt al meegedaan aan deze Fantest.'],
    ['gesloten', 'De Fantest van je formulier is gesloten.'],
    ['gewijzigd', 'De redactie heeft de vragen net gewijzigd.'],
  ])('says what happened after "%s", only to a supporter', async (name, words) => {
    expect(await render({ [name]: '1' })).not.toContain(words)

    currentSupporter.mockResolvedValue(supporter)
    findEntry.mockResolvedValue({ score: 6 })
    expect(await render({ [name]: '1' })).toContain(words)
  })

  it('gives a blocked account no question, and the way to Contact', async () => {
    currentSupporter.mockResolvedValue({ disabledAt: new Date(), id: 7 })
    const html = await render()

    expect(html).toContain('De redactie heeft je account geblokkeerd.')
    expect(html).toContain('href="/contact"')
    expect(html).not.toContain('Redactievraag')
    expect(html).not.toContain('type="radio"')
  })

  it('may be indexed for a visitor and not for a supporter', async () => {
    expect((await generateMetadata()).robots).toBeUndefined()

    currentSupporter.mockResolvedValue(supporter)
    expect((await generateMetadata()).robots).toEqual({ follow: false, index: false })
  })
})

describe('the archive of the Fantest', () => {
  it('starts with the heading, the intro and the credit without names', async () => {
    const html = await render()

    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toContain('Fantest van toen')
    expect(html).toContain('Van december 2001 tot oktober 2005 had de Fansite elke maand een Fantest')
    expect(html).toContain('Je score van deze oude quizzen bewaren we niet.')
    expect(html).toContain('Vragen uit het archief van de Fansite, gemaakt door de toenmalige redactie.')
  })

  it('has a card for each year, the newest first, and the months of a year the newest first too', async () => {
    const html = await render()

    expect(html.indexOf('>2003<')).toBeLessThan(html.indexOf('>2002<'))
    expect(html.indexOf('>December 2003<')).toBeLessThan(html.indexOf('>Mei 2003<'))
    expect(html.indexOf('>Mei 2003<')).toBeLessThan(html.indexOf('>Januari 2003<'))
    expect(html).toContain('href="/fans/fantest/2003-05"')
    expect(html).toContain('href="/fans/fantest/2002-12"')
  })

  it('says under a month how the fans of then did, and says nothing for a month with too few', async () => {
    const html = await render()

    expect(html).toContain('Toen gemiddeld 4,1 van 10')
    expect(html).toContain('Toen gemiddeld 3,8 van 9')
    expect(html.match(/Toen gemiddeld/g)).toHaveLength(3)
  })

  it('links to the ranking, also in a month without a quiz', async () => {
    loadMonthQuiz.mockResolvedValue(undefined)

    expect(await render()).toContain('href="/fans/fantest/ranglijst"')
  })

  it('holds no form and nothing personal for a visitor without a quiz this month', async () => {
    loadMonthQuiz.mockResolvedValue(undefined)
    const html = await render()

    expect(html).not.toContain('<form')
    expect(html).not.toContain('<input')
  })

  it('is "not found" with the Fantest off', async () => {
    vi.stubEnv('FANS_FANTEST', 'off')

    await expect(render()).rejects.toThrow('NEXT_NOT_FOUND')
    await expect(generateMetadata()).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('is "not found" with accounts off, as the rest of Fans is', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'off')

    await expect(render()).rejects.toThrow('NEXT_NOT_FOUND')
  })
})

describe('the months of the editors that are over', () => {
  const editors = (id: number, year: number, month: number) => ({
    averageTenths: undefined,
    id,
    month,
    questions: 10,
    source: 'redactie',
    year,
  })
  const figures = (participants: number, total: number) => ({ allRight: 2, chosen: {}, participants, total })

  beforeEach(() => {
    loadArchive.mockResolvedValue([
      editors(21, 2026, 10),
      editors(20, 2026, 9),
      { ...editors(1, 2003, 5), averageTenths: 41, source: 'oude-fansite' },
    ])
    closedFigures.mockResolvedValue(
      new Map([
        [20, figures(4, 30)],
        [21, figures(8, 52)],
      ]),
    )
  })

  it('shows the last one with its result above the list, with a link to the right answers', async () => {
    const html = await render()

    expect(html).toMatch(/<h2[^>]*>Uitslag van oktober 2026<\/h2>/)
    expect(html.indexOf('Uitslag van oktober 2026')).toBeLessThan(html.indexOf('Eerdere maanden'))
    expect(html).toContain('>6,5<')
    expect(html).toContain('>8<')
    expect(html).toContain('keer alles goed')
    expect(html).toContain('Bekijk de goede ')
    expect(html).not.toContain('Fantest van toen')
    // The credit of the old editors is about their years only.
    expect(html).toContain(
      'De vragen van 2001 tot en met 2005 komen uit het archief van de Fansite, gemaakt door de toenmalige redactie.',
    )
    expect(html).not.toContain('Vragen uit het archief')
  })

  it('lists them between the old months, the newest year first, with the average from five on', async () => {
    const html = await render()

    expect(html.indexOf('>2026<')).toBeLessThan(html.indexOf('>2003<'))
    expect(html).toContain('href="/fans/fantest/2026-09"')
    expect(html).toContain('Gemiddeld 6,5 van 10')
    expect(html).toContain('Toen gemiddeld 4,1 van 10')
    expect(html.match(/emiddeld \d/g)).toHaveLength(2)
  })

  it('shows only the number of participants of a last month with fewer than five', async () => {
    closedFigures.mockResolvedValue(new Map([[21, figures(1, 7)]]))
    const html = await render()

    expect(html).toContain('1 deelnemer<')
    expect(html).not.toContain('gemiddeld 7')
    expect(html).not.toContain('hf-key-figure')
  })
})
