import { describe, expect, it } from 'vitest'

import {
  averageText,
  checkQuiz,
  monthName,
  monthPath,
  monthSlug,
  monthTitle,
  parseMonthSlug,
  quizMinimum,
  type QuizViewQuestion,
  scoreOf,
  summaryTitle,
} from './fantest'

const question = (position: number, correct: number): QuizViewQuestion => ({
  answers: ['a', 'b', 'c', 'd'],
  correct,
  percentages: undefined,
  position,
  text: `Vraag ${position}?`,
})
const questions = [question(1, 1), question(3, 2), question(4, 4)]

describe('the address of a month', () => {
  it('is the year and the month with two digits', () => {
    expect(monthSlug(2003, 5)).toBe('2003-05')
    expect(monthPath(2005, 10)).toBe('/fans/fantest/2005-10')
  })

  it('is read back, and refuses what is no month', () => {
    expect(parseMonthSlug('2003-05')).toEqual({ month: 5, year: 2003 })
    for (const wrong of ['2003-5', '2003-13', '2003-00', '03-05', '2003-05-01', 'abc', '2003-05 ', '']) {
      expect(parseMonthSlug(wrong), wrong).toBeUndefined()
    }
  })

  it('has the name of a month in Dutch, in small letters', () => {
    expect(monthName(1)).toBe('januari')
    expect(monthName(12)).toBe('december')
    expect(monthTitle(2005, 10)).toBe('oktober 2005')
  })
})

describe('the figures', () => {
  it('writes an average in tenths with a comma', () => {
    expect(averageText(41)).toBe('4,1')
    expect(averageText(60)).toBe('6,0')
    expect(averageText(100)).toBe('10,0')
  })

  it('needs five participants before figures show', () => {
    expect(quizMinimum).toBe(5)
  })

  it('says "vraag" for one question and "vragen" for more', () => {
    expect(summaryTitle(1)).toBe('Nog 1 vraag zonder antwoord')
    expect(summaryTitle(3)).toBe('Nog 3 vragen zonder antwoord')
  })
})

describe('checkQuiz', () => {
  it('is checked when every question has one of the four answers, and scores them', () => {
    const state = checkQuiz(questions, ['1', '2', '3'])

    expect(state).toEqual({ answers: { 1: 1, 3: 2, 4: 3 }, checked: true, errors: {} })
    expect(scoreOf(questions, state.answers)).toBe(2)
  })

  it('gives each question without an answer its own error, numbered in this quiz, and keeps the rest', () => {
    const state = checkQuiz(questions, ['1', null, undefined])

    expect(state.checked).toBe(false)
    expect(state.answers).toEqual({ 1: 1 })
    expect(state.errors).toEqual({ 3: 'Kies een antwoord bij vraag 2.', 4: 'Kies een antwoord bij vraag 3.' })
  })

  it('refuses an answer that is not 1 to 4, or not a text', () => {
    for (const entry of ['0', '5', 'a', '', '1.5', 2, {}, ['1']]) {
      expect(checkQuiz([question(1, 1)], [entry]).checked, String(entry)).toBe(false)
    }
  })
})
