import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { exampleMenuAt } from '../../docs/ExamplePage'
import { Page } from '../page/Page'
import { Navigation } from './Navigation'

const items = [
  { current: true, href: '/nieuws', label: 'Nieuws' },
  { href: '/forum', label: 'Forum' },
  { href: '/uitslagen', label: 'Uitslagen' },
]

describe('Navigation', () => {
  it('is a nav with a name for screen readers', () => {
    render(<Navigation items={items} label="Hoofdmenu" />)

    expect(screen.getByRole('navigation', { name: 'Hoofdmenu' }).tagName).toBe('NAV')
  })

  it('gives two navigations on one page names of their own', () => {
    render(
      <>
        <Navigation items={items} label="Hoofdmenu" />
        <Navigation items={items} label="Onderaan de pagina" />
      </>,
    )

    expect(screen.getByRole('navigation', { name: 'Hoofdmenu' })).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Onderaan de pagina' })).toBeTruthy()
  })

  it('holds a list of links, named by their text', () => {
    render(<Navigation items={items} label="Hoofdmenu" />)
    const list = within(screen.getByRole('navigation')).getByRole('list')

    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(
      within(list)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Nieuws', 'Forum', 'Uitslagen'])
    expect(screen.getByRole('link', { name: 'Forum' }).getAttribute('href')).toBe('/forum')
  })

  it('marks only the link to the current page with aria-current="page"', () => {
    render(<Navigation items={items} label="Hoofdmenu" />)

    expect(screen.getByRole('link', { name: 'Nieuws' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Forum' }).hasAttribute('aria-current')).toBe(false)
    expect(screen.getByRole('link', { name: 'Uitslagen' }).hasAttribute('aria-current')).toBe(false)
    expect(document.querySelectorAll('[aria-current]')).toHaveLength(1)
  })

  it.each(['Nieuws', 'Forum'] as const)('marks only %s when that is the current page', (page) => {
    render(<Navigation items={exampleMenuAt(page)} label="Hoofdmenu" />)

    expect(screen.getByRole('link', { current: 'page' }).textContent).toBe(page)
    expect(document.querySelectorAll('[aria-current]')).toHaveLength(1)
  })

  it('gives every link the class that the look of the menu in the header hangs on, under the header', () => {
    render(
      <Page.Header>
        <Navigation items={items} label="Hoofdmenu" />
      </Page.Header>,
    )
    const links = within(screen.getByRole('banner')).getAllByRole('link')

    expect(links.map((link) => link.className)).toEqual(Array(3).fill('hf-navigation-link'))
    expect(screen.getByRole('link', { current: 'page' }).className).toBe('hf-navigation-link')
  })

  it('marks no link when the visitor is on none of them', () => {
    render(<Navigation items={items.map(({ href, label }) => ({ href, label }))} label="Hoofdmenu" />)

    expect(document.querySelectorAll('[aria-current]')).toHaveLength(0)
  })

  it('keeps the other attributes and adds a class to its own', () => {
    render(<Navigation className="extra" id="menu" items={items} label="Hoofdmenu" />)
    const nav = screen.getByRole('navigation')

    expect(nav.className).toBe('hf-navigation extra')
    expect(nav.id).toBe('menu')
  })

  it('needs a label, and keeps it when another name is passed in from JavaScript', () => {
    const props = { 'aria-label': 'Iets anders' }
    const elements = [
      // @ts-expect-error A navigation without a name is not allowed.
      <Navigation items={items} />,
    ]
    render(<Navigation {...props} items={items} label="Hoofdmenu" />)

    expect(elements).toHaveLength(1)
    expect(screen.getByRole('navigation', { name: 'Hoofdmenu' })).toBeTruthy()
  })
})
