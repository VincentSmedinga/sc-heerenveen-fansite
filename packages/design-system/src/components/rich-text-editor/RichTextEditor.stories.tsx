import { expect, userEvent, waitFor } from 'storybook/test'

import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Button } from '../button/Button'
import { Form } from '../form/Form'
import { RichTextEditor, type RichTextValue } from './RichTextEditor'

const meta = preview.meta({
  argTypes: {
    defaultValue: {
      control: 'object',
      description: 'De tekst waarmee de editor begint, als Tiptaps JSON. Zonder waarde begint hij leeg.',
    },
    error: { control: 'text', description: 'Wat er mis is met de tekst, en hoe het goed komt.' },
    hint: { control: 'text', description: 'Extra uitleg onder het label, in gewone tekst.' },
    label: { control: 'text', description: 'Het zichtbare label.' },
    name: { control: 'text', description: 'De naam van het verborgen veld dat de JSON met het formulier meestuurt.' },
    required: { control: 'boolean', description: 'Of de tekst ingevuld moet zijn. Standaard wel.' },
  },
  component: RichTextEditor,
  parameters: {
    docs: {
      description: {
        component: [
          'Een veld om de tekst van een artikel te schrijven, zonder dat je opmaaktekens hoeft te kennen.',
          'Je kiest het voor lopende tekst met een kop, een lijst, vet, cursief en een link, en voor niets anders: een foto, een tabel of andere opmaak die iemand plakt, wordt gewone tekst.',
          '',
          'De tekst is Tiptaps JSON, en een verborgen veld stuurt hem met het formulier mee.',
          'Een link maak je met een klein formulier bij de knop, en die accepteert alleen een adres dat met `https://` of met een schuine streep begint.',
          'De knoppen zijn te bedienen met het toetsenbord: de pijltjes lopen langs de balk, en Tab verlaat de balk en de editor.',
          '',
          'Het component heeft JavaScript nodig, en Tiptap zit niet in het hoofdbestand van het package.',
          'Importeer het uit `@fansite/design-system/rich-text-editor`, alleen op een pagina met een editor.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/RichTextEditor',
})

const text = (value: string) => ({ text: value, type: 'text' }) as const

/** Een verzonnen artikel met elk onderdeel dat de editor kent. */
const article: RichTextValue = {
  content: [
    { attrs: { level: 2 }, content: [text('Wat je van ons mag verwachten')], type: 'heading' },
    {
      content: [
        text('Wij schrijven niet over wat anderen al schreven, maar we wijzen je de '),
        { marks: [{ type: 'bold' }], ...text('weg') },
        text('. Lees ook '),
        { marks: [{ attrs: { href: '/bronnen' }, type: 'link' }], ...text('Onze bronnen') },
        text(' of het '),
        { marks: [{ type: 'italic' }], ...text('hele verhaal') },
        text(' bij de bron.'),
      ],
      type: 'paragraph',
    },
    {
      content: [
        { content: [{ content: [text('Altijd de bron erbij')], type: 'paragraph' }], type: 'listItem' },
        { content: [{ content: [text('Een link naar het hele verhaal')], type: 'paragraph' }], type: 'listItem' },
      ],
      type: 'bulletList',
    },
  ],
  type: 'doc',
}

const hint = 'Schrijf voor supporters. Een kop is niveau 2, de titel van het artikel staat er al boven.'

export const Default = meta.story({
  args: { defaultValue: article, hint, id: 'tekst', label: 'Tekst', name: 'tekst' },
  name: 'Tekstveld met opmaak',
})

export const Empty = meta.story({
  args: { hint, id: 'tekst', label: 'Tekst', name: 'tekst' },
  name: 'Leeg',
})

export const WithError = meta.story({
  args: {
    defaultValue: { content: [{ type: 'paragraph' }], type: 'doc' },
    error: 'Schrijf een tekst voor het artikel.',
    hint,
    id: 'tekst',
    label: 'Tekst',
    name: 'tekst',
  },
  name: 'Met een foutmelding',
})

export const MakingALink = meta.story({
  args: { defaultValue: article, id: 'tekst', label: 'Tekst', name: 'tekst' },
  name: 'Een link maken',
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Link' }))
    await expect(canvas.getByRole('textbox', { name: 'Adres' })).toHaveFocus()
  },
})

export const RefusedLink = meta.story({
  args: { defaultValue: article, id: 'tekst', label: 'Tekst', name: 'tekst' },
  name: 'Een link met een adres dat niet kan',
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Link' }))
    await userEvent.type(canvas.getByRole('textbox', { name: 'Adres' }), 'http://voorbeeld.test')
    await userEvent.type(canvas.getByRole('textbox', { name: 'Tekst van de link' }), 'een voorbeeld')
    await expect(canvas.getByRole('textbox', { name: 'Adres' })).toHaveValue('http://voorbeeld.test')
    await expect(canvas.getByRole('textbox', { name: 'Tekst van de link' })).toHaveValue('een voorbeeld')
    await userEvent.click(canvas.getByRole('button', { name: 'Link opslaan' }))
    await expect(canvas.getByRole('textbox', { name: 'Adres' })).toHaveFocus()
    await expect(canvas.getByRole('textbox', { name: 'Adres' })).toHaveAttribute('aria-invalid', 'true')
  },
})

export const WithKeyboard = meta.story({
  name: 'Met het toetsenbord',
  play: async ({ canvas }) => {
    await canvas.findByRole('toolbar', { name: 'Opmaak' })

    // The toolbar is one stop for Tab, and the arrow keys move along its buttons.
    await userEvent.tab()
    await expect(canvas.getByRole('button', { name: 'Kop' })).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    await expect(canvas.getByRole('button', { name: 'Vet' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')

    // A button hands the focus to the editor, where the writing goes on. Tab leaves the editor
    // for the next button of the form, and Shift+Tab comes back.
    await waitFor(() => expect(canvas.getByRole('textbox', { name: 'Tekst' })).toHaveFocus())
    await expect(canvas.getByRole('button', { name: 'Vet' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.keyboard('Gewaagd')
    await userEvent.tab()
    await expect(canvas.getByRole('button', { name: 'Opslaan' })).toHaveFocus()
    await userEvent.tab({ shift: true })
    await expect(canvas.getByRole('textbox', { name: 'Tekst' })).toHaveFocus()
    await userEvent.tab({ shift: true })
    await expect(canvas.getByRole('button', { name: 'Vet' })).toHaveFocus()
  },
  render: () => (
    <Form>
      <RichTextEditor id="tekst" label="Tekst" name="tekst" />
      <Button type="submit">Opslaan</Button>
    </Form>
  ),
})
