import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ShortStaff } from './ShortStaff'

describe('ShortStaff', () => {
  it('writes when the person had the job, and the name, in the classes of a short match', () => {
    const { container } = render(<ShortStaff name="Testtrainer Een" period="tot 14 mrt 2026" />)

    expect(container.querySelector('.hf-short-match.hf-short-staff')).not.toBeNull()
    expect(container.querySelector('.hf-short-match-when')?.textContent).toBe('tot 14 mrt 2026')
    expect(container.querySelector('.hf-short-match-opponent')?.textContent).toBe('Testtrainer Een')
  })

  it('says "(interim)" behind the name of a person who stood in, and not behind another', () => {
    const { container, rerender } = render(<ShortStaff interim name="Testtrainer Twee" period="hele seizoen" />)

    expect(container.querySelector('.hf-short-match-opponent')?.textContent).toBe('Testtrainer Twee (interim)')

    rerender(<ShortStaff name="Testtrainer Twee" period="hele seizoen" />)

    expect(container.querySelector('.hf-short-match-opponent')?.textContent).toBe('Testtrainer Twee')
  })

  it('shows a name that is a link as a link', () => {
    const { container } = render(<ShortStaff name={<a href="#x">Testtrainer Een</a>} period="hele seizoen" />)

    expect(container.querySelector('a')?.textContent).toBe('Testtrainer Een')
  })
})
