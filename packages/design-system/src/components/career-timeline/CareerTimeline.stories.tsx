import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { CareerTimeline } from './CareerTimeline'

const meta = preview.meta({
  argTypes: {
    level: {
      control: 'inline-radio',
      description: 'Het niveau van de kop van een periode. De seizoenen staan een niveau lager.',
      options: [2, 3],
    },
    periods: {
      description:
        'De periodes, de nieuwste eerst. Elke periode heeft de jaren (`years`), de seizoenen (`seasons`) en eventueel een regel voor het gat erna (`gap`). Een seizoen heeft het seizoen (`season`) en het adres (`href`), en eventueel een rugnummer (`number`), `current`, de competities (`competitions`), een moment (`moment`) en een opmerking (`remark`).',
      table: { type: { summary: 'CareerPeriod[]' } },
    },
  },
  component: CareerTimeline,
  parameters: {
    docs: {
      description: {
        component: [
          'De loopbaan laat zien hoe een speler bij de club was, periode na periode en seizoen na seizoen, met een regel voor elk gat ertussen.',
          'Periodes en seizoenen zijn lijsten met een kop, zodat een schermlezer de tijdlijn als lijst leest; de lijn en de punten zijn versiering.',
          'De pagina geeft de koppen, de links en de tekst van een gat mee.',
          'Een deel dat ontbreekt, laat geen lege regel achter.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/CareerTimeline',
})

const inCard = (children: React.ReactNode) => (
  <Card aria-labelledby="loopbaan-titel">
    <Heading id="loopbaan-titel" level={2}>
      Testspeler Een
    </Heading>
    {children}
  </Card>
)

export const Default = meta.story({
  args: {
    level: 3,
    periods: [
      {
        gap: '2010/11: niet in de selectie',
        seasons: [
          {
            competitions: 'Eredivisie en KNVB beker',
            current: true,
            href: '#2009-10',
            moment: {
              href: '#wedstrijd-1',
              note: '10 april 2010 · hattrick in zeven minuten',
              title: 'Testclub – Testteam',
            },
            number: '35',
            season: '2009/10',
          },
          { competitions: 'Eredivisie', href: '#2008-09', number: '35', season: '2008/09' },
          { href: '#2007-08', remark: 'Geen opstellingen van dit seizoen.', season: '2007/08' },
        ],
        years: '2007–2010',
      },
      {
        seasons: [
          { competitions: 'Eerste divisie', href: '#2003-04', number: '9', season: '2003/04' },
          { competitions: 'Eerste divisie', href: '#2002-03', season: '2002/03' },
        ],
        years: '2002–2004',
      },
    ],
  },
  name: 'Voorbeeld',
  render: (args) => inCard(<CareerTimeline {...args} />),
})

export const OnePeriod = meta.story({
  name: 'Eén periode',
  render: () =>
    inCard(
      <CareerTimeline
        level={3}
        periods={[
          {
            seasons: [
              { competitions: 'Eredivisie', current: true, href: '#2025-26', number: '12', season: '2025/26' },
              { competitions: 'Eredivisie en KNVB beker', href: '#2024-25', number: '12', season: '2024/25' },
            ],
            years: '2024–heden',
          },
        ]}
      />,
    ),
})

export const WithGaps = meta.story({
  name: 'Twee periodes en een gat',
  render: () =>
    inCard(
      <CareerTimeline
        level={3}
        periods={[
          {
            gap: '2004/05 tot en met 2006/07: niet in de selectie',
            seasons: [{ competitions: 'Eredivisie', href: '#2007-08', number: '7', season: '2007/08' }],
            years: '2007–2008',
          },
          {
            seasons: [
              {
                competitions: 'Eredivisie',
                href: '#2003-04',
                moment: {
                  href: '#wedstrijd-2',
                  note: '10 april 2004 · een wedstrijd met een heel lange naam van een testclub tegen een andere testclub',
                  title: 'Testclub Amateurs Zuidwest – Testteam Combinatie Noordoost',
                },
                season: '2003/04',
              },
            ],
            years: '2003–2004',
          },
        ]}
      />,
    ),
})

export const MomentWithoutPage = meta.story({
  name: 'Een moment zonder pagina van de wedstrijd',
  render: () =>
    inCard(
      <CareerTimeline
        level={3}
        periods={[
          {
            seasons: [
              {
                competitions: 'Eredivisie 2',
                href: '#2003-04',
                moment: { note: '10 april 2004 · hattrick: 25′, 30′ en 32′', title: 'Testclub – Testteam 3–1' },
                season: '2003/04',
              },
            ],
            years: '2003–2004',
          },
        ]}
      />,
    ),
})

export const OnlySeason = meta.story({
  name: 'Een seizoen met alleen het seizoen',
  render: () =>
    inCard(
      <CareerTimeline
        level={3}
        periods={[{ seasons: [{ href: '#1999-00', season: '1999/00' }], years: '1999–2000' }]}
      />,
    ),
})
