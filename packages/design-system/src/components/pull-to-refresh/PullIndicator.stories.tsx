import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { PullIndicator, type PullIndicatorProps } from './PullIndicator'

const meta = preview.meta({
  args: { progress: 1, refreshing: false },
  argTypes: {
    progress: {
      control: { max: 1, min: 0, step: 0.1, type: 'range' },
      description: 'Hoe ver de pagina is getrokken, van 0 tot 1. Bij 1 ververst het loslaten de pagina.',
    },
    refreshing: { control: 'boolean', description: 'Waar zodra de vinger los is en de pagina opnieuw laadt.' },
  },
  component: PullIndicator,
  parameters: {
    docs: {
      description: {
        component: [
          'Wat een bezoeker ziet als hij een pagina omlaag trekt om hem te verversen: een klein label bovenaan het scherm dat met de vinger meekomt en zegt wat er gebeurt als hij loslaat.',
          'Je gebruikt dit label niet zelf: `PullToRefresh` zet het in beeld, alleen als de site draait als app op het beginscherm. Hier staat het in een kader.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Navigatie/PullIndicator',
})

// The label is fixed to the top of the screen. A transform on the frame makes it the box the
// label is fixed to.
const frame = (args: PullIndicatorProps) => (
  <div style={{ blockSize: '6rem', transform: 'translateZ(0)' }}>
    <PullIndicator {...args} />
  </div>
)

// While the label is pulled down it fades in with the pull, so a snapshot at half way has
// text at about 2.4:1. That is a moment of the movement, not a colour of the label: at 1 the
// label has full contrast, as the story "Klaar om los te laten" shows. Only this rule is off.
const halfwayParameters = { a11y: { config: { rules: [{ enabled: false, id: 'color-contrast' }] } } }

export const Pulling = meta.story({
  args: { progress: 0.5 },
  name: 'Trekken',
  parameters: halfwayParameters,
  render: frame,
})

export const Ready = meta.story({ name: 'Klaar om los te laten', render: frame })

export const Refreshing = meta.story({ args: { refreshing: true }, name: 'Verversen', render: frame })
