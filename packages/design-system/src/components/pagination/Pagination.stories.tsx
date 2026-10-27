import preview from '#.storybook/preview'

import { exampleSource } from '../../docs/exampleSource'
import { Pagination } from './Pagination'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Paginering: een `nav` met een link naar de vorige pagina, de tekst "Pagina 2 van 9" en een link naar de volgende.',
          '',
          '- `label` is verplicht: de naam voor schermlezers, zoals "Pagina\'s".',
          "- `current` is het nummer van de pagina waar de bezoeker is, en `total` het aantal pagina's.",
          "- `previousHref` en `nextHref` zijn de adressen van de buurpagina's.",
          '  Laat `previousHref` weg op de eerste pagina en `nextHref` op de laatste: dan staat er geen link.',
          '  De tekst blijft in het midden.',
          '',
          '"Vorige" en "Volgende" zijn woorden en niet alleen pijlen.',
          'Elke link is een adres, dus de paginering werkt zonder JavaScript.',
          'De links zijn 44 pixels hoog.',
          'Op een smal scherm staat de tekst boven de links.',
        ].join('\n'),
      },
      source: exampleSource,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Navigatie/Pagination',
})

const first = () => <Pagination current={1} label="Pagina's" nextHref="/podcasts?pagina=2" total={9} />

const middle = () => (
  <Pagination current={5} label="Pagina's" nextHref="/podcasts?pagina=6" previousHref="/podcasts?pagina=4" total={9} />
)

const last = () => <Pagination current={9} label="Pagina's" previousHref="/podcasts?pagina=8" total={9} />

export const FirstLight = meta.story({ globals: { theme: 'light' }, name: 'Eerste pagina, licht', render: first })

export const FirstDark = meta.story({ globals: { theme: 'dark' }, name: 'Eerste pagina, donker', render: first })

export const MiddleLight = meta.story({ globals: { theme: 'light' }, name: 'Middelste pagina, licht', render: middle })

export const MiddleDark = meta.story({ globals: { theme: 'dark' }, name: 'Middelste pagina, donker', render: middle })

export const LastLight = meta.story({ globals: { theme: 'light' }, name: 'Laatste pagina, licht', render: last })

export const LastDark = meta.story({ globals: { theme: 'dark' }, name: 'Laatste pagina, donker', render: last })

// Only on the canvas, with Storybook's viewport setting: on the docs page they would show the
// same as the stories above.
const screens = { tags: ['!autodocs'] }

export const NarrowLight = meta.story({
  ...screens,
  globals: { theme: 'light', viewport: { value: 'mobile1' } },
  name: 'Bij 320 pixels, licht',
  render: middle,
})

export const NarrowDark = meta.story({
  ...screens,
  globals: { theme: 'dark', viewport: { value: 'mobile1' } },
  name: 'Bij 320 pixels, donker',
  render: middle,
})
