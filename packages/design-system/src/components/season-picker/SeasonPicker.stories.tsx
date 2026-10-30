import { expect, fn, userEvent } from 'storybook/test'

import preview from '#.storybook/preview'

import { SeasonPicker } from './SeasonPicker'

const options = [
  { label: '2026/27', value: '2026-27' },
  { label: '2025/26', value: '2025-26' },
  { label: '2024/25', value: '2024-25' },
  { label: '2023/24', value: '2023-24' },
]

const meta = preview.meta({
  component: SeasonPicker,
  parameters: {
    docs: {
      description: {
        component: [
          'Een keuzelijst met seizoenen waarmee een bezoeker een ander seizoen van een pagina opent.',
          'Je kiest hem voor een pagina met een adres per seizoen, zoals `/wedstrijden/2025-26`.',
          '',
          'Het is een gewoon formulier (GET) met een knop "Toon", dus het werkt zonder JavaScript: de knop stuurt de keuze naar een route die doorverwijst naar het adres van het seizoen.',
          'Met JavaScript verdwijnt de knop en wisselt de pagina zodra een seizoen is gekozen.',
          'Dat is een wisseling van context (WCAG 3.2.2), dus een regel zegt het vooraf, en de lijst verwijst ernaar met `aria-describedby`.',
          'Met JavaScript zijn het label en die regel niet te zien, maar een schermlezer leest ze voor; zonder JavaScript staat het label er, met de knop.',
          'Met het toetsenbord kies je met de pijltjes en bevestig je met Enter, zodat de pagina niet bij elke pijl verspringt.',
          'Een keuze met de muis, een vinger of de open lijst wisselt direct.',
          '',
          'De lijst heeft de opmaak van de site (`hf-select-styled` van `Select`), in een browser die dat kan: ruimte tussen het pijltje en de rand, en een lijst met seizoenen in onze kleuren.',
          'Een andere browser houdt zijn eigen lijst.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/SeasonPicker',
})

// The form would load a page in the frame of the story, so the story keeps the submit.
const Example = ({ onSubmit = fn() }: { onSubmit?: () => void }) => (
  <SeasonPicker
    action="/wedstrijden/kies"
    onSubmit={(event) => {
      event.preventDefault()
      onSubmit()
    }}
    options={options}
    value="2025-26"
  />
)

export const Default = meta.story({
  args: { action: '/wedstrijden/kies', options, value: '2025-26' },
  name: 'Seizoen kiezen',
  render: (args) => (
    <SeasonPicker
      {...args}
      onSubmit={(event) => {
        event.preventDefault()
      }}
    />
  ),
})

export const Dark = meta.story({
  globals: { theme: 'dark' },
  name: 'Donker',
  render: () => <Example />,
})

export const Open = meta.story({
  name: 'Geopend',
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('combobox', { name: 'Seizoen' }))
  },
  render: () => <Example />,
})

const sentWithMouse = fn()

export const WithTheMouse = meta.story({
  name: 'Met de muis wisselt direct',
  play: async ({ canvas }) => {
    sentWithMouse.mockClear()
    await userEvent.selectOptions(canvas.getByRole('combobox', { name: 'Seizoen' }), '2024-25')
    await expect(sentWithMouse).toHaveBeenCalledTimes(1)
  },
  render: () => <Example onSubmit={sentWithMouse} />,
})

const sentWithKeyboard = fn()

// A simulated key press does not change a list, so what a key does to the choice is in the unit
// tests. Here: the list is reached with Tab, says in words that the page changes at once, and
// Enter on the season of the page has nothing to confirm.
export const WithTheKeyboard = meta.story({
  name: 'Met het toetsenbord',
  play: async ({ canvas }) => {
    const list = canvas.getByRole('combobox', { name: 'Seizoen' })

    sentWithKeyboard.mockClear()
    await userEvent.tab()
    await expect(list).toHaveFocus()
    await expect(list).toHaveAccessibleDescription(/De pagina wisselt direct van seizoen/)
    await expect(canvas.getByText('Toon')).not.toBeVisible()
    await userEvent.keyboard('{Enter}')
    await expect(sentWithKeyboard).not.toHaveBeenCalled()
  },
  render: () => <Example onSubmit={sentWithKeyboard} />,
})

export const Narrow = meta.story({
  globals: { viewport: { value: 'mobile1' } },
  name: 'Smal (320 pixels)',
  render: () => (
    <div style={{ maxInlineSize: '20rem' }}>
      <Example />
    </div>
  ),
})
