import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Body } from '../body/Body'
import { Root } from './Root'

// An html element can't be rendered into a div, so these tests render to a string and read that
// back as a document.
const parse = (markup: string) => new DOMParser().parseFromString(markup, 'text/html')

describe('Root', () => {
  it('is the html element, in Dutch', () => {
    const markup = renderToStaticMarkup(
      <Root>
        <Body>Inhoud</Body>
      </Root>,
    )

    expect(markup).toMatch(/^<html data-scroll-behavior="smooth" lang="nl">/)
    expect(parse(markup).documentElement.getAttribute('lang')).toBe('nl')
  })

  it('puts nothing in the head: Next.js owns that', () => {
    const markup = renderToStaticMarkup(
      <Root>
        <Body>Inhoud</Body>
      </Root>,
    )

    // React makes the empty head element itself. Next.js fills it from its Metadata API.
    expect(parse(markup).head.childElementCount).toBe(0)
    expect(markup).not.toMatch(/<(link|meta|script|style|title)/)
  })

  it('keeps the other attributes, such as the theme', () => {
    const markup = renderToStaticMarkup(
      <Root data-theme="dark">
        <Body>Inhoud</Body>
      </Root>,
    )

    expect(parse(markup).documentElement.dataset['theme']).toBe('dark')
  })

  it('stays Dutch when another language is passed in from JavaScript', () => {
    const props = { lang: 'en' }
    const markup = renderToStaticMarkup(
      <Root {...props}>
        <Body>Inhoud</Body>
      </Root>,
    )

    expect(parse(markup).documentElement.getAttribute('lang')).toBe('nl')
  })

  it('tells Next.js that html scrolls smoothly, and stays that way when another value is passed in', () => {
    const props = { 'data-scroll-behavior': 'auto' }
    const markup = renderToStaticMarkup(
      <Root {...props}>
        <Body>Inhoud</Body>
      </Root>,
    )

    expect(parse(markup).documentElement.dataset['scrollBehavior']).toBe('smooth')
  })

  it('does not accept a lang', () => {
    const elements = [
      // @ts-expect-error The site is Dutch, so lang is not a prop.
      <Root lang="en" />,
    ]

    expect(elements).toHaveLength(1)
  })
})
