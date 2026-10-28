import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ExampleFooter, ExampleHeader } from '../../docs/ExamplePage'
import { Page } from './Page'

const renderPage = () =>
  render(
    <Page>
      <Page.Header>Kop van de pagina</Page.Header>
      <Page.Body>
        <Page.Main>
          <h1>Nieuws</h1>
        </Page.Main>
      </Page.Body>
      <Page.Footer>Voet van de pagina</Page.Footer>
    </Page>,
  )

describe('Page', () => {
  it('holds the header, the body and the footer, in that order', () => {
    const { container } = renderPage()
    const page = container.firstElementChild

    expect(page?.className).toBe('hf-page')
    expect(Array.from(page?.children ?? []).map((child) => child.tagName.toLowerCase())).toEqual([
      'div',
      'header',
      'div',
      'footer',
    ])
  })

  it('starts with an empty strip for the top edge, hidden from a screen reader, that is not a landmark', () => {
    const { container } = renderPage()
    const edge = container.firstElementChild?.firstElementChild

    expect(edge?.className).toBe('hf-page-top-edge')
    expect(edge?.getAttribute('aria-hidden')).toBe('true')
    expect(edge?.childNodes).toHaveLength(0)
  })

  it('gives the page its landmarks: banner, main and contentinfo, once each', () => {
    renderPage()

    expect(screen.getAllByRole('banner')).toHaveLength(1)
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1)
  })

  it('keeps the other attributes and adds a class to its own', () => {
    const { container } = render(<Page className="extra" id="pagina" />)

    expect(container.firstElementChild?.className).toBe('hf-page extra')
    expect(container.firstElementChild?.id).toBe('pagina')
  })

  it('has the main in the body, not in the page itself', () => {
    const { container } = renderPage()
    const main = screen.getByRole('main')

    expect(container.querySelector('.hf-page-body')?.contains(main)).toBe(true)
    expect(main.parentElement?.className).toBe('hf-page-body')
    expect(within(main).getByRole('heading', { level: 1 })).toBeTruthy()
  })
})

describe('Page.Header', () => {
  it('holds the logo, the theme button and the main menu in that order, which its grid puts in two rows', () => {
    render(<ExampleHeader />)
    const banner = screen.getByRole('banner')

    expect(Array.from(banner.children).map((child) => child.tagName.toLowerCase())).toEqual(['a', 'button', 'nav'])
    expect(within(banner).getByRole('button', { name: 'Donker' })).toBe(banner.children[1])
    expect(within(banner).getByRole('navigation', { name: 'Hoofdmenu' })).toBe(banner.children[2])
  })

  it('is the banner of the page', () => {
    render(<Page.Header>Kop van de pagina</Page.Header>)
    const banner = screen.getByRole('banner')

    expect(banner.tagName).toBe('HEADER')
    expect(banner.className).toBe('hf-page-header')
    expect(banner.textContent).toBe('Kop van de pagina')
  })

  it('keeps the other attributes and adds a class to its own', () => {
    render(<Page.Header className="extra" id="kop" />)

    expect(screen.getByRole('banner').className).toBe('hf-page-header extra')
    expect(screen.getByRole('banner').id).toBe('kop')
  })

  it('is called Page.Header in the developer tools and the code examples', () => {
    expect(Page.Header.displayName).toBe('Page.Header')
  })
})

describe('Page.Body', () => {
  it('is a div, so the main goes inside it', () => {
    const { container } = render(<Page.Body>Inhoud</Page.Body>)

    expect(container.firstElementChild?.tagName).toBe('DIV')
    expect(container.firstElementChild?.className).toBe('hf-page-body')
    expect(container.firstElementChild?.textContent).toBe('Inhoud')
    expect(screen.queryByRole('main')).toBeNull()
  })

  it('holds the main and the sidebar in the order of the source, with no other order', () => {
    const { container } = render(
      <Page.Body>
        <Page.Main>Inhoud</Page.Main>
        <Page.Sidebar>Zijbalk</Page.Sidebar>
      </Page.Body>,
    )
    const body = container.querySelector<HTMLElement>('.hf-page-body')!

    expect(Array.from(body.children).map((child) => child.tagName.toLowerCase())).toEqual(['main', 'aside'])
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getAllByRole('complementary')).toHaveLength(1)
    expect(body.querySelector('[style]')).toBeNull()
  })

  it('keeps the other attributes and adds a class to its own', () => {
    const { container } = render(<Page.Body className="extra" id="inhoud" />)

    expect(container.firstElementChild?.className).toBe('hf-page-body extra')
    expect(container.firstElementChild?.id).toBe('inhoud')
  })

  it('has no as prop: it is always a div', () => {
    const elements = [
      // @ts-expect-error A Page.Body is always a div, so it takes no element.
      <Page.Body as="main" />,
    ]

    expect(elements).toHaveLength(1)
  })

  it('is called Page.Body in the developer tools and the code examples', () => {
    expect(Page.Body.displayName).toBe('Page.Body')
  })
})

describe('Page.Main', () => {
  it('is the main of the page', () => {
    render(<Page.Main>Inhoud</Page.Main>)
    const main = screen.getByRole('main')

    expect(main.tagName).toBe('MAIN')
    expect(main.className).toBe('hf-page-main')
    expect(main.textContent).toBe('Inhoud')
  })

  it('keeps the other attributes and adds a class to its own', () => {
    render(<Page.Main className="extra" id="inhoud" />)

    expect(screen.getByRole('main').className).toBe('hf-page-main extra')
    expect(screen.getByRole('main').id).toBe('inhoud')
  })

  it('has every child as a cell of its own, in the order of the source', () => {
    render(
      <Page.Main>
        <h1>Nieuws</h1>
        <Page.Cell>
          <h2>Kop</h2>
          <p>Inleiding</p>
        </Page.Cell>
        <p>Tekst</p>
      </Page.Main>,
    )

    expect(Array.from(screen.getByRole('main').children).map((child) => child.tagName.toLowerCase())).toEqual([
      'h1',
      'div',
      'p',
    ])
  })

  it('has no extra elements without an intro: the children are the direct children of the main', () => {
    render(
      <Page.Main>
        <p>Een</p>
        <p>Twee</p>
      </Page.Main>,
    )

    expect(screen.getByRole('main').innerHTML).toBe('<p>Een</p><p>Twee</p>')
  })

  it('puts an intro in a div of its own, and the children in a second div, in that order', () => {
    render(
      <Page.Main intro={<h1>Bronnen</h1>}>
        <p>Een</p>
        <p>Twee</p>
      </Page.Main>,
    )

    expect(screen.getByRole('main').innerHTML).toBe(
      '<div class="hf-page-intro"><h1>Bronnen</h1></div><div class="hf-page-cells"><p>Een</p><p>Twee</p></div>',
    )
  })

  it('leaves the div for the cells empty when an intro has no children, so page.css can leave it out', () => {
    render(<Page.Main intro={<h1>Bronnen</h1>}>{[]}</Page.Main>)

    expect(screen.getByRole('main').innerHTML).toBe(
      '<div class="hf-page-intro"><h1>Bronnen</h1></div><div class="hf-page-cells"></div>',
    )
  })

  it('keeps the heading in the intro inside the main, as the one level one heading of the page', () => {
    render(
      <Page.Main intro={<h1>Bronnen</h1>}>
        <p>Een</p>
      </Page.Main>,
    )

    expect(within(screen.getByRole('main')).getByRole('heading', { level: 1 })).toBeTruthy()
  })

  it('treats an empty intro as no intro', () => {
    const { rerender } = render(<Page.Main intro={undefined}>Inhoud</Page.Main>)

    expect(screen.getByRole('main').innerHTML).toBe('Inhoud')

    rerender(<Page.Main intro={null}>Inhoud</Page.Main>)
    expect(screen.getByRole('main').innerHTML).toBe('Inhoud')

    rerender(<Page.Main intro={false}>Inhoud</Page.Main>)
    expect(screen.getByRole('main').innerHTML).toBe('Inhoud')
  })

  it('does not pass the intro on to the main as an attribute', () => {
    render(<Page.Main intro="Inleiding">Inhoud</Page.Main>)

    expect(screen.getByRole('main').hasAttribute('intro')).toBe(false)
  })

  it('keeps the sidebar outside the main when the main has an intro, in the order of the source', () => {
    render(
      <Page.Body>
        <Page.Main intro={<h1>Bronnen</h1>}>
          <p>Een</p>
        </Page.Main>
        <Page.Sidebar aria-label="Zijbalk">Zijbalk</Page.Sidebar>
      </Page.Body>,
    )

    expect(screen.getByRole('main').contains(screen.getByRole('complementary'))).toBe(false)
    expect(
      Array.from(screen.getByRole('main').parentElement?.children ?? []).map((child) => child.tagName.toLowerCase()),
    ).toEqual(['main', 'aside'])
  })

  it('is called Page.Main in the developer tools and the code examples', () => {
    expect(Page.Main.displayName).toBe('Page.Main')
  })
})

describe('Page.Sidebar', () => {
  it('is a complementary landmark', () => {
    render(<Page.Sidebar>Zijbalk</Page.Sidebar>)
    const sidebar = screen.getByRole('complementary')

    expect(sidebar.tagName).toBe('ASIDE')
    expect(sidebar.className).toBe('hf-page-sidebar')
    expect(sidebar.textContent).toBe('Zijbalk')
  })

  it('keeps the other attributes, such as a name, and adds a class to its own', () => {
    render(<Page.Sidebar aria-label="Wedstrijden" className="extra" id="zijbalk" />)

    expect(screen.getByRole('complementary', { name: 'Wedstrijden' }).className).toBe('hf-page-sidebar extra')
    expect(screen.getByRole('complementary').id).toBe('zijbalk')
  })

  it('adds a class for the wide sidebar only with `wide`, and passes no `wide` on to the element', () => {
    const { rerender } = render(<Page.Sidebar aria-label="Zijbalk" className="extra" wide />)

    expect(screen.getByRole('complementary').className).toBe('hf-page-sidebar hf-page-sidebar-wide extra')
    expect(screen.getByRole('complementary').hasAttribute('wide')).toBe(false)

    rerender(<Page.Sidebar aria-label="Zijbalk" wide={false} />)

    expect(screen.getByRole('complementary').className).toBe('hf-page-sidebar')
  })

  it('adds a class for splitting the cells only with `split`, and passes no `split` on to the element', () => {
    const { rerender } = render(<Page.Sidebar aria-label="Zijbalk" className="extra" split />)

    expect(screen.getByRole('complementary').className).toBe('hf-page-sidebar hf-page-sidebar-split extra')
    expect(screen.getByRole('complementary').hasAttribute('split')).toBe(false)

    rerender(<Page.Sidebar aria-label="Zijbalk" split wide />)

    expect(screen.getByRole('complementary').className).toBe(
      'hf-page-sidebar hf-page-sidebar-split hf-page-sidebar-wide',
    )

    rerender(<Page.Sidebar aria-label="Zijbalk" split={false} />)

    expect(screen.getByRole('complementary').className).toBe('hf-page-sidebar')
  })

  it('is called Page.Sidebar in the developer tools and the code examples', () => {
    expect(Page.Sidebar.displayName).toBe('Page.Sidebar')
  })
})

describe('Page.Cell', () => {
  it('puts what belongs together in one div, without a role of its own', () => {
    const { container } = render(
      <Page.Cell>
        <h2>Kop</h2>
        <p>Inleiding</p>
      </Page.Cell>,
    )

    expect(container.firstElementChild?.tagName).toBe('DIV')
    expect(container.firstElementChild?.className).toBe('hf-page-cell')
    expect(container.firstElementChild?.children).toHaveLength(2)
    expect(screen.queryByRole('region')).toBeNull()
  })

  it('keeps the other attributes and adds a class to its own', () => {
    const { container } = render(<Page.Cell className="extra" id="blok" />)

    expect(container.firstElementChild?.className).toBe('hf-page-cell extra')
    expect(container.firstElementChild?.id).toBe('blok')
  })

  it('is called Page.Cell in the developer tools and the code examples', () => {
    expect(Page.Cell.displayName).toBe('Page.Cell')
  })
})

describe('Page.Footer', () => {
  it('is the contentinfo of the page', () => {
    render(<Page.Footer>Voet van de pagina</Page.Footer>)
    const footer = screen.getByRole('contentinfo')

    expect(footer.tagName).toBe('FOOTER')
    expect(footer.className).toBe('hf-page-footer')
    expect(footer.textContent).toBe('Voet van de pagina')
  })

  it('keeps the other attributes and adds a class to its own', () => {
    render(<Page.Footer className="extra" id="voet" />)

    expect(screen.getByRole('contentinfo').className).toBe('hf-page-footer extra')
    expect(screen.getByRole('contentinfo').id).toBe('voet')
  })

  it('holds the two lines of text and then the links as its own children, which its grid places, and no theme switch', () => {
    render(<ExampleFooter />)
    const footer = screen.getByRole('contentinfo')

    expect(Array.from(footer.children).map((child) => child.tagName.toLowerCase())).toEqual(['p', 'p', 'nav'])
    expect(within(footer).queryByRole('button')).toBeNull()
    expect(within(footer).queryByRole('group', { name: 'Thema' })).toBeNull()
    expect(Array.from(footer.querySelectorAll('p')).map((paragraph) => paragraph.textContent)).toEqual([
      'Alle koppen en links op één plek.',
      'Voor supporters door supporters.',
    ])
    expect(within(footer).getByRole('navigation', { name: 'Over de site' })).toBe(footer.lastElementChild)
  })

  it('is called Page.Footer in the developer tools and the code examples', () => {
    expect(Page.Footer.displayName).toBe('Page.Footer')
  })
})

describe('Page.Shortcuts', () => {
  const items = [
    { href: '#programma', label: 'Programma' },
    { href: '#stand', label: 'Stand' },
  ]

  it('is a navigation named by its label, which is a span and not a link', () => {
    render(<Page.Shortcuts items={items} label="Op deze pagina:" />)
    const nav = screen.getByRole('navigation', { name: 'Op deze pagina:' })
    const label = nav.querySelector('.hf-page-shortcuts-label')

    expect(nav.tagName).toBe('NAV')
    expect(nav.className).toBe('hf-page-shortcuts')
    expect(label?.tagName).toBe('SPAN')
    expect(label?.textContent).toBe('Op deze pagina:')
    expect(nav.getAttribute('aria-labelledby')).toBe(label?.id)
    expect(within(nav).queryByRole('link', { name: 'Op deze pagina:' })).toBeNull()
  })

  it('holds a list with a link for each item, in the order given, named by its label', () => {
    render(<Page.Shortcuts items={items} label="Op deze pagina:" />)
    const links = within(screen.getByRole('navigation')).getAllByRole('link')

    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(2)
    expect(links.map((link) => [link.textContent, link.getAttribute('href'), link.className])).toEqual([
      ['Programma', '#programma', 'hf-page-shortcuts-link'],
      ['Stand', '#stand', 'hf-page-shortcuts-link'],
    ])
  })

  it('marks no link as current in its markup: the current place comes from scrolling the page', () => {
    const { container } = render(<Page.Shortcuts items={items} label="Op deze pagina:" />)

    expect(container.querySelector('[aria-current]')).toBeNull()
  })

  it('gives each bar a label of its own, so two bars on a page have two names', () => {
    render(
      <>
        <Page.Shortcuts items={items} label="Eerste:" />
        <Page.Shortcuts items={items} label="Tweede:" />
      </>,
    )

    expect(screen.getByRole('navigation', { name: 'Eerste:' })).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Tweede:' })).toBeTruthy()
  })

  it('sits between the header and the body, outside the main, so the reading order and the focus order are the page’s', () => {
    const { container } = render(
      <Page>
        <Page.Header>Kop</Page.Header>
        <Page.Shortcuts items={items} label="Op deze pagina:" />
        <Page.Body>
          <Page.Main>Inhoud</Page.Main>
        </Page.Body>
      </Page>,
    )
    const page = container.firstElementChild

    expect(Array.from(page?.children ?? []).map((child) => child.tagName.toLowerCase())).toEqual([
      'div',
      'header',
      'nav',
      'div',
    ])
    expect(screen.getByRole('main').contains(screen.getByRole('navigation'))).toBe(false)
  })

  it('keeps the other attributes and adds a class to its own', () => {
    render(<Page.Shortcuts className="extra" id="balk" items={items} label="Op deze pagina:" />)

    expect(screen.getByRole('navigation').className).toBe('hf-page-shortcuts extra')
    expect(screen.getByRole('navigation').id).toBe('balk')
  })

  it('is called Page.Shortcuts in the developer tools and the code examples', () => {
    expect(Page.Shortcuts.displayName).toBe('Page.Shortcuts')
  })
})

describe('Page.Submenu', () => {
  const items = [
    { current: true, href: '/wedstrijden/programma', label: 'Programma' },
    { href: '/wedstrijden/uitslagen', label: 'Uitslagen' },
    { href: '/wedstrijden/stand', label: 'Stand' },
  ]

  it('is a navigation named by its label, and shows no label', () => {
    const { container } = render(<Page.Submenu items={items} label="Wedstrijden" />)
    const nav = screen.getByRole('navigation', { name: 'Wedstrijden' })

    expect(nav.tagName).toBe('NAV')
    expect(nav.className).toBe('hf-page-submenu')
    expect(nav.getAttribute('aria-label')).toBe('Wedstrijden')
    expect(nav.getAttribute('aria-labelledby')).toBeNull()
    // The name is for screen readers only: the text of the bar is the text of the links.
    expect(container.textContent).toBe('ProgrammaUitslagenStand')
  })

  it('holds a list with a link for each item, in the order given', () => {
    render(<Page.Submenu items={items} label="Wedstrijden" />)
    const links = within(screen.getByRole('navigation')).getAllByRole('link')

    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(3)
    expect(links.map((link) => [link.textContent, link.getAttribute('href'), link.className])).toEqual([
      ['Programma', '/wedstrijden/programma', 'hf-page-submenu-link'],
      ['Uitslagen', '/wedstrijden/uitslagen', 'hf-page-submenu-link'],
      ['Stand', '/wedstrijden/stand', 'hf-page-submenu-link'],
    ])
  })

  it('marks exactly one link as the current page, the one that is current', () => {
    const { container } = render(<Page.Submenu items={items} label="Wedstrijden" />)
    const current = container.querySelectorAll('[aria-current]')

    expect(current).toHaveLength(1)
    expect(current[0]?.getAttribute('aria-current')).toBe('page')
    expect(current[0]?.textContent).toBe('Programma')
  })

  it('marks no link when none is current, as on a page of the section that is not in the bar', () => {
    const { container } = render(
      <Page.Submenu items={items.map(({ href, label }) => ({ href, label }))} label="Wedstrijden" />,
    )

    expect(container.querySelector('[aria-current]')).toBeNull()
  })

  it('gives a page with a submenu and a bar of anchors a name for each, so the two can be told apart', () => {
    render(
      <>
        <Page.Submenu items={items} label="Wedstrijden" />
        <Page.Shortcuts items={items} label="Op deze pagina:" />
      </>,
    )

    expect(screen.getAllByRole('navigation').map((nav) => nav.getAttribute('aria-label') ?? nav.textContent)).toEqual([
      'Wedstrijden',
      expect.stringContaining('Op deze pagina:'),
    ])
    expect(screen.getByRole('navigation', { name: 'Wedstrijden' })).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Op deze pagina:' })).toBeTruthy()
  })

  it('sits under the header and before the bar of anchors, outside the main, in the order of the HTML', () => {
    const { container } = render(
      <Page>
        <Page.Header>Kop</Page.Header>
        <Page.Submenu items={items} label="Wedstrijden" />
        <Page.Shortcuts items={items} label="Op deze pagina:" />
        <Page.Body>
          <Page.Main>Inhoud</Page.Main>
        </Page.Body>
      </Page>,
    )
    const page = container.firstElementChild

    expect(Array.from(page?.children ?? []).map((child) => child.className)).toEqual([
      'hf-page-top-edge',
      'hf-page-header',
      'hf-page-submenu',
      'hf-page-shortcuts',
      'hf-page-body',
    ])
    expect(screen.getByRole('main').contains(screen.getByRole('navigation', { name: 'Wedstrijden' }))).toBe(false)
  })

  it('keeps the other attributes and adds a class to its own', () => {
    render(<Page.Submenu className="extra" id="submenu" items={items} label="Wedstrijden" />)

    expect(screen.getByRole('navigation').className).toBe('hf-page-submenu extra')
    expect(screen.getByRole('navigation').id).toBe('submenu')
  })

  it('is called Page.Submenu in the developer tools and the code examples', () => {
    expect(Page.Submenu.displayName).toBe('Page.Submenu')
  })
})
