import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Button } from '../button/Button'
import { Card } from '../card/Card'
import { Form } from '../form/Form'
import { PickList, type PickListGroup, type PickListProps } from './PickList'

const meta = preview.meta({
  argTypes: {
    groups: {
      description:
        'De groepen, elk met een legenda, het aantal gekozen en toegestaan, een mogelijke fout en de spelers. Het component telt en controleert niets: de pagina geeft de getallen.',
    },
  },
  component: PickList,
  parameters: {
    docs: {
      description: {
        component: [
          'De PickList is voor een keuze van een paar uit een lijst, verdeeld in groepen, zoals de vier spelers in Fjouwer, per linie een groep. Elke groep heeft een teller, elke speler een regel met een korte tekst, en wie niet te kiezen is, heeft een reden die bij het vakje hoort.',
          'Kies hem waar een fan meer dan één ding aanvinkt en er een grens per groep is; voor een gewone reeks vakjes zonder grens is de CheckboxGroup genoeg. Hij werkt zonder JavaScript, want het zijn gewone selectievakjes in een formulier, en hij blokkeert niets: de server beslist. De strook toont de gekozen spelers op een rij.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/PickList',
})

const groups = (overrides: Partial<Record<string, Partial<PickListGroup>>> = {}): PickListGroup[] =>
  [
    {
      chosen: 1,
      id: 'keepers',
      legend: 'Keepers',
      maximum: 2,
      name: 'keeper',
      options: [
        { label: 'Testkeeper Aa', line: '31 punten · nog 3 keer', value: 'k1' },
        { label: 'Testkeeper Bb', line: '0 punten · nog 10 keer', value: 'k2' },
      ],
      value: ['k1'],
    },
    {
      chosen: 1,
      id: 'middenvelders',
      legend: 'Middenvelders',
      maximum: 2,
      name: 'middenvelder',
      options: [
        { label: 'Testmiddenvelder Cc', line: '62 punten · nog 1 keer', value: 'm1' },
        { label: 'Testmiddenvelder Dd', line: '35 punten · nog 5 keer', value: 'm2' },
        { label: 'Testmiddenvelder Ee', line: '22 punten · nog 8 keer', value: 'm3' },
      ],
      value: ['m1'],
    },
  ].map((group) => ({ ...group, ...overrides[group.id] }))

// The form would load a page in the frame of the story, so the story keeps the submit.
const inCard = (args: PickListProps) => (
  <Card as="div" surface="soft">
    <Form action="/kies" method="post" onSubmit={(event) => event.preventDefault()}>
      <PickList {...args} />
      <Button type="submit">Opslaan</Button>
    </Form>
  </Card>
)

export const Default = meta.story({
  args: { groups: groups() },
  name: 'Gewoon',
  render: inCard,
})

export const WithError = meta.story({
  args: {
    groups: groups({
      middenvelders: {
        chosen: 3,
        error: 'Kies hoogstens 2 middenvelders.',
        value: ['m1', 'm2', 'm3'],
      },
    }),
  },
  name: 'Met fout',
  render: inCard,
})

export const Disabled = meta.story({
  args: {
    groups: groups({
      middenvelders: {
        options: [
          { label: 'Testmiddenvelder Cc', line: '62 punten · nog 1 keer', value: 'm1' },
          { disabled: true, label: 'Testmiddenvelder Dd', reason: 'Al 10 keer gekozen', value: 'm2' },
        ],
      },
    }),
  },
  name: 'Uitgeschakelde speler',
  render: inCard,
})

export const Strip = meta.story({
  args: { groups: [] },
  name: 'Strook met een lege en een doorgestreepte tegel',
  render: () => (
    <Card as="div">
      <PickList.Strip
        aria-label="Jouw vier"
        places={[{ name: 'Aa' }, { name: 'Cc', note: 'telt niet mee' }, { name: 'Dd' }, {}]}
      />
    </Card>
  ),
})
