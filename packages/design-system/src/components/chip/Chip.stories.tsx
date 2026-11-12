import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Chip, ChipList } from './Chip'

const meta = preview.meta({
  args: { children: 'Ajax', href: '#zonder-ajax' },
  argTypes: {
    children: { description: 'De naam van de keuze.' },
    href: { description: 'Het adres zonder deze keuze.' },
    removeLabel: { description: 'Wat een schermlezer na de naam hoort. Standaard "weghalen".' },
  },
  component: Chip,
  parameters: {
    docs: {
      description: {
        component: [
          'Een keuze die geldt, als link die de keuze weghaalt, zoals "Ajax" boven de resultaten van een zoekopdracht.',
          'Je kiest hem boven een lijst die door keuzes is gefilterd; de link gaat naar dezelfde pagina zonder die ene keuze.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Navigatie/Chip',
})

export const Default = meta.story({ name: 'Eén keuze' })

export const Several = meta.story({
  name: 'Meer keuzes naast elkaar',
  render: () => (
    <ChipList label="Gekozen filters">
      {['Ajax', 'Uit', 'Gewonnen', 'vrijdag'].map((name) => (
        <Chip href={`#zonder-${name}`} key={name}>
          {name}
        </Chip>
      ))}
    </ChipList>
  ),
})
