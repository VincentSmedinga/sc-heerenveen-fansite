import type { ComponentProps, CSSProperties } from 'react'

import { expect, userEvent } from 'storybook/test'

import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Page } from '../page/Page'
import { AccountButton } from './AccountButton'

const meta = preview.meta({
  argTypes: {
    screenName: {
      control: 'text',
      description: 'De schermnaam van de supporter die is ingelogd. Zonder naam is niemand ingelogd.',
    },
  },
  component: AccountButton,
  parameters: {
    docs: {
      description: {
        component: [
          'De supporterknop van de header: een ronde knop met een supporter met een sjaal. Wie niet is ingelogd, gaat ermee naar Inloggen; wie is ingelogd, naar Mijn account. Je kiest hem voor de header, naast de knop voor licht en donker.',
          'Uitgelogd hangen de armen langs het lijf en zit de sjaal om de nek. Onder de muis en bij focus gaan de armen omhoog en zwaait de supporter twee keer met de sjaal. Ingelogd houdt hij de sjaal omhoog, met de initialen op de borst. Een schermlezer hoort waar de link heen gaat; de supporter zelf, met de initialen, is een tekening die verborgen is.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Navigatie/AccountButton',
})

// The button is made for the dark blue of the header, so the stories show it there.
const inHeader = (args: ComponentProps<typeof AccountButton>) => (
  <Page.Header>
    <span />
    <AccountButton {...args} />
  </Page.Header>
)

export const SignedOut = meta.story({
  name: 'Uitgelogd',
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Inloggen' })).toHaveAttribute('href', '/fans/inloggen')
  },
  render: inHeader,
})

export const Hover = meta.story({
  name: 'Uitgelogd, onder de muis',
  parameters: {
    docs: {
      description: {
        story:
          'De armen gaan omhoog en de supporter zwaait twee keer met de sjaal. De muis is nagebootst met de add-on Pseudo States; met de muis zie je de echte beweging.',
      },
    },
    pseudo: { hover: ['.hf-account-button'] },
  },
  render: inHeader,
})

export const Focus = meta.story({
  name: 'Uitgelogd, met focus',
  play: async ({ canvas }) => {
    await userEvent.tab()
    await expect(canvas.getByRole('link', { name: 'Inloggen' })).toHaveFocus()
  },
  render: inHeader,
})

export const OneInitial = meta.story({
  args: { screenName: 'Testfan99' },
  name: 'Ingelogd, één initiaal',
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Mijn account' })).toHaveAttribute('href', '/fans/mijn-account')
  },
  render: inHeader,
})

export const TwoInitials = meta.story({
  args: { screenName: 'Blauwwit_Testfan' },
  name: 'Ingelogd, twee initialen',
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Mijn account' })).toHaveAttribute('href', '/fans/mijn-account')
  },
  render: inHeader,
})

// The motion tokens are 0s with reduced motion. This sets them so for the button alone, as the
// tokens do, because a story cannot ask the browser for reduced motion.
const reduced = {
  '--hf-motion-duration-medium': '0s',
  '--hf-motion-duration-quick': '0s',
  '--hf-motion-duration-short': '0s',
} as CSSProperties

export const ReducedMotion = meta.story({
  name: 'Minder beweging, onder de muis',
  parameters: {
    docs: {
      description: {
        story:
          'Met minder beweging staan de armen er meteen, zonder te zwaaien. De tijden van de beweging staan hier op nul, zoals de tokens dat doen als de bezoeker minder beweging kiest.',
      },
    },
    pseudo: { hover: ['.hf-account-button'] },
  },
  play: async ({ canvasElement }) => {
    const wave = canvasElement.querySelector('.hf-account-button-wave')

    await expect(wave).not.toBeNull()
    const durations = getComputedStyle(wave as Element).transitionDuration.split(', ')

    await expect(durations.every((duration) => duration === '0s')).toBe(true)
  },
  render: (args) => (
    <div style={reduced}>
      <Page.Header>
        <span />
        <AccountButton {...args} />
      </Page.Header>
    </div>
  ),
})
