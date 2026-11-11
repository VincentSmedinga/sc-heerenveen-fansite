import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PlayerList } from './PlayerList'

describe('PlayerList', () => {
  it('shows the family name, then the rest after a comma, and links a player who has a page', () => {
    render(
      <PlayerList
        players={[
          {
            facts: 'Verdediger · 2013–2017',
            href: '/spelers/joost-van-aken',
            key: '1',
            rest: 'Joost van',
            surname: 'Aken',
          },
          { key: '2', surname: 'Dinho' },
        ]}
      />,
    )

    const link = screen.getByRole('link', { name: 'Aken, Joost van' })

    expect(link.getAttribute('href')).toBe('/spelers/joost-van-aken')
    expect(link.querySelector('strong')?.textContent).toBe('Aken')
    expect(screen.getByText('Verdediger · 2013–2017')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Dinho' })).toBeNull()
    expect(screen.getByText('Dinho').tagName).toBe('STRONG')
  })

  it('shows the given name first, as one name, when the order is given-first', () => {
    render(
      <PlayerList
        order="given-first"
        players={[
          { facts: 'Doelman · 2019/20', href: '/spelers/joost-van-aken', key: '1', rest: 'Joost', surname: 'van Aken' },
        ]}
      />,
    )

    const link = screen.getByRole('link', { name: 'Joost van Aken' })

    expect(link.getAttribute('href')).toBe('/spelers/joost-van-aken')
    expect(link.querySelector('strong')).toBeNull()
    expect(screen.getByText('Doelman · 2019/20')).toBeTruthy()
  })
})
