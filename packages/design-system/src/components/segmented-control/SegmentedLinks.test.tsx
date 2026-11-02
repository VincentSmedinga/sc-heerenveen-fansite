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

  describe('the names for the slide between two pages', () => {
    it('has none without a place, so the switch does not take part', () => {
      render(<SegmentedLinks label="Welke wedstrijden" options={options} value="all" />)

      expect(screen.getByRole('group').getAttribute('style')).not.toContain('name')
      expect(screen.getAllByRole('link').every((link) => !link.hasAttribute('style'))).toBe(true)
    })

    it('gives the thumb and each option a name that holds the place', () => {
      render(<SegmentedLinks label="Welke wedstrijden" options={options} place="stand" value="all" />)

      expect(screen.getByRole('group').style.getPropertyValue('--hf-segmented-thumb-name')).toBe(
        'hf-segmented-thumb-stand',
      )
      expect(
        screen.getAllByRole('link').map((link) => link.style.getPropertyValue('--hf-segmented-option-name')),
      ).toEqual(['hf-segmented-option-stand-1', 'hf-segmented-option-stand-2'])
    })

    it('keeps the names when another option is chosen, so the thumb slides, and differs per place', () => {
      const names = (place: string, value: string) => {
        const { unmount } = render(<SegmentedLinks label="Welke" options={options} place={place} value={value} />)
        const group = screen.getByRole('group')
        const result = [
          group.style.getPropertyValue('--hf-segmented-thumb-name'),
          ...screen.getAllByRole('link').map((link) => link.style.getPropertyValue('--hf-segmented-option-name')),
        ]

        unmount()

        return result
      }

      expect(names('stand', 'all')).toEqual(names('stand', 'league'))
      expect(names('stand', 'all')).not.toEqual(names('statistieken', 'all'))
    })

    it('leaves the style of the caller in place', () => {
      render(<SegmentedLinks label="Welke" options={options} place="stand" style={{ color: 'red' }} value="all" />)

      expect(screen.getByRole('group').style.color).toBe('red')
    })
  })
})
