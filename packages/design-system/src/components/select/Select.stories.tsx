import preview from '#.storybook/preview'

import type { Size } from '../size'

import { Field } from '../field/Field'
import { Select } from './Select'

const meta = preview.meta({
  component: Select,
  parameters: {
    docs: {
      description: {
        component: [
          'Een lijst om één antwoord uit te kiezen. Zet het altijd in een `Field`, dat het zijn label geeft.',
          'Elke keuze is een `Select.Option`: het `option`-element, dat alleen in een `Select` werkt.',
          'De waarde van de gekozen keuze gaat mee met het formulier.',
          '',
          'Met `defaultValue` kies je het antwoord dat in het begin gekozen is.',
          'Wil je dat de bezoeker zelf kiest, zet dan als eerste een keuze zoals "Kies een onderwerp" met een lege `value`, en maak het veld verplicht.',
          '',
          'Het veld is hoog genoeg om met een vinger te raken, en zijn rand is goed te zien tegen de achtergrond.',
          'Met `size="small"` is het veld lager, voor een kiezer naast de inhoud; in het hoofdstuk Maten van knoppen en velden staat wanneer je welke maat kiest.',
          'Heeft het veld een fout (`aria-invalid`), dan is de rand dikker en heeft hij de kleur van fouten.',
          '',
          'Met `width="natural"` is de lijst zo breed als de keuze die hij laat zien, voor een korte lijst met korte woorden zoals een status.',
          '',
          'Met `className="hf-select-styled"` krijgt de lijst de opmaak van de site, gesloten en open: ruimte tussen het pijltje en de rand, en een lijst met keuzes in onze kleuren, waarin de gekozen keuze een vinkje heeft.',
          'Dat werkt in een browser die dat kan; een andere browser houdt zijn eigen lijst.',
          'De open lijst blijft binnen het scherm: hij opent onder het veld, boven het veld als hij daar niet past, en anders aan de kant met de meeste ruimte, waar een lange lijst in zichzelf scrolt.',
          'De cijfers in die lijst zijn proportioneel, want een keuzelijst heeft geen kolommen.',
          'De seizoenskiezer gebruikt het al.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/Select',
})

const render = (className?: string, size: Size = 'default') => (
  <Field id="onderwerp" label="Onderwerp">
    <Select className={className} defaultValue="verwijderen" name="onderwerp" size={size}>
      <Select.Option value="verwijderen">Een bericht laten verwijderen</Select.Option>
      <Select.Option value="fout">Een fout in een bericht</Select.Option>
      <Select.Option value="bron">Een bron voorstellen</Select.Option>
      <Select.Option value="anders">Iets anders</Select.Option>
    </Select>
  </Field>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render: () => render() })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render: () => render() })

export const Styled = meta.story({
  name: 'Met de opmaak van de site',
  render: () => render('hf-select-styled'),
})

export const SmallLight = meta.story({
  globals: { theme: 'light' },
  name: 'Kleine maat, licht',
  render: () => render(undefined, 'small'),
})

export const SmallDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Kleine maat, donker',
  render: () => render(undefined, 'small'),
})

export const SmallStyled = meta.story({
  name: 'Kleine maat met de opmaak van de site',
  render: () => render('hf-select-styled', 'small'),
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
