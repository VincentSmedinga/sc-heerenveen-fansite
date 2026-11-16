// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { GroundFormState, GroundValues } from '#src/beheer/ground-fields'

import { GroundForm } from './GroundForm'

afterEach(() => {
  // Vitest has no globals here, so Testing Library doesn't clean up by itself.
  cleanup()
})

const values = (more: Partial<GroundValues> = {}): GroundValues => ({
  breedtegraad: '',
  lengtegraad: '',
  plaats: '',
  postcode: '',
  rows: [{ dag: '', naam: 'Oefenpark', seizoen: '', toelichting: '' }],
  straat: '',
  ...more,
})

const show = (initial: GroundValues, answer?: GroundFormState) =>
  render(
    <GroundForm
      action={() => Promise.resolve(answer ?? { errors: {}, values: initial })}
      cancelHref="/beheer/stadions"
      initial={initial}
    />,
  )

const button = () => screen.getByRole('button', { name: 'Vul het adres in vanaf de coördinaten' })

describe('the form of a stadium', () => {
  it('has the address button off and says why while there are no coordinates', () => {
    show(values())

    expect(button()).toHaveProperty('disabled', true)
    expect(button().getAttribute('aria-describedby')).toContain('adres-uit')
    expect(screen.getByText('Vul eerst de breedtegraad en de lengtegraad in.')).toBeTruthy()
  })

  it('has the button off with a reason for coordinates outside the Netherlands, and on for coordinates inside', () => {
    show(values({ breedtegraad: '48,85', lengtegraad: '2,35' }))
    expect(button()).toHaveProperty('disabled', true)
    expect(screen.getByText(/liggen buiten Nederland/)).toBeTruthy()

    fireEvent.change(screen.getByLabelText(/Breedtegraad/), { target: { value: '52,9605' } })
    fireEvent.change(screen.getByLabelText(/Lengtegraad/), { target: { value: '5,9396' } })

    expect(button()).toHaveProperty('disabled', false)
    expect(screen.queryByText(/liggen buiten Nederland/)).toBeNull()
  })

  it('puts the focus on the list of errors, which links to the field with the error', async () => {
    const answer: GroundFormState = {
      errors: { lengtegraad: 'Vul ook de lengtegraad in, of laat de breedtegraad leeg.' },
      values: values({ breedtegraad: '52,9' }),
    }
    const { container } = show(values(), answer)

    fireEvent.submit(container.querySelector('form') as HTMLFormElement)

    const link = await screen.findByRole('link', { name: /Vul ook de lengtegraad in/ })

    expect(link.getAttribute('href')).toBe('#lengtegraad')
    await waitFor(() => expect(document.activeElement?.id).toBe('fouten'))
    expect(document.getElementById('lengtegraad')).toBeTruthy()
  })

  it('shows a proposal of the address in the fields, with a line that says it is not saved yet', async () => {
    const answer: GroundFormState = {
      errors: {},
      focus: 'straat',
      notice: 'Het voorstel van PDOK staat in de velden. Het is nog niet bewaard: kies Opslaan als het klopt.',
      values: values({
        breedtegraad: '52,9607',
        lengtegraad: '5,9406',
        plaats: 'Heerenveen',
        postcode: '8448 GK',
        straat: 'Domela Nieuwenhuisweg 5',
      }),
    }
    const { container } = show(values({ breedtegraad: '52,9607', lengtegraad: '5,9406' }), answer)

    fireEvent.submit(container.querySelector('form') as HTMLFormElement)

    expect(await screen.findByText(/nog niet bewaard/)).toBeTruthy()
    expect((screen.getByLabelText(/Straat/) as HTMLInputElement).value).toBe('Domela Nieuwenhuisweg 5')
    expect((screen.getByLabelText(/Postcode/) as HTMLInputElement).value).toBe('8448 GK')
    expect(screen.getByRole('status').textContent).toContain('nog niet bewaard')
    await waitFor(() => expect(document.activeElement?.id).toBe('straat'))
  })

  it('names every button of a line with the number and the name of the line', () => {
    show(values())

    expect(screen.getByRole('button', { name: /Regel 1: Oefenpark weghalen/ })).toBeTruthy()
  })
})
