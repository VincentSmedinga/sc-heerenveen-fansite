import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button, buttonAppearances, buttonIcons, buttonTypes } from './Button'

describe('Button', () => {
  it('is a button with its text as its name', () => {
    render(<Button type="submit">Versturen</Button>)

    expect(screen.getByRole('button', { name: 'Versturen' }).tagName).toBe('BUTTON')
  })

  it.each(buttonTypes)('can be of the type %s', (type) => {
    render(<Button type={type}>Doe iets</Button>)

    expect(screen.getByRole('button').getAttribute('type')).toBe(type)
  })

  it('is the filled button, without a class of its own, when it has no appearance', () => {
    render(<Button type="button">Doe iets</Button>)

    expect(screen.getByRole('button').hasAttribute('class')).toBe(false)
  })

  it.each(buttonAppearances)('can have the appearance %s', (appearance) => {
    render(
      <Button appearance={appearance} type="button">
        Doe iets
      </Button>,
    )

    expect(screen.getByRole('button').className).toBe(appearance === 'default' ? '' : `hf-button-${appearance}`)
  })

  it('adds a class of its own to the one of the appearance', () => {
    render(
      <Button appearance="soft" className="extra" type="button">
        Doe iets
      </Button>,
    )

    expect(screen.getByRole('button').className).toBe('hf-button-soft extra')
  })

  it('keeps the other attributes', () => {
    render(
      <Button className="extra" disabled type="button">
        Doe iets
      </Button>,
    )

    expect(screen.getByRole('button').className).toBe('extra')
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true)
  })

  it('has no icon and no extra markup without the prop icon', () => {
    render(<Button type="button">Laad 5 meer</Button>)

    expect(screen.getByRole('button').innerHTML).toBe('Laad 5 meer')
  })

  it.each(buttonIcons)('puts the icon %s in front of the text, with the first word', (icon) => {
    render(
      <Button icon={icon} type="button">
        Laad 5 meer
      </Button>,
    )
    const button = screen.getByRole('button')

    expect(button.innerHTML).toMatch(
      /^<span class="hf-icon-head"><svg [^>]*class="hf-icon"[^>]*>.*<\/svg>Laad<\/span> 5 meer$/,
    )
  })

  it('is named by its text alone: the icon is hidden from assistive technology', () => {
    render(
      <Button icon="envelope" type="submit">
        Versturen
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Versturen' })

    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(button.textContent).toBe('Versturen')
  })

  it('keeps its class and its other attributes next to an icon', () => {
    render(
      <Button appearance="soft" className="extra" icon="plus" name="nieuws" type="submit" value="15">
        Laad 5 meer
      </Button>,
    )
    const button = screen.getByRole('button')

    expect(button.className).toBe('hf-button-soft extra')
    expect(button.getAttribute('name')).toBe('nieuws')
    expect(button.getAttribute('value')).toBe('15')
  })

  it('only takes the icons of the list', () => {
    const elements = [
      // @ts-expect-error A button has no arrow.
      <Button icon="arrow-right" type="button">
        Verder
      </Button>,
    ]

    expect(elements).toHaveLength(1)
    expect(buttonIcons).toEqual(['envelope', 'plus'])
  })

  it('needs a type, because a button in a form sends the form unless it says otherwise', () => {
    const elements = [
      // @ts-expect-error A Button without a type is not allowed.
      <Button>Versturen</Button>,
    ]

    expect(elements).toHaveLength(1)
  })
})
