import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { ScoreGrid } from './ScoreGrid'

const meta = preview.meta({
  args: { awayName: 'FC Twente', homeName: 'sc Heerenveen', legend: 'Jouw voorspelling' },
  component: ScoreGrid,
  decorators: [
    (Story) => (
      <Card>
        <Story />
      </Card>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'Het raster waarin een supporter de ruststand en de eindstand van een wedstrijd intikt: een veld voor één cijfer per club, met de clubnamen als kolomkop en Ruststand en Eindstand als rij.',
          'Kies het voor een voorspelling, waar vier keuzelijsten trager zijn. Het werkt zonder JavaScript in een gewoon formulier, en een leeg veld blijft leeg, nooit 0. De pagina geeft de legenda, de namen en de foutmeldingen.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/ScoreGrid',
})

export const Default = meta.story({ name: 'Leeg' })

export const Filled = meta.story({
  args: { defaultValues: { fullTimeAway: '1', fullTimeHome: '2', halftimeAway: '0', halftimeHome: '1' } },
  name: 'Ingevuld',
})

export const WithError = meta.story({
  args: {
    defaultValues: { fullTimeHome: '2', halftimeAway: '0', halftimeHome: '1' },
    error: 'Er ontbreekt nog iets.',
    errors: { fullTimeAway: 'Vul de goals van FC Twente bij de eindstand in.' },
  },
  name: 'Met een fout',
})

export const ReadOnly = meta.story({
  args: {
    readOnly: true,
    values: { fullTimeAway: '1', fullTimeHome: '2', halftimeAway: '0', halftimeHome: '1' },
  },
  name: 'Alleen lezen',
})

export const LongName = meta.story({
  args: { awayName: 'Koninklijke Voetbalvereniging Willem II Tilburg', homeName: 'Sportclub Heracles Almelo' },
  name: 'Lange clubnaam',
})

export const Phone = meta.story({
  args: {
    awayName: 'Koninklijke Voetbalvereniging Willem II Tilburg',
    defaultValues: { fullTimeAway: '1', fullTimeHome: '2', halftimeAway: '0', halftimeHome: '1' },
  },
  globals: { viewport: { value: 'mobile1' } },
  name: 'Op een telefoon',
})
