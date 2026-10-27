import { expect, userEvent } from 'storybook/test'

import preview from '#.storybook/preview'

import { RefreshButton } from './RefreshButton'

const meta = preview.meta({
  component: RefreshButton,
  parameters: {
    docs: {
      description: {
        component: [
          'De knop "Pagina verversen", voor wie de pagina niet omlaag kan trekken: met het toetsenbord, een schermlezer of een andere bediening dan een vinger.',
          'Hij doet hetzelfde als het gebaar: de pagina opnieuw laden.',
          '',
          'De knop is onzichtbaar totdat hij focus heeft, zoals een link om naar de inhoud te springen, maar een schermlezer vindt hem wel.',
          'Met Tab komt hij als eerste, vóór de kop van de pagina.',
          'Met focus staat hij vast in de hoek bovenaan het scherm.',
          'Er heeft dan niets anders focus, dus hij bedekt geen element met focus.',
          '',
          '`PullToRefresh` zet hem in beeld, alleen als de site draait als app op het beginscherm.',
          'In een browsertabblad staat hij er niet: daar heeft de browser een eigen verversknop.',
          'Je gebruikt deze knop niet zelf.',
          '',
          'Zonder focus is er hier niets te zien.',
          'Klik in het kader of druk op Tab om de knop te zien.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Navigatie/RefreshButton',
})

// The button is fixed to the top corner of the screen. A transform on the frame makes it the
// box the button is fixed to.
const frame = () => (
  <div style={{ blockSize: '6rem', transform: 'translateZ(0)' }}>
    <RefreshButton onClick={() => undefined} />
  </div>
)

// Moves the focus to the button the way a visitor does, with Tab.
const focus = async () => {
  await userEvent.tab()
}

export const FocusLight = meta.story({
  globals: { theme: 'light' },
  name: 'Met focus, licht',
  play: async ({ canvas }) => {
    await focus()
    await expect(canvas.getByRole('button', { name: 'Pagina verversen' })).toHaveFocus()
  },
  render: frame,
})

export const FocusDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Met focus, donker',
  play: async ({ canvas }) => {
    await focus()
    await expect(canvas.getByRole('button', { name: 'Pagina verversen' })).toHaveFocus()
  },
  render: frame,
})
