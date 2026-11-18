import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { contrast, role } from '../../tokens/colourRoles'
import { tableColumns } from '../table-columns'
import { TableColumnIcon, tableColumnIconNames } from './TableColumnIcon'

// The CSS is read as text: jsdom doesn't apply rules in a cascade layer.
const css = readFileSync(join(import.meta.dirname, 'table-column-icon.css'), 'utf8').replaceAll(
  /\/\*[\s\S]*?\*\//gu,
  '',
)

const draw = (element: React.ReactElement) => render(element).container.querySelector('svg')

describe('TableColumnIcon', () => {
  it.each(tableColumnIconNames)('draws %s as shapes only, hidden from assistive technology', (name) => {
    const icon = draw(<TableColumnIcon name={name} />)

    expect(icon?.getAttribute('aria-hidden')).toBe('true')
    expect(icon?.getAttribute('focusable')).toBe('false')
    expect(icon?.getAttribute('viewBox')).toBe('0 0 16 16')
    expect(icon?.querySelectorAll('circle, path, rect, ellipse').length).toBeGreaterThan(0)
    expect(icon?.outerHTML).not.toMatch(/(href|src)=|https?:|style="[^"]*url\(/u)
  })

  it('gives every column of tableColumns a drawing of its own', () => {
    const drawings = Object.values(tableColumns).map(({ icon }) => {
      // The ids of the clips differ, so they are left out.
      return draw(<TableColumnIcon name={icon} />)?.innerHTML.replaceAll(/id="[^"]*"|url\(#[^)]*\)/gu, '')
    })

    expect(new Set(drawings).size).toBe(Object.keys(tableColumns).length)
  })

  it('gives every ball a clip of its own, so two balls in a table do not share one', () => {
    const { container } = render(
      <>
        <TableColumnIcon name="goals" />
        <TableColumnIcon name="conceded" />
        <TableColumnIcon name="hattricks" />
      </>,
    )
    const ids = [...container.querySelectorAll('clipPath')].map((clip) => clip.id)

    expect(ids).toHaveLength(5)
    expect(new Set(ids).size).toBe(5)
    for (const id of ids) expect(container.querySelectorAll(`[clip-path="url(#${id})"]`)).toHaveLength(1)
  })

  it('has the size of the text beside it and is turned 8 degrees clockwise', () => {
    expect(css).toMatch(/\.hf-table-icon \{[^}]*block-size: 1em;/u)
    expect(css).toMatch(/\.hf-table-icon \{[^}]*inline-size: 1em;/u)
    expect(css).toMatch(/\.hf-table-icon \{[^}]*transform: rotate\(8deg\);/u)
  })

  it('draws the badges in the colours of the result, with a sign that repeats the colour', () => {
    const badge = (name: (typeof tableColumnIconNames)[number]) =>
      draw(<TableColumnIcon name={name} />)
        ?.querySelector('.hf-table-icon-badge')
        ?.getAttribute('class')

    expect(badge('won')).toContain('hf-table-icon-win')
    expect(badge('lost')).toContain('hf-table-icon-loss')
    expect(badge('drawn')).toContain('hf-table-icon-draw')
    expect(badge('goals')).toBeUndefined()
    expect(badge('conceded')).toContain('hf-table-icon-loss')
    expect(badge('goalDifference')).toContain('hf-table-icon-draw')
    expect(css).toMatch(/\.hf-table-icon-win \{\s*fill: var\(--hf-colour-outcome-win\)/u)
    expect(css).toMatch(/\.hf-table-icon-loss \{\s*fill: var\(--hf-colour-outcome-loss\)/u)
    expect(css).toMatch(/\.hf-table-icon-draw \{\s*fill: var\(--hf-colour-outcome-draw\)/u)
    expect(draw(<TableColumnIcon name="won" />)?.querySelector('.hf-table-icon-sign')).toBeTruthy()
  })

  it('draws the shirt, the boot and the cards with a rim in the colour of the text and fills from tokens', () => {
    expect(css).toMatch(/\.hf-table-icon-rim,\s*\.hf-table-icon-card \{\s*stroke: var\(--hf-colour-text-default\)/u)
    expect(css).toMatch(/\.hf-table-icon-stripe-blue \{\s*fill: var\(--hf-colour-icon-stripe-blue\)/u)
    expect(css).toMatch(/\.hf-table-icon-stripe-white \{\s*fill: var\(--hf-colour-icon-stripe-white\)/u)
    expect(css).toMatch(/\.hf-table-icon-pompebled \{\s*fill: var\(--hf-colour-icon-pompebled\)/u)
    expect(css).toMatch(/\.hf-table-icon-boot \{\s*fill: var\(--hf-colour-icon-boot\)/u)
    expect(css).toMatch(/\.hf-table-icon-yellow \{\s*fill: var\(--hf-colour-card-yellow\)/u)
    expect(css).toMatch(/\.hf-table-icon-red \{\s*fill: var\(--hf-colour-card-red\)/u)
  })

  it('has fills of CanvasText or Canvas in forced colours, and keeps every line visible', () => {
    const forced = css.match(/@media \(forced-colors: active\) \{([\s\S]*)\}\s*\n\s*\.hf-table-legend-item/u)?.[1] ?? ''

    expect(forced).toMatch(/\.hf-table-icon-win,[^{]*\{\s*fill: CanvasText;/u)
    expect(forced).toMatch(/\.hf-table-icon-stripe-white,[^{]*\{\s*fill: Canvas;/u)
    expect(forced).toMatch(/\.hf-table-icon-win-line,[^{]*\{\s*stroke: CanvasText;/u)
    expect(forced).toMatch(/\.hf-table-icon-sign \{\s*stroke: Canvas;/u)
  })
})

describe('the shirt and the overlays', () => {
  it('draws the shirt with three white and two blue stripes, two pompeblêden and a rim', () => {
    const shirt = draw(<TableColumnIcon name="started" />)

    expect(shirt?.querySelectorAll('.hf-table-icon-stripe-white')).toHaveLength(3)
    expect(shirt?.querySelectorAll('.hf-table-icon-stripe-blue')).toHaveLength(2)
    expect(shirt?.querySelectorAll('.hf-table-icon-pompebled')).toHaveLength(2)
    expect(shirt?.querySelector('.hf-table-icon-rim')).toBeTruthy()
  })

  it('cuts the drawing away round a badge and the small pitch instead of drawing a border', () => {
    for (const name of [
      'won',
      'drawn',
      'lost',
      'goalDifference',
      'conceded',
      'pointsPerMatch',
      'goalsPerMatch',
    ] as const) {
      expect(draw(<TableColumnIcon name={name} />)?.querySelector('mask')).toBeTruthy()
    }
    expect(css).not.toMatch(/\.hf-table-icon-(badge|halo)\s*\{/u)
  })

  it('draws every line with the width of the pitch', () => {
    expect(css).toMatch(/\.hf-table-icon-line \{[^}]*stroke-width: 1\.2;/u)
    expect(css).toMatch(/\.hf-table-icon-arrow \{[^}]*stroke-width: 1\.2;/u)
    expect(css).not.toMatch(/stroke-width: 1\.[1368];|stroke-width: 1\.7;/u)
  })
})

describe('the colours of the icons of the columns', () => {
  const surfaces = ['surface', 'page', 'surface-strong', 'surface-soft', 'surface-warm'].map((name) =>
    role(`background-${name}`),
  )
  const rim = role('text-default')
  const tokens = readFileSync(join(import.meta.dirname, '../../tokens/colour.css'), 'utf8')

  it.each(['light', 'dark'] as const)('has a rim that reaches 3:1 on every surface in %s', (theme) => {
    for (const surface of surfaces) {
      expect(contrast(rim[theme], surface[theme])).toBeGreaterThanOrEqual(3)
    }
  })

  it.each(['light', 'dark'] as const)('has badges that reach 3:1 on every surface in %s, so they are seen', (theme) => {
    for (const name of ['outcome-win', 'outcome-loss', 'outcome-draw']) {
      for (const surface of surfaces) {
        expect(contrast(role(name)[theme], surface[theme])).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('has the stripes and the pompeblêden of the shirt in both themes and the grey of the boot lighter in dark', () => {
    expect(tokens).toMatch(
      /--hf-colour-icon-stripe-blue: light-dark\(var\(--hf-colour-blue-500\), var\(--hf-colour-blue-500\)\)/u,
    )
    expect(tokens).toMatch(
      /--hf-colour-icon-stripe-white: light-dark\(var\(--hf-colour-white\), var\(--hf-colour-blue-100\)\)/u,
    )
    expect(tokens).toMatch(/--hf-colour-icon-pompebled: light-dark\(#e30613, #e30613\)/u)
    expect(tokens).toMatch(
      /--hf-colour-icon-boot: light-dark\(var\(--hf-colour-grey-400\), var\(--hf-colour-grey-300\)\)/u,
    )
    expect(tokens).toMatch(/ {6}--hf-colour-icon-stripe-white: var\(--hf-colour-blue-100\);/u)
    expect(tokens).toMatch(/ {6}--hf-colour-icon-boot: var\(--hf-colour-grey-400\);/u)
  })
})
