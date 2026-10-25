import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { filledIconNames, Icon, iconNames } from './Icon'

// The CSS is read as text: jsdom doesn't apply rules in a cascade layer.
const css = readFileSync(join(import.meta.dirname, 'icon.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const draw = (element: React.ReactElement) => render(element).container.querySelector('svg')

describe('Icon', () => {
  it.each(iconNames)(
    'draws %s as an svg that assistive technology skips, in the colour of the text around it',
    (name) => {
      const { container } = render(<Icon name={name} />)
      const icon = container.querySelector('svg')

      expect(container.children).toHaveLength(1)
      expect(icon?.getAttribute('class')).toBe('hf-icon')
      expect(icon?.getAttribute('aria-hidden')).toBe('true')
      expect(icon?.getAttribute('focusable')).toBe('false')
      expect(icon?.getAttribute('stroke')).toBe('currentColor')
      expect(icon?.getAttribute('fill')).toBe('none')
      expect(icon?.textContent).toBe('')
    },
  )

  it.each(iconNames)('draws %s in the code: shapes only, nothing that points to another file or address', (name) => {
    const icon = draw(<Icon name={name} />)
    const shapes = [...(icon?.querySelectorAll('*') ?? [])].map((element) => element.tagName)

    expect(shapes.length).toBeGreaterThan(0)
    expect(shapes.every((tagName) => tagName === 'path' || tagName === 'circle')).toBe(true)
    expect(icon?.outerHTML).not.toMatch(/(href|src)=|https?:|url\(/)
  })

  it('draws every icon in one style: a line of the same width with round ends and corners', () => {
    for (const name of iconNames) {
      const icon = draw(<Icon name={name} />)

      expect(icon?.getAttribute('stroke-width'), name).toBe('1.5')
      expect(icon?.getAttribute('stroke-linecap'), name).toBe('round')
      expect(icon?.getAttribute('stroke-linejoin'), name).toBe('round')
      expect(icon?.getAttribute('viewBox'), name).toBe('0 0 16 16')
    }
  })

  it.each(filledIconNames)('draws %s filled in the colour of the text, with the same shapes as the line', (name) => {
    const line = draw(<Icon name={name} />)
    const filled = draw(<Icon appearance="filled" name={name} />)

    expect(filled?.getAttribute('fill')).toBe('currentColor')
    expect(filled?.getAttribute('stroke')).toBe('currentColor')
    expect(filled?.innerHTML).toBe(line?.innerHTML)
  })

  it('has a filled drawing only for the sun and the moon', () => {
    const elements = [
      // @ts-expect-error An arrow has no filled drawing.
      <Icon appearance="filled" name="arrow-right" />,
    ]

    expect(elements).toHaveLength(1)
    expect(filledIconNames).toEqual(['moon', 'sun'])
  })
})

describe('the CSS of the icons', () => {
  it('sets no colour, so the icon has the colour of the text around it also under the mouse and with the focus', () => {
    expect(css).not.toMatch(/(^|[;{\s])(color|fill|stroke)\s*:/)
  })

  it('does not move the icon', () => {
    expect(css).not.toMatch(/transition|animation|transform|:hover/)
  })

  it('sizes the icon relative to the text, and keeps the icon with its word on one line', () => {
    expect(css).toMatch(/inline-size: 0\.875em/)
    expect(css).toMatch(/\.hf-icon-head,\s*\.hf-icon-tail\s*\{\s*white-space: nowrap/)
  })
})
