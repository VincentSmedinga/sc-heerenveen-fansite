import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Winner } from './Winner'

const meta = preview.meta({
  args: {
    average: '7,8',
    label: 'Uitblinker vorige wedstrijd',
    line: 'Thuis tegen Testclub, 3–1',
    name: 'Testspeler A',
  },
  argTypes: {
    average: {
      description:
        'Het gemiddelde cijfer, met een komma, zoals `7,8`. Een schermlezer leest er "gemiddeld cijfer" bij.',
    },
    highlight: { description: 'Het zegel dat opvalt: groter en met rode punten.' },
    label: {
      description: 'Het rode label boven de naam, zoals "Uitblinker vorige wedstrijd". Het staat in hoofdletters.',
    },
    line: { description: 'Eén kleine regel onder de naam. Mag leeg zijn.' },
    name: { description: 'De naam, groot.' },
  },
  component: Winner,
  decorators: [
    (Story) => (
      <Card as="div">
        <Story />
      </Card>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'Het zegel voor de uitblinker: de speler met het hoogste gemiddelde van de fans. Het gemiddelde staat in het midden van het zegel, in twee kleuren, en ernaast het label, de naam en één kleine regel.',
          'Kies hem alleen voor de uitblinker, omdat hij mag opvallen. Moet er één boven de anderen uitsteken, zoals de beste van alle seizoenen, dan krijgt die het zegel dat opvalt; het label zegt het ook. Het zegel is versiering en het gemiddelde is gewone tekst; is er weinig ruimte, dan staat de tekst onder het zegel.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/Winner',
})

export const Default = meta.story({
  name: 'Met regel',
  render: (args) => <Winner {...args} />,
})

export const WithoutLine = meta.story({
  args: { label: 'Uitblinker van de wedstrijd', line: undefined },
  name: 'Zonder regel',
  render: (args) => <Winner {...args} />,
})

export const Highlight = meta.story({
  args: { highlight: true, label: 'Uitblinker van de uitblinkers', line: 'Gemiddelde van alle cijfers' },
  decorators: [
    (Story) => (
      <Card as="div" surface="soft">
        <Story />
      </Card>
    ),
  ],
  name: 'Het zegel dat opvalt, op een zachte kaart',
  render: (args) => <Winner {...args} />,
})
