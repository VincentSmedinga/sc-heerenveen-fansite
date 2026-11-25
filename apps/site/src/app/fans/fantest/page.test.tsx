import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import FantestPage, { generateMetadata } from './page'

const { currentSupporter, findEntry, loadArchive, loadMonthQuiz } = vi.hoisted(() => ({
  currentSupporter: vi.fn(),
  findEntry: vi.fn(),
  loadArchive: vi.fn(),
  loadMonthQuiz: vi.fn(),
}))

vi.mock('#src/database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('#src/fans/fantest', async (importOriginal) => ({ ...(await importOriginal<object>()), loadArchive }))
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
  loadArchive.mockResolvedValue([
    { averageTenths: 43, month: 1, questions: 10, year: 2003 },
    { averageTenths: undefined, month: 12, questions: 10, year: 2002 },
    { averageTenths: 38, month: 12, questions: 9, year: 2003 },
    { averageTenths: 41, month: 5, questions: 10, year: 2003 },
  ])
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

  it.each([
    ['al', 'Je hebt al meegedaan aan deze Fantest.'],
    ['gesloten', 'Deze Fantest is gesloten.'],
    ['gewijzigd', 'De redactie heeft de vragen net gewijzigd.'],
  ])('says what happened after "%s", only to a supporter', async (name, words) => {
    expect(await render({ [name]: '1' })).not.toContain(words)

    currentSupporter.mockResolvedValue(supporter)
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
