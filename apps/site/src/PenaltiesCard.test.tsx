import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PenaltiesCard } from './PenaltiesCard'

describe('PenaltiesCard', () => {
  it('has a heading and the two numbers, for and against, with what they are', () => {
    const html = renderToStaticMarkup(<PenaltiesCard against={3} for={5} known={39} level={3} played={39} />)

    expect(html).toContain('id="strafschoppen"')
    expect(html).toContain('hf-card-soft')
    expect(html).toContain('>Voor ons, benut<')
    expect(html).toContain('>Tegen ons, benut<')
    expect(html).toContain('<dt class="hf-meta">Voor ons, benut</dt><dd><p>5</p></dd>')
    expect(html).toContain('<dt class="hf-meta">Tegen ons, benut</dt><dd><p>3</p></dd>')
  })

  it('says that only the penalties that were scored are known, and how many matches it is based on', () => {
    const html = renderToStaticMarkup(<PenaltiesCard against={1} for={2} known={30} played={39} />)

    expect(html).toContain('We kennen alleen de benutte strafschoppen.')
    expect(html).toContain('30 van de 39 gespeelde wedstrijden')
  })

  it('stays, without a list, when there is no penalty', () => {
    const html = renderToStaticMarkup(<PenaltiesCard against={0} for={0} known={10} played={10} />)

    expect(html).toContain('id="strafschoppen"')
    expect(html).toContain('Geen strafschoppen')
    expect(html).not.toContain('<dl')
    expect(html).toContain('We kennen alleen de benutte strafschoppen.')
  })

  it('keeps a zero when the other side has penalties', () => {
    const html = renderToStaticMarkup(<PenaltiesCard against={0} for={2} known={10} played={10} />)

    expect(html).not.toContain('Geen strafschoppen')
    expect(html).toContain('>0<')
  })
})
