import { type ComponentProps, useState } from 'react'
import { expect, userEvent } from 'storybook/test'

import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Page } from '../page/Page'
import { sizes } from '../size'
import { ThemeButton } from './ThemeButton'

const meta = preview.meta({
  args: { dark: false, label: 'Donker' },
  argTypes: {
    dark: { control: 'boolean', description: 'Of het donkere thema aan staat. De pagina houdt dit bij.' },
    label: { control: 'text', description: 'De naam van het donkere thema voor een schermlezer.' },
    size: { control: 'radio', description: 'De maat van de knop.', options: sizes },
  },
  component: ThemeButton,
  parameters: {
    docs: {
      description: {
        component: [
          'De knop waarmee een bezoeker het thema wisselt tussen licht en donker, voor de header. Je kiest hem als er één schakelaar nodig is op een plek waar weinig ruimte is.',
          'De knop heeft geen tekst: het pictogram laat het thema zien dat aan staat, en onder de muis en bij focus het andere. Een schermlezer hoort de naam en of de knop is ingedrukt, dus het pictogram is nooit het enige teken. Het component bewaart het thema niet: de pagina geeft `dark` en handelt de klik af.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Navigatie/ThemeButton',
})

// The button is made for the dark blue of the header, so the stories show it there.
const inHeader = (args: ComponentProps<typeof ThemeButton>) => (
  <Page.Header>
    <span />
    <ThemeButton {...args} />
  </Page.Header>
)

// The button changes with the theme itself, so it keeps a story for each theme.
export const Light = meta.story({
  globals: { theme: 'light' },
  name: 'Licht',
  render: inHeader,
})

export const Dark = meta.story({
  args: { dark: true },
  globals: { theme: 'dark' },
  name: 'Donker',
  render: inHeader,
})

export const Small = meta.story({
  args: { size: 'small' },
  name: 'Kleine maat',
  render: inHeader,
})

const Example = ({ start }: { start: boolean }) => {
  const [dark, setDark] = useState(start)

  return (
    <Page.Header>
      <span />
      <ThemeButton
        dark={dark}
        label="Donker"
        onClick={() => {
          setDark(!dark)
        }}
      />
    </Page.Header>
  )
}

export const Pressing = meta.story({
  name: 'Indrukken en terug',
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Donker' })).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(canvas.getByRole('button', { name: 'Donker' }))
    await expect(canvas.getByRole('button', { name: 'Donker' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(canvas.getByRole('button', { name: 'Donker' }))
    await expect(canvas.getByRole('button', { name: 'Donker' })).toHaveAttribute('aria-pressed', 'false')
  },
  render: () => <Example start={false} />,
})

export const Hover = meta.story({
  name: 'Onder de muis',
  parameters: {
    docs: {
      description: {
        story:
          'De staat nagebootst met de add-on Pseudo States. Het pictogram is dat van het andere thema. Met de muis, met aanraken en met de Tab-toets zie je de echte.',
      },
    },
    pseudo: { hover: ['.hf-theme-button'] },
  },
  render: inHeader,
})

export const Focus = meta.story({
  name: 'Met focus',
  play: async ({ canvas }) => {
    await userEvent.tab()
    await expect(canvas.getByRole('button', { name: 'Donker' })).toHaveFocus()
  },
  render: inHeader,
})

export const SettledAfterClick = meta.story({
  name: 'Na een klik, onder de muis',
  parameters: {
    docs: {
      description: {
        story:
          'De muis staat nog op de knop na een klik. Het pictogram van het nieuwe thema blijft staan, tot de aanwijzer de knop verlaat. De muis is nagebootst met de add-on Pseudo States.',
      },
    },
    pseudo: { hover: ['.hf-theme-button'] },
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Donker' })

    await expect(button).not.toHaveAttribute('data-settled')
    await userEvent.click(button)
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(button).toHaveAttribute('data-settled')
  },
  render: () => <Example start={false} />,
})
