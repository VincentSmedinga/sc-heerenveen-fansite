import preview from '#.storybook/preview'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component:
          'Koppen `h1` tot en met `h4`. Elk niveau heeft een standaardstijl; met een klasse kies je een andere stijl zonder het niveau te veranderen.',
      },
    },
  },
  tags: ['autodocs'],
  title: 'HTML-elementen/Koppen',
})

export const AllLevels = meta.story({
  name: 'Alle niveaus',
  render: () => (
    <>
      <h1>ADO Den Haag – sc Heerenveen</h1>
      <p className="hf-meta">h1 · kop 1</p>
      <h2>Laatste nieuws</h2>
      <p className="hf-meta">h2 · kop 2</p>
      <h3>Nieuwste discussies</h3>
      <p className="hf-meta">h3 · kop 3</p>
      <h4>Hoe we bronnen kiezen</h4>
      <p className="hf-meta">h4 · kop 4</p>
    </>
  ),
})

export const StyleApartFromLevel = meta.story({
  name: 'Stijl los van niveau',
  parameters: {
    docs: {
      description: {
        story:
          'In de zijbalk is de titel van een blok een `h2`, want het blok hangt direct onder de paginatitel. Met `class="hf-heading-3"` ziet die kop eruit als kop 3.',
      },
    },
  },
  render: () => (
    <section aria-labelledby="discussies" className="_hf-docs-card" style={{ maxInlineSize: '24rem' }}>
      <h2 className="hf-heading-3" id="discussies">
        Nieuwste discussies
      </h2>
      <p className="hf-meta">Positieve punten in het Abe Lenstra Stadion · 83 reacties</p>
      <p className="hf-meta">Dylan Vente · 227 reacties</p>
    </section>
  ),
})
