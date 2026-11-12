import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { CheckboxGroup } from '../checkbox-group/CheckboxGroup'
import { Field } from '../field/Field'
import { Select } from '../select/Select'
import { FilterCard } from './FilterCard'

const meta = preview.meta({
  args: { summary: 'Filters' },
  argTypes: {
    children: { control: false, description: 'De filters.' },
    collapsed: {
      control: 'boolean',
      description: 'Of de kaart op een smal scherm dicht staat. Op een breed scherm staat hij altijd open.',
    },
    summary: { control: 'text', description: 'De regel die de kaart opent en sluit, zoals "Filters · 2 gekozen".' },
  },
  component: FilterCard,
  parameters: {
    docs: {
      description: {
        component: [
          'De kaart met de filters van een zoekopdracht, naast de resultaten.',
          'Op een telefoon is het een uitklapper boven de resultaten; op een breed scherm staan de filters altijd in beeld.',
          'Zet er een formulier in, zodat het werkt zonder JavaScript.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/FilterCard',
})

const filters = (
  <form action="#" method="get" onSubmit={(event) => event.preventDefault()}>
    <Field id="tegenstander" label="Tegenstander">
      <Select name="tegen">
        <Select.Option value="">Elke club</Select.Option>
        <Select.Option value="testclub">Testclub (12)</Select.Option>
      </Select>
    </Field>
    <CheckboxGroup
      legend="Thuis of uit"
      name="waar"
      options={[
        { count: 689, label: 'Thuis', value: 'thuis' },
        { count: 696, label: 'Uit', value: 'uit' },
      ]}
    />
  </form>
)

export const Default = meta.story({
  args: { children: filters },
  name: 'Open',
})

export const Collapsed = meta.story({
  args: { children: filters, collapsed: true, summary: 'Filters · 2 gekozen' },
  name: 'Dicht op een smal scherm',
})
