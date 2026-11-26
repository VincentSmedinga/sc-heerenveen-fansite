import { act, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DataTable } from '../data-table/DataTable'
import { ShowAll } from './ShowAll'

const rows = ['Alkmaar', 'Breda', 'Coevorden', 'Delft'].map((header, index) => ({ cells: [index], header }))

const list = (shown: number) => (
  <ShowAll moreLabel={`Toon alle ${rows.length} clubs`} shown={shown} total={rows.length}>
    <DataTable caption="De clubs" columns={['Club', 'Gespeeld']} rows={rows} />
  </ShowAll>
)

/** The rows that the style element of the block hides, by the selector it holds. */
const hidden = (container: HTMLElement) => {
  const rule = container.querySelector('style')?.textContent ?? ''
  const selector = /\{\s*(.+?)\s*\{ display: none;/u.exec(rule)?.[1]

  return selector === undefined
    ? []
    : [...container.querySelectorAll(selector)].map((row) => row.querySelector('th')?.textContent)
}

const click = (name: string) => {
  act(() => {
    fireEvent.click(screen.getByRole('button', { name }))
  })
}

describe('ShowAll', () => {
  afterEach(() => {
    delete (Element.prototype as Partial<Element>).scrollIntoView
  })

  it('sends every row from the server, and hides the later ones only where script is on', () => {
    const html = renderToStaticMarkup(list(2))

    for (const { header } of rows) {
      expect(html).toContain(header)
    }

    expect(html).toMatch(/<style>@media \(scripting: enabled\) \{ \[data-show-all="[^"&]+"\]/u)
    expect(html).toContain('tbody > tr')
    expect(html).toContain('aria-expanded="false"')
  })

  it('hides the rows after the first ones while it is closed', () => {
    const { container } = render(list(2))

    expect(hidden(container)).toEqual(['Coevorden', 'Delft'])
  })

  it('opens and closes on the button, which says so and changes its name', () => {
    Element.prototype.scrollIntoView = vi.fn()
    const { container } = render(list(2))
    const button = screen.getByRole('button', { name: 'Toon alle 4 clubs' })

    expect(button.getAttribute('aria-expanded')).toBe('false')
    button.focus()
    click('Toon alle 4 clubs')

    expect(button.textContent).toBe('Toon minder')
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(button)
    expect(hidden(container)).toEqual([])
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()

    click('Toon minder')

    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(hidden(container)).toEqual(['Coevorden', 'Delft'])
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
  })

  it('has no button and hides nothing with as many rows as it shows, or fewer', () => {
    for (const shown of [4, 5]) {
      const { container, unmount } = render(list(shown))

      expect(screen.queryByRole('button', { name: /^Toon alle/u })).toBeNull()
      expect(container.querySelector('style')).toBeNull()
      unmount()
    }
  })

  it('shows the first rows of the order the visitor sorts on', () => {
    const { container } = render(list(2))

    click('Gespeeld')
    expect(hidden(container)).toEqual(['Breda', 'Alkmaar'])

    click('Gespeeld')
    click('Gespeeld')
    expect(hidden(container)).toEqual(['Coevorden', 'Delft'])
  })

  it('shows the button only where script is on', () => {
    const css = readFileSync(join(import.meta.dirname, 'show-all.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')
    const scripted = css.indexOf('@media (scripting: enabled)')

    expect(css.slice(0, scripted)).toMatch(/\.hf-show-all \.hf-show-all-button \{\s*display: none;/u)
    expect(css.slice(scripted)).toMatch(/\.hf-show-all \.hf-show-all-button \{\s*display: inline-block;/u)
  })
})
