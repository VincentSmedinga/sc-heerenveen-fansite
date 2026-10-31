import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { Button } from './button/Button'
import { Input } from './input/Input'
import { Pagination } from './pagination/Pagination'
import { SegmentedControl } from './segmented-control/SegmentedControl'
import { SegmentedLinks } from './segmented-control/SegmentedLinks'
import { Select } from './select/Select'
import { sizeClassName, sizes } from './size'
import { ThemeButton } from './theme-button/ThemeButton'

// jsdom doesn't apply rules in a cascade layer, so the test reads the files' text, without the
// comments, which mention the sizes in words.
const read = (file: string) => readFileSync(join(import.meta.dirname, '..', file), 'utf8').replace(/\/\*.*?\*\//gs, '')

describe('the sizes', () => {
  it('are the standard size and the small size, and only the small size has a class', () => {
    expect(sizes).toEqual(['default', 'small'])
    expect(sizeClassName('default')).toBeUndefined()
    expect(sizeClassName('small')).toBe('hf-size-small')
  })

  it('leave a component without a size as it was', () => {
    render(
      <>
        <Button type="button">Versturen</Button>
        <Input aria-label="Naam" />
        <Select aria-label="Seizoen" />
        <Pagination current={1} label="Pagina's" total={2} />
        <ThemeButton dark={false} label="Donker" />
        <SegmentedControl
          label="Thema"
          onChange={() => undefined}
          options={[{ label: 'Licht', value: 'light' }]}
          value="light"
        />
        <SegmentedLinks label="Welke" options={[{ href: '#a', label: 'Alles', value: 'all' }]} value="all" />
      </>,
    )

    expect(screen.getByRole('button', { name: 'Versturen' }).hasAttribute('class')).toBe(false)
    expect(screen.getByRole('textbox').hasAttribute('class')).toBe(false)
    expect(screen.getByRole('combobox').hasAttribute('class')).toBe(false)
    expect(screen.getByRole('navigation').className).toBe('hf-pagination')
    expect(screen.getByRole('button', { name: 'Donker' }).className).toBe('hf-theme-button')
    expect(screen.getByRole('group', { name: 'Thema' }).className).toBe('hf-segmented-control')
    expect(screen.getByRole('group', { name: 'Welke' }).className).toBe('hf-segmented-control')
  })

  it('put the same class on every component that takes the small size, next to its other classes', () => {
    render(
      <>
        <Button appearance="soft" size="small" type="button">
          Versturen
        </Button>
        <Input aria-label="Naam" className="extra" size="small" />
        <Select aria-label="Seizoen" size="small" />
        <Pagination current={1} label="Pagina's" size="small" total={2} />
        <ThemeButton dark={false} label="Donker" size="small" />
        <SegmentedControl
          label="Thema"
          onChange={() => undefined}
          options={[{ label: 'Licht', value: 'light' }]}
          size="small"
          value="light"
        />
        <SegmentedLinks
          label="Welke"
          options={[{ href: '#a', label: 'Alles', value: 'all' }]}
          size="small"
          value="all"
        />
      </>,
    )

    expect(screen.getByRole('button', { name: 'Versturen' }).className).toBe('hf-button-soft hf-size-small')
    expect(screen.getByRole('textbox').className).toBe('hf-size-small extra')
    expect(screen.getByRole('combobox').className).toBe('hf-size-small')
    expect(screen.getByRole('navigation').className).toBe('hf-pagination hf-size-small')
    expect(screen.getByRole('button', { name: 'Donker' }).className).toBe('hf-theme-button hf-size-small')
    expect(screen.getByRole('group', { name: 'Thema' }).className).toBe('hf-segmented-control hf-size-small')
    expect(screen.getByRole('group', { name: 'Welke' }).className).toBe('hf-segmented-control hf-size-small')
  })

  it('do not pass the size on as the attribute of the HTML element', () => {
    render(
      <>
        <Input aria-label="Naam" size="small" />
        <Select aria-label="Seizoen" size="small" />
      </>,
    )

    expect(screen.getByRole('textbox').hasAttribute('size')).toBe(false)
    expect(screen.getByRole('combobox').hasAttribute('size')).toBe(false)
  })
})

describe('the small size in CSS', () => {
  const token = read('tokens/size.css').match(/--hf-size-control-small: (\d*\.?\d+)rem;/)

  it('is 36 pixels high, well above the 24 pixels of WCAG 2.5.8', () => {
    expect(Number(token?.[1]) * 16).toBe(36)
    expect(read('index.css')).toContain("@import url('./tokens/size.css');")
  })

  it.each([
    'components/button/button.css',
    'base/forms.css',
    'components/select/select.css',
    'components/pagination/pagination.css',
    'components/theme-button/theme-button.css',
    'components/segmented-control/segmented-control.css',
  ])('sets the height from the token in %s, and no height of its own', (file) => {
    const css = read(file)
    const small = css.slice(css.indexOf('hf-size-small'))

    expect(small).toContain('var(--hf-size-control-small)')
    expect(small).not.toMatch(/(?:block|inline|min-block|min-inline)-size: \d*\.?\d+rem/)
  })

  it('keeps the round button without padding, which the small size of a button would give it', () => {
    const css = read('components/theme-button/theme-button.css')

    expect(css.slice(css.indexOf('&.hf-size-small'))).toMatch(/&\.hf-size-small \{[^}]*padding: 0;/)
  })
})
