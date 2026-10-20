import preview from '#.storybook/preview'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component:
          'Links zijn altijd onderstreept. Onder de muis wordt de lijn dikker en de kleur donkerder (licht) of lichter (donker). Een bezochte link krijgt een getint grijs, zodat je ziet wat je al hebt gelezen.',
      },
    },
  },
  tags: ['autodocs'],
  title: 'HTML-elementen/Links',
})

export const InText = meta.story({
  name: 'In lopende tekst',
  render: () => (
    <p style={{ maxInlineSize: '40rem' }}>
      Lees het hele verslag bij <a href="#verslag-omrop-fryslan">Omrop Fryslân</a> of bekijk de samenvatting bij{' '}
      <a href="#samenvatting-eredivisie">de eredivisie</a>.
    </p>
  ),
})

export const States = meta.story({
  name: 'Toestanden',
  parameters: {
    docs: {
      description: {
        story:
          'Bezocht, muis en focus zijn nagebootst met de add-on Pseudo States. Met de Tab-toets zie je de echte focusrand.',
      },
    },
    pseudo: {
      focusVisible: ['[data-example="focus"]'],
      hover: ['[data-example="hover"]'],
      visited: ['[data-example="visited"]'],
    },
  },
  render: () => (
    <ul style={{ listStyleType: 'none', paddingInlineStart: 0 }}>
      <li>
        <a href="#nog-niet-bezocht">Gewone link</a>
      </li>
      <li>
        <a data-example="visited" href="#al-bezocht">
          Bezochte link
        </a>
      </li>
      <li>
        <a data-example="hover" href="#onder-de-muis">
          Link onder de muis
        </a>
      </li>
      <li>
        <a data-example="focus" href="#met-focus">
          Link met focus
        </a>
      </li>
    </ul>
  ),
})
