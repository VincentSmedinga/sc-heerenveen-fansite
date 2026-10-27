import { render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { exampleMenuAt } from '../../docs/ExamplePage'
import { Page } from '../page/Page'
import { Navigation } from './Navigation'

const items = [
  { current: true, href: '/nieuws', label: 'Nieuws' },
  { external: true, href: '/forum', label: 'Forum' },
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

  it('draws the icon for a link to another site behind the text of an external item, and nowhere else', () => {
    render(<Navigation items={items} label="Hoofdmenu" />)
    const forum = screen.getByRole('link', { name: 'Forum' })
    const icon = forum.querySelector('svg')

    expect(document.querySelectorAll('svg')).toHaveLength(1)
    expect(icon?.parentElement).toBe(forum)
    expect(icon?.previousSibling?.textContent).toBe('Forum')
    expect(icon?.nextSibling).toBeNull()
    expect(screen.getByRole('link', { name: 'Nieuws' }).querySelector('svg')).toBeNull()
    expect(screen.getByRole('link', { name: 'Uitslagen' }).querySelector('svg')).toBeNull()
  })

  it('hides the icon from assistive technology and takes the colour of the text', () => {
    render(<Navigation items={items} label="Hoofdmenu" />)
    const icon = screen.getByRole('link', { name: 'Forum' }).querySelector('svg')

    expect(icon?.getAttribute('aria-hidden')).toBe('true')
    expect(icon?.getAttribute('focusable')).toBe('false')
    expect(icon?.getAttribute('stroke')).toBe('currentColor')
    expect(icon?.textContent).toBe('')
    // The icon is no tab stop of its own, and the link keeps its name.
    expect(screen.getAllByRole('link')).toHaveLength(3)
    expect(screen.getByRole('link', { name: 'Forum' }).textContent).toBe('Forum')
  })

  it('draws the icon itself: nothing in it points to another file or address', () => {
    render(<Navigation items={items} label="Hoofdmenu" />)
    const icon = document.querySelector('svg')

    expect(icon?.outerHTML).not.toMatch(/(href|src)=|https?:|url\(/)
  })

  it('draws no icon when external is false', () => {
    render(<Navigation items={[{ external: false, href: '/forum', label: 'Forum' }]} label="Hoofdmenu" />)

    expect(document.querySelector('svg')).toBeNull()
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

  it('sets the links in the header in a size that grows with the window, from 16px at 320px to 18px at 900px', () => {
    const css = readFileSync(join(import.meta.dirname, 'navigation.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')
    const [, minimum, offset, slope, maximum] =
      css.match(/font-size: clamp\(([\d.]+)rem, ([\d.]+)rem \+ ([\d.]+)vw, ([\d.]+)rem\);/) ?? []
    const at = (width: number) => Number(offset) * 16 + (Number(slope) / 100) * width

    expect(Number(minimum) * 16).toBe(16)
    expect(Number(maximum) * 16).toBe(18)
    expect(Math.max(16, at(320))).toBeCloseTo(16, 0)
    expect(at(900)).toBeCloseTo(18, 0)
  })

  it('sets the links in the header in weight 600 and the current page in weight 800', () => {
    const css = readFileSync(join(import.meta.dirname, 'navigation.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')
    const header = css.slice(css.indexOf('.hf-page-header .hf-navigation-link {'))
    const [, link] = header.match(/font-weight: (\d+);/) ?? []
    const [, current] = header.match(/\[aria-current='page'\] \{\s*font-weight: (\d+);/) ?? []

    expect(link).toBe('600')
    expect(current).toBe('800')
  })
})
