import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Link } from '../link/Link'
import { Page } from '../page/Page'
import { Logo } from './Logo'

const meta = preview.meta({
  component: Logo,
  parameters: {
    docs: {
      description: {
        component: [
          'Het logo van de Fansite: het schild met de Friese banen en een pompeblêd, het woordmerk en "sinds 1997". Het is één plaatje met de naam "sc Heerenveen Fansite, sinds 1997".',
          'Zet het logo in een `Link` naar de homepage; de naam van het logo is dan de naam van de link.',
          'De SVG-bestanden in `src/assets` zijn voor plekken buiten de site, zoals een social-afbeelding.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/Logo',
})

export const Default = meta.story({ name: 'Logo', render: () => <Logo /> })

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
