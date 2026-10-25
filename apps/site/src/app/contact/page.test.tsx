import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { withoutIcons } from '../../without-icons'
import ContactPage, { generateMetadata } from './page'
import SentPage, { metadata as sentMetadata } from './verstuurd/page'

vi.mock('./actions', () => ({ sendContactMessage: vi.fn() }))

const html = renderToStaticMarkup(<ContactPage />)

describe('the page Contact', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is titled Contact, with a description and a canonical URL of its own', () => {
    vi.stubEnv('SITE_ENV', 'acceptance')

    expect(generateMetadata()).toMatchObject({
      alternates: { canonical: 'https://acc.sc.heerenveen.org/contact' },
      description: expect.stringMatching(/^Schrijf de redactie/),
      openGraph: { title: 'Contact', url: 'https://acc.sc.heerenveen.org/contact' },
      title: 'Contact',
    })
  })

  it('has one h1 Contact, two sentences of explanation, and then the form', () => {
    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Contact</h1>'])
    expect(html).toMatch(/<\/h1><p class="hf-intro">.*?<\/p><p>.*?<\/p><form/)
  })

  it('is a form that does not leave the validation to the browser', () => {
    expect(html).toMatch(/<form [^>]*novalidate/i)
  })

  it('has the five fields, each with a label, the right autocomplete and the right requirement', () => {
    const label = (id: string) => html.match(new RegExp(`<label[^>]*for="${id}"[^>]*>(.*?)</label>`))?.[1]

    expect(label('naam')).toContain('Naam')
    expect(label('naam')).toContain('niet verplicht')
    expect(label('e-mail')).toBe('E-mailadres')
    expect(label('onderwerp')).toBe('Onderwerp')
    expect(label('link')).toContain('Link naar het bericht')
    expect(label('link')).toContain('niet verplicht')
    expect(label('bericht')).toBe('Bericht')
    expect(html).toMatch(/<input[^>]*autoComplete="name"[^>]*name="naam"|<input[^>]*autocomplete="name"/i)
    expect(html).toMatch(/<input[^>]*autocomplete="email"/i)
    expect(html).toMatch(/<input[^>]*type="url"/)
    expect(html).toMatch(/<textarea[^>]*name="bericht"/)
  })

  it('offers the four subjects after an empty first choice', () => {
    expect([...html.matchAll(/<option[^>]*>(.*?)<\/option>/g)].map(([, text]) => text)).toEqual([
      'Kies een onderwerp',
      'Een bericht laten verwijderen',
      'Een fout in een bericht',
      'Een bron voorstellen',
      'Iets anders',
    ])
  })

  it('has a trap that nobody sees, and a button that sends', () => {
    expect(html).toMatch(
      /<div aria-hidden="true" class="hf-visually-hidden"[^>]*inert[^>]*><label>[^<]*<input [^>]*name="website"/,
    )
    expect(withoutIcons(html)).toMatch(/<button [^>]*type="submit"[^>]*>Versturen<\/button>/)
  })

  it('draws an envelope in front of the text of the button that sends, hidden from screen readers', () => {
    const button = html.match(/<button [^>]*type="submit".*?<\/button>/)?.[0] ?? ''

    expect(button).toMatch(
      /^<button [^>]*><span class="hf-icon-head"><svg aria-hidden="true" class="hf-icon"[^>]*>.*<\/svg>Versturen<\/span><\/button>$/,
    )
    expect(button).toContain('<path d="m2.5 5 5.5 4 5.5-4"></path>')
    expect(html.match(/<svg /g)).toHaveLength(1)
  })

  it('shows no error summary and no failure before anything is sent', () => {
    expect(html).not.toContain('Er is iets mis')
    expect(html).not.toContain('Het versturen is niet gelukt')
  })
})

describe('the confirmation', () => {
  const sent = renderToStaticMarkup(<SentPage />)

  it('thanks the visitor in text, under one h1', () => {
    expect(sent).toContain('Bedankt, we hebben je bericht ontvangen.')
    expect(sent.match(/<h1/g)).toHaveLength(1)
  })

  it('is not for search engines and has no canonical address', () => {
    expect(sentMetadata).toMatchObject({ robots: { index: false }, title: 'Bericht verstuurd' })
    expect(sentMetadata.alternates).toBeUndefined()
  })
})
