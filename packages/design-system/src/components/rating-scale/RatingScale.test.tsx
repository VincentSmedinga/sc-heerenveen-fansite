import { fireEvent, render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { contrast, role } from '../../tokens/colourRoles'
import { RatingScale } from './RatingScale'

const grades = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']

describe('RatingScale', () => {
  it('is a fieldset named by the player, with ten radio buttons from 1 to 10 in order', () => {
    render(<RatingScale id="cijfer-1" legend="Testspeler A" name="cijfer-1" />)
    const group = screen.getByRole('group', { name: 'Testspeler A' })

    expect(group.tagName).toBe('FIELDSET')
    expect(
      within(group)
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('value')),
    ).toEqual(grades)
    for (const grade of grades) {
      expect(screen.getByRole('radio', { name: grade }).closest('label')?.textContent).toBe(grade)
    }
  })

  it('has no default choice', () => {
    render(<RatingScale id="c" legend="Testspeler A" name="c" />)

    expect(screen.getAllByRole('radio').filter((radio) => (radio as HTMLInputElement).checked)).toHaveLength(0)
  })

  it('chooses the grade it is given, as a number or as the text the server returns', () => {
    const { unmount } = render(<RatingScale id="c" legend="Testspeler A" name="c" value={7} />)

    expect((screen.getByRole('radio', { name: '7' }) as HTMLInputElement).checked).toBe(true)
    unmount()
    render(<RatingScale id="c" legend="Testspeler A" name="c" value="10" />)
    expect((screen.getByRole('radio', { name: '10' }) as HTMLInputElement).checked).toBe(true)
  })

  it('sends the chosen grade with the form under its name, and nothing when none is chosen', () => {
    const { container } = render(
      <form>
        <RatingScale id="c" legend="Testspeler A" name="cijfer-1" required={false} />
      </form>,
    )
    const form = container.querySelector('form') as HTMLFormElement

    expect(new FormData(form).getAll('cijfer-1')).toEqual([])
    fireEvent.click(screen.getByText('8'))
    expect(new FormData(form).getAll('cijfer-1')).toEqual(['8'])
  })

  it('puts the id on the first radio button, so a link goes to it, and numbers the others', () => {
    render(<RatingScale id="cijfer-1" legend="Testspeler A" name="cijfer-1" />)

    expect(screen.getByRole('radio', { name: '1' }).id).toBe('cijfer-1')
    expect(screen.getByRole('radio', { name: '10' }).id).toBe('cijfer-1-10')
  })

  it('is required by default, and not when it says so', () => {
    const { rerender } = render(<RatingScale id="c" legend="Testspeler A" name="c" />)

    expect(screen.getAllByRole('radio').every((radio) => radio.hasAttribute('required'))).toBe(true)
    rerender(<RatingScale id="c" legend="Testspeler A" name="c" required={false} />)
    expect(screen.getAllByRole('radio').some((radio) => radio.hasAttribute('required'))).toBe(false)
  })

  it('shows the line under the legend, and leaves it out when it is empty', () => {
    const { rerender } = render(<RatingScale id="c" legend="Testspeler A" line="Keeper · 90 min" name="c" />)

    expect(document.getElementById('c-line')?.textContent).toBe('Keeper · 90 min')
    expect(screen.getByRole('group').getAttribute('aria-describedby')).toBe('c-line')
    rerender(<RatingScale id="c" legend="Testspeler A" line="" name="c" />)
    expect(document.getElementById('c-line')).toBeNull()
    expect(screen.getByRole('group').hasAttribute('aria-describedby')).toBe(false)
  })

  it('ties the error to the group, in text that starts with Fout, and marks the group', () => {
    render(<RatingScale error="Geef Testspeler A een cijfer." id="c" legend="Testspeler A" line="Keeper" name="c" />)
    const group = screen.getByRole('group', { name: 'Testspeler A' })

    expect(group.getAttribute('aria-describedby')).toBe('c-line c-error')
    expect(document.getElementById('c-error')?.textContent).toBe('Fout: Geef Testspeler A een cijfer.')
    expect(group.hasAttribute('data-invalid')).toBe(true)
  })

  it('has no error mark without an error', () => {
    render(<RatingScale id="c" legend="Testspeler A" name="c" />)

    expect(screen.getByRole('group').hasAttribute('data-invalid')).toBe(false)
  })

  it('passes other props to the fieldset', () => {
    render(<RatingScale className="extra" data-extra="1" id="c" legend="Testspeler A" name="c" />)

    const group = screen.getByRole('group')

    expect(group.className).toContain('hf-rating-scale')
    expect(group.className).toContain('extra')
    expect(group.getAttribute('data-extra')).toBe('1')
  })
})

// jsdom doesn't apply rules in a cascade layer, so these read the file's text,
// without the comments.
const css = readFileSync(join(import.meta.dirname, 'rating-scale.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

describe('the look of a RatingScale', () => {
  it('makes each button at least as big as a control, in one and in two rows', () => {
    expect(css).toContain('min-block-size: var(--hf-size-control);')
    expect(css).toContain('min-inline-size: var(--hf-size-control);')
    expect(css).toContain('repeat(5, minmax(var(--hf-size-control), 4rem))')
    expect(css).toContain('repeat(10, minmax(var(--hf-size-control), 1fr))')
  })

  it('follows the width of the card, not of the screen', () => {
    expect(css).toContain('container-type: inline-size;')
    expect(css).toMatch(/@container hf-rating-scale \(inline-size >= /)
    expect(css).not.toMatch(/@media \((?:min|max)-width/)
  })

  it('takes its colours from colour roles, never from a scale', () => {
    expect(css).not.toMatch(/var\(--hf-colour-(?:blue|grey|red|steel|sand)-/)
  })

  it.each(['light', 'dark'] as const)('has a chosen button whose number reaches 4.5:1 in %s', (theme) => {
    expect(contrast(role('text-on-button')[theme], role('background-button')[theme])).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['light', 'dark'] as const)('has numbers and borders with enough contrast in %s', (theme) => {
    for (const surface of ['surface', 'surface-soft', 'surface-strong']) {
      expect(contrast(role('text-highlight')[theme], role('background-surface')[theme])).toBeGreaterThanOrEqual(4.5)
      expect(contrast(role('border-input')[theme], role(`background-${surface}`)[theme])).toBeGreaterThanOrEqual(3)
      expect(contrast(role('text-accent')[theme], role('background-surface')[theme])).toBeGreaterThanOrEqual(3)
    }
  })
})
