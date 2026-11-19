import { act, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { MoreRows } from './MoreRows'

const rowsOf = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    cells: [index + 1],
    header: `Club ${index + 1}`,
    position: index + 1,
  }))
const table = (count: number) => (
  <MoreRows
    caption="De eerste {shown} clubs"
    columns={['Club', 'Punten']}
    name="Het makkelijkst"
    rows={rowsOf(count)}
    unit="clubs"
  />
)
const bodyRows = () => document.querySelectorAll('tbody tr').length
const press = (name: string) =>
  act(() => {
    fireEvent.click(screen.getByRole('button', { name }))
  })

describe('MoreRows', () => {
  it('sends the first five rows and no button without JavaScript', () => {
    const html = renderToStaticMarkup(table(12))

    expect(html).not.toContain('<button')
    expect(html).not.toContain('aria-live')
    expect(html.match(/<tbody>.*<\/tbody>/s)?.[0].match(/<tr/g)).toHaveLength(5)
    expect(html).toContain('De eerste 5 clubs')
  })

  it('adds five rows a press, names the rest at the end, and ends with Herstel naar top 5', () => {
    render(table(12))
    expect(bodyRows()).toBe(5)

    press('Toon 5 meer, Het makkelijkst')
    expect(bodyRows()).toBe(10)
    expect(screen.getByRole('status').textContent).toBe('5 clubs meer getoond, nu 10')
    expect(document.querySelector('caption')?.textContent).toBe('De eerste 10 clubs')

    press('Toon 2 meer, Het makkelijkst')
    expect(bodyRows()).toBe(12)
    expect(screen.getByRole('status').textContent).toBe('2 clubs meer getoond, nu 12')

    press('Herstel naar top 5, Het makkelijkst')
    expect(bodyRows()).toBe(5)
    expect(screen.getByRole('status').textContent).toBe('Terug naar de top 5')
  })

  it('keeps the focus on the same button after a press', () => {
    render(table(12))

    const button = screen.getByRole('button', { name: 'Toon 5 meer, Het makkelijkst' })

    button.focus()
    press('Toon 5 meer, Het makkelijkst')
    expect(document.activeElement).toBe(button)
  })

  it('stops at the last row when the list has fewer than 25 rows, and puts the visible text first in the name', () => {
    render(table(8))
    expect(screen.getByRole('button', { name: /^Toon 3 meer/ })).toBeTruthy()
    press('Toon 3 meer, Het makkelijkst')
    expect(bodyRows()).toBe(8)
    expect(screen.getByRole('button', { name: /^Herstel naar top 5/ })).toBeTruthy()
  })

  it('has no button for five rows or fewer', () => {
    render(table(5))
    expect(bodyRows()).toBe(5)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
