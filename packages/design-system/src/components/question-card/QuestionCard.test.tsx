import { render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { QuestionCard } from './QuestionCard'

// The CSS is read as text: jsdom doesn't apply rules in a cascade layer.
const css = readFileSync(join(import.meta.dirname, 'question-card.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('QuestionCard', () => {
  it('is a list item in a named list, so a screen reader says how many there are', () => {
    render(
      <QuestionCard.Grid aria-label="Vragen">
        <QuestionCard figure="8" href="/a" question="Een" />
        <QuestionCard figure="9" href="/b" question="Twee" />
      </QuestionCard.Grid>,
    )
    const list = screen.getByRole('list', { name: 'Vragen' })

    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
  })

  it('is one link named by the question, the number and the line together', () => {
    render(
      <QuestionCard.Grid aria-label="Vragen">
        <QuestionCard figure="22" href="/derby" question="De derby">
          13 keer gewonnen
        </QuestionCard>
      </QuestionCard.Grid>,
    )

    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'De derby 22 13 keer gewonnen' }).getAttribute('href')).toBe('/derby')
  })

  it('has no line when it has none', () => {
    const { container } = render(
      <QuestionCard.Grid aria-label="Vragen">
        <QuestionCard figure="111" href="/a" question="Alle 0–0’s" />
      </QuestionCard.Grid>,
    )

    expect(container.querySelector('.hf-question-note')).toBeNull()
  })
})

describe('the CSS of the question card', () => {
  it('has three columns on a wide screen and one on a phone', () => {
    expect(css).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\);/)
    expect(css).toMatch(/@media \(width >= 40rem\)\s*{\s*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/)
  })

  it('takes every colour from a token', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i)
  })
})
