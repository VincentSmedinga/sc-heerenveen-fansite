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
Vaste controles laten de run falen, en GitHub mailt de eigenaar: geen verzoek naar derden, toegankelijkheid en best practices 100, en gewicht, JavaScript en lettertypes niet meer dan de basiswaarden in het bestand plus 5% (de nulmeting hierboven, tot #1579 ze ververste).
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

## Waar de LCP op mobiel vandaan komt (#1579)

De dagelijkse controle meldt op mobiel een LCP van 1031 tot 1234 ms tegen een budget van 1100 ms.
De nulmeting hierboven had 0,81 tot 0,97 seconde, vanuit Nederland op een thuisverbinding.
Dit is gemeten op 22 en 23 november 2026.
De budgetten gaan niet omhoog en `enforce` blijft uit, tot de beslissing van 7 december 2026 (`decideOn`).

### De basiswaarden zijn ververst

De gewichten in `fixed.baselineKiB` komen uit de mediaan van de laatste zeven geldige dagelijkse runs van de workflow Lighthouse, uit de bestanden `lighthouse-metrics`: 15, 16, 17, 18, 20, 21 en 22 november 2026.
De run van 19 november is overgeslagen: hij faalde en mat foutpagina's van 12,8 KiB.
Per pagina is het de mediaan van 14 waarden: zeven runs, mobiel en bureaublad.
De vorige waarden waren de nulmeting van 6 november, voordat #800 de lettertypes van 218 naar 100 KiB bracht.

Een pagina met een teken uit het latin-ext-bereik (zoals een naam met een accent erboven) haalt een derde lettertype van 18,7 KiB.
Spelers doet dat elke dag, en op 22 november deed de homepage het ook, met een gewicht van 330,5 KiB.
De mediaan zelf had een grens van 318,7 KiB gegeven, en dus een rode run zonder dat de site zwaarder was geworden.
Daarom rekenen alle pagina's met het lettertype erbij: de lettertypes staan op 118,7 KiB en het gewicht is de mediaan plus 18,7 KiB.
Bij Spelers hoefde dat niet, want de mediaan had het al.

| Pagina                                 | Gewicht | JavaScript | Lettertypes |
| -------------------------------------- | ------- | ---------- | ----------- |
| Homepage (`/`)                         | 322,2   | 150,6      | 118,7       |
| Archief, pagina 1 (`/nieuws`)          | 323,2   | 145,9      | 118,7       |
| Artikel (`/redactie/we-zijn-terug`)    | 309,6   | 143,3      | 118,7       |
| Spelers (`/spelers`)                   | 324,4   | 151,4      | 118,7       |
| Archief, pagina 2 (`/nieuws?pagina=2`) | 323,3   | 145,9      | 118,7       |
| Bronnen (`/bronnen`)                   | 315,1   | 145,9      | 118,7       |

De grens is elke waarde plus 5%.

### Wat de LCP is

Op elke pagina is de LCP hetzelfde moment als de eerste verf (FCP): de eerste tekst die verschijnt.
Er is geen afbeelding op de pagina's, en de LCP is dus altijd een stuk tekst.
Uit de rapporten van de run van 22 november, mobiel, de middelste run:

| Pagina                 | LCP-element                                        | LCP             |
| ---------------------- | -------------------------------------------------- | --------------- |
| Homepage               | de inleiding in de eerste kaart (`p`)              | 1218 ms         |
| Archief, pagina 1 en 2 | de woordmerk-tekst in de kop (`.hf-logo-wordmark`) | 1197 en 1176 ms |
| Artikel                | de inleiding van het artikel (`p.hf-intro`)        | 987 ms          |
| Spelers                | de eerste alinea (`p`)                             | 1218 ms         |
| Bronnen                | de woordmerk-tekst in de kop                       | 1019 ms         |

### Waar de tijd naartoe gaat

Lighthouse meet de LCP niet, maar rekent hem uit: het neemt de echte run op de machine van de runner en speelt hem na met een trage 4G-verbinding (150 ms rondgang, 1,6 Mbit/s) en een processor die 4 keer trager is.
De echte run heeft een LCP van 0,66 seconde.
De nagespeelde heeft 1,2 seconde.
Het verschil is de verbinding die Lighthouse erbij rekent.

Voor de homepage op mobiel, 22 november:

- **De server:** 118 ms eerste byte, zoals de runner hem ziet.
  De nagespeelde run telt dat een op een mee, en 4 rondgangen (DNS, TCP, TLS en het verzoek) erbij: 733 ms tot de eerste byte.
  Dat is 60% van de LCP, en het is geen wijziging aan de pagina die dit verschuift.
- **Wat de pagina blokkeert:** het HTML-bestand (16,5 KiB), twee stylesheets (17,4 en 8,9 KiB) en `theme.js` (0,5 KiB), die tegelijk binnenkomen.
  Daarna ligt er nog ongeveer 490 ms tot de eerste verf.
- **De lettertypes:** twee (Truculenta 66,7 KiB en Atkinson 33,4 KiB), vooraf aangevraagd in de head.
  Ze zijn binnen voor de eerste verf en blokkeren niets: de tekst gebruikt eerst een vervangend lettertype met dezelfde maten (`font-display: swap`).
- **JavaScript:** 150 KiB, met lage prioriteit en `async`.
  Het blokkeert de eerste verf niet.
- **Afbeeldingen:** er zijn er geen.

De mediaan van de eerste byte op mobiel, over de zeven runs, is 156 tot 266 ms per pagina, en op `/nieuws` was hij op 22 november 432 ms.
Op een lokale computer is hij 15 tot 45 ms.

### Wat we probeerden, en wat het opleverde

Gemeten op een lokale build met dezelfde opdracht als hierboven: Lighthouse 13.6.0, mobiel, de middelste van drie runs per pagina, achter een kleine HTTP/2-proxy met TLS, zodat de protocolkeuze lijkt op die van acceptatie.
Zonder wijziging is de LCP 783 tot 928 ms; de server is lokaal 15 tot 45 ms.
De LCP springt in stappen van ongeveer 120 tot 150 ms (een rondgang), en wisselt op dezelfde pagina tussen twee waarden.
Alles hieronder valt binnen die ruis.
De rijen over de stylesheets en de CSS in het HTML-bestand zijn zonder proxy gemeten (gewoon HTTP, waar de build zonder wijziging gemiddeld 841 ms had), de andere met:

| Wat is veranderd (alleen om te meten)                            | Gemiddelde LCP van de zes pagina's                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------ |
| Niets (de huidige build)                                         | 852 ms                                                       |
| Alle JavaScript (150 KiB) leeggemaakt                            | 850 ms                                                       |
| Alle lettertypes (100 KiB) leeggemaakt                           | 850 ms                                                       |
| Het tweede stylesheet (9,6 KiB) leeggemaakt                      | geen verschil (zes pagina's, zelfde waarden)                 |
| Het eerste stylesheet teruggebracht tot 7,5 KiB, het tweede leeg | geen verschil                                                |
| De twee lettertypes niet meer vooraf aanvragen                   | 831 ms                                                       |
| De CSS in het HTML-bestand zetten (`inlineCss` van Next.js)      | 1212 ms, dus slechter (+50 KiB, de CSS stond er ook nog los) |

Wat hieruit volgt:

- Minder bytes van JavaScript, lettertypes of CSS maakt de LCP niet korter, want ze zitten niet op het pad naar de eerste verf.
  Een andere lettertypesubset, minder JavaScript of minder CSS komt daarom niet in aanmerking voor dit issue.
- De LCP bestaat uit de verbinding en de eerste byte (ongeveer 60%) en één ronde stylesheets.
  Daar kan de pagina zelf niets aan veranderen.
- De enige post die van ons is, is de antwoordtijd van de server op de host: 100 tot 430 ms op acceptatie tegen 15 tot 45 ms op een lokale computer.

### Wat er nog is

De LCP is niet onder 1100 ms gekomen, en deze pull request verandert geen code die de LCP raakt, omdat geen goedkope verandering hem verschoof.
Wat overblijft, voor een nieuw issue:

- **De antwoordtijd van de server op de host** meten en verlagen: waar gaan de 100 tot 430 ms heen (de pagina maken, de database, de proxy, de host zelf), en hoeveel wint een kortere weg?
  De nagespeelde LCP telt elke milliseconde ervan mee.
  Dit is in #1594 gedaan: zie het hoofdstuk hieronder.

## Waar de antwoordtijd van de host naartoe gaat (#1594)

De antwoordtijd is te splitsen met `node scripts/response-time.js <adres> [runs] [pad ...]`.
Het doet gewone GET-verzoeken van buiten, zonder dependency, en vraagt met `DNT: 1` om niet geteld te worden.
Per pad meet het de DNS, de TCP-verbinding, de TLS-handshake en het wachten op de eerste byte, op een nieuwe verbinding (koud) en op een verbinding die net is gebruikt (warm).
Het vergelijkt de pagina's met een klein bestand dat de server ook uitdeelt, `/theme.js`: dat bestand loopt langs dezelfde host en dezelfde proxy, maar er hoeft geen pagina gemaakt te worden en er is geen database.
Het verschil in wachttijd, warm, is de tijd die de site aan het maken van de pagina besteedt.
Dat is een schatting: hij is niet te splitsen in de pagina zelf en de database, want dat kan van buiten niet.

Gemeten op 23 november 2026 op <https://acc.sc.heerenveen.org>, 30 runs per pad, de mediaan, vanuit Nederland op een thuisverbinding.
De pagina's draaiden warm: de server had net verzoeken gehad, en elke run deed eerst een koud en dan een warm verzoek.
De tijden zijn in milliseconden, en de verbinding was snel (zie hieronder voor het IPv6-adres):

| Pad                         | Status | DNS | TCP | TLS | Wachten (koud) | Eerste byte (koud) | Hoogste | Wachten (warm) | Pagina maken |
| --------------------------- | ------ | --- | --- | --- | -------------- | ------------------ | ------- | -------------- | ------------ |
| `/theme.js` (klein bestand) | 200    | 3   | 20  | 29  | 25             | 79                 | 96      | 28             |              |
| `/`                         | 200    | 3   | 20  | 30  | 40             | 95                 | 114     | 45             | 16           |
| `/nieuws`                   | 200    | 3   | 22  | 30  | 39             | 93                 | 118     | 42             | 14           |
| `/redactie/we-zijn-terug`   | 200    | 3   | 22  | 30  | 31             | 87                 | 105     | 37             | 9            |
| `/spelers`                  | 200    | 3   | 22  | 30  | 37             | 93                 | 122     | 39             | 11           |
| `/bronnen` (10 runs)        | 200    | 3   | 23  | 30  | 34             | 87                 | 87      | 38             | 10           |

De rij van `/bronnen` komt uit een eerdere meting van dezelfde dag met 10 runs: bij de meting met 30 runs duurde de TCP-verbinding 273 ms, om de reden hieronder, en dat zegt niets over die pagina.

### Wat dit zegt

- **De pagina maken en de database samen: 7 tot 16 ms.**
  Dat is wat de site zelf kost, en het is de enige post die wij kunnen veranderen.
  Het komt overeen met de 15 tot 45 ms eerste byte op een lokale computer.
  De pagina's halen hun gegevens uit een cache in het geheugen van de server (`cacheFor`), dus een kortere weg met een cache wint hier niets meer.
- **De host en de weg erheen: 25 tot 28 ms wachten voor een bestand van een halve kilobyte, en ongeveer 55 ms voor DNS, TCP en TLS.**
  Dat is de verbinding van deze computer met de host, en de weg van LiteSpeed naar Node.
  Wij kunnen die niet veranderen zonder een andere host of een CDN, en dat valt buiten dit issue.
- **Van deze computer is de eerste byte 79 tot 95 ms, koud.**
  De dagelijkse controle meldt 156 tot 266 ms per pagina op mobiel, gemeten op een runner van GitHub, en 432 ms op `/nieuws` op 22 november.
  Dat verschil van 70 tot 340 ms zit dus niet in de site: ze maakt de pagina's in 7 tot 16 ms.
  Het zit in de weg tussen de runner en de host, of in de runner zelf.
  Van buiten is dat niet verder te splitsen.
- **Eén uitschieter per run:** de hoogste eerste byte is 96 tot 122 ms, niet meer dan 30 ms boven de mediaan, dus de server vertraagt niet af en toe.

### Een IPv6-adres dat niet antwoordt

`acc.sc.heerenveen.org` heeft een AAAA-record (`2a11:4881:1:9523::1`) en een A-record (`62.129.138.4`).
Op 23 november 2026 antwoordde het IPv6-adres een kwartier lang van deze computer niet (100% pakketverlies met ping, en `curl -6` komt niet aan), terwijl IPv4 in 20 ms verbond.
Node probeerde eerst IPv6 en viel na 250 ms terug op IPv4, en dat gaf een TCP-tijd van 273 ms in een meting.
De eerste metingen van die dag verbonden wel in 20 ms, dus het adres kan tijdelijk wel hebben geantwoord.
`curl -6 -m 8 -sI https://acc.sc.heerenveen.org/theme.js` kreeg ook bij een tweede controle na 8 seconden geen antwoord.
IPv6 werkt op die computer wel: `https://ipv6.google.com` verbond in 70 ms.
Het ligt dus aan het adres of aan de weg ernaartoe, niet aan IPv6 op die computer.
Een bezoeker met IPv6 die niet verbindt, valt na een korte tijd terug op IPv4, maar wacht eerst.
Of het IPv6-adres bij deze site hoort, is te zien in het paneel van mijn.host; hoort het er niet bij, dan kan de AAAA-record weg.

### Wat er niet is gedaan

Er is geen verandering aan de site gedaan.
Geen enkele post die van ons is, is meer dan 16 ms.
Een `Server-Timing`-header of een logregel met de tijd van het maken van de pagina is bewust niet toegevoegd: de proxy van Next.js draait voor de pagina en kan de tijd van de pagina niet meten, en 7 tot 16 ms is te klein om de moeite van een meting per verzoek te lonen.
De LCP komt hierdoor niet onder de 1100 ms; wat er nog is, staat in het nieuwe issue (zie de pull request).
