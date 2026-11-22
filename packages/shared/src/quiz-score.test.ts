import { describe, expect, it } from 'vitest'

import { scoreQuiz } from './quiz-score.ts'

describe('scoreQuiz', () => {
  it('counts the answers that are the right one', () => {
    expect(scoreQuiz([0, 1, 2, 3], [0, 1, 2, 3])).toBe(4)
    expect(scoreQuiz([0, 1, 2, 3], [3, 1, 0, 3])).toBe(2)
    expect(scoreQuiz([1, 1, 1], [0, 0, 0])).toBe(0)
  })

  it('scores a question without an answer as nothing', () => {
    expect(scoreQuiz([0, undefined, 2], [0, 1, 2])).toBe(2)
  })

  it('scores an empty quiz as nothing', () => {
    expect(scoreQuiz([], [])).toBe(0)
  })

  it('refuses answers for another number of questions', () => {
    expect(() => scoreQuiz([0, 1], [0, 1, 2])).toThrow('A quiz of 3 questions got 2 answers.')
  })
})
