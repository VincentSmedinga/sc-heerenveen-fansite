import { render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { contrast, role } from '../../tokens/colourRoles'
import { QuizQuestion, type QuizQuestionProps } from './QuizQuestion'

const props: QuizQuestionProps = {
  answers: ['Ajax', 'Feyenoord', 'Sunderland', 'Newcastle United'],
  id: 'vraag-1',
  name: 'vraag-1',
  number: 3,
  question: 'Naar welke club vertrok de testspeler?',
  total: 10,
}

describe('QuizQuestion', () => {
  it('is a group named by the question, with four radio buttons in order, and says which question it is', () => {
    render(<QuizQuestion {...props} />)
    const group = screen.getByRole('group', { name: 'Naar welke club vertrok de testspeler?' })

    expect(group.tagName).toBe('FIELDSET')
    expect(
      within(group)
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('value')),
    ).toEqual(['1', '2', '3', '4'])
    expect(screen.getByText('Vraag 3 van 10')).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Sunderland' }).closest('label')?.textContent).toBe('Sunderland')
  })

  it('gives the first radio button the id, so a link in an ErrorSummary goes to it', () => {
    render(<QuizQuestion {...props} />)

    expect(screen.getAllByRole('radio').map((radio) => radio.id)).toEqual([
      'vraag-1',
      'vraag-1-2',
      'vraag-1-3',
      'vraag-1-4',
    ])
  })

  it('has no default choice and chooses the answer it is given', () => {
    const { unmount } = render(<QuizQuestion {...props} />)

    expect(screen.getAllByRole('radio').filter((radio) => (radio as HTMLInputElement).checked)).toHaveLength(0)
    unmount()
    render(<QuizQuestion {...props} value="2" />)
    expect((screen.getByRole('radio', { name: 'Feyenoord' }) as HTMLInputElement).checked).toBe(true)
  })

  it('shows its own error in words and ties it to the group', () => {
    render(<QuizQuestion {...props} error="Kies een antwoord bij vraag 3." />)
    const group = screen.getByRole('group')
    const error = screen.getByText('Kies een antwoord bij vraag 3.')

    expect(group.getAttribute('aria-describedby')).toBe(error.closest('p')?.id)
    expect(within(error.closest('p') as HTMLElement).getByText('Fout:')).toBeTruthy()
  })

  describe('after it is checked', () => {
    const checked = (chosen: number, percentages: null | number[] = [10, 20, 60, 10]) =>
      render(<QuizQuestion {...props} result={{ chosen, correct: 3, percentages }} />)

    it('is no form: the question is a heading and the answers are a list', () => {
      checked(3)

      expect(screen.queryAllByRole('radio')).toHaveLength(0)
      expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('Naar welke club vertrok de testspeler?')
      expect(screen.getAllByRole('listitem')).toHaveLength(4)
    })

    it('says in words which answer is right and which one the player chose, with the percentage of each', () => {
      checked(1)
      const items = screen.getAllByRole('listitem')

      expect(items[0]?.textContent).toBe('AjaxJouw keuze, fout antwoord10%')
      expect(items[2]?.textContent).toBe('Sunderland, goed antwoord60%')
      expect(items[1]?.textContent).toBe('Feyenoord20%')
    })

    it('says "Goed." for a right answer and names the right one for a wrong answer', () => {
      const { unmount } = checked(3)

      expect(screen.getByText('Goed.')).toBeTruthy()
      unmount()
      checked(2)
      expect(screen.getByText('Fout.').parentElement?.textContent).toBe('Fout. Het goede antwoord is Sunderland.')
    })

    it('leaves the percentages out when it has none', () => {
      checked(3, null)

      expect(screen.queryByText(/%/)).toBeNull()
    })
  })
})

describe('the colours of QuizQuestion', () => {
  const css = readFileSync(join(import.meta.dirname, 'quiz-question.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

  it('come from colour roles, never from a scale', () => {
    expect(css).toContain('color: var(--hf-colour-text-correct);')
    expect(css).toContain('color: var(--hf-colour-text-accent);')
    expect(css).not.toMatch(/var\(--hf-colour-(?:blue|grey|red|green|steel|sand)-/)
  })

  it.each(['light', 'dark'] as const)('reach 4.5:1 on every surface in %s', (theme) => {
    for (const text of ['text-correct', 'text-accent']) {
      for (const surface of ['page', 'surface', 'surface-strong', 'surface-soft', 'surface-warm']) {
        expect(
          contrast(role(text)[theme], role(`background-${surface}`)[theme]),
          `${text} on ${surface}`,
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
