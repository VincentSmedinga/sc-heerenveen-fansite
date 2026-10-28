import type { CSSProperties } from 'react'

type TypeStyle = {
  className: string
  colour?: 'accent' | 'heading'
  name: string
  sample: string
  spec: string
  use: string
}

export const typeStyles: TypeStyle[] = [
  {
    className: 'hf-wordmark',
    colour: 'heading',
    name: 'Woordmerk',
    sample: 'sc Heerenveen Fansite',
    spec: 'Truculenta 900 · breedte 125 · 36 px (mobiel 28) · regelhoogte 1 · +0,02 em · kapitalen',
    use: 'Alleen de sitenaam in header en footer.',
  },
  {
    className: 'hf-heading-1',
    colour: 'heading',
    name: 'Kop 1',
    sample: 'ADO Den Haag – sc Heerenveen',
    spec: 'Truculenta 800 · breedte 125 · schaalt mee met de breedte · 1,0 · +0,01 em · kapitalen',
    use: 'Paginatitel, titel op de wedstrijdband.',
  },
  {
    className: 'hf-heading-2',
    colour: 'heading',
    name: 'Kop 2',
    sample: 'Laatste nieuws',
    spec: 'Truculenta 800 · breedte 125 · schaalt mee met de breedte · 1,05 · +0,02 em · kapitalen',
    use: 'Secties op een pagina.',
  },
  {
    className: 'hf-heading-3',
    colour: 'heading',
    name: 'Kop 3',
    sample: 'Nieuwste discussies',
    spec: 'Truculenta 800 · breedte 115 · schaalt mee met de breedte · 1,15 · +0,03 em · kapitalen',
    use: 'Titels van kaarten en blokken in de zijbalk.',
  },
  {
    className: 'hf-label',
    colour: 'accent',
    name: 'Label',
    sample: 'Volgende wedstrijd',
    spec: 'Truculenta 700 · breedte 125 · één maat · 1,2 · +0,04 em · kapitalen',
    use: 'Bovenregels en badges, zoals Volgende wedstrijd of Uit.',
  },
  {
    className: 'hf-heading-4',
    colour: 'heading',
    name: 'Kop 4',
    sample: 'Hoe we bronnen kiezen',
    spec: 'Truculenta 800 · breedte 115 · één maat · 1,3 · +0,03 em · kapitalen',
    use: 'Tussenkoppen in lopende tekst, zoals op Over ons.',
  },
  {
    className: 'hf-headline',
    colour: 'heading',
    name: 'Nieuwskop',
    sample: 'Samenvatting: SC Heerenveen bezorgt Excelsior opnieuw een grote nederlaag',
    spec: 'Atkinson Hyperlegible Next 500 · één maat · 1,35',
    use: 'Koppen van berichten in lijsten. Een kop over meer regels breekt in balans. Nooit in kapitalen.',
  },
  {
    className: 'hf-body',
    name: 'Tekst',
    sample:
      'Gemaakt door supporters, zonder advertenties en zonder winstoogmerk. We tonen de kop en linken naar het bericht van de journalist.',
    spec: 'Atkinson Hyperlegible Next 400 · één maat · 1,5',
    use: 'Lopende tekst.',
  },
  {
    className: 'hf-intro',
    name: 'Inleiding',
    sample: 'We zetten de koppen van de media over sc Heerenveen op één plek, met een link naar het hele verhaal.',
    spec: 'Atkinson Hyperlegible Next 400 · één maat · 1,4',
    use: 'De eerste alinea onder de paginatitel, in balans over de regels. In de HTML staat een b in de p: zonder CSS toont de browser hem vet.',
  },
  {
    className: 'hf-meta',
    name: 'Meta',
    sample: 'Leeuwarder Courant · 83 reacties · laatst 13:28',
    spec: 'Atkinson Hyperlegible Next 400 · één maat · 1,4',
    use: 'Bron, tijd en aantallen.',
  },
]

const colourStyle = (colour: TypeStyle['colour']): CSSProperties | undefined =>
  colour ? { color: `var(--hf-colour-text-${colour})` } : undefined

export const TypeStyles = () => (
  <div>
    {typeStyles.map(({ className, colour, name, sample, spec, use }) => (
      <div className="_hf-docs-specimen" key={className}>
        <div>
          <p className="hf-headline" style={{ marginBlockEnd: '0.25rem' }}>
            {name}
          </p>
          <p className="hf-meta _hf-docs-secondary" style={{ marginBlockEnd: '0.25rem' }}>
            {spec}
          </p>
          <p className="hf-meta _hf-docs-secondary" style={{ marginBlockEnd: '0.25rem' }}>
            {use}
          </p>
          <p className="hf-meta" style={{ marginBlockEnd: 0 }}>
            <code>.{className}</code>
          </p>
        </div>
        <p className={className} style={{ ...colourStyle(colour), marginBlockEnd: 0 }}>
          {sample}
        </p>
      </div>
    ))}
  </div>
)

const truculentaWeights = [100, 300, 500, 700, 900]
const truculentaWidths = [75, 100, 125]
const atkinsonWeights = [200, 400, 600, 800]

const display: CSSProperties = { fontFamily: 'var(--hf-font-family-display)', marginBlockEnd: '0.25rem' }
const text: CSSProperties = { fontFamily: 'var(--hf-font-family-text)', marginBlockEnd: '0.25rem' }

export const FontSpecimens = () => (
  <div className="_hf-docs-stack">
    <section aria-labelledby="font-truculenta">
      <h3 className="hf-heading-3" id="font-truculenta">
        Truculenta
      </h3>
      <p>
        Voor woordmerk, alle koppen en labels. Variabel in gewicht (100–900), breedte (75–125) en optische grootte
        (12–72). Die laatste volgt vanzelf de lettergrootte. Let op de lage middenstrepen van E, F, H en R.
      </p>
      {truculentaWeights.map((weight) => (
        <p key={weight} style={{ ...display, fontSize: '2rem', fontStretch: '125%', fontWeight: weight }}>
          Hearrenfean {weight}
        </p>
      ))}
      {truculentaWidths.map((width) => (
        <p key={width} style={{ ...display, fontSize: '2rem', fontStretch: `${width}%`, fontWeight: 900 }}>
          Abe Lenstra · breedte {width}
        </p>
      ))}
    </section>
    <section aria-labelledby="font-atkinson">
      <h3 className="hf-heading-3" id="font-atkinson">
        Atkinson Hyperlegible Next
      </h3>
      <p>
        Voor nieuwskoppen, tekst en meta. Variabel in gewicht (200–800), met cursief. Elke letter heeft een eigen vorm,
        dus Il1 en O0 zijn niet te verwarren.
      </p>
      {atkinsonWeights.map((weight) => (
        <p key={weight} style={{ ...text, fontSize: '1.375rem', fontWeight: weight }}>
          Il1 O0 · De pompeblêden op het shirt · {weight} <em style={{ fontWeight: weight }}>en cursief</em>
        </p>
      ))}
    </section>
    <section aria-labelledby="font-characters">
      <h3 className="hf-heading-3" id="font-characters">
        Nederlands en Fries
      </h3>
      <p style={{ ...display, fontSize: '1.5rem', fontStretch: '125%', fontWeight: 800, textTransform: 'uppercase' }}>
        Skûtsjesilen op het IJsselmeer, ideeën uit Fryslân
      </p>
      <p style={{ ...text, fontSize: '1.25rem' }}>
        ë é ê è ï ô û â ú ü · Ĳ ĳ · IJsselmeer, Fryslân, wêze, skûtsjesilen, ideeën, één, café
      </p>
      <p className="hf-meta _hf-docs-secondary">
        De kapitalen in de bovenste regel komen uit CSS (<code>text-transform: uppercase</code>); de tekst zelf staat in
        gewone letters. Zo leest een schermlezer woorden en geen losse letters.
      </p>
    </section>
    <section aria-labelledby="font-figures">
      <h3 className="hf-heading-3" id="font-figures">
        Tabelcijfers
      </h3>
      <p>
        In tabellen hebben alle cijfers dezelfde breedte (<code>font-variant-numeric: tabular-nums</code>), zodat
        kolommen recht onder elkaar staan.
      </p>
      <p style={{ ...text, fontSize: '1.25rem' }}>
        Gewoon: 1.111 · 8.888 <br />
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>Tabel: 1.111 · 8.888</span>
      </p>
    </section>
  </div>
)
