import preview from '#.storybook/preview'

import { Button } from './button/Button'
import { Field } from './field/Field'
import { Input } from './input/Input'
import { Pagination } from './pagination/Pagination'
import { SegmentedLinks } from './segmented-control/SegmentedLinks'
import { Select } from './select/Select'
import { sizes } from './size'

const meta = preview.meta({
  title: 'Componenten/Formulier/Maten van knoppen en velden',
})

const labels = { default: 'Standaard', small: 'Klein' } as const

const Row = ({ size }: { size: (typeof sizes)[number] }) => (
  <section aria-label={labels[size]} style={{ display: 'grid', gap: '1rem', justifyItems: 'start' }}>
    <h3 className="hf-heading-4">{labels[size]}</h3>
    <div style={{ alignItems: 'end', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '1rem', marginBlockEnd: '1rem' }}>
        <Button size={size} type="button">
          Versturen
        </Button>
        <Button appearance="soft" icon="plus" size={size} type="button">
          Laad 5 meer
        </Button>
      </div>
      <Field id={`seizoen-${size}`} label="Seizoen">
        <Select defaultValue="2026" name={`seizoen-${size}`} size={size}>
          <Select.Option value="2026">2026/2027</Select.Option>
          <Select.Option value="2025">2025/2026</Select.Option>
        </Select>
      </Field>
      <Field id={`naam-${size}`} label="Zoeken">
        <Input name={`naam-${size}`} size={size} type="search" />
      </Field>
    </div>
    <SegmentedLinks
      label={`Welke wedstrijden, ${labels[size].toLowerCase()}`}
      options={[
        { href: '#alle-wedstrijden', label: 'Alle wedstrijden', value: 'all' },
        { href: '#eredivisie', label: 'Eredivisie', value: 'league' },
      ]}
      size={size}
      value="all"
    />
    <Pagination
      current={5}
      label={`Pagina's, ${labels[size].toLowerCase()}`}
      nextHref="#6"
      previousHref="#4"
      size={size}
      total={9}
    />
  </section>
)

const render = () => (
  <div style={{ display: 'grid', gap: '2rem', maxInlineSize: '48rem' }}>
    {sizes.map((size) => (
      <Row key={size} size={size} />
    ))}
  </div>
)

export const SideBySide = meta.story({ name: 'Standaard en klein onder elkaar', render })

export const SideBySideDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Standaard en klein onder elkaar, donker',
  render,
})
