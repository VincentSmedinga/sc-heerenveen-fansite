import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PageBody, pageBodyElements } from './PageBody'

describe('PageBody', () => {
  it('is the main of the page by default', () => {
    render(<PageBody>Inhoud</PageBody>)
    const main = screen.getByRole('main')

    expect(main.tagName).toBe('MAIN')
    expect(main.className).toBe('hf-page-body')
  })

  it.each(pageBodyElements)('can be a %s', (element) => {
    const { container } = render(<PageBody as={element}>Inhoud</PageBody>)

    expect(container.firstElementChild?.tagName.toLowerCase()).toBe(element)
    expect(container.firstElementChild?.className).toBe('hf-page-body')
    expect(container.firstElementChild?.textContent).toBe('Inhoud')
  })

  it('has the main inside it when it is a div, so a sidebar can sit beside the main', () => {
    const { container } = render(
      <PageBody as="div">
        <main>Inhoud</main>
        <aside>Zijbalk</aside>
      </PageBody>,
    )

    expect(container.querySelector('.hf-page-body')?.tagName).toBe('DIV')
    expect(within(container.querySelector<HTMLElement>('.hf-page-body')!).getByRole('main').textContent).toBe('Inhoud')
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })

  it('keeps the other attributes and adds a class to its own', () => {
    render(<PageBody className="extra" id="inhoud" />)

    expect(screen.getByRole('main').className).toBe('hf-page-body extra')
    expect(screen.getByRole('main').id).toBe('inhoud')
  })

  it('allows no other element', () => {
    const elements = [
      // @ts-expect-error A section is not an element a PageBody can be.
      <PageBody as="section" />,
    ]

    expect(elements).toHaveLength(1)
  })
})
