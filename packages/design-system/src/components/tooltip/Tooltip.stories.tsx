import type { ReactNode } from 'react'

import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Tooltip } from './Tooltip'

const meta = preview.meta({
  argTypes: {
    bottom: {
      control: { max: 100, min: 0, type: 'range' },
      description: 'Hoe hoog de plek ligt in de ouder, van 0 (onderaan) tot 100 (bovenaan).',
    },
    children: { control: 'text', description: 'De tekst van de tooltip. Kort, zoals een waarde.' },
    left: {
      control: { max: 100, min: 0, type: 'range' },
      description: 'Hoe ver de plek van links ligt in de ouder, van 0 (links) tot 100 (rechts).',
    },
    onClose: { control: false, description: 'Wordt aangeroepen bij Escape. De ouder haalt de tooltip dan weg.' },
  },
  component: Tooltip,
  parameters: {
    docs: {
      description: {
        component: [
          'Een tooltip toont een korte tekst bij een plek, zoals de waarde bij een punt van een grafiek.',
          'Het onderdeel weet niets van grafieken: de ouder geeft de plek en bepaalt wanneer de tooltip er is.',
          'Hij staat boven de plek, of eronder als er boven geen ruimte is, en blijft binnen de ouder.',
          '',
          'De tooltip is een hulp voor de aanwijzer en voor aanraking, geen bediening.',
          'Hij reageert zelf niet op de aanwijzer, is verborgen voor een schermlezer en krijgt geen focus.',
          'De tekst moet dus ook ergens anders staan.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/Tooltip',
})

/** The parent of the examples: a positioned box with a dot at the place the tooltip is for. */
const Parent = ({ bottom, children, left }: { bottom: number; children: ReactNode; left: number }) => (
  <div
    style={{
      blockSize: '6rem',
      border: '1px dashed var(--hf-colour-border-default)',
      inlineSize: '16rem',
      position: 'relative',
    }}
  >
    <span
      style={{
        background: 'var(--hf-colour-chart-line)',
        blockSize: '0.5rem',
        borderRadius: '50%',
        inlineSize: '0.5rem',
        insetBlockEnd: `${bottom}%`,
        insetInlineStart: `${left}%`,
        position: 'absolute',
        transform: 'translate(-50%, 50%)',
      }}
    />
    {children}
  </div>
)

export const Default = meta.story({
  args: { bottom: 30, children: '1,8', left: 50 },
  name: 'Boven de plek, met besturing',
  render: (args) => (
    <Parent bottom={args.bottom} left={args.left}>
      <Tooltip {...args} />
    </Parent>
  ),
})

export const Below = meta.story({
  args: { bottom: 85, children: '1,8', left: 50 },
  name: 'Eronder als er boven geen ruimte is',
  render: (args) => (
    <Parent bottom={args.bottom} left={args.left}>
      <Tooltip {...args} />
    </Parent>
  ),
})

export const AtTheEdge = meta.story({
  args: { bottom: 30, children: '2,4', left: 98 },
  name: 'Binnen de ouder bij een plek aan de rand',
  render: (args) => (
    <Parent bottom={args.bottom} left={args.left}>
      <Tooltip {...args} />
    </Parent>
  ),
})
