import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { CheckboxGroup } from '../checkbox-group/CheckboxGroup'
import { Disclosure } from '../disclosure/Disclosure'
import { Field } from '../field/Field'
import { Select } from '../select/Select'
import { FilterList } from './FilterList'

const meta = preview.meta({
  argTypes: {
    children: { control: false, description: 'De rijen: een `Disclosure` voor elk filter.' },
  },
  component: FilterList,
  parameters: {
    docs: {
      description: {
        component: [
          'De filters van een zoekopdracht als één lijst van rijen die open- en dichtklappen.',
          'Een dichte rij zegt wat er gekozen is, zodat de bezoeker niet alles hoeft te openen.',
          'Zet de lijst in een formulier, zodat het werkt zonder JavaScript.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/FilterList',
})

const rows = (club: boolean) => (
  <form action="#" method="get" onSubmit={(event) => event.preventDefault()}>
    <FilterList>
      <Disclosure open summary="Tegenstander" value={club ? 'Testclub' : undefined}>
        <Field hideOptional id="tegenstander" label="Tegenstander" required={false}>
          <Select defaultValue={club ? 'testclub' : ''} name="tegen">
            <Select.Option value="">Elke club</Select.Option>
            <Select.Option value="testclub">Testclub (12)</Select.Option>
          </Select>
        </Field>
      </Disclosure>
      <Disclosure summary="Thuis of uit" value={club ? 'Uit' : undefined}>
        <CheckboxGroup
          legend="Thuis of uit"
          name="waar"
          options={[
            { count: 689, label: 'Thuis', value: 'thuis' },
            { count: 696, label: 'Uit', value: 'uit' },
          ]}
          value={club ? ['uit'] : []}
        />
      </Disclosure>
      <Disclosure summary="Uitslag" value={club ? '2 gekozen' : undefined}>
        <CheckboxGroup
          legend="Uitslag"
          name="uitslag"
          options={[
            { count: 552, label: 'Gewonnen', value: 'gewonnen' },
            { count: 358, label: 'Gelijk', value: 'gelijk' },
            { count: 475, label: 'Verloren', value: 'verloren' },
          ]}
          value={club ? ['gewonnen', 'gelijk'] : []}
        />
      </Disclosure>
    </FilterList>
  </form>
)

export const Default = meta.story({
  args: { children: rows(false) },
  name: 'Zonder keuze',
})

export const Chosen = meta.story({
  args: { children: rows(true) },
  name: 'Met keuzes',
})
