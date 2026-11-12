import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SaveButtons } from './SaveButtons'

describe('the buttons to save in the toolbar', () => {
  it('belong to the form by its id, so they save it without JavaScript', () => {
    const html = renderToStaticMarkup(
      <SaveButtons
        buttons={[{ label: 'Opslaan', value: 'opslaan' }]}
        cancelHref="/beheer/spelers"
        formId="speler-formulier"
      />,
    )

    expect(html).toMatch(/<button[^>]*type="submit"/u)
    expect(html).toContain('form="speler-formulier"')
    expect(html).toContain('name="knop"')
    expect(html).toContain('value="opslaan"')
    expect(html).toContain('<a href="/beheer/spelers">Annuleren</a>')
  })

  it('sends no name when a button has no value, and leaves the link out without an address', () => {
    const html = renderToStaticMarkup(
      <SaveButtons buttons={[{ label: 'Tekst lezen', noIcon: true }]} formId="plakken-formulier" />,
    )

    expect(html).not.toContain('name=')
    expect(html).not.toContain('hf-icon')
    expect(html).not.toContain('Annuleren')
  })

  it('shows a button for each choice, in order', () => {
    const html = renderToStaticMarkup(
      <SaveButtons
        buttons={[
          { label: 'Opslaan en volgende', value: 'volgende' },
          { appearance: 'soft', label: 'Opslaan', value: 'opslaan' },
        ]}
        formId="persoon-formulier"
      />,
    )

    expect(html.indexOf('Opslaan en volgende')).toBeLessThan(html.lastIndexOf('Opslaan</span>'))
    expect(html).toContain('hf-button-soft')
  })
})
