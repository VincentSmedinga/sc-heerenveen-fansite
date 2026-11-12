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
  it('holds the logo and the theme button, and not the main menu, which follows it', () => {
    const { container } = render(<ExampleHeader />)
    const banner = screen.getByRole('banner')

    expect(Array.from(banner.children).map((child) => child.tagName.toLowerCase())).toEqual(['a', 'button'])
    expect(within(banner).getByRole('button', { name: 'Donker' })).toBe(banner.children[1])
    expect(within(banner).queryByRole('navigation')).toBeNull()
    expect(banner.nextElementSibling).toBe(screen.getByRole('navigation', { name: 'Hoofdmenu' }))
    expect(container.children).toHaveLength(2)
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

  it('holds the main, with no other order or style', () => {
    const { container } = render(
      <Page.Body>
        <Page.Main>Inhoud</Page.Main>
      </Page.Body>,
    )
    const body = container.querySelector<HTMLElement>('.hf-page-body')!

    expect(Array.from(body.children).map((child) => child.tagName.toLowerCase())).toEqual(['main'])
    expect(screen.getAllByRole('main')).toHaveLength(1)
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

  it('has no extra elements: the children are the direct children of the main', () => {
    render(
      <Page.Main>
        <p>Een</p>
        <p>Twee</p>
      </Page.Main>,
    )

    expect(screen.getByRole('main').innerHTML).toBe('<p>Een</p><p>Twee</p>')
  })

  it('is called Page.Main in the developer tools and the code examples', () => {
    expect(Page.Main.displayName).toBe('Page.Main')
  })
})

describe('Page.Title', () => {
  it('is a row with the heading first and the control after it, and passes its class and props on', () => {
    render(
      <Page.Title className="extra" data-testid="title">
        <h1>Wedstrijden</h1>
        <form aria-label="Seizoen kiezen" />
      </Page.Title>,
    )
    const title = screen.getByTestId('title')

    expect(title.className).toBe('hf-page-title extra')
    expect([...title.children].map((child) => child.tagName)).toEqual(['H1', 'FORM'])
  })

  it('has the class that keeps what wraps on the left for wrapped="start", and not otherwise', () => {
    render(
      <>
        <Page.Title data-testid="start" wrapped="start" />
        <Page.Title data-testid="end" />
      </>,
    )

    expect(screen.getByTestId('start').className).toBe('hf-page-title hf-page-title-start')
    expect(screen.getByTestId('end').className).toBe('hf-page-title')
  })

  it('is a cell of the Page.Main like any other content', () => {
    render(
      <Page.Main>
        <Page.Title>Titel</Page.Title>
      </Page.Main>,
    )

    expect(document.querySelector('.hf-page-main > .hf-page-title')?.textContent).toBe('Titel')
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
      'Alles over onze club op één plek.',
      'Voor supporters door supporters.',
    ])
    expect(within(footer).getByRole('navigation', { name: 'Over de site' })).toBe(footer.lastElementChild)
  })

  it('is called Page.Footer in the developer tools and the code examples', () => {
    expect(Page.Footer.displayName).toBe('Page.Footer')
  })
})

describe('Page.TopLink', () => {
  it('is a link to the top of the page, named by its label and with no visible text', () => {
    render(<Page.TopLink label="Naar boven" />)
    const link = screen.getByRole('link', { name: 'Naar boven' })

    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('#top')
    expect(link.className).toBe('hf-page-top-link')
    expect(link.textContent).toBe('')
  })

  it('hides its arrow from assistive technology, so the name is the label alone', () => {
    render(<Page.TopLink label="Naar boven" />)
    const icon = screen.getByRole('link').querySelector('svg')

    expect(icon?.getAttribute('aria-hidden')).toBe('true')
    expect(icon?.getAttribute('focusable')).toBe('false')
    expect(icon?.getAttribute('class')).toBe('hf-icon')
  })

  it('keeps the other attributes and adds a class to its own, but not another destination or name', () => {
    render(<Page.TopLink className="extra" id="boven" label="Naar boven" />)
    const link = screen.getByRole('link')

    expect(link.className).toBe('hf-page-top-link extra')
    expect(link.id).toBe('boven')
    expect(link.getAttribute('href')).toBe('#top')
  })

  it('is the last child of the footer, after the links, so the keyboard reaches it after them', () => {
    render(<ExampleFooter topLink />)
    const footer = screen.getByRole('contentinfo')

    expect(Array.from(footer.children).map((child) => child.tagName.toLowerCase())).toEqual(['p', 'p', 'nav', 'a'])
    expect(footer.lastElementChild).toBe(within(footer).getByRole('link', { name: 'Naar boven' }))
    expect(within(footer).getAllByRole('link').at(-1)).toBe(footer.lastElementChild)
  })

  it('is called Page.TopLink in the developer tools and the code examples', () => {
    expect(Page.TopLink.displayName).toBe('Page.TopLink')
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

describe('the order of the top of a page', () => {
  it('is the header, the main menu, the bar of anchors, the content and the footer, in the HTML', () => {
    const { container } = render(
      <Page>
        <ExampleHeader />
        <Page.Shortcuts items={[{ href: '#stand', label: 'Stand' }]} label="Op deze pagina:" />
        <Page.Body>
          <Page.Main>Inhoud</Page.Main>
        </Page.Body>
        <ExampleFooter />
      </Page>,
    )
    const page = container.firstElementChild

    expect(Array.from(page?.children ?? []).map((child) => child.className)).toEqual([
      'hf-page-top-edge',
      'hf-page-header',
      'hf-navigation hf-navigation-header',
      'hf-page-shortcuts',
      'hf-page-body',
      'hf-page-footer',
    ])
  })

  it('has one banner and one landmark for the main menu, outside the banner and outside the main', () => {
    render(
      <Page>
        <ExampleHeader />
        <Page.Body>
          <Page.Main>Inhoud</Page.Main>
        </Page.Body>
      </Page>,
    )
    const menu = screen.getByRole('navigation', { name: 'Hoofdmenu' })

    expect(screen.getAllByRole('banner')).toHaveLength(1)
    expect(screen.getAllByRole('navigation')).toHaveLength(1)
    expect(screen.getByRole('banner').contains(menu)).toBe(false)
    expect(screen.getByRole('main').contains(menu)).toBe(false)
  })
})
