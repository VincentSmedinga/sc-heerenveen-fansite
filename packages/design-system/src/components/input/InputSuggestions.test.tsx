import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Input } from './Input'
import { InputSuggestions } from './InputSuggestions'

describe('InputSuggestions', () => {
  it('is a list with an option for each suggestion, which an Input names with `list`', () => {
    const { container } = render(
      <>
        <InputSuggestions id="namen" suggestions={['Jan Jansen', 'Piet Bakker']} />
        <Input list="namen" name="naam" />
      </>,
    )
    const list = container.querySelector('datalist')

    expect(list?.id).toBe('namen')
    expect([...(list?.querySelectorAll('option') ?? [])].map((option) => option.value)).toEqual([
      'Jan Jansen',
      'Piet Bakker',
    ])
    expect(container.querySelector('input')?.getAttribute('list')).toBe('namen')
  })
})
