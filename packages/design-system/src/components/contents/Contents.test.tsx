import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Contents } from './Contents'

describe('Contents', () => {
  it('is a div with the class and the attributes it is given, around its children', () => {
    const { container } = render(
      <Contents data-name="deel">
        <p>tekst</p>
      </Contents>,
    )
    const element = container.firstElementChild

    expect(element?.tagName).toBe('DIV')
    expect(element?.className).toBe('hf-contents')
    expect(element?.getAttribute('data-name')).toBe('deel')
    expect(element?.textContent).toBe('tekst')
  })
})
