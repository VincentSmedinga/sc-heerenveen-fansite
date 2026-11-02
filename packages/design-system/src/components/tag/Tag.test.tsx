import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Tag, tagTones } from './Tag'

describe('Tag', () => {
  it('is text inside a line, with no role of its own', () => {
    render(<Tag>Uitslag ontbreekt</Tag>)
    const tag = screen.getByText('Uitslag ontbreekt')

    expect(tag.tagName).toBe('SPAN')
    expect(tag.hasAttribute('role')).toBe(false)
  })

  it('is the neutral tone, with only the class of the tag, when it has no tone', () => {
    render(<Tag>Gepland</Tag>)

    expect(screen.getByText('Gepland').className).toBe('hf-tag')
  })

  it.each(tagTones.filter((tone) => tone !== 'neutral'))('adds the class of the tone %s', (tone) => {
    render(<Tag tone={tone}>Aangepast</Tag>)

    expect(screen.getByText('Aangepast').className).toBe(`hf-tag hf-tag-${tone}`)
  })

  it('keeps a class of its own and the other attributes', () => {
    render(
      <Tag className="extra" id="tag" tone="highlight">
        Aangepast
      </Tag>,
    )
    const tag = screen.getByText('Aangepast')

    expect(tag.className).toBe('hf-tag hf-tag-highlight extra')
    expect(tag.id).toBe('tag')
  })
})
