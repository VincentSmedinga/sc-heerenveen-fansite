import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Breadcrumb } from './Breadcrumb'

const meta = preview.meta({
  argTypes: {
    current: { control: 'text', description: 'De huidige pagina, als tekst zonder link.' },
    items: {
      description: 'De pagina’s boven de huidige, de hoogste eerst. Elk heeft een `href` en een `label`.',
      table: { type: { summary: 'readonly { href: string; label: string }[]' } },
    },
    label: { control: 'text', description: 'De naam van het kruimelpad voor schermlezers.' },
  },
  component: Breadcrumb,
  parameters: {
    docs: {
      description: {
        component: [
          'Een kruimelpad laat zien waar de bezoeker is, en brengt hem met één link terug naar een pagina erboven.',
          'Het is een navigatie met een geordende lijst. De huidige pagina is het laatste item: tekst zonder link, met `aria-current="page"`.',
          'De tekens ertussen zijn geen tekst, dus een schermlezer leest alleen de pagina’s voor.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Navigatie/Breadcrumb',
})

const items = [
  { href: '/beheer', label: 'Beheer' },
  { href: '/beheer/wedstrijden', label: 'Wedstrijden' },
]

export const Default = meta.story({
  args: { current: 'Testclub - Testvoort', items, label: 'Kruimelpad' },
  name: 'Kruimelpad',
})

const long = [
  { href: '/beheer', label: 'Beheer van de redactie van de Testkrant' },
  { href: '/beheer/wedstrijden', label: 'Wedstrijden van het seizoen tweeduizendzesentwintig' },
]

// Only on the canvas, with Storybook's viewport setting: on the docs page it would show the
// same as the story above.
export const Narrow = meta.story({
  args: { current: 'Testclub - Testvoort in de beker, tweede ronde', items: long, label: 'Kruimelpad' },
  globals: { viewport: { value: 'mobile1' } },
  name: 'Lange namen bij 320 pixels',
  tags: ['!autodocs'],
})
