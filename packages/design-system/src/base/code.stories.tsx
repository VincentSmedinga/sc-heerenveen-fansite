import preview from '#.storybook/preview'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: 'Code in een zin en een blok code, op een tonaal vlak.',
      },
    },
  },
  tags: ['autodocs'],
  title: 'HTML-elementen/Code',
})

export const Inline = meta.story({
  name: 'Code in een zin',
  render: () => (
    <p style={{ maxInlineSize: '40rem' }}>
      Geef een kop de klasse <code>hf-heading-3</code> om hem eruit te laten zien als kop 3, zonder het niveau te
      veranderen.
    </p>
  ),
})

export const Block = meta.story({
  name: 'Blok code',
  parameters: {
    docs: {
      description: {
        story: 'Een blok code krijgt `tabindex="0"`, zodat je het ook met het toetsenbord kunt scrollen.',
      },
    },
  },
  render: () => (
    <pre tabIndex={0}>
      <code>{`<section aria-labelledby="discussies">
  <h2 class="hf-heading-3" id="discussies">Nieuwste discussies</h2>
</section>`}</code>
    </pre>
  ),
})
