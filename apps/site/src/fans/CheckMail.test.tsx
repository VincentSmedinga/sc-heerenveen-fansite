import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CheckMail, LinkGone, newCodeMessageOf, wrongCodeMessage } from './CheckMail'

const action = () => Promise.resolve()
const render = (props: Partial<Parameters<typeof CheckMail>[0]> = {}) =>
  renderToStaticMarkup(
    <CheckMail
      action={action}
      error={undefined}
      intro="We hebben een link en een code gemaild."
      otherAddress="/fans/aanmelden"
      reference="ref"
      {...props}
    />,
  )

describe('CheckMail', () => {
  it('has one field for the code, with its label and hint, drawn as six boxes', () => {
    const html = render()

    expect(html.match(/<input/g)).toHaveLength(1)
    expect(html).toContain('Code uit de mail')
    expect(html).toContain('Zoek de mail met de code. Vul dan de 6 cijfers in. Plakken kan ook.')
    expect(html).toContain('autoComplete="one-time-code"')
    expect(html.match(/hf-code-input-box"/g)).toHaveLength(6)
    expect(html).toContain('Doorgaan')
  })

  it('shows a wrong code in the summary and at the field, which is invalid', () => {
    const html = render({ error: wrongCodeMessage(3) })

    expect(html).toContain('Die code klopt niet')
    expect(html.match(/Je kunt het nog 3 keer proberen\./g)).toHaveLength(2)
    expect(html).toContain('aria-invalid="true"')
  })

  it('has no field for a request that nobody made', () => {
    expect(render({ reference: undefined })).not.toContain('<input')
  })

  it('offers a new code with a button in a form, and another address with a link', () => {
    const html = render({ newCode: action })

    expect(html).toContain('Geen mail?')
    expect(html).toMatch(/<form[^>]*>(?:(?!<\/form>).)*Stuur een nieuwe code \(kan over 1 minuut\)<\/button><\/form>/)
    expect(html).toContain('<a href="/fans/aanmelden">gebruik een ander adres</a>')
  })

  it('keeps the notice with the link for a page that cannot send a new code', () => {
    const html = render()

    expect(html).toContain('gebruik een ander adres')
    expect(html).not.toContain('Stuur een nieuwe code')
  })

  it('shows the answer to a new code above the field, and only a known one', () => {
    const html = render({ message: newCodeMessageOf('wacht') })

    expect(html).toContain('Wacht nog even. Je kunt over een minuut een nieuwe code vragen.')
    expect(newCodeMessageOf('limiet')).toBe('Het lukt nu even niet. Probeer het over een kwartier opnieuw.')
    expect(newCodeMessageOf('<script>')).toBeUndefined()
    expect(newCodeMessageOf(undefined)).toBeUndefined()
    expect(newCodeMessageOf('constructor')).toBeUndefined()
  })
})

describe('LinkGone', () => {
  it('has the button to start again and the link to Fans', () => {
    const html = renderToStaticMarkup(<LinkGone again={{ href: '/fans/aanmelden', label: 'Stuur een nieuwe' }} />)

    expect(html).toMatch(/<form[^>]*action="\/fans\/aanmelden"[^>]*><button[^>]*>Stuur een nieuwe<\/button><\/form>/)
    expect(html).toContain('<a href="/fans">Naar Fans</a>')
  })
})
