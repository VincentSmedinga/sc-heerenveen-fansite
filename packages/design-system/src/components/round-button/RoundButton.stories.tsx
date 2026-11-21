import { expect } from 'storybook/test'

import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Icon } from '../icon/Icon'
import { Page } from '../page/Page'
import { sizes } from '../size'
import { RoundButton, type RoundButtonSurface, roundButtonSurfaces } from './RoundButton'

const meta = preview.meta({
  args: { children: <Icon name="arrow-up" />, label: 'Naar boven', surface: 'page' },
  argTypes: {
    children: { control: false, description: 'Het pictogram, het enige wat de knop laat zien.' },
    href: { control: 'text', description: 'Met een adres is de knop een link, zonder is hij een knop.' },
    label: { control: 'text', description: 'De naam van de knop voor een schermlezer: wat hij doet.' },
    size: { control: 'radio', description: 'De maat van de knop.', options: sizes },
    surface: {
      control: 'radio',
      description: 'Het vlak waar de knop op staat: de pagina of het donkerblauw van de header.',
      options: roundButtonSurfaces,
    },
  },
  component: RoundButton,
  parameters: {
    docs: {
      description: {
        component: [
          'Een ronde knop of link met alleen een pictogram, voor de header en voor de pagina. De knop voor licht en donker, de knop naar boven en de supporterknop zijn er allemaal een, zodat ze er hetzelfde uitzien. Je kiest hem voor een handeling die iedereen aan het pictogram herkent, op een plek waar weinig ruimte is.',
          'In rust is alleen het pictogram te zien, in een rustig blauw. Onder de muis, ingedrukt en bij focus komt de knop naar voren, met een lichte vulling en een rand. Een schermlezer hoort de naam, dus het pictogram is nooit het enige teken.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Navigatie/RoundButton',
})

export const Default = meta.story({
  args: { children: <Icon name="arrow-up" />, label: 'Naar boven' },
  name: 'Voorbeeld',
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Naar boven' })).toHaveAttribute('type', 'button')
  },
  render: (args) => <RoundButton {...args} />,
})

// The four states next to each other. The pseudo states add-on sets hover, focus and pressing.
const states = [
  { example: 'rest', name: 'In rust' },
  { example: 'hover', name: 'Onder de muis' },
  { example: 'focus', name: 'Met focus' },
  { example: 'active', name: 'Ingedrukt' },
] as const

const Row = ({ surface }: { surface: RoundButtonSurface }) => (
  <span style={{ display: 'flex', gap: '1rem' }}>
    {states.map(({ example, name }) => (
      <RoundButton data-example={example} key={example} label={name} surface={surface}>
        <Icon name="arrow-up" />
      </RoundButton>
    ))}
  </span>
)

const allStates = {
  docs: {
    description: {
      story:
        'Van links naar rechts: in rust, onder de muis, met focus en ingedrukt, op de pagina en in de header. De toestanden zijn nagebootst met de add-on Pseudo States; met de muis en de Tab-toets zie je de echte.',
    },
  },
  pseudo: {
    active: ['[data-example="active"]'],
    focusVisible: ['[data-example="focus"]'],
    hover: ['[data-example="hover"]'],
  },
}

const renderAllStates = () => (
  <div className="hf-flow">
    <Row surface="page" />
    <Page.Header>
      <Row surface="header" />
    </Page.Header>
  </div>
)

// The colours on the page follow the theme, so the states have a story for each theme.
export const States = meta.story({
  globals: { theme: 'light' },
  name: 'Alle toestanden, licht',
  parameters: allStates,
  render: renderAllStates,
})

export const StatesDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Alle toestanden, donker',
  parameters: allStates,
  render: renderAllStates,
})

export const AsLink = meta.story({
  args: { children: <Icon name="envelope" />, href: '#contact', label: 'Mail ons' },
  name: 'Als link, met een ander pictogram',
  parameters: {
    docs: {
      description: {
        story:
          'Met een adres is de knop een link. Elk pictogram past, hier dat van een envelop uit het onderdeel Icon.',
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Mail ons' })).toHaveAttribute('href', '#contact')
  },
  render: (args) => <RoundButton {...args} />,
})
