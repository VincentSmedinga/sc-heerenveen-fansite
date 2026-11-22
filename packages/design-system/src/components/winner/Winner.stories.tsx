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
          'De zegel voor de uitblinker van een wedstrijd: de speler met het hoogste gemiddelde van de supporters. Het gemiddelde staat in de zegel, en ernaast het label, de naam en één kleine regel.',
          'Kies hem alleen voor de uitblinker, omdat hij mag opvallen. De zegel is versiering en het gemiddelde is gewone tekst; is er weinig ruimte, dan staat de tekst onder de zegel.',
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
