import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Page } from './Page'
import { PageBody } from './PageBody'
import { PageFooter } from './PageFooter'
import { PageHeader } from './PageHeader'

const renderPage = () =>
  render(
    <Page>
      <PageHeader>Kop van de pagina</PageHeader>
      <PageBody>
        <h1>Nieuws</h1>
      </PageBody>
      <PageFooter>Voet van de pagina</PageFooter>
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
