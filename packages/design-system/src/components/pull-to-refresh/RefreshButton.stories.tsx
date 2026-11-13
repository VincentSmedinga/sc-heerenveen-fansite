import { expect, userEvent } from 'storybook/test'

import preview from '#.storybook/preview'

import { RefreshButton } from './RefreshButton'

const meta = preview.meta({
  component: RefreshButton,
  parameters: {
    docs: {
      description: {
        component: [
          'De knop "Pagina verversen", voor wie de pagina niet omlaag kan trekken: met het toetsenbord, een schermlezer of een andere bediening dan een vinger. Hij doet hetzelfde als het gebaar: de pagina opnieuw laden.',
          'Je gebruikt deze knop niet zelf: `PullToRefresh` zet hem in beeld, alleen als de site draait als app op het beginscherm. Hij is onzichtbaar totdat hij focus heeft, dus druk op Tab om hem te zien.',
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

export const Focus = meta.story({
  name: 'Met focus',
  play: async ({ canvas }) => {
    await focus()
    await expect(canvas.getByRole('button', { name: 'Pagina verversen' })).toHaveFocus()
  },
  render: frame,
})
