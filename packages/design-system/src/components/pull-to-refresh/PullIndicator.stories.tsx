import preview from '#.storybook/preview'

import { PullIndicator } from './PullIndicator'

const meta = preview.meta({
  component: PullIndicator,
  parameters: {
    docs: {
      description: {
        component: [
          'Wat een bezoeker ziet als hij een pagina omlaag trekt om hem te verversen: een klein label bovenaan het scherm.',
          'Het komt met de vinger mee omlaag en zegt wat er gebeurt als hij loslaat.',
          '',
          '- `progress` loopt van 0 tot 1.',
          '  Bij 1 ververst het loslaten de pagina.',
          '- `refreshing` is waar zodra de vinger los is en de pagina opnieuw laadt.',
          '',
          'Het label is verborgen voor schermlezers (`aria-hidden`).',
          'Het is een hint voor een vinger op het scherm, en een schermlezer ziet dat gebaar niet.',
          'De pagina die daarna laadt, leest de schermlezer zelf voor.',
          'Met minder beweging komt het label niet omlaag: het blijft staan en verschijnt zodra loslaten ververst.',
          '',
          'Je gebruikt dit label niet zelf.',
          '`PullToRefresh` zet het in beeld, en staat in de layout van de site.',
          'Die luistert naar het gebaar, alleen als de site draait als app op het beginscherm, en laadt de pagina opnieuw.',
          'In een browsertabblad, met het toetsenbord en zonder JavaScript verandert er niets.',
          'In de app zet `PullToRefresh` ook de eigen verversing van de browser uit (Chrome op Android heeft die), zodat niet allebei afgaan.',
          'De pagina scrolt en veert zoals altijd.',
          '',
          'Het label staat vast bovenaan het scherm; hier staat het in een kader.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/PullIndicator',
})

// The label is fixed to the top of the screen. A transform on the frame makes it the box the label is fixed to.
const frame = (progress: number, refreshing = false) => (
  <div style={{ blockSize: '6rem', transform: 'translateZ(0)' }}>
    <PullIndicator progress={progress} refreshing={refreshing} />
  </div>
)

const pulling = () => frame(0.5)
const ready = () => frame(1)
const refreshing = () => frame(1, true)

export const PullingLight = meta.story({ globals: { theme: 'light' }, name: 'Trekken, licht', render: pulling })

export const PullingDark = meta.story({ globals: { theme: 'dark' }, name: 'Trekken, donker', render: pulling })

export const ReadyLight = meta.story({
  globals: { theme: 'light' },
  name: 'Klaar om los te laten, licht',
  render: ready,
})

export const ReadyDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Klaar om los te laten, donker',
  render: ready,
})

export const RefreshingLight = meta.story({ globals: { theme: 'light' }, name: 'Verversen, licht', render: refreshing })

export const RefreshingDark = meta.story({ globals: { theme: 'dark' }, name: 'Verversen, donker', render: refreshing })
