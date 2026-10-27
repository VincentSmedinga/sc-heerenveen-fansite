import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PlayerName } from './PlayerName'

describe('PlayerName', () => {
  it('is one name in one text, the given name and the surname one space apart', () => {
    const { container } = render(<PlayerName givenName="Jakob" surname="Trenskow" />)

    expect(container.textContent).toBe('Jakob Trenskow')
    expect(container.firstElementChild?.childNodes).toHaveLength(3)
  })

  it('puts the weight on the parts, the given name in its own and the surname in its own', () => {
    const { container } = render(<PlayerName givenName="Joost" surname="van Aken" />)

    expect(container.querySelector('.hf-player-name-given')?.textContent).toBe('Joost')
    expect(container.querySelector('.hf-player-name-surname')?.textContent).toBe('van Aken')
  })

  it('has no strong, b or text for a screen reader only, because the weight is for the eye', () => {
    const { container } = render(<PlayerName givenName="Jakob" surname="Trenskow" />)

    expect(container.querySelector('strong, b, em, i')).toBeNull()
    expect(container.querySelector('.hf-visually-hidden, [aria-hidden], [hidden]')).toBeNull()
    expect(container.querySelector('.hf-player-name')?.textContent).toBe('Jakob Trenskow')
  })

  it('gives only the surname, without a space, when there is no given name', () => {
    const { container } = render(<PlayerName surname="Dinho" />)

    expect(container.textContent).toBe('Dinho')
    expect(container.querySelector('.hf-player-name-given')).toBeNull()
    expect(container.querySelector('.hf-player-name-surname')?.textContent).toBe('Dinho')
  })

  it('takes an empty given name as no given name', () => {
    const { container } = render(<PlayerName givenName="" surname="Dinho" />)

    expect(container.textContent).toBe('Dinho')
    expect(container.querySelector('.hf-player-name-given')).toBeNull()
  })

  it('gives the whole name in the normal weight when the surname is empty', () => {
    const { container } = render(<PlayerName givenName="Jan Paul van Hecke" surname="" />)

    expect(container.textContent).toBe('Jan Paul van Hecke')
    expect(container.querySelector('.hf-player-name-surname')).toBeNull()
    expect(container.querySelector('.hf-player-name-given')?.textContent).toBe('Jan Paul van Hecke')
  })

  it('is a span that keeps the class of the caller and the other attributes', () => {
    const { container } = render(<PlayerName className="extra" givenName="Jakob" id="speler" surname="Trenskow" />)
    const name = container.firstElementChild

    expect(name?.tagName).toBe('SPAN')
    expect(name?.className).toBe('hf-player-name extra')
    expect(name?.id).toBe('speler')
  })

  it('works inside a link, and the link is named by the whole name', () => {
    render(
      <a href="#speler">
        <PlayerName givenName="Jakob" surname="Trenskow" />
      </a>,
    )

    expect(screen.getByRole('link', { name: 'Jakob Trenskow' })).toBeTruthy()
  })
})
