import preview from '#.storybook/preview'

import { ArchiveCredit } from './ArchiveCredit'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De bronvermelding voor wedstrijden uit de sc Heerenveen Fansite (1990 tot 2007), in de vorm van principe 4 van de Redactie: altijd de bron vermelden.',
          'De gegevens zijn van ons, dus er is geen licentie en geen pagina om te noemen.',
          'De bronvermelding is één regel die altijd te zien is, zonder uitklap.',
          '',
          'Heeft een pagina wedstrijden van Wikipedia én van de sc Heerenveen Fansite, dan gebruikt ze `WikipediaCredit` met `archive`, die beide noemt.',
          '',
          '- `lead` staat voor de naam in plaats van `Bron:`, zoals `Gegevens van` in de strook onder het plaatje van een kaart.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/ArchiveCredit',
})

export const Default = meta.story({
  name: 'Bron: sc Heerenveen Fansite',
  render: () => (
    <div style={{ maxInlineSize: '20rem' }}>
      <ArchiveCredit />
    </div>
  ),
})

export const Lead = meta.story({
  name: 'Met een andere aanhef',
  render: () => (
    <div style={{ maxInlineSize: '20rem' }}>
      <ArchiveCredit lead="Gegevens van" />
    </div>
  ),
})
