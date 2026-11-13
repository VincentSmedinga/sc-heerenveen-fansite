import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Field } from '../field/Field'
import { sizes } from '../size'
import { Select, selectWidths } from './Select'

const meta = preview.meta({
  argTypes: {
    size: { control: 'radio', description: 'De maat van de lijst.', options: sizes },
    width: {
      control: 'radio',
      description: 'De breedte: de regel, of zo breed als de keuze die de lijst laat zien.',
      options: selectWidths,
    },
  },
  component: Select,
  parameters: {
    docs: {
      description: {
        component: [
          'Een lijst om één antwoord uit te kiezen. Zet het altijd in een `Field`, dat het zijn label geeft.',
          'Kies hem als er te veel antwoorden zijn voor keuzerondjes. Elke keuze is een `Select.Option`; een lange lijst deel je in met `Select.Group`.',
          'Met `className="hf-select-styled"` krijgt de lijst de opmaak van de site, in een browser die dat kan.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/Select',
})

export const Default = meta.story({
  name: 'Keuzelijst',
  render: (args) => (
    <Field id="onderwerp" label="Onderwerp">
      <Select defaultValue="verwijderen" name="onderwerp" {...args}>
        <Select.Option value="verwijderen">Een bericht laten verwijderen</Select.Option>
        <Select.Option value="fout">Een fout in een bericht</Select.Option>
        <Select.Option value="bron">Een bron voorstellen</Select.Option>
        <Select.Option value="anders">Iets anders</Select.Option>
      </Select>
    </Field>
  ),
})

export const Styled = meta.story({
  args: { className: 'hf-select-styled' },
  name: 'Met de opmaak van de site',
  render: Default.input.render,
})

export const Groups = meta.story({
  name: 'Met groepen',
  render: () => (
    <Field id="land" label="Land">
      <Select defaultValue="" name="land">
        <Select.Option value="">Kies een land</Select.Option>
        <Select.Group label="Landen van onze spelers">
          <Select.Option value="DK">Denemarken (DK)</Select.Option>
          <Select.Option value="NL">Nederland (NL)</Select.Option>
          <Select.Option value="NO">Noorwegen (NO)</Select.Option>
        </Select.Group>
        <Select.Group label="Andere landen">
          <Select.Option value="AD">Andorra (AD)</Select.Option>
          <Select.Option value="BE">België (BE)</Select.Option>
          <Select.Option value="ZW">Zimbabwe (ZW)</Select.Option>
        </Select.Group>
      </Select>
    </Field>
  ),
})

export const Small = meta.story({
  args: { size: 'small' },
  name: 'Kleine maat',
  render: Default.input.render,
})

export const Natural = meta.story({
  name: 'Zo breed als de keuze',
  render: () => (
    <Field id="soort" label="Soort">
      <Select defaultValue="gewoon" name="soort" width="natural">
        <Select.Option value="gewoon">Gewoon</Select.Option>
        <Select.Option value="strafschop">Strafschop</Select.Option>
        <Select.Option value="eigen">Eigen doelpunt</Select.Option>
      </Select>
    </Field>
  ),
})

// Thirty seasons, from 2026/27 back, one with a long text to show that it wraps.
const seasons = Array.from({ length: 30 }, (_, index) => {
  const start = 2026 - index

  return { label: `${start}/${String(start + 1).slice(2)}`, value: `${start}-${String(start + 1).slice(2)}` }
})

export const LongList = meta.story({
  name: 'Lange lijst',
  render: () => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', maxInlineSize: '24rem' }}>
      <Field id="seizoen" label="Seizoen">
        <Select className="hf-select-styled" defaultValue="2024-25" name="seizoen" width="natural">
          {seasons.map(({ label, value }, index) => (
            <Select.Option key={value} value={value}>
              {index === 3
                ? `${label}, het seizoen met de allerlangste tekst die een keuze in een lijst kan hebben`
                : label}
            </Select.Option>
          ))}
        </Select>
      </Field>
    </div>
  ),
})

export const ShortListLow = meta.story({
  name: 'Kort menu onderin',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div
      style={{
        alignItems: 'flex-end',
        blockSize: '100dvb',
        boxSizing: 'border-box',
        display: 'flex',
        justifyContent: 'flex-end',
        minBlockSize: '30rem',
        padding: '1rem',
      }}
    >
      <Field id="seizoen-onderin" label="Seizoen">
        <Select className="hf-select-styled" defaultValue="2024-25" name="seizoen-onderin" width="natural">
          {seasons.slice(0, 5).map(({ label, value }) => (
            <Select.Option key={value} value={value}>
              {label}
            </Select.Option>
          ))}
        </Select>
      </Field>
    </div>
  ),
})
