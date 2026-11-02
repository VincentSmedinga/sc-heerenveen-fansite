import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card, cardSurfaces } from '../card/Card'
import { Tag, tagTones } from './Tag'

// The type of the props as the table of controls shows it: the compiler gives `unknown[number]`
// for the lists.
const union = (values: readonly string[]) => ({ type: { summary: values.map((value) => `'${value}'`).join(' | ') } })

const meta = preview.meta({
  argTypes: {
    children: { control: 'text', description: 'De tekst van het label. Hij zegt zelf wat er aan de hand is.' },
    tone: {
      control: 'radio',
      description: 'De toon van het label.',
      options: tagTones,
      table: union(tagTones),
    },
  },
  component: Tag,
  parameters: {
    docs: {
      description: {
        component: [
          'Een label met een paar woorden, zoals "Uitslag ontbreekt", voor wat aandacht vraagt in een lijst of een tabel.',
          'De tekst zegt altijd wat er aan de hand is; de kleur komt erbij en draagt niets alleen.',
          'Kies `attention` voor wat ontbreekt of nog moet, `highlight` voor wat is aangepast, en `neutral` voor een feit.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/Tag',
})

export const Default = meta.story({
  args: { children: 'Uitslag ontbreekt', tone: 'attention' },
  name: 'Label',
})

const surfaceLabels = {
  default: 'Vlak',
  soft: 'Zacht vlak',
  strong: 'Sterk vlak',
  transparent: 'Doorzichtig vlak',
  warm: 'Warm vlak',
} as const

export const Tones = meta.story({
  name: 'Drie tonen op elk vlak',
  render: () => (
    <div style={{ display: 'grid', gap: '1rem', maxInlineSize: '40rem' }}>
      {cardSurfaces.map((surface) => (
        <Card aria-label={surfaceLabels[surface]} key={surface} surface={surface}>
          <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <Tag tone="attention">Uitslag ontbreekt</Tag>
            <Tag tone="highlight">Aangepast</Tag>
            <Tag>Gepland</Tag>
          </div>
        </Card>
      ))}
    </div>
  ),
})
