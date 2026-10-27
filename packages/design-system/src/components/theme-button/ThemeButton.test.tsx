import { fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import { ThemeButton } from './ThemeButton'

const css = () => readFileSync(join(import.meta.dirname, 'theme-button.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

describe('ThemeButton', () => {
  it('is a button named by its label, with no visible text', () => {
    render(<ThemeButton dark={false} label="Donker" />)
    const button = screen.getByRole('button', { name: 'Donker' })

    expect(button.tagName).toBe('BUTTON')
    expect(button.textContent).toBe('')
    expect(button.className).toBe('hf-theme-button')
  })

  it('is a button that does not send a form', () => {
    render(<ThemeButton dark={false} label="Donker" />)

    expect(screen.getByRole('button').getAttribute('type')).toBe('button')
  })

  it('is not pressed in the light theme, and is pressed in the dark theme', () => {
    const { rerender } = render(<ThemeButton dark={false} label="Donker" />)

    expect(screen.getByRole('button', { name: 'Donker' }).getAttribute('aria-pressed')).toBe('false')

    rerender(<ThemeButton dark label="Donker" />)

    expect(screen.getByRole('button', { name: 'Donker' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('draws the rays of the sun, a disc and the disc that cuts the dent, and leaves the choice to the CSS', () => {
    render(<ThemeButton dark={false} label="Donker" />)
    const icon = screen.getByRole('button').querySelector('svg')

    expect(icon?.getAttribute('fill')).toBe('currentColor')
    expect(icon?.querySelectorAll('.hf-theme-button-rays path')).toHaveLength(8)
    expect(icon?.querySelectorAll('.hf-theme-button-body')).toHaveLength(1)
    expect(icon?.querySelectorAll('mask .hf-theme-button-dent')).toHaveLength(1)
  })

  it('gives each button its own mask, so two buttons on a page do not share one', () => {
    render(
      <>
        <ThemeButton dark={false} label="Eerste" />
        <ThemeButton dark label="Tweede" />
      </>,
    )
    const masks = [...document.querySelectorAll('mask')].map((mask) => mask.id)

    expect(masks).toHaveLength(2)
    expect(new Set(masks).size).toBe(2)
    expect(document.querySelectorAll('g[mask]')).toHaveLength(2)
    expect(document.querySelector('g[mask]')?.getAttribute('mask')).toBe(`url(#${masks[0]})`)
  })

  it('hides the icon from assistive technology, so the name and the state are all a screen reader hears', () => {
    render(<ThemeButton dark label="Donker" />)

    expect(screen.getByRole('button').querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('calls onClick when pressed, and keeps no state of its own', () => {
    const onClick = vi.fn()

    render(<ThemeButton dark={false} label="Donker" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Donker' }))

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('false')
  })

  it('is round, in theme-button.css', () => {
    expect(css()).toContain('border-radius: 50%;')
  })

  it('remembers a click, to keep the icon of the chosen theme, until the pointer or the focus leaves', () => {
    render(<ThemeButton dark={false} label="Donker" />)
    const button = screen.getByRole('button', { name: 'Donker' })

    expect(button.hasAttribute('data-settled')).toBe(false)

    fireEvent.click(button)

    expect(button.hasAttribute('data-settled')).toBe(true)

    fireEvent.pointerLeave(button)

    expect(button.hasAttribute('data-settled')).toBe(false)

    fireEvent.click(button)
    fireEvent.blur(button)

    expect(button.hasAttribute('data-settled')).toBe(false)
  })

  it('does not change the name or the pressed state when it settles, and passes the events on', () => {
    const onBlur = vi.fn()
    const onClick = vi.fn()
    const onPointerLeave = vi.fn()

    render(<ThemeButton dark label="Donker" onBlur={onBlur} onClick={onClick} onPointerLeave={onPointerLeave} />)
    const button = screen.getByRole('button', { name: 'Donker' })

    fireEvent.click(button)

    expect(screen.getByRole('button', { name: 'Donker' }).getAttribute('aria-pressed')).toBe('true')
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')

    fireEvent.pointerLeave(button)
    fireEvent.blur(button)

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onPointerLeave).toHaveBeenCalledTimes(1)
    expect(onBlur).toHaveBeenCalledTimes(1)
  })

  describe('theme-button.css', () => {
    // The part of the stylesheet between the opening brace after `start` and its closing brace.
    const block = (start: string, sheet = css()) => {
      const from = sheet.indexOf(start)

      if (from < 0) {
        throw new Error(`No ${start} in theme-button.css`)
      }

      let depth = 0

      for (let at = sheet.indexOf('{', from); at < sheet.length; at += 1) {
        depth += sheet[at] === '{' ? 1 : sheet[at] === '}' ? -1 : 0

        if (depth === 0) {
          return sheet.slice(from, at + 1)
        }
      }

      throw new Error(`No end of ${start} in theme-button.css`)
    }

    it('keeps the duration of the morph in one value, and the colour change at 0,2 seconds', () => {
      expect(css().match(/--hf-theme-button-morph: [^;]+;/g)).toEqual(['--hf-theme-button-morph: 0.4s;'])
      expect(css()).toContain('background-color 0.2s,')
    })

    it('shows the other icon only under hover: hover and with :focus-visible, and not when the button was clicked', () => {
      const preview = css().match(
        /&\[aria-pressed='(?:true|false)'\]:(?:focus-visible|hover):not\(\[data-settled\]\) \{/g,
      )

      expect(preview).toHaveLength(4)
      expect(block('@media (hover: hover)')).toContain(':hover:not([data-settled])')
      expect(css().replace(block('@media (hover: hover)'), '')).not.toContain(':hover:not')
    })

    it('does not show the other icon for :active', () => {
      expect(css()).not.toMatch(/:active:not|:active\[/)
      expect(css()).not.toMatch(/aria-pressed='(?:true|false)'\]:active/)
    })

    it('has transitions only without reduced motion', () => {
      let sheet = css()
      let guarded = 0

      while (sheet.includes('@media (prefers-reduced-motion: no-preference)')) {
        sheet = sheet.replace(block('@media (prefers-reduced-motion: no-preference)', sheet), '')
        guarded += 1
      }

      expect(guarded).toBe(1)
      expect(sheet).not.toContain('transition')
    })

    it('moves the icon with transforms only, from one number, so every browser draws the same', () => {
      expect(css()).not.toMatch(/\bd: /)
      expect(css()).not.toContain('@supports')
      expect(css().match(/--hf-theme-button-moon: [01];/g)?.length).toBe(6)
    })
  })
})
