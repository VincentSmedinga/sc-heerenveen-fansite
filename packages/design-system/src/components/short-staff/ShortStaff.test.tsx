import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ShortStaff } from './ShortStaff'

describe('ShortStaff', () => {
  it('writes when the person had the job, and the name, in the classes of a short match', () => {
    const { container } = render(<ShortStaff givenName="Testtrainer" period="tot 14 mrt 2026" surname="Een" />)

    expect(container.querySelector('.hf-short-match.hf-short-staff')).not.toBeNull()
    expect(container.querySelector('.hf-short-match-when')?.textContent).toBe('tot 14 mrt 2026')
    expect(container.querySelector('.hf-short-match-opponent')?.textContent).toBe('Testtrainer Een')
  })

  it('shows only the name when there is no period', () => {
    const { container } = render(<ShortStaff givenName="Testtrainer" surname="Een" />)

    expect(container.querySelector('.hf-short-match-when')).toBeNull()
    expect(container.querySelector('.hf-short-match-opponent')?.textContent).toBe('Testtrainer Een')
  })

  it('has the given name in the normal weight and the surname in the stronger weight, as a player has', () => {
    const { container } = render(<ShortStaff givenName="Testtrainer" surname="van Twee" />)

    expect(container.querySelector('.hf-player-name-given')?.textContent).toBe('Testtrainer')
    expect(container.querySelector('.hf-player-name-surname')?.textContent).toBe('van Twee')
  })

  it('says "(interim)" behind the name of a person who stood in, in the quiet style of "thuis", and not behind another', () => {
    const { container, rerender } = render(<ShortStaff givenName="Testtrainer" interim surname="Twee" />)

    expect(container.querySelector('.hf-short-match-opponent')?.textContent).toBe('Testtrainer Twee (interim)')
    expect(container.querySelector('.hf-short-match-where')?.textContent).toBe('(interim)')

    rerender(<ShortStaff givenName="Testtrainer" surname="Twee" />)

    expect(container.querySelector('.hf-short-match-opponent')?.textContent).toBe('Testtrainer Twee')
    expect(container.querySelector('.hf-short-match-where')).toBeNull()
  })
})
