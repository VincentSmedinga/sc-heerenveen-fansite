import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Text } from '../text/Text'
import { anchorIdMaxLength, isAnchorId, isOldAnchorId } from './anchor'
import { Heading, headingLevels } from './Heading'

describe('Heading', () => {
  it.each(headingLevels)('is an h%i at level %i, with the style of the same number', (level) => {
    render(<Heading level={level}>Titel</Heading>)
    const heading = screen.getByRole('heading', { level, name: 'Titel' })

    expect(heading.tagName).toBe(`H${level}`)
    expect(heading.className).toBe(`hf-heading-${level}`)
  })

  it('has a level that is separate from the style: an h2 can look like Kop 3', () => {
    render(
      <Heading appearance={3} level={2}>
        Nieuwste discussies
      </Heading>,
    )
    const heading = screen.getByRole('heading', { level: 2 })

    expect(heading.tagName).toBe('H2')
    expect(heading.classList.contains('hf-heading-3')).toBe(true)
    expect(heading.classList.contains('hf-heading-2')).toBe(false)
  })

  it('does not change the level when the style changes', () => {
    render(
      <>
        <Heading appearance={1} level={4}>
          Klein in de structuur
        </Heading>
        <Heading appearance={4} level={1}>
          Groot in de structuur
        </Heading>
      </>,
    )

    expect(screen.getByRole('heading', { name: 'Klein in de structuur' }).tagName).toBe('H4')
    expect(screen.getByRole('heading', { name: 'Groot in de structuur' }).tagName).toBe('H1')
  })

  it('keeps the other attributes and adds a class to its own', () => {
    render(
      <Heading className="extra" id="titel" level={2}>
        Titel
      </Heading>,
    )
    const heading = screen.getByRole('heading')

    expect(heading.className).toBe('hf-heading-2 extra')
    expect(heading.id).toBe('titel')
  })

  it('allows only the levels 1 to 4, and needs a level', () => {
    const elements = [
      // @ts-expect-error Level 5 has no style of its own yet.
      <Heading level={5} />,
      // @ts-expect-error A heading needs a level.
      <Heading />,
    ]

    expect(elements).toHaveLength(2)
  })
})

describe('Heading with an anchor', () => {
  it('is a heading that holds one link to itself, named by the text of the heading', () => {
    render(
      <Heading anchor id="wie-we-zijn" level={2}>
        Wie we zijn
      </Heading>,
    )
    const heading = screen.getByRole('heading', { level: 2 })
    const link = screen.getByRole('link', { name: 'Wie we zijn' })

    expect(heading.id).toBe('wie-we-zijn')
    expect(heading.className).toBe('hf-heading-2 hf-heading-anchored')
    expect(heading.contains(link)).toBe(true)
    expect(link.getAttribute('href')).toBe('#wie-we-zijn')
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('has an arrow for the target in front of the text, that assistive technology skips', () => {
    render(
      <Heading anchor id="stand" level={2}>
        Stand
      </Heading>,
    )
    const heading = screen.getByRole('heading')
    const arrow = heading.querySelector('.hf-heading-target')

    expect(heading.firstElementChild).toBe(arrow)
    expect(arrow?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByRole('link', { name: 'Stand' }).contains(arrow)).toBe(false)
    expect(screen.getByRole('heading', { name: 'Stand' })).toBe(heading)
  })

  it('draws a chain link behind the text that assistive technology skips and that adds nothing to the name', () => {
    render(
      <Heading anchor id="cookies" level={3}>
        Cookies
      </Heading>,
    )
    const link = screen.getByRole('link')
    const icon = link.querySelector('svg')

    expect(icon?.getAttribute('aria-hidden')).toBe('true')
    expect(link.textContent).toBe('Cookies')
    expect(screen.getByRole('link', { name: 'Cookies' })).toBe(link)
  })

  it('keeps the icon with the last letter of the last word, so it never stands alone and a long word can still break', () => {
    render(
      <Heading anchor id="lang" level={2}>
        Een kop met een heel lang woord
      </Heading>,
    )
    const tail = screen.getByRole('link').querySelector('.hf-icon-tail')

    expect(tail?.textContent).toBe('d')
    expect(tail?.querySelector('svg')).not.toBeNull()
  })

  it('keeps the icon with the end of a heading that ends in small print, behind a word joiner', () => {
    render(
      <Heading anchor id="versie-0-2-0" level={2}>
        25 oktober 2026{' '}
        <Text appearance="meta" as="span">
          versie 0.2.0
        </Text>
      </Heading>,
    )
    const link = screen.getByRole('link')
    const tail = link.querySelector('.hf-icon-tail')

    expect(tail?.textContent).toBe('\u2060')
    expect(tail?.querySelector('svg')).not.toBeNull()
    expect(link.textContent?.replace('\u2060', '')).toBe('25 oktober 2026 versie 0.2.0')
  })

  it('changes nothing without the option: no link, no icon, no extra class, an id that is only an id', () => {
    render(
      <Heading id="discussies" level={2}>
        Discussies
      </Heading>,
    )

    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByRole('heading').outerHTML).toBe('<h2 class="hf-heading-2" id="discussies">Discussies</h2>')
  })

  it('puts the old anchors in the heading as empty elements, before the link', () => {
    const { container } = render(
      <Heading aliases={['wat-we-doen', 'versie-0.2.0']} anchor id="hoe-we-werken" level={2}>
        Hoe we werken
      </Heading>,
    )
    const heading = screen.getByRole('heading')
    const old = [...heading.querySelectorAll('span[id]')]

    expect(old.map((element) => element.id)).toEqual(['wat-we-doen', 'versie-0.2.0'])
    expect(old.every((element) => element.childNodes.length === 0)).toBe(true)
    expect(heading.children[1]?.id).toBe('wat-we-doen')
    expect(container.querySelector('[id="versie-0.2.0"]')).toBe(old[1])
    // The old anchors add nothing to what a screen reader reads.
    expect(screen.getByRole('heading', { name: 'Hoe we werken' })).toBe(heading)
  })

  it('refuses an id that breaks the rules', () => {
    const wrong = ['Cookies', 'wie we zijn', 'privé', 'wie_we_zijn', 'versie-0.2.0', '-cookies', 'cookies-', 'a--b', '']

    for (const id of wrong) {
      expect(() => render(<Heading anchor id={id} level={2} />), id).toThrow(/not an id for an anchor/)
    }
  })

  it('refuses an anchor on an h1, and an old anchor that is empty, has a space or is the anchor itself', () => {
    const levelOne = (
      // @ts-expect-error An h1 has no anchor.
      <Heading anchor id="titel" level={1} />
    )

    expect(() => render(levelOne)).toThrow(/h2 to h4/)

    for (const alias of ['', 'oud anker', 'nieuw']) {
      expect(() => render(<Heading aliases={[alias]} anchor id="nieuw" level={2} />), alias).toThrow(
        /not an old anchor/,
      )
    }
  })

  it('needs an id with an anchor, and takes old anchors only with an anchor', () => {
    const elements = [
      // @ts-expect-error An anchor needs the id that the page chooses.
      <Heading anchor level={2} />,
      // @ts-expect-error Old anchors belong to a heading with an anchor.
      <Heading aliases={['oud']} level={2} />,
    ]

    expect(elements).toHaveLength(2)
  })
})

describe('the rules for the id of an anchor', () => {
  it.each(['cookies', 'wie-we-zijn', 'toegankelijkheidsverklaring', 'versie-0-2-0', 'nul-1', '2026'])(
    'allows %s',
    (id) => {
      expect(isAnchorId(id)).toBe(true)
    },
  )

  it.each([
    ['capitals', 'Wie-we-zijn'],
    ['a space', 'wie we zijn'],
    ['an accent', 'privé'],
    ['an underscore', 'wie_we_zijn'],
    ['a dot', 'versie-0.2.0'],
    ['a punctuation mark', 'cookies?'],
    ['a hyphen at the start', '-cookies'],
    ['a hyphen at the end', 'cookies-'],
    ['two hyphens in a row', 'a--b'],
    ['nothing', ''],
    ['more than the longest length', 'a'.repeat(anchorIdMaxLength + 1)],
  ])('refuses an id with %s', (_, id) => {
    expect(isAnchorId(id)).toBe(false)
  })

  it('allows an old anchor to break the rules, as long as HTML allows it', () => {
    expect(isOldAnchorId('versie-0.2.0')).toBe(true)
    expect(isOldAnchorId('Nul_Gehouden')).toBe(true)
    expect(isOldAnchorId('')).toBe(false)
    expect(isOldAnchorId('met spatie')).toBe(false)
  })
})
