import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { type CareerPeriod, CareerTimeline } from './CareerTimeline'

const periods: CareerPeriod[] = [
  {
    gap: '2010/11: niet in de selectie',
    seasons: [
      {
        competitions: 'Eredivisie en KNVB beker',
        current: true,
        href: '#2009',
        moment: { href: '#wedstrijd', note: '10 april 2004 · hattrick in zeven minuten', title: 'Testclub – Testteam' },
        number: '35',
        remark: 'Geen opstellingen van dit seizoen.',
        season: '2009/10',
      },
    ],
    years: '2007–2010',
  },
  { seasons: [{ href: '#2003', season: '2003/04' }], years: '2003–2004' },
]

describe('CareerTimeline', () => {
  it('is a list of periods with a heading each, and a list of seasons with a heading each in it', () => {
    render(<CareerTimeline level={2} periods={periods} />)

    expect(screen.getByRole('heading', { level: 2, name: '2007–2010' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: '2009/10' })).toBeTruthy()
    expect(screen.getAllByRole('list')).toHaveLength(3)
  })

  it('puts the seasons one level below the periods', () => {
    render(<CareerTimeline level={3} periods={periods} />)

    expect(screen.getByRole('heading', { level: 4, name: '2009/10' })).toBeTruthy()
  })

  it('shows the gap, the number, the label, the competitions, the moment and the remark', () => {
    render(<CareerTimeline level={2} periods={periods} />)

    expect(screen.getByText('2010/11: niet in de selectie')).toBeTruthy()
    expect(screen.getByText('rugnummer 35')).toBeTruthy()
    expect(screen.getByText('Dit seizoen')).toBeTruthy()
    expect(screen.getByText('Eredivisie en KNVB beker')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Testclub – Testteam' }).getAttribute('href')).toBe('#wedstrijd')
    expect(screen.getByText('10 april 2004 · hattrick in zeven minuten')).toBeTruthy()
    expect(screen.getByText('Geen opstellingen van dit seizoen.')).toBeTruthy()
  })

  it('leaves no empty line for a season with only the season', () => {
    const { container } = render(<CareerTimeline level={2} periods={[periods[1] as CareerPeriod]} />)
    const season = container.querySelector('.hf-career-season') as HTMLElement

    expect(within(season).getByRole('link', { name: '2003/04' })).toBeTruthy()
    expect(season.querySelectorAll('p')).toHaveLength(0)
    expect(container.querySelector('.hf-career-gap')).toBeNull()
  })

  it('writes no decoration in the markup, so a screen reader reads only the list', () => {
    const { container } = render(<CareerTimeline level={2} periods={periods} />)

    expect(container.querySelectorAll('svg, img, [role="presentation"]')).toHaveLength(0)
  })
})
