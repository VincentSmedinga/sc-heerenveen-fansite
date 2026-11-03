import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { NavigationBar } from './NavigationBar'

const subitems = [
  { href: '/beheer', label: 'Beheer' },
  { current: true, href: '/beheer/berichten', label: 'Berichten' },
]

describe('a bar on its own', () => {
  it('is a nav with a name of its own, holding a list of the screens', () => {
    render(<NavigationBar label="Beheer" subitems={subitems} />)
    const nav = screen.getByRole('navigation', { name: 'Beheer' })

    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/beheer', '/beheer/berichten'])
    expect(within(nav).getAllByRole('listitem')).toHaveLength(2)
  })

  it('marks only the current screen with aria-current="page"', () => {
    render(<NavigationBar label="Beheer" subitems={subitems} />)

    expect(screen.getByRole('link', { name: 'Berichten' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Beheer' }).hasAttribute('aria-current')).toBe(false)
  })

  it('has the classes of the bar in the menu, and one of its own', () => {
    render(<NavigationBar label="Beheer" subitems={subitems} />)

    expect(screen.getByRole('navigation').className).toBe('hf-navigation-bar hf-navigation-bar-alone')
  })
})

describe('the bar in the menu', () => {
  it('is a div without a name and not a landmark, so the menu keeps its one navigation', () => {
    const { container } = render(<NavigationBar subitems={subitems} />)

    expect(screen.queryByRole('navigation')).toBeNull()
    expect(container.innerHTML).toMatch(/^<div class="hf-navigation-bar"><div class="hf-page-shortcuts-row">/)
  })
})

describe('the button at the end', () => {
  const end = { action: () => undefined, label: 'Uitloggen' }

  it('is the last item of the list in the same nav, as a button in a form', () => {
    render(<NavigationBar end={end} label="Beheer" subitems={subitems} />)
    const nav = screen.getByRole('navigation', { name: 'Beheer' })
    const listItems = within(nav).getAllByRole('listitem')
    const button = within(nav).getByRole('button', { name: 'Uitloggen' })

    expect(listItems).toHaveLength(3)
    expect(listItems.at(-1)?.contains(button)).toBe(true)
    expect(button.getAttribute('type')).toBe('submit')
    expect(button.closest('form')).not.toBeNull()
    expect(within(nav).getAllByRole('link')).toHaveLength(2)
  })

  it('is not there without it, and the links stay as they were', () => {
    render(<NavigationBar label="Beheer" subitems={subitems} />)

    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('comes after the last link in the document, so the keyboard reaches it after the links', () => {
    render(<NavigationBar end={end} label="Beheer" subitems={subitems} />)

    const lastLink = screen.getAllByRole('link').at(-1)!

    expect(lastLink.compareDocumentPosition(screen.getByRole('button', { name: 'Uitloggen' }))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it('is only allowed on a bar with a name, which the type checks', () => {
    // @ts-expect-error -- The bar in the menu has no place for a button.
    render(<NavigationBar end={end} subitems={subitems} />)
  })
})
