import preview from '#.storybook/preview'

import { Link } from '../link/Link'
import { Page } from '../page/Page'
import { Logo } from './Logo'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Het logo van de Fansite: het schild met de Friese banen en een pompeblêd, het woordmerk en "sinds 1997".',
          '',
          'Het logo is één plaatje met de naam "sc Heerenveen Fansite, sinds 1997".',
          'Het schild is getekend en voor schermlezers verborgen; het woordmerk is tekst, in de Truculenta van het woordmerk.',
          'De tekst volgt de kleuren van het thema: donker op de pagina in licht, licht in donker en licht in de header.',
          'Het schild houdt in elk thema dezelfde kleuren.',
          '',
          'Zet het logo in een `Link` naar de homepage; de naam van het logo is dan de naam van de link.',
          '"sinds 1997" staat achter het woordmerk, en gaat op een smal scherm naar een regel eronder als het er niet meer achter past.',
          'De SVG-bestanden in `src/assets` zijn voor plekken buiten de site, zoals een social-afbeelding.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Logo',
})

const render = () => <Logo />

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })

export const InHeader = meta.story({
  name: 'In de header, als link',
  render: () => (
    <Page.Header>
      <Link href="#home">
        <Logo />
      </Link>
    </Page.Header>
  ),
})
