import { describe, expect, it } from 'vitest'

import { emptyQuestion, type QuizValues } from './quiz-fields'
import { readIntent, readQuizValues, swapQuestions, validateQuiz } from './quiz-form'

const complete = (): QuizValues => ({
  intro: '',
  slottekst: '',
  vragen: Array.from({ length: 10 }, (_, index) => ({
    allesGoed: false,
    antwoorden: ['a', 'b', 'c', 'd'] as [string, string, string, string],
    goed: '2',
    tekst: `Testvraag ${index + 1}?`,
  })),
})

const form = (entries: Record<string, string>) => {
  const formData = new FormData()

  for (const [name, value] of Object.entries(entries)) {
    formData.set(name, value)
  }

  return formData
}

describe('readQuizValues', () => {
  it('reads ten questions, cleans the lines and keeps the newlines of the plain texts', () => {
    const values = readQuizValues(
      form({
        intro: '  Eerste regel\r\nTweede\u0007regel  ',
        'vraag-1': '  Wie\n scoorde? ',
        'vraag-1-alles-goed': 'ja',
        'vraag-1-antwoord-2': ' Testman ',
        'vraag-1-goed': '2',
        'vraag-2-alles-goed': 'nee',
        'vraag-2-goed': '5',
      }),
    )

    expect(values.vragen).toHaveLength(10)
    expect(values.intro).toBe('Eerste regel\nTweede regel')
    expect(values.vragen[0]).toEqual({
      allesGoed: true,
      antwoorden: ['', 'Testman', '', ''],
      goed: '2',
      tekst: 'Wie scoorde?',
    })
    expect(values.vragen[1]).toEqual(emptyQuestion())
  })
})

describe('readIntent', () => {
  it.each([
    [{}, { kind: 'save' }],
    [{ knop: 'publiceren' }, { kind: 'publish' }],
    [{ knop: 'omhoog-3' }, { from: 3, kind: 'move', to: 2 }],
    [{ knop: 'omlaag-9' }, { from: 9, kind: 'move', to: 10 }],
    [{ knop: 'omhoog-1' }, { kind: 'save' }],
    [{ knop: 'omlaag-10' }, { kind: 'save' }],
    [{ knop: 'omlaag-11' }, { kind: 'save' }],
  ])('reads %o', (entries, intent) => {
    expect(readIntent(form(entries as Record<string, string>))).toEqual(intent)
  })
})

describe('swapQuestions', () => {
  it('swaps two questions and leaves the rest', () => {
    const swapped = swapQuestions(complete(), 1, 2)

    expect(swapped.vragen.map(({ tekst }) => tekst).slice(0, 3)).toEqual([
      'Testvraag 2?',
      'Testvraag 1?',
      'Testvraag 3?',
    ])
  })
})

describe('validateQuiz', () => {
  it('lets a draft be unfinished', () => {
    const empty = { intro: '', slottekst: '', vragen: Array.from({ length: 10 }, emptyQuestion) }

    expect(validateQuiz(empty, false)).toEqual({})
  })

  it('accepts ten complete questions without an introduction or a closing text', () => {
    expect(validateQuiz(complete(), true)).toEqual({})
  })

  it('asks, in the order of the form, for every text, answer and right answer that is missing', () => {
    const values = complete()

    values.vragen[2] = { allesGoed: false, antwoorden: ['a', '', 'c', ''], goed: '', tekst: '' }

    expect(Object.entries(validateQuiz(values, true))).toEqual([
      ['vraag-3', 'Schrijf de tekst van vraag 3.'],
      ['vraag-3-antwoord-2', 'Vul antwoord 2 van vraag 3 in.'],
      ['vraag-3-antwoord-4', 'Vul antwoord 4 van vraag 3 in.'],
      ['vraag-3-goed', 'Kies het goede antwoord van vraag 3.'],
    ])
  })

  it('wants the right answer also for a question that counts for everyone', () => {
    const values = complete()

    values.vragen[0] = { ...values.vragen[0]!, allesGoed: true, goed: '' }

    expect(Object.keys(validateQuiz(values, true))).toEqual(['vraag-1-goed'])
  })

  it('refuses texts that do not fit, in a draft too', () => {
    const values = complete()

    values.intro = 'x'.repeat(2001)
    values.slottekst = 'x'.repeat(2001)
    values.vragen[0] = { ...values.vragen[0]!, antwoorden: ['x'.repeat(201), 'b', 'c', 'd'], tekst: 'x'.repeat(501) }

    expect(Object.keys(validateQuiz(values, false))).toEqual(['intro', 'slottekst', 'vraag-1', 'vraag-1-antwoord-1'])
  })
})
