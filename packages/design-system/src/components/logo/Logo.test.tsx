import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Link } from '../link/Link'
import { Logo } from './Logo'

describe('Logo', () => {
  it('is one image, with a name', () => {
    render(<Logo />)

    expect(screen.getByRole('img', { name: 'sc Heerenveen Fansite, sinds 1997' })).toBeTruthy()
  })

  it('hides the drawing of the shield from screen readers and shows the wordmark as text', () => {
    const { container } = render(<Logo />)

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('.hf-logo-wordmark')?.textContent).toBe('sc Heerenveen Fansite')
    expect(container.querySelector('.hf-logo-tagline')?.textContent).toBe('sinds 1997')
  })

  it('names a link around it', () => {
    render(
      <Link href="/">
        <Logo />
      </Link>,
    )

    expect(screen.getByRole('link', { name: 'sc Heerenveen Fansite, sinds 1997' }).getAttribute('href')).toBe('/')
  })

  it('gives the shield and its clipping path ids that no other logo on the page has', () => {
    const { container } = render(
      <>
        <Logo />
        <Logo />
      </>,
    )
    const ids = Array.from(container.querySelectorAll('[id]')).map((element) => element.id)

    expect(ids).toHaveLength(4)
    expect(new Set(ids).size).toBe(4)
  })

  it('points the clipping and the copies of the shield at its own ids', () => {
    const { container } = render(<Logo />)
    const shield = container.querySelector('path[id]')?.id
    const field = container.querySelector('clipPath')?.id

    expect(container.querySelector('clipPath use')?.getAttribute('href')).toBe(`#${shield}`)
    expect(container.querySelector('g[clip-path]')?.getAttribute('clip-path')).toBe(`url(#${field})`)
  })

  it('keeps the other attributes and adds a class to its own', () => {
    render(<Logo className="extra" id="logo" />)
    const logo = screen.getByRole('img')

    expect(logo.className).toBe('hf-logo extra')
    expect(logo.id).toBe('logo')
  })

  it('keeps its name when another one is passed in from JavaScript', () => {
    const props = { 'aria-label': 'Iets anders' }
    render(<Logo {...props} />)

    expect(screen.getByRole('img', { name: 'sc Heerenveen Fansite, sinds 1997' })).toBeTruthy()
    expect(screen.queryByRole('img', { name: 'Iets anders' })).toBeNull()
  })
})
