import type { ComponentProps, CSSProperties } from 'react'

import { expect, userEvent, waitFor } from 'storybook/test'

import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Page } from '../page/Page'
import { AccountButton } from './AccountButton'

const meta = preview.meta({
  argTypes: {
    screenName: {
      control: 'text',
      description: 'De schermnaam van de fan die is ingelogd. Zonder naam is niemand ingelogd.',
    },
  },
  component: AccountButton,
  parameters: {
    docs: {
      description: {
        component: [
          'De knop voor je account in de header: een ronde knop met een ring, met daarin een hoofd en schouders. Wie niet is ingelogd, gaat ermee naar Inloggen; wie is ingelogd, naar Mijn account. Je kiest hem voor de header, naast de knop voor licht en donker.',
          'Uitgelogd schuift de romp onder de muis en bij focus omhoog tot hij de ring vult. Ingelogd is de ring een dichte schijf met de initialen erin uitgesneden, en beweegt er niets. Een schermlezer hoort waar de link heen gaat; de tekening, met de initialen, is verborgen.',
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

// Where the torso is, once it has stopped moving: `none` below, or moved up into the ring.
const expectTorso = async (canvasElement: HTMLElement, translate: string) => {
  const torso = canvasElement.querySelector('.hf-account-button-torso') as Element

  await waitFor(() => expect(getComputedStyle(torso).translate).toBe(translate))
}

const raised = '0px -7.5px'

export const SignedOut = meta.story({
  name: 'Uitgelogd',
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('link', { name: 'Inloggen' })).toHaveAttribute('href', '/fans/inloggen')
    await expectTorso(canvasElement, 'none')

    // The size of a RoundButton, with a line of 1.5 on the grid of 16.
    const drawing = canvasElement.querySelector('.hf-account-button > svg') as SVGElement

    await expect(getComputedStyle(drawing).inlineSize).toBe('26px')
    await expect(getComputedStyle(drawing.querySelector(':scope > circle') as Element).strokeWidth).toBe('1.5px')
  },
  render: inHeader,
})

export const Hover = meta.story({
  name: 'Uitgelogd, onder de muis',
  parameters: {
    docs: {
      description: {
        story:
          'De romp schuift omhoog tot hij de ring vult. De muis is nagebootst met de add-on Pseudo States; met de muis zie je de beweging.',
      },
    },
    pseudo: { hover: ['.hf-account-button'] },
  },
  render: inHeader,
})

export const Focus = meta.story({
  name: 'Uitgelogd, met focus',
  play: async ({ canvas, canvasElement }) => {
    await userEvent.tab()
    await expect(canvas.getByRole('link', { name: 'Inloggen' })).toHaveFocus()
    await expectTorso(canvasElement, raised)
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
  play: async ({ canvas, canvasElement }) => {
    await expectTorso(canvasElement, raised)
    await userEvent.tab()
    await expect(canvas.getByRole('link', { name: 'Mijn account' })).toHaveFocus()
    await expectTorso(canvasElement, raised)
  },
  render: inHeader,
})

export const NoInitials = meta.story({
  args: { screenName: '1997' },
  name: 'Ingelogd, zonder initialen',
  parameters: {
    docs: {
      description: {
        story: 'Een schermnaam zonder letter die we kunnen tekenen geeft de dichte schijf.',
      },
    },
  },
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
          'Met minder beweging staat de romp onder de muis meteen boven, zonder te schuiven. De tijden van de beweging staan hier op nul, zoals de tokens dat doen als de bezoeker minder beweging kiest.',
      },
    },
    pseudo: { hover: ['.hf-account-button'] },
  },
  play: async ({ canvasElement }) => {
    const torso = canvasElement.querySelector('.hf-account-button-torso') as Element

    await expect(getComputedStyle(torso).transitionDuration).toBe('0s')
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
