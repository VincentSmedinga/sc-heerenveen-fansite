import { expect } from 'storybook/test'

import preview from '#.storybook/preview'

import { Button } from '../components/button/Button'
import { Card } from '../components/card/Card'
import { DataTable } from '../components/data-table/DataTable'
import { Field } from '../components/field/Field'
import { Heading } from '../components/heading/Heading'
import { Input } from '../components/input/Input'
import { Select } from '../components/select/Select'
import { sizes } from '../components/size'
import { Text } from '../components/text/Text'

const meta = preview.meta({
  title: 'Tokens/Dichtheid',
})

// The same card twice. The ids differ, so the labels of the two fields stay tied to their own
// field, and the card is a `div`: the two sections around the cards are the landmarks, and two
// cards with the same heading would be two landmarks with the same name.
const Sample = ({ id }: { id: string }) => (
  <Card as="div">
    <Heading appearance={3} level={2}>
      Artikel nakijken
    </Heading>
    <Text>De redactie leest elk artikel na voordat het verschijnt.</Text>
    <Field id={`${id}-titel`} label="Titel">
      <Input defaultValue="Testclub wint van Testkrant" name={`${id}-titel`} />
    </Field>
    <Field id={`${id}-status`} label="Status">
      <Select defaultValue="concept" name={`${id}-status`}>
        <Select.Option value="concept">Concept</Select.Option>
        <Select.Option value="gepubliceerd">Gepubliceerd</Select.Option>
      </Select>
    </Field>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
      <Button type="button">Opslaan</Button>
      <Button appearance="soft" size="small" type="button">
        Voorbeeld
      </Button>
    </div>
    <DataTable
      caption="Artikelen van deze week"
      columns={['Dag', 'Woorden', 'Reacties']}
      rows={[
        { cells: [420, 3], header: 'Maandag' },
        { cells: [610, 8], header: 'Dinsdag' },
      ]}
    />
  </Card>
)

export const SideBySide = meta.story({
  name: 'Gewoon en compact naast elkaar',
  render: () => (
    <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))' }}>
      <section aria-label="Gewoon">
        <Sample id="gewoon" />
      </section>
      <section aria-label="Compact" className="hf-density-compact">
        <Sample id="compact" />
      </section>
    </div>
  ),
})

// The height is measured in the browser, because jsdom has no layout. A field and a list are
// exactly as high as each other, in the standard and the small size, and also when compact.
export const EqualHeights = meta.story({
  name: 'Veld en lijst even hoog',
  play: async ({ canvasElement }) => {
    for (const group of canvasElement.querySelectorAll('[data-group]')) {
      const [field, list] = [...group.querySelectorAll('input, select')].map(
        (control) => control.getBoundingClientRect().height,
      )

      await expect(field, group.getAttribute('data-group') ?? '').toBe(list)
    }
  },
  render: () => (
    <div style={{ display: 'grid', gap: '1rem', maxInlineSize: '30rem' }}>
      {[false, true].flatMap((compact) =>
        sizes.map((size) => (
          <div
            className={compact ? 'hf-density-compact' : undefined}
            data-group={`${compact ? 'compact' : 'gewoon'}, ${size}`}
            key={`${String(compact)}-${size}`}
            style={{ display: 'flex', gap: '1rem' }}
          >
            <Input aria-label="Veld" name="veld" size={size} />
            <Select aria-label="Lijst" name="lijst" size={size}>
              <Select.Option value="a">Keuze</Select.Option>
            </Select>
          </div>
        )),
      )}
    </div>
  ),
})
