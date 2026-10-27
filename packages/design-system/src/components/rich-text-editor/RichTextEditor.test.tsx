import type { Editor } from '@tiptap/core'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { userEvent } from 'storybook/test'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { isLinkAddress, linkAddressError } from './linkAddress'
import { RichTextEditor, type RichTextValue } from './RichTextEditor'

// jsdom does not lay anything out, and ProseMirror asks the document where a click landed and
// the range where the cursor is.
beforeAll(() => {
  document.elementFromPoint = () => null
  Range.prototype.getBoundingClientRect = () => new DOMRect()
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList
})

const article: RichTextValue = {
  content: [
    { attrs: { level: 2 }, content: [{ text: 'Een kop', type: 'text' }], type: 'heading' },
    {
      content: [
        { text: 'Gewone tekst, ', type: 'text' },
        { marks: [{ type: 'bold' }], text: 'vet', type: 'text' },
        { text: ' en ', type: 'text' },
        { marks: [{ type: 'italic' }], text: 'cursief', type: 'text' },
        { text: ' en ', type: 'text' },
        { marks: [{ attrs: { href: '/bronnen' }, type: 'link' }], text: 'een link', type: 'text' },
      ],
      type: 'paragraph',
    },
    {
      content: [
        { content: [{ content: [{ text: 'Eén', type: 'text' }], type: 'paragraph' }], type: 'listItem' },
        { content: [{ content: [{ text: 'Twee', type: 'text' }], type: 'paragraph' }], type: 'listItem' },
      ],
      type: 'bulletList',
    },
  ],
  type: 'doc',
}

const list: RichTextValue = {
  content: [
    { content: [{ content: [{ text: 'Eén', type: 'text' }], type: 'paragraph' }], type: 'listItem' },
    { content: [{ content: [{ text: 'Twee', type: 'text' }], type: 'paragraph' }], type: 'listItem' },
  ],
  type: 'bulletList',
}

const renderEditor = (props: Partial<React.ComponentProps<typeof RichTextEditor>> = {}) => {
  const result = render(<RichTextEditor id="tekst" label="Tekst" name="body" {...props} />)

  return { ...result, editable: () => screen.findByRole('textbox', { name: 'Tekst' }) }
}

/** The JSON in the hidden field: what the form would send. */
const sent = () => JSON.parse((document.querySelector('input[name="body"]') as HTMLInputElement).value) as RichTextValue

/** The editor of the last render, through the element Tiptap puts on the editable node. */
const editorOf = (element: HTMLElement) => (element as HTMLElement & { editor: Editor }).editor

/**
 * Puts the cursor in the first text node with these words, or selects the words. jsdom has no
 * layout, so a click does not find a place in the text.
 */
const placeCursor = async (textbox: HTMLElement, words: string, select = false) => {
  const editor = editorOf(textbox)
  let from = -1

  editor.state.doc.descendants((node, position) => {
    if (from === -1 && node.isText && node.text?.includes(words)) {
      from = position + (node.text.indexOf(words) ?? 0)
    }
  })
  editor
    .chain()
    .focus()
    .setTextSelection(select ? { from, to: from + words.length } : from + 1)
    .run()
  // The editor takes the focus on the next frame.
  await waitFor(() => {
    expect(document.activeElement).toBe(textbox)
  })
}

describe('RichTextEditor', () => {
  it('has a visible label that names the editor, and the id of the field', async () => {
    const { editable } = renderEditor()
    const textbox = await editable()

    expect(textbox.id).toBe('tekst')
    expect(textbox.getAttribute('aria-multiline')).toBe('true')
    expect(document.querySelector('label')?.textContent).toBe('Tekst')
  })

  it('moves the focus to the editor when the label is clicked', async () => {
    const { editable } = renderEditor()
    const textbox = await editable()

    await userEvent.click(screen.getByText('Tekst', { selector: 'label' }))

    expect(document.activeElement).toBe(textbox)
  })

  it('leaves the focus where it is when a label of the link form is clicked', async () => {
    const { editable } = renderEditor()

    await userEvent.click(await editable())
    await userEvent.click(screen.getByRole('button', { name: 'Link' }))
    fireEvent.click(screen.getByText('Tekst van de link', { selector: 'label' }))

    expect(document.activeElement).not.toBe(await editable())
  })

  it('ties the hint and the error to the editor, and marks it invalid with an error', async () => {
    const { editable, rerender } = renderEditor({ hint: 'Schrijf voor supporters.' })
    const textbox = await editable()

    expect(textbox.getAttribute('aria-describedby')).toBe('tekst-hint')
    expect(textbox.hasAttribute('aria-invalid')).toBe(false)

    rerender(
      <RichTextEditor
        error="Schrijf een tekst."
        hint="Schrijf voor supporters."
        id="tekst"
        label="Tekst"
        name="body"
      />,
    )

    await waitFor(() => {
      expect(textbox.getAttribute('aria-invalid')).toBe('true')
    })
    expect(textbox.getAttribute('aria-describedby')).toBe('tekst-hint tekst-error')
    expect(document.getElementById('tekst-error')?.textContent).toBe('Fout: Schrijf een tekst.')
  })

  it('says to a screen reader that the text is required, unless it is not', async () => {
    const { editable, rerender } = renderEditor()

    expect((await editable()).getAttribute('aria-required')).toBe('true')

    rerender(<RichTextEditor id="tekst" label="Tekst" name="body" required={false} />)

    const textbox = await screen.findByRole('textbox', { name: 'Tekst (niet verplicht)' })

    await waitFor(() => {
      expect(textbox.getAttribute('aria-required')).toBe('false')
    })
  })

  describe('the text', () => {
    it('shows the starting value, with the formatting it has', async () => {
      renderEditor({ defaultValue: article })
      const textbox = await screen.findByRole('textbox', { name: 'Tekst' })

      expect(textbox.querySelector('h2')?.textContent).toBe('Een kop')
      expect(textbox.querySelector('strong')?.textContent).toBe('vet')
      expect(textbox.querySelector('em')?.textContent).toBe('cursief')
      expect(textbox.querySelector('a')?.getAttribute('href')).toBe('/bronnen')
      expect([...textbox.querySelectorAll('li')].map((item) => item.textContent)).toEqual(['Eén', 'Twee'])
    })

    it('starts empty without a value', async () => {
      renderEditor()
      await screen.findByRole('textbox', { name: 'Tekst' })

      expect(sent()).toEqual({ content: [{ type: 'paragraph' }], type: 'doc' })
    })

    it('carries the JSON in a hidden field with the name the form gives, from the start', async () => {
      renderEditor({ defaultValue: article })
      await screen.findByRole('textbox', { name: 'Tekst' })

      const field = document.querySelector<HTMLInputElement>('input[name="body"]')

      expect(field?.type).toBe('hidden')
      expect(sent()).toEqual(article)
    })

    it('keeps the hidden field up to date, so the form sends the text of that moment', async () => {
      const onChange = vi.fn()
      const { editable } = renderEditor({ onChange })
      const textbox = await editable()

      await userEvent.click(textbox)
      await userEvent.keyboard('Hallo')

      expect(sent()).toEqual({
        content: [{ content: [{ text: 'Hallo', type: 'text' }], type: 'paragraph' }],
        type: 'doc',
      })
      expect(onChange).toHaveBeenLastCalledWith(sent())
    })

    it('makes bold and italic with the usual keys', async () => {
      const { editable } = renderEditor()

      await userEvent.click(await editable())
      await userEvent.keyboard('{Control>}b{/Control}vet{Control>}b{/Control} {Control>}i{/Control}schuin')

      const paragraph = sent().content?.[0]?.content

      expect(paragraph).toEqual([
        { marks: [{ type: 'bold' }], text: 'vet', type: 'text' },
        { text: ' ', type: 'text' },
        { marks: [{ type: 'italic' }], text: 'schuin', type: 'text' },
      ])
    })
  })

  describe('what can be pasted', () => {
    const pasteHtml = async (html: string) => {
      const { editable } = renderEditor()
      const textbox = await editable()

      editorOf(textbox).view.pasteHTML(html, new Event('paste') as ClipboardEvent)
      await waitFor(() => {
        expect(sent()).not.toEqual({ content: [{ type: 'paragraph' }], type: 'doc' })
      })

      return textbox
    }

    it('turns a table into text, with its cells apart, and drops an image', async () => {
      await pasteHtml(
        '<table><tr><td>Cel een</td><td>Cel twee</td></tr></table><p>Daarna <img src="https://voorbeeld.test/foto.jpg" alt="Foto"> tekst</p>',
      )

      const json = JSON.stringify(sent())

      expect(json).toContain('Cel een Cel twee')
      expect(json).toContain('Daarna')
      expect(json).not.toMatch(/image|table|img|voorbeeld\.test/)
    })

    it('turns a heading of another level into a paragraph, and keeps the text', async () => {
      await pasteHtml('<h1>Groot</h1><h3>Kleiner</h3>')

      expect(sent().content?.map((node) => node.type)).toEqual(['paragraph', 'paragraph'])
    })

    it('keeps the allowed formatting', async () => {
      await pasteHtml('<h2>Kop</h2><p><b>vet</b> <i>cursief</i></p><ul><li>punt</li></ul>')

      expect(sent().content?.map((node) => node.type)).toEqual(['heading', 'paragraph', 'bulletList'])
      expect(JSON.stringify(sent())).toMatch(/bold/)
      expect(JSON.stringify(sent())).toMatch(/italic/)
    })

    it('drops other formatting, scripts and styles, and keeps the words', async () => {
      await pasteHtml(
        '<p style="color:red"><u>onderstreept</u> <s>doorgehaald</s> <code>programma</code></p><script>alert(1)</script><blockquote>citaat</blockquote>',
      )

      const json = JSON.stringify(sent())

      expect(json).toContain('onderstreept')
      expect(json).toContain('citaat')
      expect(json).not.toMatch(/underline|strike|code|blockquote|color|style/)
    })

    it('does not make a link of an address that is not allowed, and keeps its words', async () => {
      await pasteHtml(
        '<p><a href="javascript:alert(1)">een</a> <a href="//evil.example">twee</a> <a href="http://voorbeeld.test">drie</a> <a href="https://voorbeeld.test/a">vier</a> <a href="/bronnen">vijf</a></p>',
      )

      const marks = sent().content?.[0]?.content?.flatMap((node) => node.marks ?? [])

      expect(marks).toEqual([
        { attrs: { href: 'https://voorbeeld.test/a' }, type: 'link' },
        { attrs: { href: '/bronnen' }, type: 'link' },
      ])
      expect(JSON.stringify(sent())).toContain('een')
    })

    it('has no list inside a list', async () => {
      await pasteHtml('<ul><li>boven<ul><li>onder</li></ul></li></ul>')

      expect(sent().content?.map((node) => node.type)).toEqual(['bulletList', 'bulletList'])
      expect(JSON.stringify(sent())).toContain('onder')
    })
  })

  describe('the toolbar', () => {
    it('is a toolbar with a name, with a button for each kind of formatting, in Dutch', async () => {
      renderEditor()
      await screen.findByRole('textbox', { name: 'Tekst' })

      const toolbar = screen.getByRole('toolbar', { name: 'Opmaak' })

      expect([...toolbar.querySelectorAll('button')].map((button) => button.textContent)).toEqual([
        'Kop',
        'Lijst',
        'Vet',
        'Cursief',
        'Link',
      ])
    })

    it('never sends the form it sits in: its buttons are buttons', async () => {
      renderEditor()
      await screen.findByRole('textbox', { name: 'Tekst' })

      for (const button of screen.getByRole('toolbar').querySelectorAll('button')) {
        expect(button.type).toBe('button')
      }
    })

    it('says with aria-pressed which formatting the cursor is in', async () => {
      renderEditor({ defaultValue: article })
      const textbox = await screen.findByRole('textbox', { name: 'Tekst' })

      const pressed = () =>
        screen
          .getAllByRole('button', { pressed: true })
          .map((button) => button.textContent)
          .sort()

      await placeCursor(textbox, 'Een kop')
      await waitFor(() => {
        expect(pressed()).toEqual(['Kop'])
      })

      await placeCursor(textbox, 'vet')
      await waitFor(() => {
        expect(pressed()).toEqual(['Vet'])
      })

      await placeCursor(textbox, 'Eén')
      await waitFor(() => {
        expect(pressed()).toEqual(['Lijst'])
      })
    })

    it('turns the formatting on and off with the buttons', async () => {
      const { editable } = renderEditor()
      const textbox = await editable()
      const types = () => sent().content?.map((node) => node.type)

      await userEvent.click(textbox)
      await userEvent.click(screen.getByRole('button', { name: 'Kop' }))
      // A button hands the focus to the editor on the next frame.
      await waitFor(() => {
        expect(document.activeElement).toBe(textbox)
      })
      await userEvent.keyboard('Titel{Enter}Punt')

      expect(types()).toEqual(['heading', 'paragraph'])

      await placeCursor(textbox, 'Punt')
      await userEvent.click(screen.getByRole('button', { name: 'Lijst' }))

      expect(types()).toEqual(['heading', 'bulletList'])
      expect(screen.getByRole('button', { name: 'Lijst' }).getAttribute('aria-pressed')).toBe('true')

      await placeCursor(textbox, 'Punt')
      await userEvent.click(screen.getByRole('button', { name: 'Lijst' }))

      expect(types()).toEqual(['heading', 'paragraph'])

      await placeCursor(textbox, 'Titel')
      await userEvent.click(screen.getByRole('button', { name: 'Kop' }))

      expect(types()).toEqual(['paragraph', 'paragraph'])
    })

    it('has Tab and Shift+Tab leave the editor, also in a list, and the arrow keys move along the buttons', async () => {
      renderEditor({ defaultValue: { content: [list], type: 'doc' } })
      const textbox = await screen.findByRole('textbox', { name: 'Tekst' })
      const [heading, listButton, bold, italic, link] = screen.getAllByRole('button')

      // From the top of the page: one stop in the toolbar, and then the editor.
      await userEvent.tab()
      expect(document.activeElement).toBe(heading)
      await userEvent.keyboard('{ArrowRight}')
      expect(document.activeElement).toBe(listButton)
      await userEvent.keyboard('{End}')
      expect(document.activeElement).toBe(link)
      await userEvent.keyboard('{ArrowRight}')
      expect(document.activeElement).toBe(heading)
      await userEvent.keyboard('{ArrowLeft}')
      expect(document.activeElement).toBe(link)
      await userEvent.keyboard('{Home}{ArrowRight}{ArrowRight}')
      expect(document.activeElement).toBe(bold)
      expect(italic?.getAttribute('tabindex')).toBe('-1')

      await userEvent.tab()
      expect(document.activeElement).toBe(textbox)

      // Into the second item of the list, and out again, with no list inside a list.
      await placeCursor(textbox, 'Twee')
      await userEvent.tab()
      expect(document.activeElement).not.toBe(textbox)
      expect(document.body.contains(document.activeElement)).toBe(true)
      expect(textbox.contains(document.activeElement)).toBe(false)

      await placeCursor(textbox, 'Twee')
      await userEvent.tab({ shift: true })
      expect(textbox.contains(document.activeElement)).toBe(false)
      expect(textbox.querySelectorAll('ul ul')).toHaveLength(0)
      expect(textbox.querySelectorAll('li')).toHaveLength(2)
    })

    it('goes back to the toolbar at the button where it left', async () => {
      renderEditor()
      const textbox = await screen.findByRole('textbox', { name: 'Tekst' })

      await userEvent.tab()
      await userEvent.keyboard('{ArrowRight}{ArrowRight}')
      await userEvent.tab()
      expect(document.activeElement).toBe(textbox)
      await userEvent.tab({ shift: true })

      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Vet' }))
    })
  })

  describe('a link', () => {
    const openLinkForm = async () => {
      const { editable } = renderEditor({ defaultValue: article })
      const textbox = await editable()

      return { textbox }
    }

    it('is made with the address and the text, in a form that is not a form', async () => {
      const { editable } = renderEditor()

      await userEvent.click(await editable())
      await userEvent.keyboard('Lees ')
      await userEvent.click(screen.getByRole('button', { name: 'Link' }))

      const group = screen.getByRole('group', { name: 'Link' })

      expect(group.closest('form')).toBeNull()
      expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Adres' }))
      expect(screen.getByRole('textbox', { name: 'Adres' }).hasAttribute('name')).toBe(false)
      expect(screen.getByRole('textbox', { name: 'Adres' }).getAttribute('form')).toBe('')

      await userEvent.type(screen.getByRole('textbox', { name: 'Adres' }), 'https://voorbeeld.test/nieuws')
      await userEvent.type(screen.getByRole('textbox', { name: 'Tekst van de link' }), 'ons nieuws')
      await userEvent.click(screen.getByRole('button', { name: 'Link opslaan' }))

      expect(screen.queryByRole('group', { name: 'Link' })).toBeNull()
      await waitFor(async () => {
        expect(document.activeElement).toBe(await editable())
      })
      expect(sent().content?.[0]?.content).toEqual([
        { text: 'Lees ', type: 'text' },
        {
          marks: [{ attrs: { href: 'https://voorbeeld.test/nieuws' }, type: 'link' }],
          text: 'ons nieuws',
          type: 'text',
        },
      ])
    })

    it('uses the selected words as the text, and keeps the bold in them', async () => {
      const { textbox } = await openLinkForm()
      await placeCursor(textbox, 'vet', true)

      await userEvent.click(screen.getByRole('button', { name: 'Link' }))

      expect((screen.getByRole('textbox', { name: 'Tekst van de link' }) as HTMLInputElement).value).toBe('vet')

      await userEvent.type(screen.getByRole('textbox', { name: 'Adres' }), '/over-ons{Enter}')

      expect(screen.queryByRole('group', { name: 'Link' })).toBeNull()
      const marked = sent().content?.[1]?.content?.find((node) => node.text === 'vet')

      expect(marked?.marks).toEqual(
        expect.arrayContaining([{ type: 'bold' }, { attrs: { href: '/over-ons' }, type: 'link' }]),
      )
    })

    it.each([
      ['http://voorbeeld.test', 'Dit adres kan niet'],
      ['www.voorbeeld.test', 'Dit adres kan niet'],
      ['javascript:alert(1)', 'Dit adres kan niet'],
      ['//evil.example', 'Dit adres kan niet'],
      ['/\\evil.example', 'Dit adres kan niet'],
      ['https://', 'Dit adres kan niet'],
      ['', 'Vul het adres van de link in'],
    ])('refuses the address %j with an error at the field', async (address, message) => {
      const { editable } = renderEditor()

      await userEvent.click(await editable())
      await userEvent.keyboard('woorden')
      await userEvent.click(screen.getByRole('button', { name: 'Link' }))
      await userEvent.type(screen.getByRole('textbox', { name: 'Adres' }), address || ' ')
      await userEvent.type(screen.getByRole('textbox', { name: 'Tekst van de link' }), 'tekst')
      await userEvent.click(screen.getByRole('button', { name: 'Link opslaan' }))

      const field = screen.getByRole('textbox', { name: 'Adres' })

      expect(document.activeElement).toBe(field)
      expect(field.getAttribute('aria-invalid')).toBe('true')
      expect(
        document.getElementById(field.getAttribute('aria-describedby')?.split(' ').at(-1) ?? '')?.textContent,
      ).toContain(message)
      expect(JSON.stringify(sent())).not.toContain('"link"')
    })

    it('needs the text of the link', async () => {
      const { editable } = renderEditor()

      await userEvent.click(await editable())
      await userEvent.click(screen.getByRole('button', { name: 'Link' }))
      await userEvent.type(screen.getByRole('textbox', { name: 'Adres' }), '/bronnen')
      await userEvent.click(screen.getByRole('button', { name: 'Link opslaan' }))

      expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Tekst van de link' }))
      expect(screen.getByRole('textbox', { name: 'Tekst van de link' }).getAttribute('aria-invalid')).toBe('true')
    })

    it('changes and removes a link that is there', async () => {
      const { textbox } = await openLinkForm()

      await placeCursor(textbox, 'een link')
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Link' }).getAttribute('aria-pressed')).toBe('true')
      })
      await userEvent.click(screen.getByRole('button', { name: 'Link' }))

      expect((screen.getByRole('textbox', { name: 'Adres' }) as HTMLInputElement).value).toBe('/bronnen')
      expect((screen.getByRole('textbox', { name: 'Tekst van de link' }) as HTMLInputElement).value).toBe('een link')

      await userEvent.click(screen.getByRole('button', { name: 'Link verwijderen' }))

      expect(JSON.stringify(sent())).not.toContain('"link"')
      expect(JSON.stringify(sent())).toContain('een link')
    })

    it('closes with Escape or Annuleren and gives the focus back to the button, without changing the text', async () => {
      const { editable } = renderEditor()

      await userEvent.click(await editable())
      await userEvent.click(screen.getByRole('button', { name: 'Link' }))
      await userEvent.keyboard('{Escape}')

      expect(screen.queryByRole('group', { name: 'Link' })).toBeNull()
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Link' }))

      await userEvent.click(screen.getByRole('button', { name: 'Link' }))
      await userEvent.click(screen.getByRole('button', { name: 'Annuleren' }))

      expect(screen.queryByRole('group', { name: 'Link' })).toBeNull()
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Link' }))
      expect(sent()).toEqual({ content: [{ type: 'paragraph' }], type: 'doc' })
    })

    it('does not send the form it sits in when Enter is pressed in a field', async () => {
      const onSubmit = vi.fn((event: React.FormEvent) => {
        event.preventDefault()
      })

      render(
        <form onSubmit={onSubmit}>
          <RichTextEditor id="tekst" label="Tekst" name="body" />
        </form>,
      )
      await userEvent.click(await screen.findByRole('textbox', { name: 'Tekst' }))
      await userEvent.click(screen.getByRole('button', { name: 'Link' }))
      await userEvent.type(screen.getByRole('textbox', { name: 'Adres' }), 'http://nee{Enter}')

      expect(onSubmit).not.toHaveBeenCalled()
      expect(new FormData(document.querySelector('form') as HTMLFormElement).has('body')).toBe(true)
      expect([...new FormData(document.querySelector('form') as HTMLFormElement).keys()]).toEqual(['body'])
    })
  })
})

describe('isLinkAddress', () => {
  it.each(['https://www.lc.nl/sport', 'https://voorbeeld.test', '/', '/bronnen', '/bronnen?a=1#b'])(
    'accepts %j',
    (address) => {
      expect(isLinkAddress(address)).toBe(true)
    },
  )

  it.each([
    '',
    ' ',
    'http://voorbeeld.test',
    'HTTPS://voorbeeld.test',
    'https://',
    'https:///x',
    'https://a b',
    'www.lc.nl',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    'data:text/html,x',
    'mailto:a@b.nl',
    'bronnen',
    ' /bronnen',
  ])('refuses %j', (address) => {
    expect(isLinkAddress(address)).toBe(false)
  })

  it('has an error that says why an address cannot be used', () => {
    expect(linkAddressError('/bronnen')).toBeUndefined()
    expect(linkAddressError('http://x.nl')).toContain('https://')
    expect(linkAddressError('')).toContain('Vul het adres')
  })
})
