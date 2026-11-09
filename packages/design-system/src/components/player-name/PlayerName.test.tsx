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

  it('has the same markup as before when there is no shirt number and no line', () => {
    const { container } = render(<PlayerName givenName="Jakob" surname="Trenskow" />)

    expect(container.innerHTML).toBe(
      '<span class="hf-player-name"><span class="hf-player-name-given">Jakob</span> <span class="hf-player-name-surname">Trenskow</span></span>',
    )
  })

  describe('with a shirt number', () => {
    it('puts the number in a column before the name, one space apart, as one line of text', () => {
      const { container } = render(<PlayerName givenName="Joost" shirtNumber={4} surname="van Aken" />)

      expect(container.querySelector('.hf-player-name-number')?.textContent).toBe('4')
      expect(container.querySelector('.hf-player-name-text')?.textContent).toBe('Joost van Aken')
      expect(container.textContent).toBe('4 Joost van Aken')
      expect(container.querySelector('.hf-visually-hidden, [aria-hidden], [hidden]')).toBeNull()
    })

    it('is named by the number and the name together, in a link', () => {
      render(
        <a href="#speler">
          <PlayerName givenName="Joost" shirtNumber={4} surname="van Aken" />
        </a>,
      )

      expect(screen.getByRole('link', { name: '4 Joost van Aken' })).toBeTruthy()
    })

    it('keeps an empty column for null, with no space before the name', () => {
      const { container } = render(<PlayerName shirtNumber={null} surname="Dinho" />)

      expect(container.querySelector('.hf-player-name-number')?.textContent).toBe('')
      expect(container.textContent).toBe('Dinho')
    })

    it('shows the number 0 and does not take it for none', () => {
      const { container } = render(<PlayerName shirtNumber={0} surname="Nul" />)

      expect(container.textContent).toBe('0 Nul')
    })

    it('has no column when the number is left out', () => {
      const { container } = render(<PlayerName surname="Dinho" />)

      expect(container.querySelector('.hf-player-name-number')).toBeNull()
      expect(container.querySelector('.hf-player-name-numbered')).toBeNull()
    })

    it('keeps the class of the caller and the weights of the name', () => {
      const { container } = render(<PlayerName className="extra" givenName="Joost" shirtNumber={4} surname="Aken" />)

      expect(container.firstElementChild?.className).toBe('hf-player-name hf-player-name-numbered extra')
      expect(container.querySelector('.hf-player-name-given')?.textContent).toBe('Joost')
      expect(container.querySelector('.hf-player-name-surname')?.textContent).toBe('Aken')
    })
  })

  describe('with a line behind the name', () => {
    it('puts the children in a line of their own after the name, and the name stays one name', () => {
      const { container } = render(
        <PlayerName givenName="Robin" surname="van Persie">
          34 wedstrijden, 1,85 punten per wedstrijd
        </PlayerName>,
      )

      expect(container.querySelector('.hf-player-name-meta')?.textContent).toBe(
        '34 wedstrijden, 1,85 punten per wedstrijd',
      )
      expect(container.querySelector('.hf-player-name-given')?.textContent).toBe('Robin')
      expect(container.querySelector('.hf-player-name-surname')?.textContent).toBe('van Persie')
      expect(container.textContent).toBe('Robin van Persie 34 wedstrijden, 1,85 punten per wedstrijd')
      expect(container.querySelector('.hf-visually-hidden, [aria-hidden], [hidden]')).toBeNull()
    })

    it('has no line when there are no children, or only an empty one', () => {
      const { container, rerender } = render(<PlayerName surname="Dinho">{null}</PlayerName>)

      expect(container.querySelector('.hf-player-name-meta')).toBeNull()

      rerender(<PlayerName surname="Dinho">{false}</PlayerName>)

      expect(container.querySelector('.hf-player-name-meta')).toBeNull()
    })

    it('goes with a shirt number: the line is in the column of the name, not under the number', () => {
      const { container } = render(
        <PlayerName shirtNumber={9} surname="Dinho">
          3e seizoen
        </PlayerName>,
      )

      expect(container.querySelector('.hf-player-name-text .hf-player-name-meta')?.textContent).toBe('3e seizoen')
      expect(container.querySelector('.hf-player-name-number .hf-player-name-meta')).toBeNull()
      expect(container.textContent).toBe('9 Dinho 3e seizoen')
    })
  })
})

describe('PlayerName with a country', () => {
  it('puts the flag between the shirt number and the name, with the name of the country as its text', () => {
    const { container } = render(<PlayerName country="NL" givenName="Jakob" shirtNumber={9} surname="Trenskow" />)
    const flag = screen.getByRole('img', { name: 'Nederland' })

    expect(flag.getAttribute('src')).toMatch(/^data:image\/svg\+xml,/u)
    expect([...(container.firstElementChild?.children ?? [])].map((child) => child.className)).toEqual([
      'hf-player-name-number',
      'hf-player-name-flag',
      'hf-player-name-text',
    ])
    // The number, the country and the name, one space apart, in that order.
    expect(container.textContent?.replace(/\s+/gu, ' ')).toBe('9 Jakob Trenskow')
  })

  it('takes a code in small letters too', () => {
    render(<PlayerName country="be" surname="Dinho" />)

    expect(screen.getByRole('img', { name: 'België' })).toBeDefined()
  })

  it('has no image, but an empty place of its own, for a player without a country among others who have one', () => {
    const { container } = render(<PlayerName country={null} givenName="Jakob" shirtNumber={9} surname="Trenskow" />)

    expect(screen.queryByRole('img')).toBeNull()
    expect(container.querySelector('span.hf-player-name-flag')?.childNodes).toHaveLength(0)
    expect(container.textContent).toBe('9 Jakob Trenskow')
  })

  it('has the same empty place for a country without a flag here, and never a broken image', () => {
    const { container } = render(<PlayerName country="BR" shirtNumber={9} surname="Dinho" />)

    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('span.hf-player-name-flag')).not.toBeNull()
  })

  it('has no place for a flag, and the markup it had, without a country', () => {
    const { container } = render(<PlayerName givenName="Jakob" shirtNumber={9} surname="Trenskow" />)

    expect(container.querySelector('.hf-player-name-flag')).toBeNull()
    expect([...(container.firstElementChild?.children ?? [])].map((child) => child.className)).toEqual([
      'hf-player-name-number',
      'hf-player-name-text',
    ])
  })

  it('shows the flag without a shirt number too, before the name', () => {
    const { container } = render(<PlayerName country="DE" surname="Dinho" />)

    expect(screen.getByRole('img', { name: 'Duitsland' })).toBeDefined()
    expect(container.querySelector('.hf-player-name-number')).toBeNull()
    expect(container.textContent?.trim()).toBe('Dinho')
  })
})
