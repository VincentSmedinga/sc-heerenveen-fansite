import { render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { exampleMenuAt } from '../../docs/ExamplePage'
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

  it('gives every link the class that the look of the menu hangs on, also the current one', () => {
    render(<Navigation appearance="header" items={items} label="Hoofdmenu" />)
    const links = within(screen.getByRole('navigation')).getAllByRole('link')

    expect(links.map((link) => link.className)).toEqual(Array(3).fill('hf-navigation-link'))
    expect(screen.getByRole('link', { current: 'page' }).className).toBe('hf-navigation-link')
  })

  it('is the plain row of links without an appearance, and the main menu of the header with one', () => {
    const { rerender } = render(<Navigation items={items} label="Hoofdmenu" />)

    expect(screen.getByRole('navigation').className).toBe('hf-navigation')
    expect(screen.getByRole('list').hasAttribute('role')).toBe(false)

    rerender(<Navigation appearance="header" items={items} label="Hoofdmenu" />)

    expect(screen.getByRole('navigation').className).toBe('hf-navigation hf-navigation-header')
    expect(screen.getByRole('list').getAttribute('role')).toBe('list')
    expect(screen.getAllByRole('listitem').map((item) => item.getAttribute('role'))).toEqual(Array(3).fill('listitem'))
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
    const header = css.slice(css.indexOf('.hf-navigation-header .hf-navigation-link {'))
    const [, link] = header.match(/font-weight: (\d+);/) ?? []
    const [, current] = header.match(/\[aria-current='true'\]\) \{\s*font-weight: (\d+);/) ?? []

    expect(link).toBe('600')
    expect(current).toBe('800')
  })
})

describe('Navigation with sub-pages', () => {
  const subitems = [
    { href: '/wedstrijden/programma', label: 'Programma' },
    { href: '/wedstrijden/uitslagen', label: 'Uitslagen' },
    { href: '/wedstrijden/stand', label: 'Stand' },
  ]
  const menu = [
    { href: '/', label: 'Nieuws' },
    { href: '/wedstrijden', label: 'Wedstrijden', subitems },
    { external: true, href: 'https://forum.heerenveen.org', label: 'Forum' },
  ]

  /** The menu with the item or the sub-page that is the current one. */
  const at = (path: string) =>
    menu.map((item) => ({
      ...item,
      current: item.href === path,
      ...(item.subitems === undefined
        ? {}
        : { subitems: item.subitems.map((subitem) => ({ ...subitem, current: subitem.href === path })) }),
    }))

  const renderAt = (path: string) => render(<Navigation appearance="header" items={at(path)} label="Hoofdmenu" />)

  it('shows no nested list on a page that has no sub-pages, and the row stays as it was', () => {
    renderAt('/')

    expect(screen.getAllByRole('list')).toHaveLength(1)
    expect(document.querySelector('.hf-navigation-bar')).toBeNull()
    expect(screen.getAllByRole('link')).toHaveLength(3)
  })

  it('shows the nested list in the item of the page the visitor is on, and in no other item', () => {
    renderAt('/wedstrijden')
    const item = screen.getByRole('link', { name: 'Wedstrijden' }).closest('li')!

    expect(screen.getAllByRole('list')).toHaveLength(2)
    expect(within(item).getAllByRole('list')).toHaveLength(1)
    expect(
      within(item)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Wedstrijden', 'Programma', 'Uitslagen', 'Stand'])
    expect(screen.getByRole('link', { name: 'Nieuws' }).closest('li')?.querySelector('ul')).toBeNull()
    expect(screen.getByRole('link', { name: 'Forum' }).closest('li')?.querySelector('ul')).toBeNull()
  })

  it('shows the nested list while the visitor is on one of the sub-pages', () => {
    renderAt('/wedstrijden/uitslagen')
    const nested = screen.getByRole('link', { name: 'Wedstrijden' }).closest('li')!.querySelector('ul')

    expect(nested).not.toBeNull()
    expect(within(nested!).getAllByRole('link')).toHaveLength(3)
  })

  it('has the nested list in the li of its item, after the link, with a link for each sub-page, in the order given', () => {
    renderAt('/wedstrijden')
    const item = screen.getByRole('link', { name: 'Wedstrijden' }).closest('li')!
    const nested = item.querySelector('ul')!

    expect(item.firstElementChild).toBe(screen.getByRole('link', { name: 'Wedstrijden' }))
    expect(item.contains(nested)).toBe(true)
    expect(
      within(nested)
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href'), link.className]),
    ).toEqual([
      ['Programma', '/wedstrijden/programma', 'hf-navigation-sublink'],
      ['Uitslagen', '/wedstrijden/uitslagen', 'hf-navigation-sublink'],
      ['Stand', '/wedstrijden/stand', 'hf-navigation-sublink'],
    ])
  })

  it('is one landmark with one name for both levels', () => {
    renderAt('/wedstrijden/stand')

    expect(screen.getAllByRole('navigation')).toHaveLength(1)
    expect(screen.getByRole('navigation').getAttribute('aria-label')).toBe('Hoofdmenu')
    expect(document.querySelectorAll('[aria-label]')).toHaveLength(1)
  })

  it('marks the item aria-current="page" when the visitor is on it, and its sub-pages not at all', () => {
    renderAt('/wedstrijden')

    expect(screen.getByRole('link', { name: 'Wedstrijden' }).getAttribute('aria-current')).toBe('page')
    expect(document.querySelectorAll('[aria-current]')).toHaveLength(1)
  })

  it('marks the item aria-current="true" and the sub-page aria-current="page" when the visitor is on a sub-page', () => {
    renderAt('/wedstrijden/uitslagen')

    expect(screen.getByRole('link', { name: 'Wedstrijden' }).getAttribute('aria-current')).toBe('true')
    expect(screen.getByRole('link', { name: 'Uitslagen' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Programma' }).hasAttribute('aria-current')).toBe(false)
    expect(screen.getByRole('link', { name: 'Nieuws' }).hasAttribute('aria-current')).toBe(false)
  })

  it('has never more than one aria-current="page", on any page', () => {
    for (const path of [
      '/',
      '/wedstrijden',
      '/wedstrijden/programma',
      '/wedstrijden/uitslagen',
      '/wedstrijden/stand',
    ]) {
      const { unmount } = renderAt(path)

      expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1)
      unmount()
    }
  })

  it('marks nothing on a page of no item, and shows no nested list', () => {
    renderAt('/zoeken')

    expect(document.querySelectorAll('[aria-current]')).toHaveLength(0)
    expect(screen.getAllByRole('list')).toHaveLength(1)
  })

  it('shows no nested list for an item with an empty list of sub-pages', () => {
    render(
      <Navigation
        appearance="header"
        items={[{ current: true, href: '/wedstrijden', label: 'Wedstrijden', subitems: [] }]}
        label="Hoofdmenu"
      />,
    )

    expect(screen.getAllByRole('list')).toHaveLength(1)
  })

  it('leaves the sub-pages out of a navigation that is not the main menu, such as the one in the footer', () => {
    render(<Navigation items={at('/wedstrijden/stand')} label="Over de site" />)

    expect(screen.getAllByRole('list')).toHaveLength(1)
    expect(screen.getAllByRole('link')).toHaveLength(3)
    expect(document.querySelectorAll('[aria-current]')).toHaveLength(0)
  })

  it('keeps the link of an item first and its sub-pages next, so the focus order is the order in the code', () => {
    renderAt('/wedstrijden')

    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Nieuws',
      'Wedstrijden',
      'Programma',
      'Uitslagen',
      'Stand',
      'Forum',
    ])
  })

  it('can be the last item that has sub-pages, which the menu row keeps on the right', () => {
    render(
      <Navigation
        appearance="header"
        items={[
          { href: '/', label: 'Nieuws' },
          { current: true, href: '/forum', label: 'Forum', subitems },
        ]}
        label="Hoofdmenu"
      />,
    )
    const last = screen.getByRole('link', { name: 'Forum' }).closest('li')!

    expect(last.parentElement?.lastElementChild).toBe(last)
    expect(last.firstElementChild?.className).toBe('hf-navigation-link')
  })
})
