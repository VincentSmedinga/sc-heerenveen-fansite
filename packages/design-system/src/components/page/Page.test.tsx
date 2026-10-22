import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Page, pageBodyElements } from './Page'

const renderPage = () =>
  render(
    <Page>
      <Page.Header>Kop van de pagina</Page.Header>
      <Page.Body>
        <h1>Nieuws</h1>
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
      'header',
      'main',
      'footer',
    ])
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
    renderPage()
    const main = screen.getByRole('main')

    expect(main.parentElement?.className).toBe('hf-page')
    expect(main.className).toContain('hf-page-body')
    expect(within(main).getByRole('heading', { level: 1 })).toBeTruthy()
  })
})

describe('Page.Header', () => {
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
  it('is the main of the page by default', () => {
    render(<Page.Body>Inhoud</Page.Body>)
    const main = screen.getByRole('main')

    expect(main.tagName).toBe('MAIN')
    expect(main.className).toBe('hf-page-body')
  })

  it.each(pageBodyElements)('can be a %s', (element) => {
    const { container } = render(<Page.Body as={element}>Inhoud</Page.Body>)

    expect(container.firstElementChild?.tagName.toLowerCase()).toBe(element)
    expect(container.firstElementChild?.className).toBe('hf-page-body')
    expect(container.firstElementChild?.textContent).toBe('Inhoud')
  })

  it('has the main inside it when it is a div, so a sidebar can sit beside the main', () => {
    const { container } = render(
      <Page.Body as="div">
        <main>Inhoud</main>
        <aside>Zijbalk</aside>
      </Page.Body>,
    )

    expect(container.querySelector('.hf-page-body')?.tagName).toBe('DIV')
    expect(within(container.querySelector<HTMLElement>('.hf-page-body')!).getByRole('main').textContent).toBe('Inhoud')
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })

  it('keeps the other attributes and adds a class to its own', () => {
    render(<Page.Body className="extra" id="inhoud" />)

    expect(screen.getByRole('main').className).toBe('hf-page-body extra')
    expect(screen.getByRole('main').id).toBe('inhoud')
  })

  it('allows no other element', () => {
    const elements = [
      // @ts-expect-error A section is not an element a Page.Body can be.
      <Page.Body as="section" />,
    ]

    expect(elements).toHaveLength(1)
  })

  it('is called Page.Body in the developer tools and the code examples', () => {
    expect(Page.Body.displayName).toBe('Page.Body')
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

  it('is called Page.Footer in the developer tools and the code examples', () => {
    expect(Page.Footer.displayName).toBe('Page.Footer')
  })
})
