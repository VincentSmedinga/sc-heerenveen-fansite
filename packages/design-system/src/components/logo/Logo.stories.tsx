import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Link } from '../link/Link'
import { Page } from '../page/Page'
import { RoundButton } from '../round-button/RoundButton'
import { ThemeButton } from '../theme-button/ThemeButton'
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

/** One header at a given width, with two round buttons beside the logo. */
const headerAt = (width: number) => (
  <div style={{ inlineSize: `${width}px`, maxInlineSize: '100%' }}>
    <Page.Header>
      <Link href="#home">
        <Logo />
      </Link>
      <RoundButton label="Inloggen" size="small" surface="header">
        <svg aria-hidden="true" height="22" viewBox="0 0 24 24" width="22">
          <circle cx="12" cy="8" fill="currentColor" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0Z" fill="currentColor" />
        </svg>
      </RoundButton>
      <ThemeButton dark={false} label="Donker" size="small" />
    </Page.Header>
  </div>
)

const widthParameters = (width: number) => ({
  docs: {
    description: {
      story: `De kop op ${width} pixels breed, met een tweede ronde knop naast de knop voor licht en donker. Het woordmerk blijft op één regel.`,
    },
  },
  layout: 'fullscreen' as const,
})

export const Width360 = meta.story({
  name: 'Kop op 360 pixels',
  parameters: widthParameters(360),
  render: () => headerAt(360),
})

export const Width390 = meta.story({
  name: 'Kop op 390 pixels',
  parameters: widthParameters(390),
  render: () => headerAt(390),
})

export const Width600 = meta.story({
  name: 'Kop op 600 pixels, met "sinds 1997" ernaast',
  parameters: widthParameters(600),
  render: () => headerAt(600),
})
