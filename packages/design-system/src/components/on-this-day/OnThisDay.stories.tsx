import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Link } from '../link/Link'
import { OnThisDay } from './OnThisDay'

const meta = preview.meta({
  args: {
    intro: 'Drie keer speelden we op 11 november, alle drie uit.',
    matches: [
      { clubs: 'Testdorp FC – sc Heerenveen', score: '1–3', year: '2023' },
      { clubs: 'Voorbeeld United – sc Heerenveen', score: '2–0', year: '2018' },
      { clubs: 'sc Heerenveen – Proef Boys', score: '2–1', year: '1990' },
    ],
    title: 'Op deze dag: 11 november',
  },
  argTypes: {
    children: { control: false, description: 'De link onder de wedstrijden, zoals "Alle wedstrijden in november".' },
    intro: { control: 'text', description: 'Eén regel onder de kop met het aantal en waar ze gespeeld zijn.' },
    matches: { description: 'De wedstrijden, de nieuwste eerst: het jaar, de clubs en de uitslag.' },
    title: { control: 'text', description: 'De kop, met de datum.' },
  },
  component: OnThisDay,
  parameters: {
    docs: {
      description: {
        component: [
          'De warme kaart met de wedstrijden die op de datum van vandaag in eerdere jaren zijn gespeeld: het jaar, de clubs en de uitslag, en een link naar meer.',
          'Kies hem om een bezoeker een reden te geven om terug te kijken; op een dag zonder wedstrijden laat je de kaart weg.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/OnThisDay',
})

export const Default = meta.story({
  name: 'Op deze dag',
  render: (args) => (
    <OnThisDay {...args}>
      <Link href="#november">Alle wedstrijden in november</Link>
    </OnThisDay>
  ),
})
