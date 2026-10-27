'use client'

import type { Editor, JSONContent } from '@tiptap/core'

import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import {
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'

import { Button } from '../button/Button'
import { Field } from '../field/Field'
import { Input } from '../input/Input'
import { extensions } from './extensions'
import { linkAddressError } from './linkAddress'

export type RichTextEditorProps = Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'defaultValue' | 'id' | 'onChange'
> & {
  /**
   * The text the editor starts with, as Tiptap's JSON. Without it, the editor starts empty. The
   * editor keeps its own text after that: a new `defaultValue` does not replace it.
   */
  defaultValue?: RichTextValue
  /**
   * What is wrong with the text, and how to put it right. Without it, the field has no error.
   */
  error?: string | undefined
  /** Extra help under the label. Plain text only. */
  hint?: string
  /**
   * The `id` of the editor. The label, the hint and the error are tied to it, and an
   * ErrorSummary links to it.
   */
  id: string
  /** The visible label. */
  label: ReactNode
  /**
   * The name of the hidden field that carries the text, as JSON, along with the form.
   */
  name: string
  /** Called with the new text, as Tiptap's JSON, each time it changes. */
  onChange?: (value: RichTextValue) => void
  /**
   * Whether the text has to be filled in. A field is required unless you say otherwise. The
   * editor tells a screen reader, and the server checks it.
   */
  required?: boolean
}

/** The text of the editor: Tiptap's JSON. */
export type RichTextValue = JSONContent

const emptyValue: RichTextValue = { content: [{ type: 'paragraph' }], type: 'doc' }

/** What Field gives its field, and what the editor needs besides. */
type BodyProps = {
  'aria-describedby'?: string | undefined
  'aria-invalid'?: boolean | undefined
  defaultValue: RichTextValue | undefined
  id?: string
  name: string
  onChange: ((value: RichTextValue) => void) | undefined
  required?: boolean
}

/**
 * A field for the text of an article, with a toolbar for the formatting an article has: a
 * heading of level 2, a list with bullets, bold, italic and a link. Nothing else can be made or
 * pasted in: a photo, a table or other formatting becomes plain text. The keys Ctrl or Cmd+B
 * and +I work as well. The text is Tiptap's JSON, which a hidden field carries along with the
 * form.
 * The editor needs JavaScript, and Tiptap with it, so it is not in the main entry of the
 * package. Import it from `@fansite/design-system/rich-text-editor`, and only on a page that
 * has an editor.
 */
export const RichTextEditor = ({
  defaultValue,
  error,
  hint,
  id,
  label,
  name,
  onChange,
  required,
  ...props
}: RichTextEditorProps) => (
  <Field
    {...props}
    error={error}
    id={id}
    // A label only passes the focus on to what it labels. A div that can be edited is not
    // something a label can label, so the editor does it.
    onClick={(event) => {
      if (event.target instanceof Element && event.target.closest('label')?.id === `${id}-label`) {
        document.getElementById(id)?.focus()
      }
    }}
    {...(hint === undefined ? {} : { hint })}
    label={label}
    {...(required === undefined ? {} : { required })}
  >
    <RichTextEditorBody defaultValue={defaultValue} name={name} onChange={onChange} />
  </Field>
)

type ToolbarState = {
  bold: boolean
  heading: boolean
  italic: boolean
  link: boolean
  list: boolean
}

/** The part of the editor that Field puts the label, hint and error above. */
const RichTextEditorBody = ({
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  defaultValue,
  id = '',
  name,
  onChange,
  required,
}: BodyProps) => {
  const [json, setJson] = useState(() => JSON.stringify(defaultValue ?? emptyValue))
  const editor = useEditor({
    content: defaultValue ?? emptyValue,
    editorProps: {
      // The editable element follows what Field says about the field. useEditor hands these
      // options to the editor on every render.
      attributes: {
        'aria-labelledby': `${id}-label`,
        'aria-multiline': 'true',
        'aria-required': String(required === true),
        class: 'hf-rich-text-editor-content',
        id,
        role: 'textbox',
        ...(describedBy === undefined ? {} : { 'aria-describedby': describedBy }),
        ...(invalid === true ? { 'aria-invalid': 'true' } : {}),
      },
      // A file dropped on the editor would make the browser open it and leave the page.
      handleDrop: (_view, event) => {
        if (event.dataTransfer?.files.length) {
          event.preventDefault()

          return true
        }

        return false
      },
      // The words of two cells of a table would run together as one word.
      transformPastedHTML: (html) => html.replaceAll(/<\/t[dh]>/gi, ' $&'),
    },
    extensions,
    // Next.js renders the page on the server first, where there is no document to edit.
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => {
      const value = current.getJSON()

      setJson(JSON.stringify(value))
      onChange?.(value)
    },
  })

  return (
    <div className="hf-rich-text-editor">
      {editor ? <Toolbar editor={editor} /> : null}
      <EditorContent editor={editor} />
      <input name={name} type="hidden" value={json} />
    </div>
  )
}

/** What a button of the toolbar does, with the name it has for everyone. */
const tools = [
  {
    isOn: (state: ToolbarState) => state.heading,
    label: 'Kop',
    run: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    isOn: (state: ToolbarState) => state.list,
    label: 'Lijst',
    run: (editor: Editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    isOn: (state: ToolbarState) => state.bold,
    label: 'Vet',
    run: (editor: Editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    isOn: (state: ToolbarState) => state.italic,
    label: 'Cursief',
    run: (editor: Editor) => editor.chain().focus().toggleItalic().run(),
  },
] as const

type LinkTarget = { from: number; hadLink: boolean; to: number }

/**
 * The toolbar, with the small form for a link under it. It is one stop for the Tab key: the
 * arrow keys, Home and End move between its buttons, and Tab leaves it.
 */
const Toolbar = ({ editor }: { editor: Editor }) => {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }): ToolbarState => ({
      bold: current.isActive('bold'),
      heading: current.isActive('heading', { level: 2 }),
      italic: current.isActive('italic'),
      link: current.isActive('link'),
      list: current.isActive('bulletList'),
    }),
  })
  const barRef = useRef<HTMLDivElement>(null)
  const [stop, setStop] = useState(0)
  const [target, setTarget] = useState<LinkTarget | null>(null)
  const buttonCount = tools.length + 1

  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = [...(barRef.current?.querySelectorAll('button') ?? [])]
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const next = {
      ArrowLeft: (current + buttonCount - 1) % buttonCount,
      ArrowRight: (current + 1) % buttonCount,
      End: buttonCount - 1,
      Home: 0,
    }[event.key]

    if (current === -1 || next === undefined) {
      return
    }

    event.preventDefault()
    buttons[next]?.focus()
  }

  const openLink = () => {
    const hadLink = editor.isActive('link')

    // In a link, the whole link is what changes, also when only the cursor is in it.
    if (hadLink && editor.state.selection.empty) {
      editor.chain().extendMarkRange('link').run()
    }

    const { from, to } = editor.state.selection

    setTarget({ from, hadLink, to })
  }

  return (
    <>
      <div
        aria-label="Opmaak"
        className="hf-rich-text-editor-toolbar"
        onKeyDown={moveFocus}
        ref={barRef}
        role="toolbar"
      >
        {tools.map((tool, index) => (
          <Button
            aria-pressed={tool.isOn(state)}
            key={tool.label}
            onClick={() => {
              tool.run(editor)
            }}
            onFocus={() => {
              setStop(index)
            }}
            tabIndex={stop === index ? 0 : -1}
            type="button"
          >
            {tool.label}
          </Button>
        ))}
        <Button
          aria-pressed={state.link}
          data-tool="link"
          onClick={openLink}
          onFocus={() => {
            setStop(tools.length)
          }}
          tabIndex={stop === tools.length ? 0 : -1}
          type="button"
        >
          Link
        </Button>
      </div>
      {target ? (
        <LinkForm
          editor={editor}
          onClose={(restoreFocus) => {
            setTarget(null)

            if (restoreFocus) {
              barRef.current?.querySelector<HTMLButtonElement>('[data-tool="link"]')?.focus()
            }
          }}
          target={target}
        />
      ) : null}
    </>
  )
}

/**
 * The small form for a link: the address and the text. It is not a `form`, because the editor
 * sits in a form of its own, and a form inside a form is not allowed. Its fields have no name
 * and no form, so they are never sent, and the Enter key applies the link instead of sending
 * the form.
 */
const LinkForm = ({
  editor,
  onClose,
  target,
}: {
  editor: Editor
  onClose: (restoreFocus: boolean) => void
  target: LinkTarget
}) => {
  const base = useId()
  const addressId = `${base}-address`
  const textId = `${base}-text`
  const [initial] = useState(() => ({
    address: target.hadLink ? String((editor.getAttributes('link') as { href?: string }).href ?? '') : '',
    text: editor.state.doc.textBetween(target.from, target.to, ' '),
  }))
  const [addressValue, setAddressValue] = useState(initial.address)
  const [textValue, setTextValue] = useState(initial.text)
  const [addressError, setAddressError] = useState<string>()
  const [textError, setTextError] = useState<string>()

  useEffect(() => {
    document.getElementById(addressId)?.focus()
  }, [addressId])

  const apply = () => {
    const address = addressValue.trim()
    const text = textValue.trim()
    const problem = linkAddressError(address)
    const missingText = text === '' ? 'Vul de tekst van de link in. Dit is wat bezoekers lezen.' : undefined

    setAddressError(problem)
    setTextError(missingText)

    if (problem) {
      document.getElementById(addressId)?.focus()

      return
    }

    if (missingText) {
      document.getElementById(textId)?.focus()

      return
    }

    const chain = editor.chain().focus()

    if (text === initial.text) {
      // The words stay, so bold and italic in them stay as well.
      chain.setTextSelection({ from: target.from, to: target.to }).setLink({ href: address }).run()
    } else {
      chain
        .insertContentAt(
          { from: target.from, to: target.to },
          { marks: [{ attrs: { href: address }, type: 'link' }], text, type: 'text' },
        )
        .run()
    }

    onClose(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onClose(true)
    } else if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      event.preventDefault()
      apply()
    }
  }

  return (
    <div aria-label="Link" className="hf-rich-text-editor-link" onKeyDown={handleKeyDown} role="group">
      <Field
        error={addressError}
        hint="Begint met https:// of met een schuine streep, zoals /bronnen."
        id={addressId}
        label="Adres"
      >
        <Input
          autoComplete="off"
          form=""
          onChange={(event) => {
            setAddressValue(event.target.value)
          }}
          value={addressValue}
        />
      </Field>
      <Field error={textError} id={textId} label="Tekst van de link">
        <Input
          autoComplete="off"
          form=""
          onChange={(event) => {
            setTextValue(event.target.value)
          }}
          value={textValue}
        />
      </Field>
      <div className="hf-rich-text-editor-link-actions">
        <Button onClick={apply} type="button">
          Link opslaan
        </Button>
        {target.hadLink ? (
          <Button
            appearance="soft"
            onClick={() => {
              editor.chain().focus().setTextSelection({ from: target.from, to: target.to }).unsetLink().run()
              onClose(false)
            }}
            type="button"
          >
            Link verwijderen
          </Button>
        ) : null}
        <Button
          appearance="soft"
          onClick={() => {
            onClose(true)
          }}
          type="button"
        >
          Annuleren
        </Button>
      </div>
    </div>
  )
}
