import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { IconButton, iconButtonIcons } from './IconButton'

describe('IconButton', () => {
  it('is a button named by its label, and shows the label when the pointer rests on it', () => {
    render(<IconButton icon="trash" label="Doelpunt 2 weghalen" type="submit" />)
    const button = screen.getByRole('button', { name: 'Doelpunt 2 weghalen' })

    expect(button.getAttribute('aria-label')).toBe('Doelpunt 2 weghalen')
    expect(button.getAttribute('title')).toBe('Doelpunt 2 weghalen')
  })

  it('shows only the icon, which assistive technology skips, and no text', () => {
    render(<IconButton icon="trash" label="Weghalen" type="button" />)
    const button = screen.getByRole('button')

    expect(button.textContent).toBe('')
    expect(button.querySelectorAll('svg')).toHaveLength(1)
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  it.each(iconButtonIcons)('can show the icon %s', (icon) => {
    render(<IconButton icon={icon} label="Weghalen" type="button" />)

    expect(screen.getByRole('button').querySelector('svg')).toBeTruthy()
  })

  it('is soft unless it says otherwise, and has the class of its own next to the others', () => {
    const { rerender } = render(<IconButton className="extra" icon="trash" label="Weghalen" type="button" />)

    expect(screen.getByRole('button').className).toBe('hf-button-soft hf-icon-button extra')

    rerender(<IconButton appearance="danger" icon="trash" label="Weghalen" size="small" type="button" />)
    expect(screen.getByRole('button').className).toBe('hf-button-danger hf-size-small hf-icon-button')
  })

  it('sends the form with its name and value, so it works without JavaScript', () => {
    const { container } = render(
      <form>
        <IconButton icon="trash" label="Doelpunt 2 weghalen" name="knop" type="submit" value="doelpunt-weghalen-2" />
      </form>,
    )
    const button = screen.getByRole('button')

    expect(button.getAttribute('type')).toBe('submit')
    expect(button.getAttribute('name')).toBe('knop')
    expect(button.getAttribute('value')).toBe('doelpunt-weghalen-2')
    expect(container.querySelector('form')).toBeTruthy()
  })

  it('needs a label and a type, because an icon alone names nothing', () => {
    const elements = [
      // @ts-expect-error An IconButton without a label is not allowed.
      <IconButton icon="trash" type="button" />,
      // @ts-expect-error An IconButton without a type is not allowed.
      <IconButton icon="trash" label="Weghalen" />,
    ]

    expect(elements).toHaveLength(2)
  })
})

describe('icon-button.css', () => {
  const css = readFileSync(join(import.meta.dirname, 'icon-button.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

  it('is as wide as the button is high, from the same tokens, so it is as easy to hit', () => {
    expect(css).toContain('inline-size: var(--hf-size-control);')
    expect(css).toContain('inline-size: var(--hf-size-control-small);')
  })

  it('takes the margin off the icon, which has none to give when no text is next to it', () => {
    expect(css).toMatch(/> \.hf-icon \{[^}]*margin: 0;/u)
  })
})
