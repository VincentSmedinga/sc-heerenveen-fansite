import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { sizes } from '../size'
import { Pagination } from './Pagination'

const meta = preview.meta({
  args: { current: 5, label: "Pagina's", nextHref: '/podcasts?pagina=6', previousHref: '/podcasts?pagina=4', total: 9 },
  argTypes: {
    current: { control: 'number', description: 'Het nummer van de pagina waar de bezoeker is.' },
    label: { control: 'text', description: 'De naam voor schermlezers.' },
    nextHref: { control: 'text', description: 'Het adres van de volgende pagina. Weg op de laatste pagina.' },
    previousHref: { control: 'text', description: 'Het adres van de vorige pagina. Weg op de eerste pagina.' },
    size: { control: 'radio', description: 'De maat van de links.', options: sizes },
    total: { control: 'number', description: 'Het aantal pagina’s.' },
  },
  component: Pagination,
  parameters: {
    docs: {
      description: {
        component: [
          'Paginering: een `nav` met een link naar de vorige pagina, de tekst "Pagina 2 van 9" en een link naar de volgende. Kies hem onder een lijst die over meer pagina’s loopt.',
          'Laat `previousHref` weg op de eerste pagina en `nextHref` op de laatste: dan staat er geen link. Elke link is een adres, dus het werkt zonder JavaScript.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
      source: {
        code: `<Pagination
  current={5}
  label="Pagina's"
  nextHref="/podcasts?pagina=6"
  previousHref="/podcasts?pagina=4"
  total={9}
/>`,
        language: 'tsx',
        type: 'code',
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Navigatie/Pagination',
})

export const Default = meta.story({ name: 'Middelste pagina' })

export const First = meta.story({
  args: { current: 1, nextHref: '/podcasts?pagina=2', previousHref: undefined },
  name: 'Eerste pagina',
})

export const Last = meta.story({
  args: { current: 9, nextHref: undefined, previousHref: '/podcasts?pagina=8' },
  name: 'Laatste pagina',
})

export const Small = meta.story({ args: { size: 'small' }, name: 'Kleine maat' })
