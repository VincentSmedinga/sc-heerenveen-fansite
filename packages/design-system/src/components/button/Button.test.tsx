import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button, buttonAppearances, buttonTypes } from './Button'

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

  it('needs a type, because a button in a form sends the form unless it says otherwise', () => {
    const elements = [
      // @ts-expect-error A Button without a type is not allowed.
      <Button>Versturen</Button>,
    ]

    expect(elements).toHaveLength(1)
  })
})
