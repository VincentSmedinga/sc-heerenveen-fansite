# Prestaties

Dit bestand legt de nulmeting van de snelheid van de site vast (#798).
#799, #800, #802 en #803 vergelijken hun resultaat hiermee.
Er is geen productie (#33), dus de meting is van de acceptatieomgeving, <https://acc.sc.heerenveen.org>.
Dezelfde meting op productie volgt zodra die er is.

## Kort

- Vanuit Nederland scoort elke pagina 99 of 100 op prestaties, en 100 op toegankelijkheid en best practices.
- De eerste byte komt na 38 tot 69 milliseconden.
  Het rapport van 6 november 2026 vanuit de VS had 800 milliseconden voor de homepage.
  Dat verschil is afstand, en geen traagheid van de server.
- De SEO-score is 66 op elke pagina en telt niet mee: de omgeving stuurt bewust `noindex`.
- Elke pagina is 410 tot 434 KiB.
  Daarvan zijn 218 tot 237 KiB lettertypes en ongeveer 152 KiB JavaScript.
- De enige score onder 100 is prestaties op Spelers op mobiel (99), door een layoutverschuiving.

## De meting

- **Datum:** 6 november 2026, tussen 23:51 en 23:58 (Nederlandse tijd).
- **Plaats:** de computer van de projecteigenaar, in Nederland, op een thuisverbinding.
- **Omgeving:** <https://acc.sc.heerenveen.org>, zonder inlog.
  De omgeving stuurt `X-Robots-Tag: noindex, nofollow`.
- **Versie:** Lighthouse 13.6.0 (CLI), Google Chrome 157.0.8103.38 in headless-stand, Node 24.16.0.
- **Instellingen:** de standaard van Lighthouse.
  Mobiel is een Moto G Power (2022) op trage 4G, met een processor die 4 keer trager is.
  Bureaublad is `--preset=desktop`: 1350 pixels breed, 10 Mbit/s en geen vertraging van de processor.
  Beide gebruiken `simulate` voor de vertraging.
- **Runs:** drie per pagina en apparaat, na elkaar, met een koude browser.
  De tabel toont de middelste run: die met de middelste prestatiescore, en bij gelijke score die met de middelste LCP.
  Alle cijfers komen uit die ene run, zodat ze bij elkaar horen.
- **Pagina's:** de homepage, `/nieuws`, het artikel [`/redactie/we-zijn-terug`](https://acc.sc.heerenveen.org/redactie/we-zijn-terug), `/spelers`, het archief en `/bronnen`.
  Het archief is `/nieuws` zelf, want het nieuwsarchief staat op `/nieuws` (zie _Het nieuwsarchief staat op `/nieuws`, met 50 koppen per pagina en een filter per bron_ in `docs/beslissingen/site.md`).
  Daarom staat het archief er twee keer in: pagina 1 en pagina 2 (`/nieuws?pagina=2`), een pagina verder terug.

### De opdracht

Draai dit buiten de repository, zodat er geen dependency bij komt.
`npm` zet Lighthouse in de map waar je het draait.
Chrome moet op de computer staan.

```sh
mkdir lighthouse && cd lighthouse
npm init -y && npm install lighthouse@13.6.0
export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p uit
for apparaat in mobiel bureaublad; do
  for run in 1 2 3; do
    i=0
    for pad in "/" "/nieuws" "/redactie/we-zijn-terug" "/spelers" "/nieuws?pagina=2" "/bronnen"; do
      i=$((i+1))
      voorinstelling=""
      [ "$apparaat" = bureaublad ] && voorinstelling="--preset=desktop"
      npx lighthouse "https://acc.sc.heerenveen.org$pad" $voorinstelling \
        --output=json --output-path="uit/p$i-$apparaat-$run.json" \
        --chrome-flags="--headless=new" --quiet
    done
  done
done
```

Dit zijn 36 runs, ongeveer een minuut per rij van zes.
Draai ze na elkaar: tegelijk draaien maakt de cijfers slechter.
Uit elk bestand komen de scores (`categories`) en deze metingen (`audits`):

- LCP, CLS en TBT: `largest-contentful-paint`, `cumulative-layout-shift` en `total-blocking-time`;
- TTFB: `server-response-time`;
- gewicht: `total-byte-weight`;
- JavaScript en lettertypes: de overdrachtsgrootte van `script` en `font` in `resource-summary`.

## Nulmeting

Scores: prestaties / toegankelijkheid / best practices / SEO.
LCP in seconden, TBT en TTFB in milliseconden.
Gewicht, JavaScript en lettertypes in KiB, zoals ze over het netwerk gaan (gecomprimeerd).
Het gewicht is alles wat de pagina laadt, ook de JavaScript en de lettertypes.

| Pagina                                              | Apparaat   | Scores               | LCP  | CLS   | TBT | TTFB | Gewicht | JavaScript | Lettertypes |
| --------------------------------------------------- | ---------- | -------------------- | ---- | ----- | --- | ---- | ------- | ---------- | ----------- |
| Homepage (`/`)                                      | mobiel     | 100 / 100 / 100 / 66 | 0,82 | 0,023 | 1   | 47   | 415,0   | 151,8      | 218,5       |
| Homepage (`/`)                                      | bureaublad | 100 / 100 / 100 / 66 | 0,24 | 0,000 | 0   | 44   | 414,9   | 151,8      | 218,4       |
| Archief, pagina 1 (`/nieuws`)                       | mobiel     | 100 / 100 / 100 / 66 | 0,97 | 0,001 | 3   | 64   | 421,5   | 151,8      | 218,7       |
| Archief, pagina 1 (`/nieuws`)                       | bureaublad | 100 / 100 / 100 / 66 | 0,28 | 0,008 | 0   | 59   | 421,4   | 151,7      | 218,7       |
| Artikel van de redactie (`/redactie/we-zijn-terug`) | mobiel     | 100 / 100 / 100 / 66 | 0,81 | 0,002 | 6   | 40   | 410,5   | 151,8      | 218,7       |
| Artikel van de redactie (`/redactie/we-zijn-terug`) | bureaublad | 100 / 100 / 100 / 66 | 0,22 | 0,002 | 0   | 50   | 410,2   | 151,7      | 218,5       |
| Spelers (`/spelers`)                                | mobiel     | 99 / 100 / 100 / 66  | 0,94 | 0,068 | 1   | 44   | 434,4   | 152,6      | 237,1       |
| Spelers (`/spelers`)                                | bureaublad | 100 / 100 / 100 / 66 | 0,28 | 0,033 | 0   | 57   | 434,5   | 152,6      | 237,1       |
| Archief, pagina 2 (`/nieuws?pagina=2`)              | mobiel     | 100 / 100 / 100 / 66 | 0,97 | 0,001 | 4   | 53   | 420,7   | 151,9      | 218,4       |
| Archief, pagina 2 (`/nieuws?pagina=2`)              | bureaublad | 100 / 100 / 100 / 66 | 0,28 | 0,000 | 0   | 69   | 420,6   | 151,9      | 218,4       |
| Bronnen (`/bronnen`)                                | mobiel     | 100 / 100 / 100 / 66 | 0,93 | 0,001 | 5   | 38   | 412,2   | 151,8      | 218,7       |
| Bronnen (`/bronnen`)                                | bureaublad | 100 / 100 / 100 / 66 | 0,28 | 0,001 | 0   | 39   | 412,0   | 151,9      | 218,4       |

De drie runs liggen dicht bij elkaar.
Op Spelers op mobiel is de CLS 0,062, 0,066 en 0,068, en de prestatiescore elke keer 99.
Op de homepage op mobiel is de LCP 0,82 seconden in alle drie.

## Wat opvalt, en waarom

### SEO 66 op elke pagina

De audit `is-crawlable` faalt, omdat acceptatie `noindex, nofollow` stuurt.
Dat is bewust: alleen productie hoort in zoekmachines.
De score telt niet mee, en er is geen issue voor.

### Spelers op mobiel: prestaties 99, CLS 0,068

Dit is de enige score onder 100.
De CLS komt van twee verschuivingen van `div.hf-page-cells`, de kolommen met de kaarten, op het moment dat de lettertypes binnen zijn ("Web font loaded").
De pagina laadt ook een extra lettertype: Atkinson Hyperlegible Next `latin-ext` (18,7 KiB), dus 237 KiB lettertypes in plaats van 218.
Op bureaublad is de CLS 0,033, en de score 100.
De oplossing staat in #800 (lettertypes kleiner maken en laden zonder verspringen).

### Layoutverschuiving op de homepage

De CLS van de homepage op mobiel is 0,023, bijna geheel (0,020) op de eerste kaart, door hetzelfde wisselen van het lettertype.
Dat is binnen de grens van 0,1, maar het is de hoogste waarde na Spelers.
Ook dit is #800.

### Lettertypes zijn ruim de helft van het gewicht

Lettertypes zijn 218,4 tot 237,1 KiB van 410 tot 434 KiB.
Truculenta `latin` is alleen al 185 KiB, omdat het bestand drie assen bevat (gewicht, breedte en optische maat).
Dat is #800.

### JavaScript: 152 KiB op elke pagina

Elke pagina stuurt 151,7 tot 152,6 KiB JavaScript.
Lighthouse schat dat 48 tot 49 KiB daarvan ongebruikt is (`unused-javascript`, score 0,5), vooral in één bestand van 72 KiB.
Daarnaast is 14 KiB aan code voor oude browsers (`legacy-javascript`, onder andere `Array.prototype.at`).
Op mobiel is er één lange taak van 52 tot 54 ms, en de TBT is 1 tot 6 ms.
Het artikel van de redactie heeft op mobiel een maximale vertraging bij de eerste invoer (`max-potential-fid`) van 70 ms, met score 0,99.
Dit is #802.
Wat #802 deed en waarom het weinig is, staat in _Waarom de JavaScript niet veel kleiner wordt_ hieronder.
#802 noemt voor de homepage 106 KiB JavaScript en een TBT van 110 ms.
Deze meting telt 151,8 KiB (alle scripts, overdrachtsgrootte) en een TBT van 1 ms.
De oorzaak van het verschil is niet bekend.
#802 meet opnieuw met deze opdracht.

### Eerste byte: 38 tot 69 ms

Vanuit Nederland is de server snel.
Het rapport van 6 november 2026 vanuit de VS had 800 ms voor de homepage, dus daar was afstand het grootste deel.
De pagina's zijn dynamisch: de antwoorden hebben `cache-control: private, no-cache, no-store, max-age=0, must-revalidate`.
#799 beslist of publieke pagina's gecached moeten worden.
Deze waarde is de ondergrens voor wat #799 nog kan winnen.

### Het CSS-bestand blokkeert de eerste verf

Het stylesheet (15,8 tot 15,9 KiB) en `theme.js` blokkeren het tekenen.
Lighthouse schat 130 tot 150 ms winst op mobiel (`render-blocking-insight`, score 0).
De LCP is toch 0,8 tot 1,0 seconde op mobiel, en 0,2 tot 0,3 op bureaublad, dus dit kost de score niets.
Er is geen issue voor.

### De lettertypes komen laat in de keten

`network-dependency-tree-insight` heeft score 0 op elke pagina: eerst de pagina, dan het stylesheet, dan de lettertypes.
Elk lettertype wordt pas gevonden als het stylesheet binnen is.
Een preload van de belangrijkste lettertypes verkort de keten.
Dat hoort bij #800.

### Wat in orde is

- Toegankelijkheid is 100 op elke pagina.
- Best practices is 100 op elke pagina.
  De beveiligingsaudits waar #801 over gaat (`csp-xss`, `origin-isolation` en `clickjacking-mitigation`) zijn alleen informatief en tellen niet mee in de score.
- De CLS is op vijf van de zes pagina's op bureaublad en op vier van de zes op mobiel onder 0,01.
- De LCP is nergens boven 1,0 seconde, en de TBT nergens boven 6 ms.
- Er is nergens een afbeelding (0 KiB), dus geen LCP-afbeelding om te verbeteren.
- Elke pagina doet 17 verzoeken, en Spelers 19.

## Waarom de JavaScript niet veel kleiner wordt

Dit is de uitkomst van #802, gemeten op 7 november 2026 met dezelfde opdracht, op een lokale build vóór en na (mediaan van drie runs).
De homepage stuurt 153,9 KiB JavaScript, gecomprimeerd, en was 159,2 KiB.
De TBT is 2 ms, voor en na.

- **134,2 KiB is React en Next.js:** `react-dom` 71,1 KiB, de client van Next.js 37,2 KiB, hulpcode van Next.js 8,8 KiB, server-aanroepen 9,3 KiB, de uitvoeromgeving 5,0 KiB en de foutpagina 2,8 KiB.
  Daar kunnen we niets aan veranderen zonder het framework te vervangen.
- **18,5 KiB is onze eigen code:** de navigatie en de themaknop 10,6 KiB, de kaart met het deelplaatje en de aanwijzer van de staafjes 5,2 KiB, de rest 2,7 KiB.
  Ook zonder al die code is de bodem 134,2 KiB, 16% minder dan 159,2 KiB.
- **De `browserslist` helpt bijna niet:** Next.js zet zijn polyfills (1,4 KiB) altijd in het hoofdbestand.
  De 13 KiB aan "verouderde JavaScript" in het rapport van Lighthouse is zijn schatting voor het bestand van `react-dom` waarin die regels staan.
- **`sideEffects` helpt wel:** `package.json` van het ontwerpsysteem zegt dat alleen CSS bijwerkingen heeft, en daardoor laadt een pagina de client-code van onderdelen die ze niet gebruikt niet meer.
  Dat is 5,3 KiB minder op de homepage, 3,3%.

De beslissing staat in _De bouw weet welke browsers we ondersteunen: een `browserslist` gelijk aan Baseline 'widely available'_ in `docs/beslissingen/site.md`.

## Zo meet je opnieuw

Draai de opdracht hierboven met dezelfde versie van Lighthouse, vanaf dezelfde computer of een in Nederland, en neem de middelste run per pagina.
Een andere versie van Lighthouse of van Chrome geeft andere scores, dus noem die bij elke nieuwe meting.
Zet de nieuwe meting onder de nulmeting, met datum en reden, en laat de nulmeting staan.
Op productie telt de SEO-score wel mee.

## De dagelijkse controle

De workflow [`lighthouse.yml`](../.github/workflows/lighthouse.yml) herhaalt deze meting elke dag en op verzoek, met de pagina's, het adres en de budgetten uit [`.github/lighthouse.json`](../.github/lighthouse.json).
De samenvatting van elke run staat bij de run in GitHub, met de laatste zeven runs ernaast.
De JSON-rapporten blijven 30 dagen als artifact.
Vaste controles laten de run falen, en GitHub mailt de eigenaar: geen verzoek naar derden, toegankelijkheid en best practices 100, en gewicht, JavaScript en lettertypes niet meer dan de nulmeting hierboven plus 5%.
De tijdcontroles melden alleen, tot de eigenaar de budgetten vaststelt (`decideOn` in het bestand).
De beslissing en de redenen staan in `docs/beslissingen/werkwijze.md`, onder _We meten zelf, elke dag, met een vast budget voor wat kan en een melding voor tijd_.
Een runner van GitHub meet niet vanuit Nederland en niet op dezelfde machine, dus de tijden wijken af van de nulmeting.
Vergelijk de tijden van de runs met elkaar, en de nulmeting met de runs alleen voor gewicht en aantallen.

## Waar de antwoordtijd zit (#799)

Het rapport van 6 november 2026 vanuit de VS had 800 ms tot de eerste byte van de homepage.
Vanuit Nederland is dat 36 tot 107 ms.
Dit is gemeten op 7 november 2026, met dezelfde opdracht, op acceptatie, vóór de wijziging van #799.

TTFB in milliseconden, de middelste van drie runs met Lighthouse 13.6.0:

| Pagina                        | Apparaat   | Nulmeting (6 november) | 7 november |
| ----------------------------- | ---------- | ---------------------- | ---------- |
| Homepage                      | mobiel     | 47                     | 47         |
| Homepage                      | bureaublad | 44                     | 41         |
| Archief, pagina 1 (`/nieuws`) | mobiel     | 64                     | 45         |
| Archief, pagina 1 (`/nieuws`) | bureaublad | 59                     | 54         |
| Artikel van de redactie       | mobiel     | 40                     | 36         |
| Artikel van de redactie       | bureaublad | 50                     | 36         |

De wijziging van #799 raakt geen pagina, dus de TTFB erna is dezelfde.
De dagelijkse controle (zie hierboven) laat hem verder zien.
De cijfers veranderen binnen de ruis van een run: een enkele run kan 60 of 100 ms zijn.

Met `curl` is te zien waar de tijd zit.
Elke waarde is de middelste van 15 verzoeken, in milliseconden na het aankomen van het verzoek (zonder verbinding en TLS), met `DNT: 1`:

| Verzoek                                                                         | Eerste byte |
| ------------------------------------------------------------------------------- | ----------- |
| Homepage                                                                        | 41          |
| `/nieuws`                                                                       | 43          |
| Artikel van de redactie                                                         | 39          |
| `/bronnen`                                                                      | 40          |
| Een bestand dat de host zelf geeft (`/icon.svg`, `/robots.txt`, een lettertype) | 28 tot 32   |

- **Afstand:** de verbinding opzetten kost 20 ms (en 20 ms voor TLS) vanuit Nederland.
  Vanuit de VS zijn dat drie of vier keer zoveel rondjes van ongeveer 150 ms, dus afstand verklaart de 800 ms bijna helemaal.
- **De applicatie:** een pagina komt ongeveer 10 tot 15 ms later dan een bestand van dezelfde host.
  Dat is het maken van de pagina, met de koppen uit het geheugen van de server (vijf minuten, zie _De koppen staan vijf minuten in het geheugen van de server_ in `docs/beslissingen/site.md`).
- **Het tellen van bezoeken:** een verzoek met `DNT: 1` telt niet, en een zonder wel.
  De eerste byte is bij beide gelijk (41 en 42 ms voor de homepage, 43 en 44 ms voor `/nieuws`), want het tellen gebeurt na het antwoord.
- **De proxy:** het zetten van de headers is niet te meten naast de rest.
- **De database:** de koppen komen uit het geheugen, dus bijna elk verzoek raakt hem niet.
  Het enige verzoek dat opviel was het eerste op `/spelers`, met 122 ms, wat past bij het vullen van dat geheugen.
- **Koude start:** niet gezien in deze metingen.
  De applicatie draaide steeds al.

De conclusie is dat weinig van de tijd van ons is.
Er is daarom niets weggehaald aan de pagina's.

### De cache van bestanden

Wat Next.js en de host al sturen, vóór de wijziging:

| Wat                                                  | Cache-Control                                             |
| ---------------------------------------------------- | --------------------------------------------------------- |
| Een pagina                                           | `private, no-cache, no-store, max-age=0, must-revalidate` |
| `/beheer`                                            | `no-store`                                                |
| `/_next/static` (scripts, stijlen en lettertypes)    | `public, max-age=31536000, immutable`                     |
| De bestanden in `public/` (pictogrammen, `theme.js`) | `public, max-age=0`                                       |

De bestanden in `public/` hebben geen hash in hun naam.
Met `max-age=0` vraagt een browser bij elke pagina of ze veranderd zijn, ook `theme.js`, dat het eerste tekenen blokkeert.
Nu: de pictogrammen en het plaatje voor gedeelde links een dag, en `theme.js` een uur (`apps/site/src/cache-headers.ts`).
De rest blijft zoals hij was.
Een pagina krijgt geen `s-maxage`, en de rooktest controleert dat, en dat het beheer `no-store` houdt.
