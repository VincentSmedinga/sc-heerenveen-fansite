import { act, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import { choosesByKey, SeasonPicker } from './SeasonPicker'

const options = [
  { label: '2026/27', value: '2026-27' },
  { label: '2025/26', value: '2025-26' },
  { label: '2024/25', value: '2024-25' },
]

const css = () => readFileSync(join(import.meta.dirname, 'season-picker.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

/** A key press on the list, with the `change` that a closed list sends in some browsers. */
function pressKeyThatChooses(list: HTMLSelectElement, key: string, chosen: string) {
  fireEvent.keyDown(list, { key })
  list.value = chosen
  fireEvent.change(list)
  fireEvent.keyUp(list, { key })
}

/** Renders the picker and counts the times its form is sent, without leaving the test. */
function setup(value = '2026-27') {
  const sent = vi.fn()
  const result = render(<SeasonPicker action="/wedstrijden/kies" options={options} value={value} />)
  const list = screen.getByRole('combobox', { name: 'Seizoen' }) as HTMLSelectElement

  list.form?.addEventListener('submit', (event) => {
    event.preventDefault()
    sent(new FormData(list.form as HTMLFormElement).get('seizoen'))
  })

  return { ...result, list, sent }
}

describe('SeasonPicker', () => {
  it('is a form that gets, named Seizoen kiezen, to the address it is given', () => {
    render(<SeasonPicker action="/wedstrijden/kies" options={options} value="2025-26" />)
    const form = screen.getByRole('form', { name: 'Seizoen kiezen' })

    expect(form.tagName).toBe('FORM')
    expect(form.getAttribute('method')).toBe('get')
    expect(form.getAttribute('action')).toBe('/wedstrijden/kies')
  })

  it('does not let the browser fill the list from an earlier visit, so it always shows the season of the page', () => {
    render(<SeasonPicker action="/wedstrijden/kies" options={options} value="2025-26" />)

    expect(screen.getByRole('form').getAttribute('autocomplete')).toBe('off')
  })

  it('has a list named Seizoen, called seizoen, with the seasons in order and the season of the page chosen', () => {
    const { list } = setup('2025-26')

    expect(document.querySelector('label')?.textContent).toBe('Seizoen')
    expect(list.name).toBe('seizoen')
    expect([...list.options].map((option) => [option.value, option.textContent])).toEqual([
      ['2026-27', '2026/27'],
      ['2025-26', '2025/26'],
      ['2024-25', '2024/25'],
    ])
    expect(list.value).toBe('2025-26')
  })

  it('sends the value of the season to the route, as the button does without script', () => {
    const { list, sent } = setup('2025-26')

    list.value = '2024-25'
    fireEvent.submit(list.form as HTMLFormElement)

    expect(sent).toHaveBeenCalledWith('2024-25')
  })

  it('renders nothing when there is one season or none, because there is nothing to choose', () => {
    const { container, rerender } = render(
      <SeasonPicker action="/wedstrijden/kies" options={options.slice(0, 1)} value="2026-27" />,
    )

    expect(container.innerHTML).toBe('')

    rerender(<SeasonPicker action="/wedstrijden/kies" options={[]} value="2026-27" />)

    expect(container.innerHTML).toBe('')
  })

  describe('with script', () => {
    it('hides the button Toon, which stays in the page for a visitor without script', () => {
      setup()

      expect(screen.getByText('Toon').closest('button')?.hidden).toBe(true)
      expect(screen.getByText('Toon').closest('button')?.getAttribute('type')).toBe('submit')
    })

    it('hides the label and the line about the page from the eye, and keeps them for a screen reader', () => {
      const { list } = setup()
      const hint = document.getElementById(list.getAttribute('aria-describedby') ?? '')

      expect(document.querySelector('label')?.className).toBe('hf-visually-hidden')
      expect(hint?.className).toContain('hf-visually-hidden')
      expect(screen.getByRole('combobox', { name: 'Seizoen' })).toBe(list)
    })

    it('tells before a choice that the page changes at once, in text that describes the list', () => {
      const { list } = setup()
      const hint = document.getElementById(list.getAttribute('aria-describedby') ?? '')

      expect(hint?.textContent).toContain('De pagina wisselt direct van seizoen.')
      expect(hint?.textContent).toContain('Enter')
      expect(hint?.previousElementSibling?.tagName).toBe('FORM')
    })

    it('sends the form when a season is chosen with the mouse or a finger', () => {
      const { list, sent } = setup()

      fireEvent.pointerDown(list)
      list.value = '2025-26'
      fireEvent.change(list)

      expect(sent).toHaveBeenCalledExactlyOnceWith('2025-26')
    })

    it('sends the form when a season is chosen from the open list with the keyboard, which the list reports without a key press on itself', () => {
      const { list, sent } = setup()

      list.value = '2024-25'
      fireEvent.change(list)

      expect(sent).toHaveBeenCalledExactlyOnceWith('2024-25')
    })

    it('does not send the form at each arrow key, so every season can be reached with the keyboard', () => {
      const { list, sent } = setup()

      pressKeyThatChooses(list, 'ArrowDown', '2025-26')
      pressKeyThatChooses(list, 'ArrowDown', '2024-25')
      pressKeyThatChooses(list, 'ArrowUp', '2025-26')

      expect(sent).not.toHaveBeenCalled()
      expect(list.value).toBe('2025-26')
    })

    it('does not send the form at a letter either, which jumps to the season that starts with it', () => {
      const { list, sent } = setup()

      pressKeyThatChooses(list, '2', '2025-26')

      expect(sent).not.toHaveBeenCalled()
    })

    it('sends the form on Enter when a season other than the season of the page is chosen', () => {
      const { list, sent } = setup()

      pressKeyThatChooses(list, 'ArrowDown', '2025-26')
      const notCancelled = fireEvent.keyDown(list, { key: 'Enter' })

      expect(sent).toHaveBeenCalledExactlyOnceWith('2025-26')
      expect(notCancelled).toBe(false)
    })

    it('does nothing on Enter when the list shows the season of the page', () => {
      const { list, sent } = setup()

      const notCancelled = fireEvent.keyDown(list, { key: 'Enter' })

      expect(sent).not.toHaveBeenCalled()
      expect(notCancelled).toBe(true)
    })

    it('sends a choice with the mouse after the keyboard was used', () => {
      const { list, sent } = setup()

      pressKeyThatChooses(list, 'ArrowDown', '2025-26')
      fireEvent.pointerDown(list)
      list.value = '2024-25'
      fireEvent.change(list)

      expect(sent).toHaveBeenCalledExactlyOnceWith('2024-25')
    })

    it('puts the season of the page back when the list loses the focus without a confirmed choice', () => {
      const { list, sent } = setup()

      pressKeyThatChooses(list, 'ArrowDown', '2024-25')
      act(() => {
        fireEvent.blur(list)
      })

      expect(list.value).toBe('2026-27')
      expect(sent).not.toHaveBeenCalled()
    })
  })

  describe('choosesByKey', () => {
    const press = (key: string, modifiers: Partial<Record<'altKey' | 'ctrlKey' | 'metaKey', boolean>> = {}) =>
      choosesByKey({ altKey: false, ctrlKey: false, key, metaKey: false, ...modifiers })

    it('is true for the keys that move through a closed list, and for a letter or digit', () => {
      for (const key of [
        'ArrowDown',
        'ArrowUp',
        'ArrowLeft',
        'ArrowRight',
        'Home',
        'End',
        'PageUp',
        'PageDown',
        '2',
        'a',
      ]) {
        expect(press(key), key).toBe(true)
      }
    })

    it('is false for Enter, Tab, Escape and the space bar, which open or leave the list', () => {
      for (const key of ['Enter', 'Tab', 'Escape', ' ']) {
        expect(press(key), key).toBe(false)
      }
    })

    it('is false for a shortcut, such as Alt and the arrow down, which opens the list', () => {
      expect(press('ArrowDown', { altKey: true })).toBe(false)
      expect(press('a', { ctrlKey: true })).toBe(false)
      expect(press('a', { metaKey: true })).toBe(false)
    })
  })

  describe('season-picker.css', () => {
    it('keeps the hidden button hidden whatever the button style says', () => {
      expect(css()).toMatch(/button\[hidden\]\s*\{\s*display: none;/)
    })

    it('lets the list be as wide as its content and not the width of a field, and the row wrap', () => {
      expect(css()).toMatch(/inline-size: auto/)
      expect(css()).toMatch(/flex-wrap: wrap/)
    })
  })
})
