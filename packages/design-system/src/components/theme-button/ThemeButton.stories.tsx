import { useState } from 'react'
import { expect, userEvent } from 'storybook/test'

import preview from '#.storybook/preview'

import { Page } from '../page/Page'
import { ThemeButton } from './ThemeButton'

const meta = preview.meta({
  component: ThemeButton,
  parameters: {
    docs: {
      description: {
        component: [
          'De knop waarmee een bezoeker het thema wisselt tussen licht en donker, voor de header.',
          'Je kiest hem als er één schakelaar nodig is op een plek waar weinig ruimte is.',
          '',
          'De knop heeft geen tekst.',
          'In rust laat het pictogram het thema zien dat aan staat: een gevulde zon in het lichte thema en een gevulde maan in het donkere.',
          'Een schermlezer hoort de naam, zoals "Donker", en met `aria-pressed` of de knop is ingedrukt: in het donkere thema is hij dat.',
          'Het pictogram is dus nooit het enige teken van de stand.',
          '',
          'In rust is de knop ingehouden: alleen het pictogram, in een gedempt blauw, zonder rand en vulling.',
          'Onder de muis, ingedrukt en bij focus met het toetsenbord komt hij naar voren: het pictogram wordt lichter en er komen een rand en een vulling bij.',
          'Onder de muis geldt alleen op een apparaat met een muis, zodat er na een tik op een telefoon niets blijft oplichten.',
          'De overgang duurt kort en valt weg bij "minder beweging".',
          '',
          'Onder de muis en bij focus gaat het pictogram over in dat van het andere thema: de zon wordt de maan en de maan wordt de zon.',
          'Zo laat de knop zien welk thema je kiest, ook zonder tekst.',
          'Na een klik of een druk op Enter of spatie blijft het pictogram van het nieuwe thema staan, tot de aanwijzer of de focus de knop verlaat.',
          'De schijf van de zon groeit uit tot de maan, en een tweede schijf drukt de deuk erin; de stralen lossen naar buiten op.',
          'Van maan naar zon krimpt de schijf weer, en de stralen komen uit de schijf naar buiten.',
          'Wat een schermlezer hoort, verandert niet: dat is de naam en of de knop is ingedrukt.',
          '',
          'De knop is gemaakt voor het donkerblauw van de header en staat daar in de eerste rij, rechts naast het logo.',
          'Het component bewaart het thema niet: de pagina geeft `dark` en handelt de klik af.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Navigatie/ThemeButton',
})

const inHeader = (dark: boolean) => () => (
  <Page.Header>
    <span />
    <ThemeButton dark={dark} label="Donker" />
  </Page.Header>
)

export const Light = meta.story({
  globals: { theme: 'light' },
  name: 'Licht',
  render: inHeader(false),
})

export const Dark = meta.story({
  globals: { theme: 'dark' },
  name: 'Donker',
  render: inHeader(true),
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
  globals: { theme: 'light' },
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

const forward = (state: 'active' | 'focusVisible' | 'hover') => ({
  docs: {
    description: {
      story:
        state === 'active'
          ? 'De staat nagebootst met de add-on Pseudo States. Ingedrukt zonder muis, zoals op een telefoon, verandert het pictogram niet. Met de muis, met aanraken en met de Tab-toets zie je de echte.'
          : 'De staat nagebootst met de add-on Pseudo States. Het pictogram is dat van het andere thema. Met de muis, met aanraken en met de Tab-toets zie je de echte.',
    },
  },
  pseudo: { [state]: ['.hf-theme-button'] },
})

export const HoverLight = meta.story({
  globals: { theme: 'light' },
  name: 'Onder de muis, licht',
  parameters: forward('hover'),
  render: inHeader(false),
})

export const HoverDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Onder de muis, donker',
  parameters: forward('hover'),
  render: inHeader(true),
})

export const PressedLight = meta.story({
  globals: { theme: 'light' },
  name: 'Ingedrukt, licht',
  parameters: forward('active'),
  render: inHeader(false),
})

export const PressedDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Ingedrukt, donker',
  parameters: forward('active'),
  render: inHeader(true),
})

export const FocusLight = meta.story({
  globals: { theme: 'light' },
  name: 'Met focus, licht',
  parameters: forward('focusVisible'),
  play: async ({ canvas }) => {
    await userEvent.tab()
    await expect(canvas.getByRole('button', { name: 'Donker' })).toHaveFocus()
  },
  render: inHeader(false),
})

export const FocusDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Met focus, donker',
  parameters: forward('focusVisible'),
  play: async ({ canvas }) => {
    await userEvent.tab()
    await expect(canvas.getByRole('button', { name: 'Donker' })).toHaveFocus()
  },
  render: inHeader(true),
})

export const SettledAfterClick = meta.story({
  globals: { theme: 'light' },
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
