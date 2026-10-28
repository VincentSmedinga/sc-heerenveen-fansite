import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Heading } from '../heading/Heading'
import { Card } from './Card'
import { makeCardImage } from './makeCardImage'
import { deliverImage } from './shareImage'

vi.mock('./makeCardImage', () => ({ makeCardImage: vi.fn() }))
vi.mock('./shareImage', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  deliverImage: vi.fn(),
}))

const png = new Blob(['png'], { type: 'image/png' })
const source = <p>Bron: Testbron</p>

const renderCard = () =>
  render(
    <Card aria-labelledby="stand" shareable={{ source }}>
      <Heading id="stand" level={2}>
        Stand
      </Heading>
      <p>Een regel in de kaart</p>
    </Card>,
  )

const button = () => screen.getByRole('button', { name: 'Maak een afbeelding van Stand' })

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-10-28T12:00:00Z'), toFake: ['Date'] })
  vi.mocked(makeCardImage).mockResolvedValue(png)
  vi.mocked(deliverImage).mockResolvedValue('shared')
})

afterEach(() => {
  vi.useRealTimers()
  vi.resetAllMocks()
})

describe('a Card with shareable', () => {
  it('has no button without the property, and is the card it was', () => {
    const { container } = render(
      <Card aria-labelledby="stand">
        <Heading id="stand" level={2}>
          Stand
        </Heading>
      </Card>,
    )

    expect(screen.queryByRole('button')).toBeNull()
    expect(container.querySelector('.hf-card-share')).toBeNull()
    expect(container.firstElementChild?.className).toBe('hf-card')
  })

  it('has a button named for what it does and for the heading of the card', () => {
    renderCard()

    expect(button().getAttribute('type')).toBe('button')
    expect(button().textContent).toBe('')
  })

  it('draws the icon hidden from assistive technology, so the name is the only name', () => {
    renderCard()
    const icon = button().querySelector('svg')

    expect(icon?.getAttribute('aria-hidden')).toBe('true')
    expect(icon?.textContent).toBe('')
  })

  it('puts the button after the heading and before the rest of the card, where the keyboard finds it', () => {
    const { container } = renderCard()
    const names = Array.from(container.querySelector('.hf-card')?.children ?? []).map(
      (child) => child.tagName + (child.className ? `.${child.className}` : ''),
    )

    expect(names).toEqual(['H2.hf-heading-2', 'DIV.hf-card-share', 'P'])
    expect(container.querySelector('.hf-card-share')?.contains(button())).toBe(true)
  })

  it('has the class that leaves room for the button in the heading', () => {
    const { container } = renderCard()

    expect(container.querySelector('.hf-card')?.className).toBe('hf-card hf-card-shareable')
  })

  it('has no button when it has no heading to name it', () => {
    render(<Card shareable={{ source }}>Zonder kop</Card>)

    expect(screen.queryByRole('button')).toBeNull()
  })

  it('is a status that says nothing until the visitor asks for an image', () => {
    renderCard()

    expect(screen.getByRole('status').textContent).toBe('')
    expect(screen.getByRole('status').className).toContain('hf-visually-hidden')
  })
})

describe('a click on the button', () => {
  it('makes the image from a copy of the card with the strip under it, and not from the card itself', async () => {
    let stage: HTMLElement | undefined
    let copy: string | undefined

    vi.mocked(makeCardImage).mockImplementation((element) => {
      stage = element
      copy = element.innerHTML

      return Promise.resolve(png)
    })
    const { container } = renderCard()

    fireEvent.click(button())
    await waitFor(() => expect(makeCardImage).toHaveBeenCalledOnce())

    // The copy of the card has its heading and its text, and not the button or the message.
    expect(copy).toContain('Een regel in de kaart')
    expect(copy).toContain('Stand')
    expect(copy).not.toContain('<button')
    expect(copy).not.toContain('role="status"')
    expect(stage?.querySelector('.hf-card-share-copy')?.className).not.toContain('hf-card-shareable')
    // The strip: the logo, the address of the site, the day, and the source of the card.
    expect(stage?.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('sc Heerenveen Fansite, sinds 1997')
    expect(stage?.querySelector('.hf-card-share-address')?.textContent).toBe(`${window.location.host} · 28-10-26`)
    expect(stage?.textContent).toContain('Bron: Testbron')
    // The card on the page is as it was.
    expect(container.querySelector('.hf-card-share-copy')).toBeNull()
  })

  it('puts the stage out of sight of everyone, and takes it away when the image is done', async () => {
    let offscreen: Element | null | undefined

    vi.mocked(makeCardImage).mockImplementation((element) => {
      offscreen = element.closest('.hf-card-share-offscreen')

      return Promise.resolve(png)
    })
    renderCard()

    fireEvent.click(button())
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Afbeelding is klaar'))

    expect(offscreen?.getAttribute('aria-hidden')).toBe('true')
    expect(offscreen?.hasAttribute('inert')).toBe(true)
    expect(document.querySelector('.hf-card-share-stage')).toBeNull()
  })

  it('gives the image to the share sheet or the download under the name of the card and the day', async () => {
    renderCard()

    fireEvent.click(button())
    await waitFor(() => expect(deliverImage).toHaveBeenCalledOnce())

    expect(deliverImage).toHaveBeenCalledWith(png, { fileName: 'sc-heerenveen-stand-2026-10-28.png', title: 'Stand' })
  })

  it('says the image is being made, with the button busy and not clickable again, and then that it is ready', async () => {
    let finish: (blob: Blob) => void = () => {}

    vi.mocked(makeCardImage).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    renderCard()

    fireEvent.click(button())

    expect(screen.getByRole('status').textContent).toBe('Afbeelding wordt gemaakt')
    expect(button().getAttribute('aria-disabled')).toBe('true')

    fireEvent.click(button())
    expect(makeCardImage).toHaveBeenCalledOnce()

    await act(async () => {
      finish(png)
    })
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Afbeelding is klaar'))

    expect(button().hasAttribute('aria-disabled')).toBe(false)
    expect(screen.getByRole('status').className).toContain('hf-visually-hidden')
  })

  it('keeps the focus on the button, which stays a button in the page the whole time', async () => {
    renderCard()
    button().focus()

    fireEvent.click(button())
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Afbeelding is klaar'))

    expect(document.activeElement).toBe(button())
  })

  it('is no error when the visitor closes the share sheet, and the button works again', async () => {
    vi.mocked(deliverImage).mockResolvedValue('cancelled')
    renderCard()

    fireEvent.click(button())
    await waitFor(() => expect(deliverImage).toHaveBeenCalledOnce())
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(''))

    expect(screen.queryByText('Het maken van de afbeelding is niet gelukt.')).toBeNull()
    expect(button().hasAttribute('aria-disabled')).toBe(false)
  })

  it('shows a sentence by the card when the image cannot be made, which a screen reader reads out, and works again', async () => {
    vi.mocked(makeCardImage).mockRejectedValue(new Error('No canvas'))
    renderCard()

    fireEvent.click(button())

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('Het maken van de afbeelding is niet gelukt.'),
    )

    expect(screen.getByRole('status').className).not.toContain('hf-visually-hidden')
    expect(button().hasAttribute('aria-disabled')).toBe(false)

    vi.mocked(makeCardImage).mockResolvedValue(png)
    fireEvent.click(button())
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Afbeelding is klaar'))
  })

  it('shows the sentence when the share sheet or the download fails', async () => {
    vi.mocked(deliverImage).mockRejectedValue(new Error('Broken'))
    renderCard()

    fireEvent.click(button())

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('Het maken van de afbeelding is niet gelukt.'),
    )
  })
})

describe('the button in card-share.css', () => {
  const css = readFileSync(join(import.meta.dirname, 'card-share.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

  it('is round and 44 by 44 pixels', () => {
    expect(css).toMatch(/\.hf-card-share-button \{[^}]*block-size: 2\.75rem;/s)
    expect(css).toMatch(/\.hf-card-share-button \{[^}]*inline-size: 2\.75rem;/s)
    expect(css).toMatch(/\.hf-card-share-button \{[^}]*border-radius: 50%;/s)
  })

  it('goes under the mouse only where there is a mouse, so nothing stays lit after a tap', () => {
    const outside = css.replace(/@media \(hover: hover\) \{(?:[^{}]|\{[^{}]*\})*\}/g, '')

    expect(css).toMatch(/@media \(hover: hover\) \{\s*&:hover \{/)
    expect(outside).not.toContain(':hover')
  })

  it('takes its colours from the roles of links and of the soft button, and from no colour of its own', () => {
    const colours = css.match(/(?:color|background-color|border-color): [^;]+;/g) ?? []

    expect(colours.length).toBeGreaterThan(0)
    for (const colour of colours) {
      expect(colour, colour).toMatch(/var\(--hf-colour-[a-z-]+\)|transparent|ButtonText/)
    }
  })

  it('moves with the motion tokens, which are zero with reduced motion', () => {
    expect(css).toMatch(/transition:[^;]*var\(--hf-motion-duration-short\)/)
    expect(css).not.toMatch(/animation|\d+m?s\b/)
  })

  it('follows the colours of the system in forced colours, and is not printed', () => {
    expect(css).toMatch(/@media \(forced-colors: active\) \{[^}]*ButtonText/)
    expect(css).toMatch(/\.hf-card-share \{[^}]*@media print \{\s*display: none;/s)
  })

  it('has no animation while the image is made: busy is a look, not a movement', () => {
    expect(css).toMatch(/&\[aria-disabled='true'\] \{\s*cursor: progress;/)
    expect(css).not.toContain('@keyframes')
  })
})
