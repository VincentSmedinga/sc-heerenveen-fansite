import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SegmentedLinks } from './SegmentedLinks'

const options = [
  { href: '/statistieken', label: 'Alle wedstrijden', value: 'all' },
  { href: '/statistieken?competitie=eredivisie', label: 'Eredivisie', value: 'league' },
] as const

describe('SegmentedLinks', () => {
  it('is a group with a name, with a link for each option and the look of a segmented control', () => {
    render(<SegmentedLinks label="Welke wedstrijden" options={options} value="all" />)

    expect(screen.getByRole('group', { name: 'Welke wedstrijden' }).className).toBe('hf-segmented-control')
    expect(screen.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Alle wedstrijden', '/statistieken'],
      ['Eredivisie', '/statistieken?competitie=eredivisie'],
    ])
  })

  it('marks only the link of the value with aria-current', () => {
    render(<SegmentedLinks label="Welke wedstrijden" options={options} value="league" />)

    expect(screen.getByRole('link', { name: 'Alle wedstrijden' }).hasAttribute('aria-current')).toBe(false)
    expect(screen.getByRole('link', { name: 'Eredivisie' }).getAttribute('aria-current')).toBe('page')
  })

  it('adds the class and the attributes of the caller to the group', () => {
    render(<SegmentedLinks className="extra" data-testid="switch" label="Welke" options={options} value="all" />)

    expect(screen.getByTestId('switch').className).toBe('hf-segmented-control extra')
  })

  it('places the thumb under the current link, and has the small size when asked', () => {
    render(<SegmentedLinks label="Welke wedstrijden" options={options} size="small" value="league" />)
    const group = screen.getByRole('group', { name: 'Welke wedstrijden' })

    expect(group.style.getPropertyValue('--hf-segmented-count')).toBe('2')
    expect(group.style.getPropertyValue('--hf-segmented-index')).toBe('1')
    expect(group.className).toBe('hf-segmented-control hf-size-small')
  })

  it('leaves the thumb out when no link is current', () => {
    render(<SegmentedLinks label="Welke wedstrijden" options={options} value="other" />)

    expect(screen.getByRole('group').hasAttribute('data-empty')).toBe(true)
    expect(screen.getAllByRole('link').every((link) => !link.hasAttribute('aria-current'))).toBe(true)
  })

  it('wraps the text of a link in the label that keeps the width of the bold text', () => {
    render(<SegmentedLinks label="Welke wedstrijden" options={options} value="all" />)

    expect(screen.getByRole('link', { name: 'Eredivisie' }).innerHTML).toBe(
      '<span class="hf-segmented-label" data-label="Eredivisie">Eredivisie</span>',
    )
  })
})
