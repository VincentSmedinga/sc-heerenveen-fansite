# Site

## Sjablonen bevatten geen HTML, alleen componenten uit het designsysteem

- **Datum:** 21 oktober 2026
- **Besluit:** de sjablonen in `apps/site` (de layouts, de pagina's en de pagina voor een onbekend adres) bevatten geen HTML-elementen, alleen componenten uit het designsysteem.
  Een ESLint-regel bewaakt dat.
- **Waarom:** de opmaak en de toegankelijkheid zitten dan op één plek.
  Een pagina kan niet om het designsysteem heen, en een kop, een link of een lijst is overal gelijk en wordt alleen daar gecontroleerd.
- **Alternatieven:** HTML in de sjablonen, met de CSS-klassen van het designsysteem.
  Dat is vrijer, maar elke pagina kan dan eigen opmaak en eigen toegankelijkheidsfouten maken.

## De ESLint-regel herkent HTML aan de kleine letter

- **Datum:** 22 oktober 2026
- **Besluit:** de regel `no-restricted-syntax` van ESLint zelf meldt elk JSX-element waarvan de naam met een kleine letter begint, zoals `<main>` of `<li>`.
  In JSX is dat een HTML- of SVG-element.
  Een component begint met een hoofdletter, ook met een punt erin, zoals `List.Item`.
  De regel geldt voor alle `.tsx`-bestanden in `apps/site/src`, behalve tests.
  `templates.test.js` controleert dat hij werkt.
- **Waarom:** het is één regel in `eslint.config.js`, zonder nieuwe dependency.
  Omdat hij voor de hele site geldt en niet alleen voor de sjablonen, kan een pagina haar HTML niet naar een eigen component verplaatsen.
- **Alternatieven:** `react/forbid-elements` uit `eslint-plugin-react`.
  Dat is een nieuwe dependency, en je moet elk element zelf opsommen.
  Of een eigen ESLint-plugin; dat is meer code voor hetzelfde.
  Of de regel alleen voor `layout.tsx`, `page.tsx` en `not-found.tsx`; dan kan HTML in een ander bestand toch.

## Een Content Security Policy die derden blokkeert, zonder nonces

- **Datum:** 21 oktober 2026
- **Besluit:** de CSP stelt `default-src 'self'` in, met dezelfde grens voor de andere soorten verzoeken.
  Inline scripts en stijlen blijven toegestaan voor Next.js.
- **Hoe:** `apps/site/src/proxy.ts` zet de header, net als `X-Robots-Tag`.
  De proxy draait voor elk verzoek, dus ook een statisch bestand en de 404 krijgen hem.
  Hij noemt `script-src`, `style-src`, `img-src`, `font-src`, `connect-src`, `frame-src` en `form-action` apart, en `base-uri 'self'`, zodat een ingespoten `base` de adressen niet naar een ander domein kan sturen.
  Alleen `next dev` krijgt ook `'unsafe-eval'`, voor het herladen van code tijdens het werk.
  De rooktest controleert de header op elk soort antwoord, en dat de gebouwde pagina's niets van een ander domein laden.
- **Waarom:** het doel is dat een pagina niets van een ander domein laadt (principe 3 van de Redactie).
  Een CSP met nonces maakt elke pagina per verzoek anders, dus niets is nog te cachen, en dat kost snelheid op de gedeelde hosting en botst met de gecachete homepage (#73).
- **Alternatieven:** nonces vanaf het begin.
  Dat is strenger tegen ingespoten scripts.
  We bewaren het voor de beheerpagina's, waar inloggen het de moeite waard maakt (#30).
  Voor de plek: `headers()` in `next.config.ts`; maar de headers staan nu al in de proxy, en zo blijven ze op één plek.
- **Later:** zie _De CSP laat afbeeldingen van het type `data:` toe_ (28 oktober 2026): `img-src` is nu `'self' data:`.
  De rest van de lijst blijft zoals hij was.
- **Later:** zie _Geen frames en geen vensters met een opener: `frame-ancestors 'none'`, `X-Frame-Options: DENY` en COOP `same-origin`_ (6 november 2026): de CSP heeft ook `frame-ancestors 'none'`, en de proxy zet `X-Frame-Options: DENY` en `Cross-Origin-Opener-Policy: same-origin` op elk antwoord, tegen clickjacking op het beheer.
  De rest van de CSP en `'unsafe-inline'` blijven zoals ze waren.

## De lijst met bronnen staat een uur in het geheugen van de server

- **Datum:** 22 oktober 2026
- **Besluit:** de server maakt `/bronnen` bij elk bezoek opnieuw, maar vraagt de bronnen hoogstens één keer per uur aan de database.
  `cacheFor` in `apps/site/src/cache.ts` bewaart de lijst een uur in het geheugen van het serverproces.
  Daarna haalt het eerstvolgende bezoek hem opnieuw op.
  Een query die mislukt, bewaart het niet.
- **Waarom:** een wijziging in het register staat zo altijd binnen een uur op de pagina, ook na een rustige periode.
  De build leest de database niet, dus hij heeft geen database nodig en bevat geen testbronnen uit CI.
  De pagina opmaken kost weinig; de query is wat we besparen.
- **Let op:** draait de host meer processen, dan heeft elk proces een eigen lijst en doet elk hoogstens één query per uur.
- **Alternatieven:** `unstable_cache` van Next.js.
  Next.js 16 vervangt die door `'use cache'`.
  Hij geeft na het uur eerst nog de oude lijst en haalt de nieuwe op de achtergrond, dus na een rustige periode ziet de eerste bezoeker een lijst die ouder is dan een uur.
  Of `'use cache'` met Cache Components.
  Dat verandert hoe Next.js elke pagina maakt: de lijst komt dan bij het bouwen in de pagina, of in een Suspense-grens die zonder JavaScript verborgen blijft.
  Of ISR met `revalidate = 3600` op de pagina; dan leest de build de database en komen de bronnen van CI in de build.

## Het hoofdmenu leest het pad in een clientcomponent

- **Datum:** 22 oktober 2026
- **Besluit:** `SiteNavigation` is een clientcomponent die met `usePathname` de huidige pagina markeert, met `aria-current="page"`.
  De layout zet het menu in de header van elke pagina.
- **Waarom:** in Next.js krijgt een layout het pad niet, en de header hoort in de layout, zodat elke pagina hem heeft.
  De server zet de markering al in de HTML.
- **Alternatieven:** de header in elke pagina, met de huidige pagina als prop; dan herhaalt elke pagina de header.
  Of het pad lezen uit de headers van het verzoek; dan maakt de server elke pagina per bezoek, ook de homepage.
  Of de huidige pagina niet markeren.
- **Later:** zie _Het hoofdmenu kiest het onderdeel en de subpagina uit het pad_ (31 oktober 2026): `SiteNavigation` markeert nu ook een subpagina in de balk, en een onderdeel is ook huidig op de pagina's eronder.

## Het hoofdmenu kiest het onderdeel en de subpagina uit het pad

- **Datum:** 31 oktober 2026
- **Besluit:** `currentOf` in `SiteNavigation.tsx` kiest uit het pad het huidige onderdeel en de huidige subpagina.
  Een subpagina is huidig op precies haar eigen pad: `/nieuws/podcasts`, `/nieuws` en `/nieuws/zoeken`.
  Nieuws is het huidige onderdeel op die paden, op `/` en op elk artikel van de redactie (`/redactie/<naam>`), en Wedstrijden op `/wedstrijden` en elk pad eronder, zoals een seizoen.
  Op `/` en op een artikel is Nieuws zelf `aria-current="page"` en is er geen huidige subpagina; op een subpagina is die `aria-current="page"` en Nieuws `aria-current="true"`.
  Een ander pad, zoals `/bronnen` of een pad dat niet bestaat, heeft geen huidig onderdeel en geen balk.
- **Waarom:** de balk laat zien waar je bent binnen Nieuws, dus een artikel hoort bij Nieuws en een seizoen bij Wedstrijden.
  Een lijst van paden voor Nieuws laat een adres dat niet bestaat, zoals `/nieuws/bestaat-niet`, zonder markering, in plaats van dat het onder Nieuws valt.
  Onder `/wedstrijden` bestaat alleen wat bij de pagina hoort, dus daar telt elk pad.
- **Nadeel:** op een artikel van de redactie wijst `aria-current="page"` op een link naar `/`, terwijl het artikel een andere pagina is.
  `Navigation` toont de balk alleen bij een onderdeel dat huidig is of een huidige subpagina heeft, en heeft geen tussenvorm voor "hier, maar niet precies hier".
- **Alternatieven:** elk pad dat met `/nieuws/` begint onder Nieuws laten vallen (korter, maar een adres dat niet bestaat staat dan onder Nieuws).
  Op een artikel geen balk en Nieuws niet huidig (dan weet de bezoeker niet waar hij is).
  Een eigenschap op `Navigation` voor "in dit onderdeel" met `aria-current="true"` (juister, maar een wijziging in het designsysteem voor één pagina).
- **Later:** zie _De balk van Nieuws heeft Podcasts, Redactie en Zoeken, in die volgorde, altijd alle drie_ (6 november 2026): een artikel van de redactie hoort bij de subpagina Redactie, dus Nieuws is daar `aria-current="true"` en het nadeel hierboven vervalt.

## Het hoofdmenu begint met Nieuws, en de huidige pagina krijgt een rode streep

- **Datum:** 22 oktober 2026
- **Besluit:** het hoofdmenu toont Nieuws (de homepage), Onze bronnen en Forum, halfvet.
  De huidige pagina staat in de lichtste kleur van de header, met een rode streep van 3 pixels eronder.
  De andere onderdelen staan in de lichtblauwe kleur van de header, zonder onderstreping, en worden onderstreept onder de muis.
- **Waarom:** met Nieuws in het menu heeft ook de homepage een onderdeel dat de huidige pagina aanwijst.
  De streep wijst de huidige pagina aan met een vorm, niet alleen met een kleur.
  Over ons hoort bij de site, niet bij de inhoud, en blijft in de footer.
  Wedstrijden en Podcasts komen in het menu met hun eigen pagina's.
- **Hoe:** de opmaak van de header geldt voor de links van een `Navigation` die in een `Page.Header` staat, via `navigation.css`.
  Het menu in de footer heeft er geen last van en blijft zoals het was: de huidige pagina is vetter, met een dikkere onderstreping.
  De streep is de onderstreping van de link, zonder afbreking bij letters met een staart, en een nieuw token geeft hem zijn kleur: `--hf-colour-accent-on-header`, rood-400 in licht en donker.
  Rood-400 haalt 5,34:1 op de header in licht en 4,20:1 in donker, en nodig is 3:1 (WCAG 1.4.11).
  Het palet verandert niet.
  Het contrast staat bij Tokens › Kleur in Storybook.
- **Alternatieven:** het menu laten zoals het is, met alleen Onze bronnen en Forum; dan heeft de homepage geen onderdeel.
  Of Over ons ook in het menu, zoals op de artboard.
  Of een prop op `Navigation` voor de opmaak van de header; dan moet elke plek die het menu in een header zet, eraan denken.
- **Later:** zie _Het hoofdmenu staat in een eigen rij onder de sitenaam_ voor de opmaak van het menu: de onderdelen staan niet meer in halfvet en in de lichtblauwe kleur maar in gewicht 500 en de lichtste kleur van de header, en de huidige pagina heeft alleen de rode streep.
  De onderdelen van het menu zelf en de rode streep blijven.
- **Later:** zie _De site heeft vier onderdelen: Nieuws, Wedstrijden, Statistieken en Forum_ (31 oktober 2026): Podcasts komt niet meer in het menu maar onder Nieuws, en Statistieken komt erbij.
- **Later:** zie _De homepage en het nieuws zijn twee pagina's, en het forum staat bovenaan de zijbalk van de homepage_ (1 november 2026): het item Nieuws wijst naar `/nieuws` en niet naar de homepage, en de homepage heeft geen huidig onderdeel in het menu.
  De rode streep blijft.

## Een eigen foutpagina bij een fout op de server

- **Datum:** 22 oktober 2026
- **Besluit:** lukt een pagina niet door een fout op de server, dan toont de site een eigen foutpagina in de paginaopbouw.
  Die zegt dat het aan ons ligt en wat de bezoeker kan doen: later opnieuw proberen, naar de homepage gaan, of het op het forum melden.
  Een pagina die een fout verwacht, zoals `/bronnen` zonder database, vangt hem zelf op en zet de foutpagina in de HTML.
  Ze antwoordt dan met 200, met `noindex` in de HTML, en werkt zonder JavaScript.
  Een fout die niemand opvangt, valt terug op `app/error.tsx`: dezelfde tekst, met status 500, maar pas nadat de browser JavaScript heeft uitgevoerd.
- **Waarom:** een bezoeker moet weten dat de fout bij ons ligt, en wat er te doen is.
  De rest van de site blijft werken, dus alleen de pagina die de database nodig heeft, valt uit.
  Next.js 16 kan niet allebei: een pagina die gooit, geeft een 500 met een lege `body`, want `error.tsx` en `global-error.tsx` zijn clientcomponenten.
  Een pagina kan haar eigen statuscode niet kiezen (alleen 404, 403, 401 en een redirect).
  We kozen voor de tekst in de HTML boven de 5xx: ook zonder JavaScript weet de bezoeker wat er aan de hand is.
- **Let op:** een zoekmachine die de pagina binnenkrijgt terwijl de database uitvalt, haalt haar uit de index tot hij weer langskomt.
  Met een 5xx zou hij de oude versie houden.
- **Alternatieven:** de pagina laten gooien, met een echte 500 en de tekst pas na JavaScript; dan ziet een bezoeker zonder JavaScript een lege pagina.
  Of de pagina doorsturen naar `/fout`, dat de proxy met een 503 herschrijft; dan komen de HTML en de 5xx samen, maar verandert het adres en vraagt elke pagina een eigen terugpad.
  Of de standaardpagina van Next.js; die is Engels en legt niets uit.
  Of de oorzaak noemen, zoals de database; dat klopt niet bij elke fout, want de pagina weet de oorzaak niet.

## De homepage toont het nieuws van de afgelopen week, per dag

- **Datum:** 22 oktober 2026
- **Besluit:** de homepage toont alle berichten van vandaag en de zes dagen ervoor, in Nederlandse tijd, het nieuwste eerst, zonder maximum.
  Ze staan per dag onder een kop met de dag, zoals "woensdag 21 oktober", en elk bericht krijgt de tijd, zoals "14:05".
- **Waarom:** een week laat zien wat er speelt, ook als een bezoeker een paar dagen niet keek.
  Een kop per dag maakt een lange week overzichtelijk.
  Een vaste dag en tijd blijft kloppen in een pagina uit de cache en zonder JavaScript, anders dan "2 uur geleden".
- **Alternatieven:** een vast aantal, zoals de nieuwste 10 of 20.
  Of een maximum van 50 bij een drukke week.
  Of één lijst met de datum bij elk bericht.
  Of "vandaag" en "gisteren", of een relatieve tijd.
- **Later:** zie _Het nieuws staat in één lijst, met dag en tijd in een eigen kolom_.
  De kop per dag is weg; de week en het ontbreken van een maximum blijven.
- **Later:** zie _De homepage toont het nieuws van twee weken_.
  De lijst beslaat nu twee weken in plaats van een week; het ontbreken van een maximum blijft.

## Voorlopig is de query de poort voor het weergavebeleid

- **Datum:** 22 oktober 2026
- **Besluit:** de query voor de homepage geeft alleen de kop, de link, de tijd, de betaalmuur en de bronnaam.
  Het component voor een nieuwsregel heeft geen props voor een intro of foto.
  Het component dat het weergavebeleid van een bron leest, komt met de eerste bron die toestemming geeft.
- **Waarom:** de importer bewaart geen intro of foto, dus er valt nu niets te kiezen.
  Een component dat altijd hetzelfde beslist, is code zonder werking.
  Wat de query niet ophaalt, kan geen pagina tonen.
- **Alternatieven:** het component nu al bouwen, zoals #9 voorstelde, met het bericht en het beleid als invoer.

## De koppen staan vijf minuten in het geheugen van de server

- **Datum:** 22 oktober 2026
- **Besluit:** de server maakt de homepage bij elk bezoek, en vraagt de berichten hoogstens één keer per vijf minuten aan de database, met `cacheFor`, zoals bij `/bronnen`.
- **Waarom:** nieuws moet snel op de pagina staan, en één query per vijf minuten kost de gedeelde hosting niets.
  De build leest de database niet, net als bij `/bronnen`.
- **Alternatieven:** een uur, zoals de lijst met bronnen; dan staat een nieuw bericht er pas na een uur.
  Of ISR of `'use cache'`; die vielen om dezelfde redenen af als bij _De lijst met bronnen staat een uur in het geheugen van de server_.

## De toegankelijkheidscontrole zet zelf verzonnen koppen in de database

- **Datum:** 22 oktober 2026
- **Besluit:** `pnpm test:a11y` zet vóór de eerste test verzonnen koppen in de database, op de testbronnen van de seed, en haalt ze er na de laatste test weer uit (`apps/site/e2e/headlines.ts`).
  De seed bevat ze niet.
  Playwright wacht tot de site `/robots.txt` beantwoordt, en niet tot de homepage: een verzoek aan de homepage voor de koppen er staan, bewaart een lege lijst voor vijf minuten.
- **Waarom:** de seed draait ook op acceptatie, waar verzonnen koppen tussen de echte van de Leeuwarder Courant zouden staan.
  Zo toetst axe de homepage met berichten, op de gebouwde site en met de echte query.
  De test maakt de koppen ook zo dat ze altijd in de week vallen.
  Dat een bericht van ouder dan een week of van een uitgezette bron wegblijft, toetst `queries.test.ts` van `@fansite/db` op een echte MariaDB.
- **Alternatieven:** de koppen in de seed zetten.
  Of de pagina in een test renderen met een nepquery; dan toetst axe niet de gebouwde site en niet de query.
  Of de cache voor de test uitzetten; dat is een codepad dat alleen de test gebruikt.

## De Coordinator schrijft per release wat er nieuw is, in het Nederlands

- **Datum:** 22 oktober 2026
- **Besluit:** de pagina Wat is er nieuw toont per versie een paar zinnen in gewone taal.
  Bij elke release schrijft de Coordinator die uit `CHANGELOG.md` en de release-pull request, en de eigenaar keurt ze goed.
  Een kleine pull request zet ze in een bestand in de repository, vóór de release.
  Het nummer en de datum komen uit `CHANGELOG.md`, dus een versie verschijnt pas als ze is uitgebracht.
  De pagina begint bij de eerste versie, 0.1.0.
- **Waarom:** commitberichten blijven Engels en gaan over code; bezoekers willen weten wat ze merken.
  Eén stap per release kost minder dan een regel in elke pull request.
  Omdat release-please het nummer en de datum al schrijft, kunnen ze niet uit elkaar lopen.
  De site wordt in het openbaar gebouwd, dus ook de versies vóór de lancering horen erbij.
- **Alternatieven:** elke pull request die iets merkbaars verandert, schrijft zelf een zin onder "Binnenkort"; dan wordt niets vergeten, maar elke pull request krijgt een taak erbij.
  Of commitberichten in het Nederlands, zodat de changelog de pagina is; dat verandert een afspraak in `CONTRIBUTING.md`, en een commit gaat dan ook over bezoekers.
  Of de pagina pas laten beginnen bij 1.0.0, de lancering.
- **Later:** sinds 0.1.0 zijn het korte regels in plaats van hele zinnen.
  Hoe je ze schrijft, staat in `AGENTS.md`.
- **Later:** de pagina heet nu Updates en staat op `/updates`; zie _De pagina Wat is er nieuw heet Updates, op `/updates`_.

## Wat is er nieuw leest `CHANGELOG.md` bij de build

- **Datum:** 22 oktober 2026
- **Besluit:** de Nederlandse zinnen staan in `apps/site/src/release-notes.ts`, een object met per versie een lijst zinnen.
  De tekst van `CHANGELOG.md` zet de bundler bij de build in de code, met `import.meta.glob` en een regel voor `?raw` in `next.config.ts`.
  Next.js maakt de pagina bij de build.
  De smoke test vergelijkt de pagina met de `CHANGELOG.md` in de checkout.
- **Waarom:** TypeScript leest het bestand zonder parser en controleert de vorm, en een zin per regel geeft een kleine diff.
  Zo heeft de server geen bestand nodig, en een versie staat pas op de site als de build haar heeft.
  Zolang er nog geen release is, bestaat `CHANGELOG.md` niet; `import.meta.glob` vindt dan niets, waar een gewone `import` de build zou breken.
  Lukt het de bundler niet, dan toont de pagina zonder foutmelding geen versies; dat merkt alleen de vergelijking in de smoke test.
- **Alternatieven:** de zinnen in JSON, zonder commentaar en zonder controle van de vorm, of in Markdown, waar een parser bij hoort.
  Of `CHANGELOG.md` lezen als de server draait, en het bestand met `assemble.js` meekopiëren, zoals de migraties; dan zoekt de server een bestand, en een vergeten kopie geeft ook een lege pagina.
  Of een script dat vóór de build een TypeScript-bestand maakt; dat is een stap en een bestand meer.
- **Later:** de pagina heet nu Updates en staat op `/updates`; zie _De pagina Wat is er nieuw heet Updates, op `/updates`_.

## De feed van Wat is er nieuw kiest zijn adres met `SITE_ENV`

- **Datum:** 22 oktober 2026
- **Besluit:** de feed op `/wat-is-er-nieuw/feed.xml` leest bij elk verzoek `SITE_ENV`, en begint elke link met het adres van die omgeving: `https://acc.sc.heerenveen.org` op acceptatie, `https://sc.heerenveen.org` op productie en `http://localhost:3000` lokaal.
  De versies komen uit de build, zoals bij de pagina.
  De smoke test controleert de links op acceptatie en op productie.
- **Waarom:** een feedlezer heeft volledige adressen nodig.
  Dezelfde build draait op acceptatie en later op productie, dus het adres kan niet in de build staan.
  De adressen liggen vast (zie _Adressen_), en `SITE_ENV` kan een bezoeker niet veranderen.
- **Alternatieven:** het adres uit de `Host`-header van het verzoek; die kiest de bezoeker zelf, en een cache bewaart dan zijn adres.
  Of een variabele met het adres; die moet dan op elke omgeving kloppen met `SITE_ENV`.
- **Later:** de pagina heet nu Updates en staat op `/updates`; zie _De pagina Wat is er nieuw heet Updates, op `/updates`_.

## Eén korte pagina Over ons, met het bronnenbeleid en de privacyverklaring

- **Datum:** 22 oktober 2026
- **Besluit:** wie we zijn, hoe we werken (met verwijderverzoeken) en privacy staan op één korte pagina, `/over-ons`, elk onder een eigen kop en in een paar zinnen.
  De geschiedenis is een paar zinnen, met de oprichter, Vincent Smedinga, bij naam, en de mensen die meehielpen.
  De footer linkt naar de pagina en naar het onderdeel privacy.
- **Hoe:** de links staan onder elke pagina in de navigatie "Over de site", vóór Wat is er nieuw.
  Het onderdeel privacy heeft het vaste anker `#privacy`.
- **Waarom:** een korte pagina wordt gelezen, en een bezoeker of uitgever vindt alles op één plek.
  De details van het bronnenbeleid staan in het hoofdstuk Redactie van Storybook en op Onze bronnen.
  De AVG vraagt een privacyverklaring die makkelijk te vinden en te begrijpen is, geen lange of aparte pagina.
- **Alternatieven:** drie of vier pagina's (Over ons, Bronnenbeleid, Verwijderverzoeken en Privacy), zoals #24 eerst noemde.
  Of één uitgebreide pagina, met de hele geschiedenis, de importer en `robots.txt`, en een privacyverklaring met een vaste bewaartermijn.
- **Later:** privacy staat niet meer op deze pagina maar op een eigen pagina; zie _Privacy staat op een eigen pagina_.
- **Later:** de pagina heet nu Updates en staat op `/updates`; zie _De pagina Wat is er nieuw heet Updates, op `/updates`_.

## De homepage verbergt zijn `h1` voor het oog, en het blok heet Laatste nieuws

- **Datum:** 23 oktober 2026
- **Besluit:** de `h1` "sc Heerenveen Fansite" blijft op de homepage, maar alleen voor schermlezers.
  Het blok met het nieuws uit de media heet "Laatste nieuws".
- **Hoe:** de `h1` heeft de klasse `hf-visually-hidden` uit het designsysteem (zie _Hulpklassen zitten in de sterkste laag_).
- **Waarom:** het logo in de header zegt al "sc Heerenveen Fansite", vlak boven de kop.
  Een schermlezer heeft de `h1` nodig om te weten waar hij is, en elke pagina heeft er precies één.
  "Laatste nieuws" zegt wat er in het blok staat; dat het over sc Heerenveen gaat, zegt de site al.
- **Alternatieven:** de `h1` weghalen; dan heeft de homepage geen `h1`.
  Of "sc Heerenveen in de media" de `h1` maken; dan vallen latere blokken, zoals het forum of podcasts, onder die kop.
  Of een andere zichtbare `h1`, zoals "Nieuws over sc Heerenveen".
  Voor het blok: "In de media", of "sc Heerenveen in de media", zoals het eerst heette.

## Privacy staat op een eigen pagina

- **Datum:** 24 oktober 2026
- **Besluit:** de privacytekst staat op een eigen pagina, `/privacy`, en niet meer als onderdeel van Over ons.
  De footer linkt ernaar, en Over ons verwijst er met één zin naar.
- **Waarom:** een link "Privacy" naar een onderdeel van de pagina waar je al op staat, verwart: er verandert niets zichtbaars.
  Een eigen pagina met een link in de footer is makkelijk te vinden, en korter dan Over ons met alles erin.
  De AVG vraagt een privacyverklaring die makkelijk te vinden en te begrijpen is.
  Dat blijft zo, want de tekst wordt niet langer.
  Er zijn geen oude links, want de site staat nog niet op productie.
- **Alternatieven:** het onderdeel met anker op Over ons houden, zoals op 22 oktober besloten; dat verwart een bezoeker die al op die pagina is.
  Of de footerlink weghalen en alleen in Over ons verwijzen; dan is de privacytekst minder vindbaar.
  Of een omleiding voor `#privacy`; dat kan niet, want een server ziet het deel na de `#` niet.
- **Later:** zie _Eén korte pagina Over ons, met het bronnenbeleid en de privacyverklaring_ (22 oktober 2026): daarvan blijven Over ons en het bronnenbeleid, en vervalt het onderdeel privacy op die pagina.

## Licht of donker: twee knoppen, drie toestanden, en een keuze gelijk aan het systeem wordt vergeten

- **Datum:** 24 oktober 2026
- **Besluit:** de footer heeft een schakelaar met twee knoppen, Licht en Donker, in een groep met de naam "Thema". De knop van het thema dat je ziet is ingedrukt. Achter de knoppen staan drie toestanden: `system`, `light` en `dark`. Is het ingedrukte thema wat het systeem al geeft, dan vergeet de pagina de keuze en volgt hij het systeem. Dat gebeurt alleen als een knop wordt ingedrukt, nooit als het systeem verandert. Zonder JavaScript staat de schakelaar er niet.
- **Waarom:** twee van de drie knoppen van "Systeem, Licht, Donker" zien er meestal hetzelfde uit, en een knop die niets lijkt te doen, is verwarrend. Zo is het systeem nooit buiten bereik, en blijft een keuze die toevallig gelijk wordt aan het systeem (een telefoon die donker wordt) staan. We volgen de aanpak van Lea Verou, [Dark mode toggles: two states are enough](https://lea.verou.me/blog/2026/dark-mode-toggles-two-states-are-enough/), en die van een eerder project van de projecteigenaar. Een knop die zonder JavaScript niets doet, is erger dan geen knop.
- **Alternatieven:** drie knoppen, zoals dat eerdere project eerst had. Of één knop die naar het tegenovergestelde schakelt; die zegt minder duidelijk welk thema je ziet. Of geen schakelaar, want het systeem beslist al; dat laat wie de site donker wil op een licht apparaat in de kou staan.
- **Later:** zie _De themaschakelaar is één knop rechtsboven in de header_ voor de plek en het aantal knoppen: één knop in de header, niet twee in de footer.
  De drie toestanden en het vergeten van een keuze gelijk aan het systeem blijven.

## De keuze staat in `localStorage`, en `data-theme` staat alleen op `html` als er een keuze is

- **Datum:** 24 oktober 2026
- **Besluit:** de keuze staat in `localStorage` onder de sleutel `fansite-theme`, alleen als de bezoeker iets anders koos dan het systeem. `public/theme.js`, een script in de `head` (via `Head`), zet `data-theme` op `html` vóór de eerste weergave, en alleen als er een keuze is. Zonder keuze en zonder JavaScript volgt de CSS het systeem. `src/theme.ts` neemt het over zodra de pagina geladen is. De sleutel en de regel in het script en in de module moeten gelijk blijven; de tests lezen ze allebei.
- **Hoe:** `html` heeft `suppressHydrationWarning`, omdat het script het attribuut zet voordat React start. De schakelaar toont niets op de server en tijdens het hydrateren, dus de HTML is voor iedereen gelijk en de pagina's blijven cachebaar. De `theme-color` van de browser volgt het thema dat de bezoeker ziet: bij een keuze krijgen beide tags de kleur van de header, en bij het systeem komen de tags van de server terug. De privacyverklaring noemt de opslag.
- **Waarom:** geen cookie, dus geen toestemming en niets naar de server, en een pagina die voor iedereen gelijk is, blijft te cachen. Het attribuut alleen zetten bij een keuze laat het gedrag voor wie niets koos gelijk aan dat van nu, en laat het script weinig beslissen.
- **Gecontroleerd:** een e2e-test blokkeert de scripts van de app en ziet dat `public/theme.js` alleen al `data-theme` zet, en dat de keuze na vernieuwen blijft. axe slaagt met een keuze die afwijkt van het systeem, in beide richtingen.
- **Alternatieven:** een functioneel cookie; dat laat de server het goede thema meteen tonen zonder script, maar maakt elke pagina per bezoeker anders en vraagt de privacyverklaring bij te werken (een vraag van #149). Of `data-theme` altijd zetten; dat laat het script meer beslissen en vraagt dat het script en de pagina's elkaar overal gelijk houden.
- **Later:** zie _De invoer van het verslag staat in `localStorage`, met een knop om te herstellen_ (10 november 2026): `localStorage` dient er ook voor de eigen invoer van een beheerder, naast de themakeuze.

## De site test componenten met jsdom en Testing Library

- **Datum:** 24 oktober 2026
- **Besluit:** `apps/site` heeft `jsdom`, `@testing-library/dom` en `@testing-library/react` als devDependencies, in dezelfde exacte versies als het designsysteem. Een test die een DOM nodig heeft, zet bovenaan `// @vitest-environment jsdom`; de andere tests blijven in Node.
- **Waarom:** de schakelaar werkt met `localStorage`, `matchMedia` en `document`, en alleen een DOM laat zien dat een knop de keuze bewaart en dat de pagina het volgt. Het zijn geen nieuwe pakketten in de werkruimte, dus de lockfile kreeg alleen regels voor de site erbij.
- **Alternatieven:** de logica van de schakelaar in het designsysteem testen, waar jsdom al staat; dan staat de opslag in een component dat niets mag bewaren. Of alleen `renderToStaticMarkup`, zoals de andere tests van de site; dat ziet geen klik.

## De site mailt via SMTP van de hosting, vanaf de brievenbus van de redactie

- **Datum:** 23 oktober 2026
- **Besluit:** `sendMail` in `apps/site/src/mail.ts` verstuurt platte tekst via SMTP van de hosting, vanaf `fansite@heerenveen.org`, en niet via een dienst van een derde.
  Het contactformulier (#99) en de inloglink van het beheer (#30) gebruiken dezelfde functie.
- **Waarom:** de mail bevat berichten van bezoekers en inloglinks.
  Een mailbezorger zou die lezen en bewaren, en we sturen geen gegevens naar een derde.
- **Let op:** dit is de brievenbus die de redactie ook leest, dus het wachtwoord ervan staat nu ook op de host, in de app.
  Kan mijn.host een apart SMTP-wachtwoord of een tweede brievenbus maken, dan is dat veiliger.
  Dat verandert de code niet.
- **Alternatieven:** een mailbezorger zoals Postmark of Mailgun, die betrouwbaarder bezorgt maar een derde partij is en geld kost.
  Of `sendmail` op de server: geen dependency, maar afhankelijk van hoe de hosting het instelt, en zonder foutmeldingen.
- **Later:** zie _De importer mailt de projecteigenaar als dezelfde import drie runs achter elkaar faalt_.
  `sendMail` staat nu in `packages/shared/src/mail.ts`, en de site importeert hem nog uit `apps/site/src/mail.ts`; de rest blijft zoals het was.

## Voor SMTP gebruiken we nodemailer 10.0.16

- **Datum:** 24 oktober 2026
- **Besluit:** `apps/site` heeft `nodemailer` 10.0.16 als dependency.
  Licentie MIT-0, past bij de EUPL-1.2 (een vrije licentie zonder voorwaarden).
  Het pakket heeft zelf geen dependencies en geen installatiescript: `prepare` staat in zijn `package.json`, maar pnpm draait dat alleen voor pakketten uit een git-repository, niet voor die uit het register.
  `allowBuilds` blijft dus ongewijzigd.
- **Waarom:** een paar regels zijn niet genoeg.
  SMTP vraagt om STARTTLS, inloggen, de juiste codering van accenten in onderwerp en tekst (`=?UTF-8?…?=`, quoted-printable), een regel die met een punt begint, regels van hoogstens 998 tekens, en antwoordcodes die goed of fout zijn.
  Een eigen client daarvoor moeten we zelf bewaken, en de bezoekers schrijven in het Nederlands, dus accenten komen vaak voor.
  Nodemailer wordt onderhouden, en de bibliotheek doet precies dit en niets meer.
- **Versie:** 10.0.16 van 7 oktober 2026.
  De nieuwste versies zijn van de afgelopen dagen: er komt elke paar dagen een versie uit, en een versie die al een paar weken oud is, heeft de tijd gehad om fouten te laten zien.
- **Alternatieven:** een eigen SMTP-client op `node:tls`.
  Dat is geen dependency, maar de coderingen en de randgevallen zijn dan van ons.
  Of een andere bibliotheek; nodemailer is de gangbare keuze voor Node en heeft zelf geen dependencies.
- **Later:** zie _De importer mailt de projecteigenaar als dezelfde import drie runs achter elkaar faalt_.
  `nodemailer` is een dependency van `@fansite/shared`, waar `sendMail` nu staat, en niet meer van `apps/site`.

## Mail gaat altijd over TLS, en zonder instellingen alleen lokaal naar het logboek

- **Datum:** 24 oktober 2026
- **Besluit:** poort 465 begint met TLS; elke andere poort moet naar TLS overschakelen (STARTTLS) voordat `sendMail` inlogt, en een server die dat niet kan, krijgt geen mail en geen wachtwoord.
  Een mislukte poging wordt niet herhaald; de aanroeper vangt de `MailError` op.
  De vijf variabelen `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` en `MAIL_FROM` zijn op `acceptance` en `production` verplicht, dus de site start er niet zonder.
  Lokaal horen ze alle vijf te ontbreken of alle vijf te staan; dan schrijft `sendMail` de mail in het logboek van de ontwikkelaar en verstuurt niets.
- **Waarom:** een mailserver die geen TLS spreekt, zou het wachtwoord en de berichten van bezoekers in het openbaar sturen.
  Een site die zonder instellingen start, merkt pas bij het eerste contactbericht dat er niets verstuurd wordt.
  Alles of niets lokaal, omdat een half ingevulde set een vergissing is die de ontwikkelaar anders pas bij het versturen ziet.
- **Gevolg:** de rooktest en de toegankelijkheidscontrole starten de site met `SITE_ENV=acceptance`; ze krijgen verzonnen instellingen mee, want ze vragen geen mail aan (de inlogpagina mailt alleen voor een account, en de testdatabase heeft er geen).
- **Alternatieven:** ongecodeerd mailen als de server geen TLS kent (onveilig); de instellingen op acceptatie optioneel laten (de site start dan, maar mailt niet).
- **Later:** het contactformulier (#99) mailt nu, en de toegankelijkheidscontrole stuurt die mail naar een nepserver; zie _De browsertest mailt naar een eigen nepserver die de mails in een map zet_.
  De rooktest houdt de verzonnen instellingen, want hij laadt geen pagina die mailt.

## Een foutmelding van `sendMail` bevat alleen een code, en een adres is precies één adres

- **Datum:** 24 oktober 2026
- **Besluit:** `sendMail` weigert een nieuwe regel in de afzender, de ontvanger, het antwoordadres en het onderwerp, en elk van de drie adressen moet precies één adres zijn (zonder komma of puntkomma).
  Een mislukte verzending geeft een `MailError` met een vast bericht en alleen de code van de bibliotheek, zoals `EAUTH` of `ESOCKET`, zonder de oorspronkelijke fout als `cause`.
  `sendMail` zet niets van een verzonden mail in het logboek; alleen het logboek van de ontwikkelaar, zonder SMTP-instellingen, krijgt de hele mail.
- **Waarom:** een nieuwe regel zou een kopregel inspuiten, bijvoorbeeld een `Bcc`.
  Het antwoordadres komt van een bezoeker; met een komma zou hij een tweede ontvanger toevoegen.
  De foutmelding van de bibliotheek noemt het adres van de ontvanger en het antwoord van de server, en de aanroeper zet de fout in het logboek.
  Daar horen het wachtwoord, het adres en de tekst van een bezoeker niet te staan.
- **Alternatieven:** de nieuwe regels weghalen in plaats van weigeren; dat verbergt een fout van de aanroeper.
  Alleen een nieuwe regel weigeren, zoals het issue vraagt; dan blijven er meer ontvangers mogelijk via het antwoordadres.

## De test mailt naar een nepserver op de computer van de test

- **Datum:** 24 oktober 2026
- **Besluit:** `mail.test.ts` start een kleine SMTP-server in de test zelf (`node:net` en `node:tls`) met STARTTLS en inloggen, en laat `sendMail` daar naartoe mailen.
  Het certificaat maakt de test bij het starten met `openssl` en vertrouwt alleen de test (`tls.setDefaultCACertificates`).
  De opdracht voor de eigenaar is `send-test-mail.mjs`, dat `pnpm --filter site assemble` naast de importer in `apps/site` zet.
- **Waarom:** geen echte mail, geen echte gegevens en geen verzoek aan een derde.
  Er staat geen privésleutel in de repository, en geen extra dependency voor een testserver.
  De standalone build neemt alleen mee wat een pagina importeert, en geen pagina mailt nog; één bestand met alles erin werkt op de host zonder `node_modules`, zoals de importer.
- **Niet getest:** poort 465 (TLS vanaf het begin) en een echte mailserver; de test dekt STARTTLS, en de eigenaar controleert de rest met de proefmail op acceptatie.
- **Alternatieven:** `smtp-server` als devDependency; dat brengt een tweede versie van nodemailer mee, en `assemble` weigert twee versies van één pakket.
  Of een certificaat in de repository.
- **Later:** het contactformulier (#99) importeert `sendMail`, dus de standalone build neemt nodemailer nu mee; zie _De browsertest mailt naar een eigen nepserver die de mails in een map zet_.

## Het contactformulier mailt de redactie en slaat niets op

- **Datum:** 23 oktober 2026
- **Besluit:** een bericht via het formulier gaat alleen als mail naar de redactie, en komt niet in de database.
  We bewaren het tot de zaak is afgehandeld, hoogstens een jaar.
- **Waarom:** de redactie leest mail al, en het formulier hoeft dan niet te wachten op het beheer (#30).
  Er staan geen persoonsgegevens op de site zelf; de mailbox ruimt de redactie zelf op.
  Een belofte van "hoogstens een jaar" kunnen vrijwilligers houden.
- **Alternatieven:** opslaan in de database en lezen in het beheer (we zien dan ook wat er binnenkwam als mail verloren gaat, maar het hangt af van #30 en voegt een tabel met persoonsgegevens toe); of allebei.

## Spam weren met een val-veld en een limiet voor het hele formulier

- **Datum:** 23 oktober 2026
- **Besluit:** spam weren met een val-veld en een limiet voor het hele formulier, zonder diensten van derden en zonder IP-adressen te bewaren.
- **Waarom:** reCAPTCHA en dergelijke sturen bezoekers naar een derde (principe 3 van de Redactie).
  Een limiet per IP-adres vraagt om IP-adressen te bewaren.
  Dit is eenvoudig en dekt de meeste robots; komt er toch veel spam, dan bekijken we het opnieuw.
- **Alternatieven:** een rekensom of puzzel (kost toegankelijkheid, WCAG 3.3.8); een limiet per IP-adres; een tijdcontrole met een getekend tijdstip.

## Het formulier is een server action met een eigen bevestigingspagina

- **Datum:** 24 oktober 2026
- **Besluit:** `/contact` heeft een formulier dat een server action aanroept (`useActionState`, in `app/contact/actions.ts`).
  Zonder JavaScript is dat een gewone POST naar dezelfde pagina; met een fout komt de pagina terug met de fouten en het ingevulde, met succes stuurt de actie door (`redirect`, status 303) naar `/contact/verstuurd`.
  Die pagina staat niet in de sitemap en krijgt `noindex`.
  De actie controleert zelf dat de `Origin` bij de host hoort (`x-forwarded-host`, anders `host`) en weigert een verzoek zonder `Origin`; Next.js doet dezelfde controle ook al.
  Een verzoek van een andere site krijgt dezelfde melding als een mislukte verzending.
- **Waarom:** een server action werkt zonder JavaScript en geeft de pagina met de fouten terug, met de layout van de site eromheen.
  Een route handler kan geen pagina met fouten tonen zonder de ingevulde gegevens in een cookie of in de URL te zetten, en persoonsgegevens horen niet in een URL.
  Na het versturen stuurt de actie door naar een eigen adres, dus vernieuwen haalt alleen die pagina opnieuw op en verstuurt het formulier niet nog eens.
- **Alternatieven:** een route handler die bij een fout terugstuurt met de gegevens in een cookie of de URL; een bevestiging op dezelfde pagina na de POST, waarbij vernieuwen het formulier opnieuw verstuurt; of alleen controleren zoals Next.js dat doet, zonder eigen controle van `Origin`.

## Het val-veld heet `website`, en een robot krijgt dezelfde bevestiging als een bezoeker

- **Datum:** 24 oktober 2026
- **Besluit:** het `Honeypot` heeft de naam `website`.
  Is het ingevuld, dan stuurt de actie door naar de bevestiging en verstuurt niets.
  Zo'n bericht telt niet mee voor de limiet.
- **Waarom:** robots vullen een veld met zo'n naam graag in.
  Een foutmelding zou de robot leren dat hij is herkend.
- **Alternatieven:** een foutmelding of een lege pagina voor een robot.

## De limiet is tien berichten per uur in het geheugen van de server

- **Datum:** 24 oktober 2026
- **Besluit:** `createLimit` (`apps/site/src/rate-limit.ts`) onthoudt de tijden van de laatste berichten, voor het hele formulier samen.
  Een bericht met fouten, een robot en een geweigerde poging tellen niet mee; een bericht dat wel wordt verstuurd, ook als de mail mislukt, telt wel.
  De limiet begint opnieuw als de server herstart.
- **Waarom:** de eis is een bescherming tegen een stortvloed, geen exacte telling.
  Een bezoeker die een typefout herstelt, hoort niet tegen de limiet aan te lopen.
  Op gedeelde hosting kan er meer dan één proces zijn, dan telt elk proces apart; dat is hier acceptabel, omdat het alleen een bovengrens per proces is.
- **Alternatieven:** de tijden in de database of in een bestand (bewaart gegevens, voor weinig winst).

## Een leeg eerste antwoord bij het onderwerp, en de naam en link in de tekst van de mail

- **Datum:** 24 oktober 2026
- **Besluit:** de keuzelijst Onderwerp begint met "Kies een onderwerp" (waarde leeg), en de server weigert die keuze.
  De mail heeft het antwoord-adres van de bezoeker als `Reply-To` (alleen het adres, zonder naam), de onderwerpregel "Contact: <onderwerp>" met de woorden uit de lijst, en naam, adres, onderwerp en link in de tekst.
- **Waarom:** een lijst met een voorgekozen antwoord laat bezoekers het onderwerp verkeerd laten staan zonder dat ze het merken.
  Een naam in de kop `Reply-To` kan tekens bevatten die `sendMail` weigert (een komma, aanhalingstekens), dus de naam staat in de tekst.
- **Alternatieven:** "Een bericht laten verwijderen" als voorgekozen antwoord; de naam in de kop `Reply-To`.

## Bij een fout gaat de focus naar het blok met fouten

- **Datum:** 24 oktober 2026
- **Besluit:** na een verzending met fouten, of een mislukte verzending, krijgt het blok bovenaan de focus (`tabIndex={-1}`, `focus()` in een effect van `ContactForm`).
  Mislukt het versturen of is de limiet bereikt, dan staat dat in een `Card` met een kop, met een link `mailto:` naar de redactie, en geen `ErrorSummary`: er is geen veld om naartoe te linken.
  Die `Card` heeft ook `tabIndex={-1}`, en krijgt dan de focus.
- **Waarom:** met JavaScript laadt de pagina niet opnieuw, dus een schermlezer begint niet bovenaan en hoort anders niets (zie _Een formulier laat de controle aan de site_).
  Zonder JavaScript laadt de pagina opnieuw en staat het blok bovenaan; het effect doet dan na het laden hetzelfde.
- **Alternatieven:** `role="alert"` op het blok; dat leest op een pagina die opnieuw laadt niet betrouwbaar voor.

## De browsertest mailt naar een eigen nepserver die de mails in een map zet

- **Datum:** 24 oktober 2026
- **Besluit:** `e2e/contact.spec.ts` verstuurt het formulier naar `scripts/fake-smtp.js`, een kleine SMTP-server met STARTTLS die Playwright start en die elke mail als bestand in `.next/fake-smtp` zet.
  De test leest die map.
  De server maakt zelf een certificaat met `openssl`, en de sites in de test vertrouwen het via `NODE_EXTRA_CA_CERTS`.
- **Waarom:** de site draait in een ander proces dan de test, dus de test kan een mail alleen zien als de server die opslaat.
  Geen echte mail en geen verzoek aan een derde.
  `NODE_TLS_REJECT_UNAUTHORIZED=0` zou de controle van het certificaat voor het hele proces uitzetten.
- **Alternatieven:** de nepserver van `mail.test.ts` hergebruiken; die draait in het testproces zelf en kan de site niet bedienen.
  Of de verzending stubben; dan test de e2e-test de mail niet.

## Inloggen voor het beheer met een link per e-mail, zonder wachtwoord

- **Datum:** 23 oktober 2026
- **Besluit:** het beheer logt in met een inloglink per e-mail, zonder wachtwoord.
- **Waarom:** het beheer heeft een paar mensen.
  Een wachtwoord moet bewaard, gereset en tegen raden beschermd worden; een link per e-mail laat de mailserver de identiteit bewijzen, en we kunnen sessies intrekken.
- **Alternatieven:** wachtwoorden met een sterke hash en tweestapsverificatie (meer code en meer beveiligingsrisico); inloggen met het forum (#36, nog niet); een gedeeld wachtwoord zoals het prototype (geen persoonlijke verantwoording).

## Accounts voor het beheer maken we met een opdracht op de host

- **Datum:** 23 oktober 2026
- **Besluit:** accounts maken we met een opdracht op de host (`admin:create`), niet met een aanmeldpagina.
  Hoe die opdracht draait, staat onder _De opdrachten voor accounts zijn één bestand in de build_.
- **Waarom:** een aanmeldpagina is een aanvalsvlak en nog niet nodig voor een handvol mensen.
- **Alternatieven:** uitnodigen vanuit het beheer; dat kan later, met #31.

## Het logboek van beheeracties komt met de eerste beheeractie

- **Datum:** 23 oktober 2026
- **Besluit:** het logboek van beheeracties komt met de eerste beheeractie (#75), niet met het inloggen (#30).
- **Waarom:** het inloggen heeft nog geen acties om te loggen, en een logboek zonder gebruik is ongetest.
- **Alternatieven:** het logboek bij het inloggen bouwen, zoals het oorspronkelijke issue stond.

## Inloggen voor het beheer is eigen code, geen Better Auth

- **Datum:** 25 oktober 2026
- **Besluit:** het inloggen (`apps/site/src/beheer`) is eigen code op `node:crypto` en Drizzle, zonder bibliotheek.
  Het issue stelde Better Auth voor met de Drizzle-adapter, de plug-in voor inloglinks en zijn rate limiting.
  Dat hebben we eerst op MariaDB 10.11 geprobeerd (versie 1.7.12, MIT).
- **Wat werkte:** de Drizzle-adapter schrijft naar MariaDB, de plug-in maakt een link die één keer werkt (een tweede keer geeft `INVALID_TOKEN`), en het cookie is `HttpOnly`, `Secure` en `SameSite=Lax`.
  Het pakket heeft geen installatiescript, dus `allowBuilds` bleef gelijk.
- **Waarom toch niet:** vier eisen van het issue moesten we er alsnog omheen bouwen, en de rest is weinig code.
  - De rate limiting telt per IP-adres en route, en bewaart dat adres in de database.
    Het issue wil een telling per e-mailadres en voor de hele site, zonder IP-adressen.
  - De plug-in maakt een token, schrijft het in de database en roept `sendMagicLink` ook aan voor een adres zonder account.
    Dat een adres geen account heeft, blijkt pas bij het gebruik van de link.
    De controle op het account, het gelijk houden van de mail en de tijd van het antwoord zijn dan ons werk.
  - Een sessie loopt bij Better Auth op bij gebruik, met één `expiresIn`.
    "12 uur zonder activiteit én 7 dagen hoe dan ook" kent hij niet; we hadden een eigen controle bij elke aanroep nodig.
  - Standaard schrijft hij het IP-adres en de user agent van het verzoek in elke sessie; dat kan uit, maar het is een instelling die we moeten kennen en bewaken.
  - Het pakket brengt tientallen pakketten mee, waaronder adapters voor Prisma en MongoDB die we niet gebruiken, en een module die telemetrie kan versturen (uit, tenzij je haar aanzet).
    Wat overblijft is een willekeurige token, een hash ervan in de database, drie tabellen en een cookie: ongeveer 250 regels die we kunnen lezen en testen.
    Het project houdt het licht, en voegt geen dependency toe als een paar regels genoeg zijn (zie `CONTRIBUTING.md`).
- **Gevolg:** een nieuwe dependency is er niet: alleen `drizzle-orm` (dezelfde versie als het andere pakket) staat nu ook in `apps/site`.
  Een geheim voor het inloggen is er ook niet: een link en een sessie zijn 256 willekeurige bits, die we als SHA-256 bewaren, en niets wordt ondertekend.
  Er is dus geen nieuwe omgevingsvariabele.
- **Alternatieven:** Better Auth met veel eigen code eromheen, die de plug-in vooral overschrijft.
  Auth.js of Lucia: ook een bibliotheek voor een handvol accounts, en een rate limiting per e-mailadres is daar ook eigen werk.

## Een link en een sessie bewaren we als SHA-256, in de database

- **Datum:** 25 oktober 2026
- **Besluit:** een inloglink en een sessie zijn 32 willekeurige bytes (base64url).
  De tabellen `admin_login_links` en `admin_sessions` bewaren alleen de SHA-256 ervan.
  Een link werkt 15 minuten en één keer: de site verwijdert de rij en gaat alleen door als er precies één rij weg was, dus twee verzoeken tegelijk loggen niet allebei in.
  Een sessie is geldig zolang het minder dan 12 uur geleden is dat hij is gebruikt én minder dan 7 dagen geleden dat hij begon; `findSession` rekent dat bij elk verzoek na met `created_at` en `last_seen_at`, dus de 7 dagen zijn echt absoluut, ook voor een sessie die elk uur wordt gebruikt.
  Een sessie die is afgelopen, wordt weggehaald.
  `admin:revoke` zet het account uit en verwijdert zijn sessies en links; elk volgend verzoek vindt geen sessie meer.
  Uitloggen verwijdert de rij.
- **Waarom:** een kopie van de database logt dan niemand in, en 256 willekeurige bits raad je niet, dus een hash zonder zout is genoeg.
  Op de server bewaren maakt intrekken meteen werkzaam; een token met een einddatum erin (JWT) kan dat niet.
- **Het cookie:** `beheer-sessie`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/beheer`, `Max-Age` 7 dagen, met alleen de token erin.
  `Path=/beheer` houdt het uit verzoeken naar de rest van de site, en het is nog steeds het enige cookie dat de site zet.
  `Secure` geldt ook lokaal: Chrome en Firefox nemen het aan op `localhost`, Safari niet.
- **Alternatieven:** de token zelf bewaren (een gelekte database logt dan in); een ondertekend cookie met een einddatum (niet in te trekken zonder lijst op de server).
- **Later:** zie _Alleen de ontwikkelserver zet het cookie van het beheer zonder Secure_ (1 november 2026): `Secure` geldt niet meer onder `NODE_ENV=development`, omdat Safari het cookie anders niet bewaart op `http://localhost`.
  De rest van deze beslissing blijft.
- **Later:** zie _Het hoofdmenu toont Beheer voor wie ingelogd is, met een teken in `localStorage`_ (2 november 2026): het cookie blijft het enige cookie en gaat nog steeds alleen naar `/beheer`, maar de browser bewaart daarnaast een teken in `localStorage` dat alleen het menu verandert.
- **Later:** zie _Een sessie duurt 9 dagen zonder gebruik en 14 dagen hoe dan ook_ (8 november 2026): de 12 uur en 7 dagen, en het `Max-Age` van 7 dagen, zijn 9 en 14 dagen geworden.
  De rest van deze beslissing blijft.

## Het antwoord op een verzoek om een link is voor elk adres hetzelfde

- **Datum:** 25 oktober 2026
- **Besluit:** `requestLoginLink` stuurt elk goed gevormd adres naar `/beheer/inloggen/verstuurd`, met of zonder account, en mailt alleen voor een account dat aanstaat.
  De mail gaat na het antwoord weg (`after` van Next.js), en het antwoord duurt minstens 400 milliseconden, voor elk adres.
  Een adres zonder account krijgt geen mail en geen rij in `admin_login_links`.
  Een adres dat geen adres is, en de rate limit, sturen terug naar het formulier met een melding.
- **Waarom:** wie de pagina bekijkt, kan zo niet nagaan wie een account heeft: niet aan de tekst, niet aan de doorverwijzing, niet aan de tijd.
  Een mail versturen duurt seconden, dus een bekend adres zou anders trager antwoorden.
  De limiet geldt voor elk adres, ook een onbekend, dus de melding "te veel links gevraagd" verraadt ook niets.
- **Beperking:** wie de mailbox van een adres leest, ziet wel of er een mail kwam.
  Dat is de eigenaar van het adres, en geen aanvaller.
  Een mailserver die uitvalt, geeft de bezoeker geen fout: de site schrijft `Could not mail a login link` in het logboek, zonder het adres.
- **Alternatieven:** de mail vóór het antwoord versturen en de tijd gelijktrekken met een vaste wachttijd (de mailserver is dan te traag en te wisselvallig); een mail "er is geen account voor dit adres" sturen naar een onbekend adres (meer mail, en het adres is van een derde).

## De rate limit van het inloggen staat in een eigen tabel

- **Datum:** 25 oktober 2026
- **Besluit:** `admin_login_attempts` houdt per verzoek de SHA-256 van het adres (in kleine letters, zonder spaties) en de tijd bij, voor bekende en onbekende adressen.
  Een verzoek mag als er in de laatste 15 minuten minder dan 5 verzoeken voor dat adres waren, en minder dan 30 voor de hele site.
  De site schrijft de rij eerst en telt daarna; staat het verzoek boven de limiet, dan verwijdert hij zijn eigen rij weer.
  Zo glippen twee verzoeken tegelijk niet allebei onder de limiet door, en houdt een stroom verzoeken het venster niet dicht.
  Rijen ouder dan 15 minuten gaan weg bij het volgende verzoek.
  Er is geen IP-adres in de tabel.
- **Waarom:** de limiet moet werken als de host meer processen start, dus hij staat in de database.
  Een IP-adres is een persoonsgegeven en zegt weinig: achter één router zitten veel mensen, en een aanvaller wisselt van adres.
  De hash van het adres is geen geheim (een adres is te raden), maar de rijen bestaan 15 minuten en de adressen van het beheer staan toch al in `admin_users`.
- **Gevolg:** wie 30 verzoeken in een kwartier stuurt, sluit het inloggen voor iedereen voor een kwartier.
  Dat is wat "30 voor de hele site" betekent; bij een handvol beheerders is het acceptabel, en tegen raden helpt het.
- **Alternatieven:** de limiet per IP-adres (bewaart IP-adressen, en een aanvaller omzeilt hem); een teller in het geheugen (werkt niet bij meer processen).

## De link in de mail toont een knop; de knop logt in

- **Datum:** 25 oktober 2026
- **Besluit:** `/beheer/inloggen/bevestigen?token=…` logt niet in als je hem opent, maar toont de knop Inloggen; de knop gebruikt de link op en begint de sessie.
  De pagina controleert of de link nog werkt, zonder hem te gebruiken, en zegt anders "Deze link werkt niet".
- **Waarom:** een virusscanner of voorbeeldweergave opent een link in een mail voordat de persoon dat doet (Microsoft 365 heeft dat), en zou een link die maar één keer werkt opgebruiken.
  Dat is één klik meer voor wie inlogt.
- **Alternatieven:** inloggen bij het openen van de link (kortste weg, maar breekbaar bij mailscanners).

## `requireRole` is de ene controle, en een test loopt het beheer zelf na

- **Datum:** 25 oktober 2026
- **Besluit:** `requireRole(...rollen)` in `apps/site/src/beheer/require-role.ts` leest het cookie, zoekt de sessie en stuurt een bezoeker zonder sessie naar `/beheer/inloggen`.
  Een sessie met een rol die niet mag, krijgt "niet gevonden".
  Elke pagina, route en serveractie onder `/beheer` roept hem als eerste aan, behalve drie pagina's en twee acties om in te loggen, die een lijst in de test met naam noemt.
  `routes.test.ts` zoekt de bestanden zelf op: elke `page.tsx` en `route.ts` onder `app/beheer`, en elk bestand in de hele site met `'use server'`.
  Voor elk bestand dat niet open staat, controleert hij twee dingen: de tekst roept `requireRole(` aan, en de bestanden worden echt aangeroepen zonder cookie en zonder database en moeten naar de inlogpagina sturen.
  Een nieuwe pagina, route of actie die `requireRole` niet als eerste aanroept, laat de test falen, ook als niemand haar in een lijst heeft gezet.
- **Waarom:** de proxy ziet een pad, niet welke actie een verzoek aanroept, en een pad dat de matcher mist, staat open.
  De test hoeft niet te weten welke acties er zijn.
  Dat de database onaangeroerd blijft, bewijst dat de weigering vóór alles komt.
- **Beperking:** de test roept een actie zonder argumenten aan; een actie die haar argumenten leest vóór `requireRole`, faalt dus ook.
  Dat is bedoeld.
- **Alternatieven:** de controle in de proxy (te makkelijk te omzeilen); een lijst van acties in de test (vergeet iemand).

## Het beheer krijgt zijn eigen headers, en `robots.txt` weigert het overal

- **Datum:** 25 oktober 2026
- **Besluit:** de proxy geeft elk antwoord onder `/beheer` (en `/beheer` zelf) `X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store` en `Referrer-Policy: no-referrer`, op elke omgeving, productie ook.
  De `Referrer-Policy` is sinds #75 `same-origin`; zie _Het beheer stuurt een referrer naar de eigen site, zodat formulieren zonder JavaScript werken_.
  `/robots.txt` heeft `Disallow: /beheer` op elke omgeving.
  Next.js stuurt voor een pagina die het per verzoek rendert een eigen, langere waarde (`private, no-cache, no-store, max-age=0, must-revalidate`); die bevat `no-store` ook, en de rooktest controleert dat.
  De pagina's zeggen ook `noindex, nofollow` in de HTML, en staan niet in de sitemap.
- **Waarom:** de inloglink staat in het adres van een pagina; zonder `Referrer-Policy` zou hij als referrer naar een andere site kunnen gaan, en een cache mag niets van het beheer bewaren.
- **Alternatieven:** alleen `noindex` in de HTML (een zoekmachine ziet dat pas na het ophalen); de headers in `next.config.ts` (dezelfde plek als de andere headers is de proxy).

## De opdrachten voor accounts zijn één bestand in de build, dat alleen `DATABASE_URL` leest

- **Datum:** 25 oktober 2026
- **Besluit:** `apps/site/src/admin.ts` is de opdracht (`create` en `revoke`).
  Lokaal draaien `pnpm admin:create <e-mailadres> <rol>` en `pnpm admin:revoke <e-mailadres>` hem met Node en de `.env` in de root.
  `assemble` bundelt hem met esbuild in `apps/site/admin.mjs`, naast de proefmail, en de host draait hem met het volledige pad van Node en `--env-file=~/fansite-acceptatie.env`, zoals de importer.
  Hij leest alleen `DATABASE_URL` (met `readDatabaseEnv`, net als de importer) en heeft geen `SITE_ENV` of mailinstellingen nodig.
  `create` voor een adres dat al aanstaat, verandert niets en stopt met 1; voor een uitgezet account zet hij het weer aan met de nieuwe rol.
  `revoke` zet het account uit (`disabled_at`) en verwijdert zijn sessies en links; de rij blijft, zodat het account niet verdwijnt uit het zicht.
  Een test (`apps/importer/src/bundle-admin.test.ts`) bundelt hem zoals `assemble` doet, draait hem buiten de repository met `--env-file` en zonder `node_modules` of `DATABASE_URL` in de omgeving, en controleert beide opdrachten tegen de testdatabase.
- **Waarom:** de host heeft alleen de standalone build en Node, geen pnpm, en een SSH-sessie krijgt de variabelen van de Node.js-app niet (zie _De site draait de migraties als ze start_ en `docs/acceptatieomgeving.md`, stap 8 tot en met 10).
  Eén bestand en één bestand met `DATABASE_URL` is wat de importer al gebruikt, dus de eigenaar leert niets nieuws.
- **Alternatieven:** een beheerpagina om accounts te maken (een aanvalsvlak, en buiten dit issue); de opdracht in `apps/site/server.js` laten draaien (dat vraagt de variabelen van de site, en meer van de host).

## Alleen de ontwikkelserver zet het cookie van het beheer zonder Secure

- **Datum:** 1 november 2026
- **Besluit:** het cookie `beheer-sessie` is `Secure` behalve onder `NODE_ENV=development`.
  `sessionCookieOptions` in `apps/site/src/beheer/require-role.ts` kiest dat op één plek, en inloggen en uitloggen gebruiken die opties.
- **Waarom:** Safari bewaart een `Secure`-cookie niet op `http://localhost`, dus de projecteigenaar kon lokaal niet inloggen in zijn eigen browser.
  De ontwikkelserver (`pnpm --filter site dev` en `pnpm review`) draait alleen op de computer van de ontwikkelaar.
  Wat echt gebruikt wordt, houdt `Secure`: acceptatie, productie en elke gebouwde site, ook die van de rooktest en de e2e-tests.
  Een afweging op `NODE_ENV` kan een verzoek niet beïnvloeden, een afweging op de `Host`-header wel.
- **Alternatieven:** `Secure` weglaten wanneer het verzoek `http` is op `localhost` (de header is door de verzender te kiezen); lokaal HTTPS met een zelfgemaakt certificaat (een extra stap voor elke ontwikkelaar); alles laten zoals het is en Chrome of Firefox gebruiken.
- **Later:** vervangt de regel "`Secure` geldt ook lokaal" van _Een link en een sessie bewaren we als SHA-256, in de database_; de rest van die beslissing blijft.

## De privacyverklaring noemt het cookie van het beheer

- **Datum:** 25 oktober 2026
- **Besluit:** `/privacy` zegt nog steeds "De site zet geen cookies" bovenaan, en heeft een alinea dat wie inlogt in het beheer één cookie krijgt: alleen een nummer voor de sessie, alleen naar de pagina's van het beheer, hooguit 7 dagen, en nooit voor een bezoeker.
- **Waarom:** de eerste zin klopt voor bezoekers, en de rest zegt wat voor de redactie anders is.
  De alinea staat bij de andere dingen die we moeten noemen, en het cookie is geen tracking.
- **Alternatieven:** de eerste zin veranderen in "De site zet geen cookies voor bezoekers"; die zin is al waar, en de intro hoeft niet te veranderen.

## Een bericht verbergen zet drie kolommen op `items`, en elke query die berichten toont sluit het uit

- **Datum:** 25 oktober 2026
- **Besluit:** `items` krijgt `hidden_at`, `hidden_by` (het account, een foreign key op `admin_users`) en `hidden_reason` (hoogstens 300 tekens), alle drie leeg voor een bericht dat te zien is.
  Elke query die berichten toont sluit een verborgen bericht uit met `hidden_at IS NULL`: de koppen van de homepage, de afleveringen en hun aantal, en de podcasts die in het filter staan.
  Een test per query bewijst het.
  "Toon weer" maakt de drie kolommen leeg; wie het verborg en waarom, staat dan nog in het logboek.
  De sitemap toont geen berichten, alleen pagina's, dus daar valt niets te verbergen.
- **Waarom:** het bericht moet in de tabel blijven, zodat de importer het niet opnieuw als nieuw ziet en weer neerzet.
  Een kolom op `items` houdt de query eenvoudig: een bericht is te zien of niet, en de koppen van de homepage hoeven geen tweede tabel te lezen.
- **Let op:** een nieuwe query op `items` voor een pagina moet `hidden_at IS NULL` ook hebben.
  De opmerking bij `listRecentItems` zegt het, en het beheer zelf (`listItems`) is de enige die verborgen berichten toont.
- **Alternatieven:** een aparte tabel `hidden_items` (een join in elke query, en het bericht en zijn verbergen kunnen uit elkaar lopen); het bericht verwijderen (de importer zet het bij de volgende run terug).
- **Later:** de voorwaarde staat nu in `isShown`, samen met `relevance = 'relevant'`; zie _De site toont alleen `relevant`, en het beheer toont alles met een woord erbij_.

## De importer laat een verborgen bericht met rust, in de query zelf

- **Datum:** 25 oktober 2026
- **Besluit:** het `INSERT … ON DUPLICATE KEY UPDATE` van `storeItems` zet elke kolom op de nieuwe waarde alleen als `hidden_at` leeg is (`unlessHidden`).
  Een verborgen bericht verandert dus niet: niet de kop, de link, de tijd of de betaalmuur, en ook `last_seen_at` niet.
  Het telt als ongewijzigd in het verslag.
- **Waarom:** de moderator verborg het om een reden, bijvoorbeeld een fout in de kop of een verzoek van de bron, en de bron biedt het bericht bij elke run opnieuw aan.
  Een controle op de rij die de importer eerst las, mist een bericht dat een moderator tijdens de run verbergt; de voorwaarde in de query zelf mist dat niet.
- **Alternatieven:** een bericht met `hidden_at` vooraf uit de lijst halen (snel, maar met die kleine kans op een bericht dat net verborgen is); een tabel met verborgen sleutels (een tweede plek om bij te houden).

## Het logboek van het beheer krijgt één schrijffunctie, en alleen toevoegen

- **Datum:** 25 oktober 2026
- **Besluit:** `audit_log` heeft per actie één rij: `created_at`, `user_id`, `action` (`item.hide` of `item.show`), `item_id` en `reason`.
  Alleen `recordAction` (`apps/site/src/beheer/audit-log.ts`) schrijft erin, binnen dezelfde transactie als de wijziging zelf, dus er is geen wijziging zonder regel en geen regel zonder wijziging.
  Een actie die niets verandert, zoals een bericht verbergen dat al verborgen is, schrijft niets.
  Er is geen code die een rij wijzigt of verwijdert, en `audit-log.test.ts` leest de broncode van de site, de importer en het databasepakket om dat vast te houden: alleen `schema.ts` en `audit-log.ts` noemen de tabel, en `audit-log.ts` doet alleen een `INSERT`.
- **Wat erin staat, en wat niet:** het nummer van het account en niet het e-mailadres, want de rij blijft bewaard en het adres van een ander is niet nodig om te weten wie het was (`admin_users` heeft het adres).
  De reden is tekst van een moderator, hoogstens 300 tekens, en de pagina toont haar als tekst.
  `recordAction` kopieert alleen die vier velden, dus een verzoek of een token kan er niet per ongeluk in komen.
  `item_id` heeft geen foreign key, zodat de rij blijft als het bericht verdwijnt (bijvoorbeeld als zijn bron wordt verwijderd).
  `user_id` heeft er wel een, zonder `ON DELETE`: een account met regels in het logboek is niet te verwijderen, en `admin:revoke` zet het uit.
- **Waarom:** het logboek moet bewijzen wat een moderator deed, ook als die het later anders zegt, en daarvoor mag de site het niet kunnen aanpassen.
- **Beperking:** "alleen toevoegen" is een afspraak in de code met een test, geen recht in de database.
  De databasegebruiker van de site kan een rij nog wijzigen met eigen SQL, en een trigger of een gebruiker zonder `UPDATE` en `DELETE` verandert dat.
  Dat kan later, als we het logboek tegen iemand met toegang tot de database moeten bewijzen.
- **Alternatieven:** triggers die `UPDATE` en `DELETE` weigeren (de gebruiker met het recht `TRIGGER` kan ze weer weghalen, en het is meer om te onderhouden dan dit issue vraagt); het e-mailadres in het logboek zetten (persoonsgegevens, en een adres dat verandert).
- **Later:** het logboek heeft ook de acties van de artikelen; zie _Een artikel schrijven geeft vier acties in het logboek, en schrijft alleen als er iets veranderde_.
- **Later:** het logboek heeft ook regels van de import, zonder account, en de functie staat in het databasepakket; zie _Het logboek van het beheer heeft ook regels van de import, zonder account_.
- **Lezen:** er is nog geen scherm voor.
  `docs/acceptatieomgeving.md` heeft de vraag voor phpMyAdmin.

## `/beheer/berichten` is een lijst met gewone formulieren, en toont wat de database nu zegt

- **Datum:** 25 oktober 2026
- **Besluit:** `/beheer/berichten` toont de 50 nieuwste berichten van alle bronnen, verborgen ook, als `NewsItem` met eronder het formulier om te verbergen (een veld voor de reden en de knop Verberg) of de reden en de knop Toon weer.
  Het zoeken is een formulier met `method="get"` (`?q=`): `LIKE` op de kop en de link, met `%`, `_` en `|` als gewone tekens, hoogstens 100 tekens.
  Verbergen en tonen zijn serveracties met het nummer van het bericht en de zoekopdracht gebonden aan de actie (zoals `logIn` het token), en worden toch opnieuw gecontroleerd, want ze komen van buiten.
  De reden wordt één regel (besturingstekens en dubbele spaties worden één spatie), is verplicht en is hoogstens 300 tekens, geteld in tekens zoals de kolom ze telt.
  Na elke actie gaat de pagina terug naar de lijst, met dezelfde zoekopdracht: een fout in het adres (`?fout=reden-leeg&bericht=<nummer>`), zoals het inloggen doet, en een melding dat het gelukt is (`?verborgen=<nummer>`).
  De fout staat in een `ErrorSummary` bovenaan en bij het veld van dat bericht, de melding in een kaart met een kop.
  Die melding komt uit de database van dat moment: `?verborgen=` zegt alleen iets over een bericht dat echt verborgen is, en een gemaakt adres kan de pagina dus niets laten beweren wat niet gebeurde.
- **Waarom:** het werkt zonder JavaScript, en een moderator die een bericht uit een verwijderverzoek zoekt, vindt het met een stukje van de kop of de link.
  De lijst gebruikt alleen componenten die er al zijn, dus er is geen nieuw onderdeel in het designsysteem.
  De zinnen "Staat binnen vijf minuten niet meer op de site" en "weer op de site" kloppen: de homepage en `/podcasts` bewaren hun lijsten vijf minuten (`src/headlines.ts`, `src/podcasts.ts`), en `src/headlines-hidden.test.ts` bewijst met een echte database en de klok van de cache dat een bericht na 4 minuten en 59 seconden nog staat en na 5 minuten weg is.
- **Alternatieven:** de cache leeghalen bij het verbergen (alleen in het proces dat de actie draait, en op de host kunnen er meer zijn); een vertraging in de zin (we zouden iets beloven wat we niet kennen); een client-component met `useActionState` zoals het contactformulier (de fout blijft dan alleen bij het veld, en 50 formulieren met JavaScript erbij zijn zwaarder); de reden in een tekstvak (een reden is één regel).
- **Later:** zie _De lijst in het beheer heeft een schakelaar voor wel en niet op de site_ (2 november 2026): de lijst is nu twee groepen van elk de nieuwste 50, het zoekveld en de acties houden de groep vast, en bij een verborgen bericht staat ook wie het verborg.

## Het beheer stuurt een referrer naar de eigen site, zodat formulieren zonder JavaScript werken

- **Datum:** 25 oktober 2026
- **Besluit:** de `Referrer-Policy` van alles onder `/beheer` is `same-origin` en niet `no-referrer`.
- **Waarom:** met `no-referrer` stuurt Chromium bij een formulier dat post `Origin: null`, en Next.js weigert dan elke serveractie ("Invalid Server Actions request").
  Elk formulier van het beheer, het inloggen ook, werkte daardoor niet zonder JavaScript; met JavaScript gebruikt de pagina `fetch`, en dat stuurt het goede `Origin`.
  Een browsertest zonder JavaScript liet het zien.
  `same-origin` doet voor de inloglink hetzelfde als `no-referrer`: naar een andere site gaat geen referrer, dus de link in het adres blijft van ons.
- **Alternatieven:** bij `no-referrer` blijven en het beheer alleen met JavaScript laten werken (dan haperen de formulieren juist bij wie geen JavaScript kan gebruiken); `Origin: null` toestaan in `serverActions.allowedOrigins` (de controle tegen vervalste verzoeken wordt dan zwakker).

## De browsertest van het beheer zet een moderator met een sessie in de testdatabase

- **Datum:** 25 oktober 2026
- **Besluit:** `e2e/admin.ts` maakt vóór de eerste test een moderator (`e2e-moderator@example.test`) en zijn sessie in de database van de controle, op dezelfde manier als `startSession`, en geeft de browser het cookie.
  De token is voor elke run nieuw (`newToken`), staat in `E2E_ADMIN_TOKEN` voor de processen van de tests, en het account, de sessie, de logregels en de verzonnen berichten gaan er na de laatste test weer uit.
  De opzet schrijft alleen naar een database op deze computer (`127.0.0.1`, `::1` of `localhost`) en stopt met een fout voor elke andere host.
  `pages.spec.ts` kent een regel met `admin: true` voor een pagina van het beheer, en `admin.spec.ts` verbergt en toont een verzonnen bericht, met en zonder JavaScript.
  De verzonnen berichten staan op de uitgezette testbron, zodat de homepage en `/podcasts` ze nooit tonen en een test die er een verbergt, niets verandert voor een andere.
- **Waarom:** een inloglink is een mail, en een browsertest kan er geen volgen zonder mailbox.
  De site krijgt er niets voor: geen route, geen omgevingsvariabele en geen vaste token, dus er is niets dat op acceptatie of productie een sessie kan maken.
  `e2e/` zit niet in de build, en de weigering voor een andere host houdt een verkeerde `DATABASE_URL` tegen.
  Een sessie die de controle zelf in de database zet, toetst wel `requireRole`, de cookie en de pagina, want de site leest de sessie net zo.
- **Beperking:** de teardown verwijdert de logregels van het testaccount met een eigen `DELETE`, anders weigert de foreign key het account te verwijderen.
  Dat mag alleen hier, op de database op deze computer; de site heeft geen manier om een regel te verwijderen.
- **Alternatieven:** de inloglink uit de nepmailserver van het contactformulier halen en echt inloggen (dichter bij de werkelijkheid, maar elke test mailt dan en wacht, en de limiet van 5 links per kwartier raakt het); een route in de site die in testmodus inlogt (een deur die op acceptatie open kan staan); `SITE_ENV` als sleutel gebruiken (de controle draait met `acceptance`, dus dat zou juist die omgeving openzetten).

## De pagina van de inloglink zegt dat de link klopt

- **Datum:** 25 oktober 2026
- **Besluit:** boven de knop Inloggen staat "Deze link klopt. Kies hieronder Inloggen om binnen te komen." in plaats van "Je bent bijna binnen. Kies Inloggen om door te gaan."
- **Waarom:** de extra klik na de link in de mail voelde als een fout (zie _De link in de mail toont een knop; de knop logt in_).
  De pagina zegt eerst dat het goed gaat, en dan wat er nu moet gebeuren, in de woorden van de knop.
- **Alternatieven:** de knop weghalen en bij het openen inloggen (breekt bij mailscanners, zie hetzelfde besluit).

## Eén pagina `/wedstrijden` voor programma, uitslagen en stand

- **Datum:** 25 oktober 2026
- **Besluit:** programma, uitslagen en stand staan samen op één pagina, `/wedstrijden`, onder drie kopjes.
  De blokken op de homepage linken er direct naartoe, de stand naar `/wedstrijden#stand`.
- **Waarom:** supporters zoeken ze samen en één pagina is minder om te bouwen en te onderhouden.
- **Alternatieven:** een pagina `/stand` apart (kortere pagina's, maar twee menu-items en twee keer een bronvermelding).
- **Later:** zie _De site heeft vier onderdelen: Nieuws, Wedstrijden, Statistieken en Forum_ (31 oktober 2026): de kaarten met cijfers staan niet meer op die pagina maar op `/statistieken`.
  Programma, uitslagen en stand blijven op `/wedstrijden`.

## Blokken onderaan de zijbalk

- **Datum:** 26 oktober 2026
- **Besluit:** de blokken "Wedstrijden" en "Stand" staan onderaan de zijbalk van de homepage, onder de discussies en de podcasts.
  Op een telefoon staat de zijbalk onder het nieuws, dus de blokken staan dan onderaan de pagina.
- **Waarom:** de projecteigenaar koos dit bij het bouwen van #271.
  De specificatie van 25 oktober had ze bovenaan, boven de discussies en de podcasts, omdat de volgende wedstrijd het eerste is wat supporters willen weten.
- **Alternatieven:** bovenaan de zijbalk, boven de discussies en de podcasts (de eerste specificatie van 25 oktober); in de hoofdkolom boven het nieuws (valt het meest op, maar verdringt het nieuws).
- **Later:** zie _De homepage en het nieuws zijn twee pagina's, en het forum staat bovenaan de zijbalk van de homepage_ (1 november 2026): de zijbalk begint met het forum, dan Wedstrijden en Stand, en eindigt met de podcasts.

## Het programma, de volgende wedstrijd en de uitslagen volgen uit de status

- **Datum:** 26 oktober 2026
- **Besluit:**
  - het programma is elke wedstrijd van het lopende seizoen die niet gespeeld is (`scheduled` en `postponed`), op volgorde van de dag;
  - een uitgestelde wedstrijd staat erin met "Uitgesteld" in plaats van een tijd, op haar oorspronkelijke dag;
  - een wedstrijd blijft in het programma tot Wikipedia de uitslag heeft;
  - de volgende wedstrijd van de homepage is de eerste wedstrijd van het programma met de status `scheduled`, dus niet een uitgestelde wedstrijd zonder nieuwe datum;
  - de uitslagen zijn de gespeelde wedstrijden, de nieuwste bovenaan;
  - het blok "Wedstrijden" op de homepage heeft alleen de vorige en de volgende wedstrijd, in één lijst van twee: de nieuwste uitslag en de volgende wedstrijd.
    De projecteigenaar koos dit op 26 oktober 2026; de specificatie had de volgende wedstrijd en de laatste drie uitslagen.
- **Waarom:** een uitgestelde wedstrijd zonder nieuwe datum is geen volgende wedstrijd, maar een supporter wil wel zien dat hij is uitgesteld.
  Wie op de datum afgaat, laat een wedstrijd verdwijnen waarvan Wikipedia de uitslag nog niet heeft.
- **Alternatieven:** een wedstrijd uit het programma halen zodra de dag voorbij is (de wedstrijd verdwijnt dan zonder uitslag); een uitgestelde wedstrijd als volgende wedstrijd tonen (staat dan weken bovenaan zonder datum).
- **Later:** zie _De vorige en de volgende wedstrijd volgen uit de aanvangstijd, en een wedstrijd zonder uitslag zegt dat na twee uur_.
  De uitgestelde wedstrijd zonder nieuwe datum, het blok met twee wedstrijden en de statistieken op de status `played` blijven zoals ze waren.
- **Later:** zie _Een geannuleerde wedstrijd staat in Uitslagen en niet in Programma_ (3 november 2026): het programma is ook niet elke wedstrijd die niet gespeeld is; een geannuleerde wedstrijd staat er niet in.

## Een wedstrijd is een regel zonder link en zonder clubwapen

- **Datum:** 26 oktober 2026
- **Besluit:** het component `Match` toont de competitie en de ronde, de twee clubs met de uitslag ertussen, en daaronder de aftrap, "Thuis" of "Uit" en het stadion.
  De thuisclub staat eerst en de regel zegt ook "Thuis" of "Uit", zodat een bezoeker niet hoeft af te leiden uit de volgorde.
  De uitslag is "2–0" vanaf de kant van de thuisclub, en een schermlezer hoort "2 tegen 0".
  De aftrap is een `Time` in Nederlandse tijd, het weekend ("weekend 12–14 februari", met de eerste dag voor machines) zolang de tijd niet bekend is, en bij een uitslag alleen de dag.
  De wedstrijd heeft geen link, want een pagina per wedstrijd is #108, en er zijn alleen namen, geen clubwapens.
- **Waarom:** de namen dragen de regel voor iedereen, ook met een schermlezer, en een wapen is een afbeelding van een ander, met rechten die we niet hebben.
- **Alternatieven:** alleen de volgorde van de clubs voor thuis en uit (niet te zien voor wie het niet weet); een kolommentabel voor de wedstrijden (breed, en op een telefoon moet hij zijwaarts scrollen).
- **Later:** zie _De regel van een wedstrijd zegt niet "Thuis" of "Uit"_ en _De volgorde van de regels van een wedstrijd hangt af van de competitie_ (3 november 2026).
  De regel noemt "Thuis" en "Uit" niet meer, en de competitie en de ronde staan niet altijd bovenaan.
  De thuisclub staat nog eerst, de uitslag is nog "2–0" vanaf de thuiskant, en de aftrap is nog een `Time`.
- **Later:** zie _De pagina van een wedstrijd staat op `/wedstrijden/<seizoen>/<datum>-<club>`, en alleen voor een verslag dat klaar is en klopt_ (7 november 2026).
  Een wedstrijd met zo'n pagina heeft wel een link, "Het verslag", als laatste regel van zijn plek in de lijst; de andere wedstrijden blijven een regel zonder link, en er zijn nog steeds geen clubwapens.

## De stand is een tabel met een scrollgebied en een korte vorm voor de zijbalk

- **Datum:** 26 oktober 2026
- **Besluit:** het component `StandingsTable` is een echte `table` met een bijschrift met de dag waarvoor de stand geldt, kolomkoppen met `scope` en een rijkop met de club.
  - De kolommen zijn: positie, club, gespeeld, gewonnen, gelijk, verloren, doelpunten voor, doelpunten tegen, doelsaldo en punten.
    De punten staan achteraan, zoals bij elke stand, en zijn vet, omdat de stand daarop is gesorteerd.
  - De koppen zijn afkortingen met één letter waar dat kan: G, W, G, V en P, en DV, DT en DS.
    G staat voor gespeeld en voor gelijk.
    De projecteigenaar koos dit op 26 oktober 2026, want supporters begrijpen twee keer G beter dan een andere letter voor gespeeld.
  - Wie ziet, leest de afkorting; de `title` geeft het volle woord onder een muis.
    Een schermlezer hoort in elke kop het volle woord (verborgen tekst naast de afkorting), dus de twee G's klinken verschillend.
    De volledige tabel heeft ook een regel eronder met alle afkortingen en hun woorden, want een `title` laat een telefoon niet zien.
    De korte vorm in de zijbalk heeft die regel niet (de projecteigenaar, 26 oktober 2026).
  - Het bijschrift is kort, "Stand op 18 oktober 2026", omdat het met de tabel meescrolt in het gebied en anders afgeknipt wordt op een telefoon.
    Het is nu niet meer te zien, zie _De stand toont de dag niet_.
  - Met alle kolommen staat de tabel in een eigen gebied dat zijwaarts scrolt, met `role="region"`, een naam en `tabindex="0"`, zodat het toetsenbord erbij kan en de pagina zelf niet zijwaarts scrolt.
  - De korte vorm (`columns="compact"`) laat gewonnen, gelijk, verloren en de doelpunten weg en past in de zijbalk zonder te scrollen.
    Het blok "Stand" op de homepage toont maar drie clubs, met sc Heerenveen in het midden: de club erboven en de club eronder, met hun echte plaats.
    Staat sc Heerenveen bovenaan of onderaan, dan zijn het de eerste of de laatste drie (`standingsAround` in `src/matches.ts`).
    De projecteigenaar koos dit op 26 oktober 2026; de volledige stand staat op `/wedstrijden`.
  - De rij van sc Heerenveen is vet, heeft een balk aan het begin en een schermlezer hoort "(onze club)" achter de naam.
- **Waarom:** de volledige tabel is op een telefoon te breed voor de pagina, en het scrollgebied houdt hem bruikbaar tot 400% inzoomen (1.4.10).
  De korte vorm laat op de homepage zien waar het om draait: positie, gespeeld, punten en doelsaldo.
- **Alternatieven:** de tabel kolommen laten weglaten met CSS op een telefoon (de volle woorden en de kolommen zijn dan niet te bereiken); altijd de korte vorm (de volledige stand ontbreekt dan op de pagina).
- **Later:** zie _De stand toont alleen gespeeld en punten, en de volledige stand heeft een balk voor de punten_.
  De kolommen W, G, V en D zijn vervallen, het scrollgebied met `label` ook, en de korte vorm verschilt nog door de balk en de uitleg van de afkortingen.
- **Later:** zie _De stand toont geen doelpunten voor en tegen_.
  De kolommen DV en DT zijn vervallen en DS heet nu D, en het bijschrift met de dag is niet meer te zien (zie _De stand toont de dag niet_); de tabel heeft nog positie, club, G, W, G, V, D en P, en de korte vorm laat alleen gewonnen, gelijk en verloren weg.
- **Later:** zie _De punten staan voor het doelsaldo in de standtabel_.
  De punten staan niet meer achteraan: de kolommen zijn nu positie, club, G, W, G, V, P en D.
- **Later:** zie _Alle tabellen gebruiken één stel afkortingen voor hun kolommen_.
  De afkortingen DV, DT en DS bestaan niet meer; het doelsaldo is S, en de letters komen uit één lijst.
- **Later:** zie _In een tabel is vet voor het kerngetal, niet voor onze club of een achternaam_.
  De punten blijven vet, maar de rij van sc Heerenveen is het niet meer: de achtergrond, de kleur, de balk en "(onze club)" markeren haar.

## De bronvermelding van Wikipedia is een component met een link per pagina

- **Datum:** 26 oktober 2026
- **Besluit:** `WikipediaCredit` zegt "Bron: Wikipedia (CC BY-SA 4.0)", linkt naar elke pagina waar het blok gegevens van heeft en naar de geschiedenis ervan, noemt de tijd van de laatste keer lezen in Nederlandse tijd en zegt dat onze wedstrijdgegevens ook CC BY-SA 4.0 zijn.
  `/wedstrijden` heeft die volledige vorm, voor alle pagina's die de import las.
  De tijd is de laatste `read_at` van die pagina's uit `wikipedia_pages`.
  De twee kleine blokken op de homepage zeggen alleen "Bron: Wikipedia", zonder links (de projecteigenaar, 26 oktober 2026), want de volledige bronvermelding staat een klik verder, op `/wedstrijden`.
  `WikipediaCredit` heeft daarvoor de korte vorm `compact`.
  De link naar de geschiedenis zegt voor een schermlezer van welke pagina hij is.
  "CC BY-SA 4.0" linkt naar de licentie.
  Zijn er geen pagina's gelezen, zoals bij een lege database, dan staan er geen gegevens en dus ook geen bronvermelding.
- **Waarom:** principe 4 van de Redactie vraagt altijd de bron, en de licentie vraagt de naam en een link.
  Een component zorgt dat een pagina er niet omheen kan.
  De geschiedenis van de pagina noemt de auteurs, zoals de licentie vraagt.
- **Alternatieven:** de volledige vorm onder elk blok (de specificatie; lang voor een kaart in de zijbalk); één vaste link naar de pagina van het seizoen (de beker en het programma staan op andere pagina's); de licentie niet linken (dat vraagt de licentie wel).
- **Hoe:** de seed zet ook de pagina's van de verzonnen wedstrijden in `wikipedia_pages` (`madeUpWikipediaPages`), zodat de bronvermelding er op acceptatie en in de toegankelijkheidscontrole ook is.
- **Later:** zie _De bronvermelding staat in een doorzichtige kaart, zonder link naar de geschiedenis_.
  De bronvermelding linkt niet meer naar de geschiedenis van de pagina's en staat op `/wedstrijden` in een kaart zonder zichtbare rand en achtergrond.
- **Later:** zie _De bron staat bij de wedstrijden, per bron_ (8 november 2026): een pagina met wedstrijden uit het archief van de oude fansite noemt het archief, naast Wikipedia of in plaats ervan.
- **Later:** zie _De kaart Wedstrijden op home toont de vorige ontmoeting, de vorm van de tegenstander en de scheidsrechter_ (9 november 2026): de korte bronvermelding staat nu één keer onder de kaart Stand, als "Wedstrijden en stand: Wikipedia", en niet meer onder elke kaart.

## De bronvermelding staat in een doorzichtige kaart, zonder link naar de geschiedenis

- **Datum:** 26 oktober 2026
- **Besluit:** de bronvermelding van Wikipedia staat in een kaart met dezelfde opvulling aan de zijkanten als de andere kaarten maar zonder zichtbare rand en achtergrond (`Card` met `surface="transparent"`), en linkt alleen naar de pagina van Wikipedia, niet naar zijn geschiedenis.
  Ze zegt dus "Bron: Wikipedia (CC BY-SA 4.0), pagina: Eredivisie 2026/27", de tijd van de laatste keer lezen en dat onze wedstrijdgegevens ook CC BY-SA 4.0 zijn.
  `WikipediaCredit` heeft de eigenschap `historyHref` niet meer.
- **Waarom:** de tekst staat dan op één lijn met de tekst in de kaarten erboven.
  Eén link is rustiger, en Wikipedia aanvaardt een link naar het artikel als bronvermelding.
- **Hoe:** de kaart zit in `SourceCredit` van de site, niet in `WikipediaCredit`, want de korte vorm onder de blokken op de homepage staat al in een kaart en die tekst staat al op één lijn met de rest.
  De rand van de doorzichtige kaart blijft in de lay-out, zodat de tekst op dezelfde plek staat als in een kaart met een rand.
  Boven en onder heeft hij geen opvulling: die telde bij de ruimte van 2 rem tussen de cellen op en gaf bijna 3,5 rem tussen de laatste kaart en de tekst, wat de projecteigenaar te veel vond (26 oktober 2026).
  In forced colours heeft hij de kleur van de achtergrond, zodat hij ook daar niet te zien is.
- **Alternatieven:** de bronvermelding zonder kaart laten (de tekst staat dan aan de rand van de kolom, naast de tekst in de kaarten); de link naar de geschiedenis houden (volledig, maar twee links in een zin die voor het oog een bijzaak is).
  **Let op:** de CC BY-SA vraagt een aanduiding van de auteurs op een redelijke manier; een link naar het artikel voldoet volgens de uitleg van Wikipedia over hergebruik, maar geen jurist heeft dat getoetst.
- **Later:** zie _De bronvermelding van Wikipedia staat dicht in een uitklap_.
  De volledige vorm is een `details` met "Bron: Wikipedia" in de `summary`; de licentie, de pagina's, de tijd van het lezen en de zin over onze gegevens staan in de uitklap.
  De doorzichtige kaart, het ontbreken van een link naar de geschiedenis en de korte vorm blijven.

## De bronvermelding van Wikipedia staat dicht in een uitklap

- **Datum:** 1 november 2026
- **Besluit:** de volledige vorm van `WikipediaCredit` is een `details` met een `summary` die "Bron: Wikipedia" zegt, en staat dicht voor elke pagina, ook als er maar één is (de projecteigenaar, 1 november 2026).
  De uitklap heeft de licentie "CC BY-SA 4.0" met zijn link, de pagina's met hun links, "Laatst gelezen op …" en de zin dat onze gegevens ook CC BY-SA 4.0 zijn.
  De `summary` heeft geen link, want een klik doet dan twee dingen.
  De korte vorm (`compact`) verandert niet.
- **Waarom:** op Tegenstanders staat een link naar elk seizoen, en de bronvermelding was langer dan de lijst erboven.
  "Bron: Wikipedia" is zonder klik te zien, zoals principe 4 van de Redactie vraagt, en de licentie en de pagina's zijn één klik verder.
  Eén vorm is makkelijker te leren dan een vorm die afhangt van het aantal pagina's.
- **Hoe:** een gewone `details`, zonder script: het werkt met het toetsenbord (Enter en spatie), een schermlezer meldt dat hij is in- of uitgeklapt en de browser zoekt ook in de dichte tekst.
  Het pijltje is het icoon `arrow-down` in de kleur van de metatekst; het draait een halve slag als hij open is, met de tijden van de beweging, dus bij "minder beweging" klapt het om zonder te draaien.
  De regel van de `summary` is minstens 44 pixels hoog om te raken met een duim.
  De controle op de pagina's (`checkPage`) klapt elke `details` open voor axe, want axe slaat ingeklapte tekst over.
- **Alternatieven:** alleen inklappen bij veel pagina's (twee vormen om te leren, en de grens is willekeurig); "Bron: Wikipedia (CC BY-SA 4.0)" met een link in de `summary` (een klik doet twee dingen); de pagina's weglaten (de licentie vraagt een aanduiding van de auteurs, en die staat in de link naar het artikel).
- **Later:** zie _De uitklap van de bronvermelding van Wikipedia gaat zacht open en dicht_.
  De uitklap springt niet meer, maar gaat over met zijn hoogte en zijn doorzichtigheid.

## De uitklap van de bronvermelding van Wikipedia gaat zacht open en dicht

- **Datum:** 1 november 2026
- **Besluit:** de uitklap van `WikipediaCredit` gaat over met zijn hoogte en zijn doorzichtigheid, bij openen en bij sluiten, met `--hf-motion-duration-short` en `--hf-motion-ease-change`: dezelfde duur en curve als het pijltje.
  Een browser die het niet kan, laat de uitklap springen zoals voorheen.
  Wie om minder beweging vraagt, ziet geen overgang, want de duur is dan 0 s.
  Dit is de ene uitzondering op de regel van het hoofdstuk Beweging dat wat opent of sluit niet van hoogte wisselt (de projecteigenaar, 1 november 2026).
- **Waarom:** het pijltje draaide zacht terwijl de tekst sprong, en dat voelde ongemaakt.
  De uitklap is een klik van de bezoeker zelf.
  Hij staat onderaan een pagina en de tekst ervan is kort.
  Daarom is een hoogte die meebeweegt hier te dragen, en elders blijft de regel gelden.
- **Hoe:** alleen CSS, in `wikipedia-credit.css`, achter `@supports (interpolate-size: allow-keywords) and selector(::details-content)`.
  `interpolate-size: allow-keywords` laat de browser naar `auto` bewegen, en `::details-content` is het vak dat de browser met de hoogte en de doorzichtigheid laat bewegen.
  `content-visibility` gaat mee in de overgang (`allow-discrete`): tijdens het sluiten blijft de tekst zichtbaar, en daarna is hij weg voor het toetsenbord en de schermlezer, zoals bij een gewone dichte `details`.
  Het vak knipt zijn hoogte af.
  Daarom heeft het opvulling zo breed als de focusring (3 pixels dik, 2 pixels ervandaan) en een gelijke negatieve marge.
  Zo wordt de ring van een link op de eerste of de laatste regel niet afgesneden, en blijft het vak even hoog.
  De `details` heeft `display: flow-root`, anders valt de negatieve marge onderaan samen met die van de `details` zelf.
  De `summary` heeft `position: relative` en `z-index: 1`, want het vak reikt 5 pixels onder de regel en nam anders de onderste 5 pixels van een klik weg.
  Het element en de bediening zijn niet veranderd: Enter en spatie, de melding "uitgeklapt" en "ingeklapt" en de zoekfunctie van de browser werken zoals eerst.
  Een test (`wikipedia-credit-css.test.ts`) bewaakt de middelen en dat de duur en curve gelijk zijn aan die van het pijltje.
- **Browsers:** gemeten in Chromium 152 (de browser van het Browser-paneel van Claude en die van Playwright) en in WebKit van Playwright, op 390 en 900 pixels breed.
  In Chromium gaat de uitklap zacht over.
  WebKit kent `::details-content`, maar nog niet `interpolate-size`, dus daar springt de uitklap, en dat is de bedoelde terugval.
  Firefox en Safari op een iPhone zijn niet gemeten.
  Firefox kent `interpolate-size` ook niet, dus daar springt hij naar verwachting ook.
  Zodra Safari en Firefox beide kennen, gaat de uitklap daar vanzelf zacht.
- **Geen schokjes:** de pagina zelf springt niet.
  Bij het openen blijft de `summary` op dezelfde plek op het scherm en groeit de pagina eronder; bij het sluiten, ook midden op de pagina, blijft hij op zijn plek en krimpt de pagina eronder.
  Dat is gemeten per beeld met `requestAnimationFrame` op `/statistieken/tegenstanders`, met de scrollpositie, de hoogte van het document en de plaats van de `summary`.
  Eén geval blijft over: de bezoeker staat helemaal onderaan met de uitklap open en sluit hem.
  Het document wordt dan korter dan de pagina is gescrold, en de browser trekt de scrollpositie elk beeld mee.
  De pagina schuift dan soepel mee in dezelfde 0,2 seconde en de `summary` zakt 156 pixels op een telefoon, tot het document zijn nieuwe lengte heeft.
  Er is geen sprong, maar de `summary` blijft in dat ene geval niet op zijn plek, en de projecteigenaar neemt dat voor lief (1 november 2026).
  Dat te voorkomen vraagt ruimte onderaan de pagina die voor elke bezoeker verandert hoe de pagina eindigt, of een script.
- **Alternatieven:** een script dat de hoogte meet en zet (kost een clientcomponent voor één uitklap, en bewaart staat); `max-block-size` met een vaste waarde (een getal dat verkeerd wordt zodra de tekst langer is, en een eigen getal naast de tokens); alleen de doorzichtigheid laten bewegen (de uitklap blijft dan springen, en dat vroeg de projecteigenaar niet); extra ruimte onderaan de pagina (zie hierboven); `scrollIntoView` na het openen (de tekst staat al in beeld, want de footer geeft ruimte, en het is een script).
- **Later:** vult _Beweging heeft vaste duren en curves, en valt bij minder beweging op één plek weg_ (27 oktober 2026) aan: de regel dat wat opent of sluit niet van hoogte wisselt, kent nu deze ene uitzondering.
- **Later:** vult _De bronvermelding van Wikipedia staat dicht in een uitklap_ (1 november 2026) aan: de uitklap springt niet meer, hij gaat over met zijn hoogte en zijn doorzichtigheid.

## Zoeken in koppen, afleveringen en artikelen, met LIKE

- **Datum:** 26 oktober 2026
- **Besluit:** de zoekpagina zoekt in de titels van berichten en podcastafleveringen die de site toont en in de titel en inleiding van de artikelen van de redactie, met `LIKE` waarbij alle woorden moeten voorkomen.
  De resultaten staan met de nieuwste bovenaan.
- **Waarom:** het zijn de teksten die we zelf bewaren en tonen.
  Forumonderwerpen bewaren we maar een handvol van, dus de dekking zou slecht zijn.
  `LIKE` vindt ook woorden van twee letters (LC, VI, AZ) en een deel van een woord, en hangt niet af van een instelling van de hosting.
  Bij enkele duizenden berichten per jaar is een zoekopdracht zonder index snel genoeg: op een database met 10.000 berichten duurt ze 7 tot 14 milliseconden.
- **Hoe:** `searchPublic` in `packages/db/src/queries.ts` doet twee vragen, een op `items` en een op `articles`, en voegt de nieuwste resultaten samen.
  Het aantal resultaten komt uit dezelfde vraag, met `count(*) over ()`.
  Elk woord is `LIKE '%woord%' escape '|'`: `%`, `_` en `|` krijgen een escape-teken, zodat `%`, `_` en `\` zichzelf zoeken.
  Hoofdletters en accenten tellen niet door de collatie `utf8mb4_unicode_ci` van de kolommen, die `search.test.ts` van `@fansite/db` controleert.
  Een bericht telt mee onder dezelfde voorwaarden als op de homepage (`isShown`, een bron die aanstaat, niet later dan nu), een artikel als het gepubliceerd is.
- **Alternatieven:** FULLTEXT in MariaDB (rangschikt op passendheid, maar vindt woorden korter dan de minimale lengte niet en hangt af van een serverinstelling die we niet kennen); alleen koppen (podcasts en artikelen blijven onvindbaar); ook forumonderwerpen (onvolledig).

## De zoekpagina staat in de footer, met de lijst met spelers in de zijbalk

- **Datum:** 26 oktober 2026
- **Besluit:** "Zoeken" is een item van het menu in de footer, het eerste, en leidt naar `/zoeken`, met het formulier en de resultaten in de hoofdkolom en de lijst met spelers in de zijbalk (op een smal scherm eronder).
  Het hoofdmenu verandert niet.
- **Waarom:** er is nog weinig inhoud, en de header moet nog een nieuw ontwerp krijgen, zei de projecteigenaar op 26 oktober 2026.
  Een gewone link werkt zonder JavaScript, en de footer heeft al de andere pagina's over de site zelf.
  De lijst helpt als je niet weet waar je naar zoekt, en zonder vraag staat ze direct onder het formulier.
- **Nadeel:** de zoekpagina is minder zichtbaar dan in het hoofdmenu, en het menu in de footer wijst de huidige pagina niet aan.
- **Hoe:** het formulier en de resultaten staan samen in één kaart, zodat de zijbalk er op een breed scherm gelijk mee begint.
  Voor een zoekvraag, als er nog geen resultaten zijn, heeft de kaart het blauwe vlak (`surface="soft"`); met resultaten is ze wit, zoals de andere kaarten.
  Boven de lijst met spelers staat "Zoek snel op een achternaam."
  De lijst staat na de resultaten in de bron, dus onder de resultaten op een smal scherm, en ze is van `players` van het lopende seizoen (`listSquad`), per positie.
  Elke naam is een gewone link naar `/zoeken?q=<achternaam>`, met de zoekterm uit de tabel.
  De bronvermelding onder de lijst is `WikipediaCredit`, met het woord `selectiegegevens` voor onze eigen gegevens (eigenschap `data`), want de standaardzin noemt de wedstrijdgegevens.
  `listSquad` is de ene plek die bepaalt wie in de lijst staat: de vlag `in_squad` van #333 is één voorwaarde in de `where` van die vraag (zie _Spelers hebben een vaste `id`, en doelpunten verwijzen ernaar_).
- **Alternatieven:** een item in het hoofdmenu (zoals het issue voorstelde: zichtbaarder, maar het menu breekt op een telefoon al af en de header krijgt een nieuw ontwerp); een zoekveld in de kop op elke pagina (altijd een stap dichtbij, maar breed en het vraagt een ontwerp van de kop); de lijst altijd boven de resultaten (prominent, maar op een telefoon schuiven de resultaten naar beneden).
- **Later:** zie _De site heeft vier onderdelen: Nieuws, Wedstrijden, Statistieken en Forum_ (31 oktober 2026): de pagina staat op `/nieuws/zoeken` en staat ook in de balk van Nieuws.
  Het item "Zoeken" in de footer blijft en wijst naar het nieuwe adres; `/zoeken` vervalt zonder omleiding.

## De zoekpagina laat woorden van één teken niet toe, toont hoogstens 100 resultaten en staat niet in de sitemap

- **Datum:** 26 oktober 2026
- **Besluit:** een vraag met een woord van één teken, zoals "a" of een los streepje in "Heerenveen - Ajax", krijgt een uitleg bij het veld en doet niets in de database.
  De pagina laadt in stappen van vijf tot hoogstens 100 resultaten, en zegt daarna dat dit de nieuwste zijn en dat meer woorden minder resultaten geven.
  `/zoeken` staat niet in `pages.ts` en dus niet in de sitemap, maar de teller van het bezoek telt de pagina, zonder de vraag.
- **Waarom:** het issue zegt "woorden van minstens 2 tekens", en een woord van één teken vindt vrijwel alles en kost de hosting het meeste.
  Zwijgend weglaten zou een andere vraag stellen dan de bezoeker typte.
  Zonder grens zou `?aantal=` de hosting op te veel rijen laten werken; 100 is ook wat de homepage toont.
  Een pagina met resultaten is `noindex`, dus een zoekmachine heeft niets aan een regel in de sitemap.
- **Nadeel:** "Heerenveen - Ajax" werkt niet; de bezoeker moet het streepje weglaten.
  Er is geen archief voor wie verder terug wil zoeken (#26).
- **Alternatieven:** woorden van één teken stilzwijgend negeren (de vraag verandert zonder dat de bezoeker het ziet); geen grens aan het aantal resultaten (een bezoeker kan de database zwaar belasten met een adres); de pagina in de sitemap (een zoekmachine zou pagina's overslaan die `noindex` zijn).
- **Hoe:** `Input` van het designsysteem krijgt het type `hidden`, voor de knop "Laad 5 meer", die de vraag meeneemt in een `GET`-formulier.
  `NewsItem` krijgt `internal` voor een artikel van de redactie, zodat het pictogram voor een link naar een andere site wegblijft.
- **Later:** er is nu een archief voor wie verder terug wil, zie _Het nieuwsarchief staat op `/nieuws`, met 50 koppen per pagina en een filter per bron_; het zoeken blijft `/zoeken`.
- **Later:** zie _De site heeft vier onderdelen: Nieuws, Wedstrijden, Statistieken en Forum_ (31 oktober 2026): de pagina staat op `/nieuws/zoeken` en niet meer op `/zoeken`.
  De regels voor woorden van één teken, de grens van 100 resultaten, de sitemap en de teller blijven.

## Een gepubliceerd anker staat in `src/anchors.ts`, en de rooktest bewaakt het

- **Datum:** 26 oktober 2026
- **Besluit:** `apps/site/src/anchors.ts` bevat per pagina de ankers die we hebben gepubliceerd.
  De rooktest (`checkAnchors`) faalt als een van die ankers niet meer op zijn pagina staat, als een kop met een anker er niet in staat, en als een `id` twee keer op een pagina voorkomt, ook als het botst met het `id` van iets anders, zoals `nieuws-3` op de homepage.
  Een pagina die verhuisd is, moet blijvend doorverwijzen (301 of 308), en de rooktest zoekt het anker op de pagina waar de doorverwijzing eindigt.
  Een anker weghalen is een keuze: je haalt het uit de lijst, of je laat het als oud anker (`aliases`) staan.
  Op Updates hoort bij elke versie in `CHANGELOG.md` een anker, dus een nieuwe versie hoeft niet in de lijst.
- **Waarom:** een anker is een belofte aan wie ernaar linkt.
  Een lijst in de repository en één controle in de rooktest, die de gebouwde pagina's al ophaalt, is de lichtste vorm die een verdwenen anker vangt.
  De lijst is ook de plek waar je ziet wat we beloven.
- **Gevolg:** de kop van een versie op Updates heet nu `versie-0-1-0`, want een punt hoort niet in een anker.
  Het oude `versie-0.1.0` blijft als oud anker, en de feed linkt er nog naar, omdat die link de `guid` is en een nieuwe `guid` elke versie als nieuw toont in een feedlezer.
  De kop van `/wedstrijden` met de wedstrijden zonder tegendoelpunt heet nu `de-nul-gehouden`, met `nul-gehouden` als oud anker.
  `/bronnen` heeft ankers voor elk soort bron (`nieuws`, `podcasts`, `forum`, `club`, `video`) en voor de twee kaarten in de zijbalk (`voorstellen`, `uitgever`).
  De Engelse `id`'s die daar alleen voor `aria-labelledby` dienden (`news-heading`) zijn daarvoor vervangen, want een kop met een anker heeft een Nederlands `id`.
  `/podcasts` heeft geen anker: de kop "Over" met de naam van de podcast staat er alleen bij een gekozen podcast, en niemand linkt naar dat deel.
- **Alternatieven:** een controle op de bronbestanden in plaats van de gebouwde pagina's (ziet niet wat de bezoeker krijgt, en niet de ankers die uit gegevens komen); alle ankers uit de pagina's halen en bewaren in een bestand dat de build maakt (de lijst is dan geen keuze meer, maar een afspiegeling); een toets in de e2e-controle in de browser (trager, en axe toetst dit niet).
- **Later:** op `/bronnen` staat een derde kaart in de zijbalk, de nieuwsbrief van de LC, met het anker `nieuwsbrief-lc`.
- **Later:** zie _De site heeft vier onderdelen: Nieuws, Wedstrijden, Statistieken en Forum_ (31 oktober 2026): de ankers van de negen kaarten met cijfers, zoals `de-nul-gehouden` met het oude `nul-gehouden`, verhuizen naar `/statistieken`.
  Op `/wedstrijden` breken ze, zonder omleiding.

## De themaschakelaar is één knop rechtsboven in de header

- **Datum:** 27 oktober 2026
- **Besluit:** de header heeft rechtsboven één schakelknop zonder tekst, met een gevulde zon in het lichte thema en een gevulde maan in het donkere.
  De knop is rond.
  In rust is hij ingehouden: alleen het pictogram, zonder rand en vulling.
  Onder de muis (alleen met een muis), ingedrukt en bij focus komen de rand en de vulling terug.
  De footer heeft geen schakelaar meer.
  De drie toestanden achter de knop blijven zoals ze waren.
- **Hoe:** de knop is het nieuwe component `ThemeButton` van het designsysteem, want de sjablonen van de site bevatten geen HTML.
  De naam is "Donker" en `aria-pressed` is waar in het donkere thema, dus een schermlezer hoort de naam en de stand.
  Het pictogram is 26 pixels in een knop van 44 bij 44 pixels.
  In rust is het pictogram blue-400 (5,3:1 in licht en 4,2:1 in donker op de header, boven de 3:1).
  Onder de muis, ingedrukt en bij `:focus-visible` is het blue-50, met een rand van blue-200 op 55% en een vulling van blue-200 op 14%.
  De overgang duurt 0,2 seconde en valt bij "minder beweging" weg.
  Onder de muis geldt alleen met `hover: hover`, zodat er na een tik op een telefoon niets blijft oplichten.
  Ingedrukt (`:active`) geldt ook op touch.
  De focusrand is blue-300, 3 pixels, met 2 pixels ruimte.
  Vier nieuwe tokens geven de kleuren: `--hf-colour-icon-on-header-quiet`, `--hf-colour-border-on-header-strong`, `--hf-colour-background-on-header-hover` en, voor de lijn boven het menu, `--hf-colour-border-on-header`.
  `ThemeToggle` van de site houdt de logica (`theme.ts`, `public/theme.js` en de sleutel `fansite-theme` veranderen niet) en tekent nu een `ThemeButton`.
  De knop is er pas na het hydrateren, dus zonder JavaScript heeft de eerste rij alleen het logo en is de HTML voor iedereen gelijk.
  De focus gaat van het logo naar de themaknop en dan naar het menu.
  Dat is ook de volgorde op het scherm: de knop staat in de eerste rij en het menu in de tweede.
- **Waarom:** de knop staat op de eerste plek waar een bezoeker hem verwacht, en wie hem zoekt hoeft niet naar de footer.
  Het menu krijgt de ruimte die de twee knoppen nodig hadden.
  Het pictogram toont het thema dat je ziet en `aria-pressed` zegt het ook; zo is de stand niet alleen aan kleur te zien.
  Het besluit van 24 oktober 2026 koos twee knoppen omdat een knop die naar het tegenovergestelde schakelt minder duidelijk zegt welk thema je ziet.
  Een schakelknop met een pictogram voor de stand en `aria-pressed` lost dat op.
- **Alternatieven:** twee knoppen in de header; die nemen de ruimte in die het menu nodig heeft.
  Of één knop waarvan het pictogram het thema toont waar je naartoe gaat (een maan in het lichte thema); dat wordt vaak verkeerd gelezen als de stand.
  Of de schakelaar ook in de footer houden; dat zijn twee plekken die gelijk moeten blijven.
  Of de knop met `SegmentedControl` bouwen; dat component is voor een keuze uit een paar opties met tekst, en blijft in het designsysteem voor andere plekken.
- **Later:** vervangt _Licht of donker: twee knoppen, drie toestanden, en een keuze gelijk aan het systeem wordt vergeten_ (24 oktober 2026) voor de plek en het aantal knoppen.
  De drie toestanden en het vergeten van een keuze gelijk aan het systeem blijven.
- **Later:** zie _Onder de muis en bij focus toont de themaknop het thema waar je naartoe gaat_ (27 oktober 2026).
  Het pictogram in rust, de naam, `aria-pressed` en de kleuren blijven; alleen onder de muis en bij focus is het pictogram dat van het andere thema.

## Het hoofdmenu staat in een eigen rij onder de sitenaam

- **Datum:** 27 oktober 2026
- **Besluit:** het hoofdmenu staat in een eigen rij onder het logo, met een dunne lijn erboven (1 pixel, blue-200 op 35%).
  Alle onderdelen staan in blue-50 (14,5:1 in licht en 11,4:1 in donker op de header), gewicht 500 en een lettergrootte die meegroeit met het venster (`clamp(1rem, 0.86rem + 0.69vw, 1.25rem)`: 16 pixels op 320 pixels breed, 20 pixels vanaf 900 pixels), met 1 rem tussen de onderdelen en minstens 44 pixels hoog.
  De huidige pagina heeft dezelfde tekstkleur en een rode streep van 3 pixels op 0,35em onder de tekst, zonder afbreking bij letters met een staart.
  Forum staat rechts en houdt zijn pictogram; er staat geen scheidingslijn tussen de onderdelen.
  Hoe een onderdeel eruitziet onder de muis, ingedrukt of bezocht, blijft zoals het was, behalve dat de streep onder de muis nu op dezelfde plek staat als de rode streep van de huidige pagina (0,35em onder de tekst, zonder afbreking).
- **Hoe:** de header is een raster met twee kolommen, de eerste voor het logo en de tweede voor de themaknop, en het menu beslaat beide kolommen op een eigen rij.
  Zo staat het menu op elke breedte onder het logo, ook als er naast het logo plek over is, en blijft het in de kolom van de pagina, in lijn met de inhoud.
  Forum staat rechts doordat het laatste onderdeel van het menu in de header een automatische marge aan het begin heeft.
  Tussen de lijn en het menu zit 0,25 rem, en onder het menu 0,4375 rem.
  Boven het logo zit 0,75 rem, tussen het logo en de lijn 0,25 rem en tussen het logo en de knop 0,5 rem, zodat de header ongeveer 128 pixels hoog is op een breed scherm.
  Op 320 pixels past "FANSITE sinds 1997" door die 0,5 rem net op één regel; met 1 rem miste het 2 pixels, en kwam "sinds 1997" op een eigen regel.
  `text-wrap: balance` op de tekst van het logo verdeelt de regels over de breedte.
  Het logo staat in de link om het logo bovenaan de regel (`vertical-align: top`), zodat de link zo hoog is als het logo en niet als een regel tekst: daarvoor zat er 7 pixels onder het logo.
  Een flexcontainer om het logo zou de onderstreping van de link op het logo doorgeven, dus het logo blijft een inline-element.
  Op 390 pixels staan de vier onderdelen op één rij; op 320 pixels gaat Forum naar een tweede rij en blijft rechts staan.
- **Waarom:** naast het logo had het menu weinig ruimte, vooral op een smal scherm, waar het onder het logo ombrak.
  Een eigen rij geeft elk onderdeel dezelfde plek op elke breedte.
- **Alternatieven:** het menu naast het logo houden; dan blijft de ruimte krap.
  Of de onderdelen in het halfvet houden (gewicht 600) of in een eigen, lichtere balk zetten; de eigenaar koos op het canvas voor een lijn erboven, en bij het bouwen voor gewicht 500 (eerst 400).
  Of grotere afstanden tussen de onderdelen; dan valt Forum op 390 pixels op een tweede rij.
  Of het menu inklappen achter een knop op een smal scherm; dat verbergt de belangrijkste links.
- **Later:** vervangt de opmaak van _Het hoofdmenu begint met Nieuws, en de huidige pagina krijgt een rode streep_ (22 oktober 2026): halfvet en de lichtblauwe kleur zijn gewicht 500 en de lichtste kleur geworden.
- **Later:** zie _Het hoofdmenu is 16 tot 18 pixels en wordt vetter, de huidige pagina nog vetter_ (27 oktober 2026) voor de maat en het gewicht: nu 600 en 16 tot 18 pixels, en de huidige pagina op 800 met zijn rode streep.
- **Later:** zie _Het hoofdmenu en het submenu zijn één `nav` tussen de `header` en de `main`, met een geneste lijst_ (28 oktober 2026): het menu staat niet meer in de `header` maar in een `nav` direct erna, op hetzelfde blauw.
  De rij, de lijn erboven, de afstanden, het gewicht en de maten blijven zoals ze zijn.
- **Later:** zie _Het hoofdmenu krijgt een knop "Meer" bij zes of meer onderdelen_ (28 oktober 2026): een menu met zes of meer onderdelen en een `moreLabel` heeft op een smal scherm de knop "Meer" in plaats van een rij die omloopt.
  Bij vijf onderdelen of minder blijft de rij zoals hij was, en de knop "Meer" is een knop in de rij, geen menuknop die alles verbergt.
- **Later:** zie _Ruimte komt uit vijf stappen, met gemiddeld als vaste keuze_ (31 oktober 2026): de ruimte boven het logo is 1 rem, niet 0,75 rem.
  De ruimte onder het logo en naast de knop blijft 0,25 en 0,5 rem, nu als `--hf-space-xs` en `--hf-space-s`.

## Onder de muis en bij focus toont de themaknop het thema waar je naartoe gaat

- **Datum:** 27 oktober 2026
- **Besluit:** in rust toont de themaknop het thema dat je ziet.
  Onder de muis (met een muis) en bij focus met het toetsenbord gaat het pictogram over in dat van het andere thema.
  Na een klik blijft het pictogram van het nieuwe thema staan tot de aanwijzer of de focus weggaat.
- **Hoe:** de zon wordt de maan en de maan wordt de zon in 0,4 seconde.
  De duur staat op één plek, in de eigenschap `--hf-theme-button-morph` in `theme-button.css`.
  De kleur, de rand en de vulling blijven 0,2 seconde.
  De schijf van de zon groeit uit tot de maan, en een tweede schijf schuift er van rechtsboven in en drukt de deuk erin.
  De stralen lossen naar buiten op, de knop in.
  Van maan naar zon krimpt de schijf weer, en de stralen komen uit de schijf naar buiten en worden zichtbaar.
  Dat zijn alleen verschuivingen en schalen van twee cirkels en acht lijnen, die allemaal volgen uit één getal (0 is de zon, 1 is de maan).
  Daarom tekent elke browser hetzelfde: Chromium en WebKit, de engine van Safari, getest; Firefox niet getest.
  Met "minder beweging" wisselt het pictogram zonder overgang.
  Het voorbeeld onder de muis is dan nog steeds te zien, en dat is waar het om gaat; een knop die niet wisselt zou onder de muis niets zeggen.
  De knop onthoudt een klik in `data-settled`, en haalt dat weg bij `pointerleave` en `blur`.
  Ingedrukt (`:active`) laat het pictogram niet wisselen: op een apparaat zonder muis blijft het de toestand van het besluit van de themaknop.
  De zon en de maan van de knop zijn eigen tekeningen in `ThemeButton`, want `Icon` tekent maar één pictogram tegelijk.
  Wat een schermlezer hoort, verandert niet: de naam is "Donker", `aria-pressed` volgt het thema dat je ziet, en het pictogram blijft verborgen voor hulpsoftware.
  De zon en de maan zelf blijven dekkend en hebben dezelfde kleur, dus ze halen ook halverwege 3:1 op de header; alleen de stralen worden doorzichtig terwijl ze oplossen.
- **Waarom:** een knop zonder tekst moet laten zien wat er gebeurt als je erop drukt.
  Het pictogram in rust zegt welk thema het is, het voorbeeld onder de muis zegt wat je kiest.
  Zo gaat het niet fout met de vraag wat een zon bedoelt: "nu licht" of "naar licht".
- **Alternatieven:** het pictogram altijd het thema laten tonen waar je naartoe gaat; dat wordt vaak gelezen als de stand, en dat was de reden voor het besluit over de themaknop.
  Of het pictogram niet laten veranderen en alleen een titel (tooltip) tonen; dat is traag, werkt niet met het toetsenbord en niet op touch.
  Of de vorm van de zon laten overgaan in die van de maan met de CSS-eigenschap `d`; Safari kent die niet, en dan is een tweede overgang nodig.
- **Later:** vult het besluit _De themaschakelaar is één knop rechtsboven in de header_ (27 oktober 2026) aan: het pictogram toont het thema dat je ziet in rust, en het andere thema onder de muis en bij focus.

## Een balk onder de kop voor de links naar de kaarten, alleen op een smal scherm

- **Datum:** 27 oktober 2026
- **Besluit:** `/wedstrijden` krijgt op een smal scherm een zandkleurige balk direct onder de kop, buiten `main`, met het label "Op deze pagina:" en een rij links naar de kaarten die zijwaarts scrolt.
  Op een breed scherm is ze er niet: vanaf 56 rem, de breedte waarop `Page.Body` twee kolommen heeft, is ze `display: none`, dus ook voor een schermlezer weg.
  Dit vervangt de rij links als blok in de hoofdkolom, die de projecteigenaar te groot en een beetje kleurloos vond, en waarin de links verdwijnen in de ruimte.
- **Waarom:** de balk staat bij het menu, en daarmee bij de andere navigatie, in een eigen `nav` buiten `main`.
  Een navigatie na de kaart Programma helpt niet om langs het lange programma te komen.
  Bovenaan staat de balk er meteen, met het label erbij.
- **Hoe:** het onderdeel is `Page.Shortcuts`, een label en een lijst links, niet gebonden aan ankers.
  Het getal 56 rem staat in `shortcuts.css`, en `shortcuts-css.test.ts` controleert dat het hetzelfde is als dat van de twee kolommen in `page.css`.
  De zes links staan in `apps/site/src/matchShortcuts.ts`, en een test controleert dat elke link naar een kop op de pagina gaat.
  Een link naar een kaart is het anker op de kop (`#stand`).
  De browser scrolt de kop in beeld en zet het beginpunt voor Tab daar, dus de volgende Tab gaat naar de link in de kop.
- **Alternatieven:** een rij links als blok in de hoofdkolom (het eerste ontwerp); een navigatie die altijd zichtbaar is (neemt ruimte op een breed scherm waar het niet nodig is); een samenvatting met openklappende kaarten (JavaScript en meer klikken); de kaarten opnieuw ordenen met de stand bovenaan (de stand is niet wat de meeste supporters het eerst zoeken).
- **Later:** de balk kent nu een huidige plek: de link naar de kaart waar de bezoeker is, heeft `aria-current="location"` en een rode streep (zie _De balk met links naar de kaarten volgt de pagina_, 28 oktober 2026).
  #286 zei nog dat geen link is gemarkeerd.
- **Later:** zie _Het submenu is een tweede balk in een tint van de kop, zonder label_ (27 oktober 2026).
  Dit besluit zei dat dezelfde balk later de subpagina's kon tonen.
  Dat wordt een eigen onderdeel, `Page.Submenu`, onder het menu en voor deze balk, in een tint van de kop.
  Deze balk blijft zandkleurig in licht, blijft voor ankers, plakt als enige en is vanaf 56 rem nog steeds weg.
- **Later:** zie _De site heeft vier onderdelen: Nieuws, Wedstrijden, Statistieken en Forum_ (31 oktober 2026): de balk geldt voor `/wedstrijden` en voor `/statistieken`, elk met de links naar zijn eigen kaarten.

## De balk komt via een slot in de layout, een parallelle route

- **Datum:** 27 oktober 2026
- **Besluit:** `layout.tsx` zet een slot `@shortcuts` tussen `Page.Header` en `Page.Body`, en `app/@shortcuts/wedstrijden/page.tsx` vult het met de balk.
  Een pagina zonder eigen route in het slot krijgt een leeg slot (`@shortcuts/page.tsx` voor de homepage, `@shortcuts/[...rest]/page.tsx` voor de rest, en `default.tsx`).
- **Waarom:** de layout zet de inhoud van elke pagina in `Page.Body`, en de balk moet erbuiten staan, over de hele breedte, tussen de kop en `main`.
  Een slot doet dat in de HTML van de server, zonder JavaScript dat de balk verzet, met de leesvolgorde en de tabvolgorde van de pagina.
  De route in het slot hoort bij het pad van de pagina, dus een pagina krijgt de balk door één bestand erbij te zetten.
  Op een pagina waarvan de gegevens niet te lezen zijn, toont de balk niets, want de foutpagina heeft geen kaarten om naartoe te springen.
- **Nadeel:** de lege routes zijn nodig, omdat een slot bij een klik op een link binnen de site anders de balk van de vorige pagina houdt.
  De map `@shortcuts` is geen pagina en geen adres: de tests van het sitemap, de bezoekregels en de gereserveerde adressen slaan hem over.
  Het slot is een segment onder de layout, dus de titelsjabloon van de layout bereikt nu ook de homepage.
  De foutpagina van de homepage zet haar titel daarom met `absolute`, zodat die blijft zoals hij was.
- **Alternatieven:** de balk in `Page.Body` zetten en met CSS naar buiten trekken (breedte, marges en de randen van het scherm moeten dan kloppen op elke breedte); de balk met JavaScript naar de goede plek verzetten (de balk springt na het laden, en zonder JavaScript staat hij verkeerd); `Page.Body` uit de layout halen en elke pagina de eigen laten zetten (elke pagina verandert voor één balk); een routegroep met een eigen layout voor `/wedstrijden` (alle pagina's verhuizen).
- **Later:** zie _Het beheer heeft een balk onder de kop met de schermen, en geen eigen schil_ (2 november 2026): ook `/beheer` heeft een route in het slot, voor de balk met de schermen van het beheer.

## Het hoofdmenu is 16 tot 18 pixels en wordt vetter, de huidige pagina nog vetter

- **Datum:** 27 oktober 2026
- **Besluit:** de links in het hoofdmenu van de kop zijn 16 pixels op 320 pixels breed en 18 pixels vanaf 900 pixels (`clamp(1rem, 0.93rem + 0.34vw, 1.125rem)`), op gewicht 600.
  De huidige pagina staat op gewicht 800 en heeft zijn rode streep.
  Het menu in de footer en elders blijft zoals het was.
- **Waarom:** 20 pixels is te groot.
  Onder het menu komt een submenu (#363) en op een telefoon is de maat gelijk, dus het gewicht moet het niveau tonen.
  Een zwaardere huidige pagina is beter te zien dan alleen een streep.
- **Alternatieven:** een kleiner submenu (15 pixels) en gewicht 500 voor beide; dat is leesbaar maar laat het gewicht gelijk.
  Maat en gewicht tegelijk veranderen, wat het submenu op blauw te zwak maakt.
- **Later:** vervangt de maat en het gewicht van _Het hoofdmenu staat in een eigen rij onder de sitenaam_ (27 oktober 2026): niet 500 en 16 tot 20 pixels, maar 600 en 16 tot 18 pixels, en de huidige pagina niet alleen met de rode streep maar ook op gewicht 800.
  De rij, de kleur, de streep en de ruimte blijven.
- **Later:** zie _Eén stel regels voor het gewicht van letters, met tokens die een bedoeling uitdrukken_ (28 oktober 2026): de gewichten 600 en 800 blijven, maar staan nu in `--hf-menu-font-weight` en `--hf-menu-current-font-weight`.

## De balk met links naar de kaarten volgt de pagina

- **Datum:** 28 oktober 2026
- **Besluit:** de link naar de kaart waar de bezoeker is, krijgt `aria-current="location"` en een rode streep van 3 pixels onder de tekst, en staat vooraan in de rij.
  Welke kaart dat is, bepaalt de kop die als laatste langs een lijn net onder de plakkende balk is gekomen.
  Vóór de eerste kop is er geen huidige link.
  De rij scrolt zelf (nooit de pagina), vloeiend en zonder animatie bij "minder beweging", en niet terwijl de bezoeker de rij aanraakt of de focus erin heeft.
  Het is een kleine clientcomponent in `ShortcutsRow`.
- **Waarom:** op een telefoon staan de kaarten onder elkaar en is de pagina lang.
  De bezoeker ziet zo welk deel hij leest en heeft de link naar het volgende deel bij de hand.
  Het gewicht verandert niet, zodat de rij niet verspringt als de huidige link wisselt.
  `aria-current="location"` is voor een plek op een pagina, `page` voor een pagina in het menu.
- **Hoe:** `followPage.ts` zoekt de koppen via de `href` van de links (`#stand` wijst naar het element met dat `id`) en zet er een `IntersectionObserver` op.
  De lijn ligt waar een klik op de link de kop neerzet, plus één pixel, zodat een kop na een klik meteen de huidige is.
  Dat is de ruimte die de pagina onder de balk houdt (`scroll-padding-block-start`) plus de ruimte die de kop voor zichzelf houdt (`scroll-margin-block-start`).
  Die tweede ruimte verschilt per kop, dus elke kop krijgt een eigen observer met een eigen lijn.
  Elke observer kijkt van de lijn tot het einde van de pagina.
  Zo meldt de browser ook een kop die de pagina overslaat bij een sprong, en meldt hij alleen wanneer een kop de lijn passeert.
  De component meet de pagina niet tijdens het scrollen.
  Het venster krijgt een andere maat of de tekst wordt groter: dan meet de component de lijnen opnieuw.
  Onderaan de pagina kan de laatste kaart niet tot de lijn komen, en dan passeert er geen kop meer.
  Daarom kijkt één controle per beeld (`requestAnimationFrame`) of de pagina op de bodem is.
  Staat de kop van de laatste kaart dan in beeld, dan is de laatste link de huidige.
  Een klik op een link maakt die link de huidige, tot de bezoeker zelf weer scrolt (`wheel`, `touchstart` of een toets).
  Zo loopt de balk niet langs de kaarten die een sprong passeert.
  De streep is de onderstreping van de tekst, dus ze blijft in geforceerde kleuren.
  Ze heeft een eigen rol, `--hf-colour-accent-shortcuts`: rood-600 in licht (4,77:1 op de balk) en rood-400 in donker (5,34:1).
  Het rood van de header, `--hf-colour-accent-on-header`, haalt op de zandkleurige balk maar 2,43:1.
  Vanaf 56 rem is de balk `display: none` en luistert de component niet naar het scrollen.
- **Alternatieven:** de huidige link vet maken (de link wordt breder en de rij verspringt).
  Een rij die niet meescrolt (de huidige link kan buiten beeld zijn).
  CSS met `scroll-target-group` en `:target-current` (geen JavaScript, maar alleen Chrome kent het nu).
  De rij die altijd op de uiterste plek scrolt, of op de dichtstbijzijnde rand: onvoorspelbaarder dan altijd vooraan.
  Een `scroll`-handler die per beeld de koppen meet: dat kost meer dan een observer.
- **Later:** vult het besluit _Een balk onder de kop voor de links naar de kaarten, alleen op een smal scherm_ (27 oktober 2026) aan: de balk kent nu een huidige plek.
- **Later:** zie _Eén stel regels voor het gewicht van letters, met tokens die een bedoeling uitdrukken_ (28 oktober 2026): het gewicht verandert nu wel.
  De huidige link staat op 700 tegen 500 voor de andere links, en de rij scrolt daarna nog altijd zo dat hij vooraan staat.

## Het submenu is een tweede balk in een tint van de kop, zonder label

- **Datum:** 27 oktober 2026
- **Besluit:** subpagina's staan in een balk onder het hoofdmenu in een tint van de kop (licht blauw-800, donker blauw-700), op elk scherm, met een onzichtbare naam en zonder zichtbaar label.
  De huidige pagina is vet met de rode streep van het menu.
  Een pagina met ankers en subpagina's heeft drie balken en alleen de ankerbalk plakt.
- **Waarom:** zo is het submenu zichtbaar verbonden met het menu en los van de zandkleurige ankerbalk, die bij de pagina hoort.
  Een label zou "Wedstrijden" drie keer onder elkaar zetten (menu, label, paginatitel).
  De eigenaar verbergt geen navigatie.
- **Alternatieven:** de zandkleurige balk van de ankers (lijkt te veel op de ankerbalk).
  Eén balk waarin de subpagina's winnen (de lezer mist dan de ankers).
  Een knop "Meer" in het hoofdmenu (#378, uitgesteld).
- **Later:** zie _Het hoofdmenu en het submenu zijn één `nav` tussen de `header` en de `main`, met een geneste lijst_ (28 oktober 2026): de balk is de geneste lijst van het hoofdmenu en geen eigen `nav` meer.
  De tint, de maten, de gewichten en het ontbreken van een label blijven.

## De submenubalk is een eigen onderdeel, `Page.Submenu`, en hergebruikt de rij van `Page.Shortcuts`

- **Datum:** 28 oktober 2026
- **Besluit:** de balk is een nieuw onderdeel, `Page.Submenu`, en geen variant van `Page.Shortcuts`.
  Het is een `nav` met een `aria-label`, een lijst links (`href`, `label`, `current`) en geen label.
  De rij, de lijst, de vervaging, het snappen en het omlopen zijn die van `Page.Shortcuts`: dezelfde klassen en dezelfde `ShortcutsRow`, met `follow={false}`.
  Die rij begint dan zo gescrold dat de link met `aria-current="page"` op de plek staat waar de rij snapt, en volgt de pagina niet.
- **Waarom:** de twee balken verschillen in bijna alles wat een variant zou zetten: de kleur, het label, het plakken, het verdwijnen vanaf 56 rem, het soort markering (`aria-current="page"` van de server tegen `aria-current="location"` van het scrollen) en de gewichten.
  Een variant had een prop voor elk daarvan nodig, en `Page.Shortcuts` zou voor beide balken verdeeld hebben moeten worden over `display: none` en `position: sticky`.
  Hergebruik van de rij houdt het scrollen, de vervaging en het toetsenbord op één plek.
- **Hoe:** de kleuren hebben rollen in de tokens: `--hf-colour-background-submenu` (licht blauw-800, donker blauw-700), `--hf-colour-text-submenu-link-hover` (wit) en `--hf-colour-background-submenu-pressed` (blauw-200 op 18%).
  De links zijn `--hf-colour-text-on-header` (blauw-50: 11,4:1 op het vlak in licht en 8,6:1 in donker), de focusring is `--hf-colour-focus-on-header` (blauw-300: 6,2:1 en 4,7:1) en de streep onder de huidige pagina is `--hf-colour-accent-on-header` (rood-400: 4,2:1 in licht en 3,2:1 in donker, en een grafisch deel heeft 3:1 nodig).
  Het issue noemde voor licht `#c22826`; dat rood haalt op blauw-800 maar 2,1:1 en is de kleur voor de zandkleurige balk, dus de streep is in beide thema's het rood van het menu.
  Op de vulling van een ingedrukte link haalt dat rood geen 3:1 (2,2:1 in donker), dus de huidige pagina krijgt geen vulling als je hem indrukt: een druk op de pagina waar je bent gaat nergens heen.
  De balk is 46 pixels hoog en de links zijn 36 pixels hoog (`2.25rem`), zonder lijn tussen kop en balk.
  De balk staat in de HTML na de kop en voor de ankerbalk, en plakt niet: de bestaande `scroll-padding-block-start` voor de ankerbalk blijft kloppen, want alleen die balk kan de focus bedekken.
- **Nadeel:** de klassen van de rij heten `hf-page-shortcuts-row` en `hf-page-shortcuts-list`, ook in het submenu.
  Een naam die voor beide balken past, kost een hernoeming van `Page.Shortcuts` die niets aan het gedrag verandert.
- **Alternatieven:** een variant van `Page.Shortcuts` met een prop (zie hierboven).
  De rij kopiëren in een eigen onderdeel (twee plekken die het scrollen en de vervaging gelijk moeten houden).
  Een lijn tussen kop en balk (de stap van 1,27:1 in licht en 1,33:1 in donker is genoeg, en het menu heeft al een lijn boven zich).
- **Later:** zie _Het hoofdmenu en het submenu zijn één `nav` tussen de `header` en de `main`, met een geneste lijst_ (28 oktober 2026): `Page.Submenu` is vervangen door de eigenschap `subitems` van `Navigation`.
  De rij van `Page.Shortcuts` blijft hergebruikt, zonder kopie, en de kleuren, de maten en de rollen in de tokens blijven.
  De balk staat niet meer in een eigen `nav` na de kop, maar in het `li` van zijn onderdeel.

## De CSP laat afbeeldingen van het type `data:` toe

- **Datum:** 28 oktober 2026
- **Besluit:** `img-src` wordt `'self' data:`.
  Een `data:`-afbeelding is een afbeelding in de pagina zelf en vraagt niets van een ander domein.
  Dit vult _Een Content Security Policy die derden blokkeert, zonder nonces_ aan.
- **Waarom:** de bibliotheek tekent de kaart als een SVG-afbeelding in een `data:`-adres (zie _De afbeelding van een kaart wordt in de browser gemaakt_).
  Zonder dit staat de CSP dat niet toe.
  Het principe blijft: een pagina laadt niets van een ander domein.
  `blob:` is niet nodig: de bibliotheek werkt zonder web worker (`workerNumber: 0`), want een worker zou van een `blob:`-adres starten.
- **Alternatieven:** `blob:` toelaten (alleen als de bibliotheek het echt nodig heeft, en dat is niet zo); `img-src *` (zou verzoeken naar elk domein toelaten, en dat doen we niet).

## Het hoofdmenu en het submenu zijn één `nav` tussen de `header` en de `main`, met een geneste lijst

- **Datum:** 28 oktober 2026
- **Besluit:** het hoofdmenu verlaat de `header` en wordt één `nav` ("Hoofdmenu") direct na de `header`.
  De subpagina's van het huidige onderdeel staan in een geneste lijst in zijn `li` en zien eruit als de balk van #363.
  `Page.Submenu` verdwijnt.
  Het bovenliggende item heeft `aria-current="true"` als een subpagina de huidige is, en het subitem heeft `aria-current="page"`.
  De kop ziet er hetzelfde uit.
- **Waarom:** de opmaak zegt zo dat het submenu bij een onderdeel van het menu hoort, en een schermlezer vindt één menu in plaats van twee.
  De `header` is zo alleen nog het banner met het logo en de themaknop.
  Het ontwerp van #363 en #380 blijft.
- **Hoe:** `Navigation` krijgt de eigenschap `appearance="header"` voor het hoofdmenu van de kop, en `subitems` bij een item (`href`, `label`, `current`).
  Alleen dat menu toont subitems; het menu in de footer negeert ze.
  De geneste lijst is er alleen bij het item dat de huidige pagina is of een huidige subpagina heeft.
  De kop is een raster met alleen het logo en de themaknop, met 0,25 rem eronder.
  Het menu is een flexrij op dezelfde achtergrond, met de lijn erboven als eerste item (`::before`, een rand, dus ook zichtbaar in geforceerde kleuren) en 0,4375 rem eronder.
  Zo is de som van de ruimtes gelijk aan die van de kop met het menu erin, en zijn de pixels gelijk (gemeten op 320, 390 en 900 pixels, licht en donker, ook met de insets van een iPhone nagebootst).
  Alleen op de rand van de balk, op een plek met een halve pixel, verschilt één rij pixels een paar tinten door de schaduw.
  De `ul` en de `li` van het menu hebben `display: contents`.
  De links zijn dan items van de `nav`, en de balk, die in het `li` van zijn link staat, is er ook een.
  De balk heeft `order: 1` en `flex-basis` over de hele rij, dus hij staat onder alle links, ook als de link van zijn item naar een tweede rij is omgelopen.
  De inset van de pagina zit als padding op de `nav`.
  Een percentage in de marge van een flex-item is van de breedte van de `nav` zonder die padding, dus de balk kan de inset niet met een negatieve marge terughalen: op een breed scherm stopte hij dan voor de rand.
  De balk haalt daarom alleen de marge van de pagina terug (of de uitsparing, als die groter is), en zijn kleur loopt door tot de rand als een schaduw zonder vervaging die ver uitwaaiert (`box-shadow: 0 0 0 100vmax`), boven en onder afgesneden met `clip-path`.
  Een schaduw telt niet mee voor wat scrolt, dus de pagina scrolt niet zijwaarts.
  Vanaf 66 rem eindigt de rij op de rand van de kolom, in lijn met het menu.
  `Navigation` geeft de `ul` en de `li` in dit menu `role="list"` en `role="listitem"`, want Safari liet lijsten met `display: contents` lang uit de toegankelijkheidsboom vallen.
  De tint, de maten, de gewichten en de rij met vervaging en snappen (`ShortcutsRow`) zijn die van #363.
  `watchTopEdge` kijkt naar de kop en naar het menu: de strook voor de statusbalk blijft zolang een van beide in beeld is, zoals voor deze wijziging de kop met het menu erin.
- **Nadeel:** de volgorde van de focus is de volgorde van de code: een link, zijn subpagina's, dan de volgende link.
  Staat het huidige onderdeel in het midden van het menu, dan springt de focus uit de balk terug naar de links die erboven staan.
  Een schermlezer leest wel de nesting zoals bedoeld.
  Het issue schreef voor dat het toetsenbord eerst door het menu loopt en dan door de geneste lijst; dat kan met een geneste lijst alleen als het huidige onderdeel het laatste is.
- **Alternatieven:** alleen de balk uit de `header` halen en het hoofdmenu erin laten (twee navs, de nesting is dan verdeeld over twee landmarks).
  `Page.Submenu` bewaren en in de `li` zetten (twee onderdelen voor één lijst, de stijlen blijven verdeeld).
  Alleen het subitem `aria-current` geven (het hoofdmenu zegt dan niet meer in welk onderdeel de bezoeker is).
  De balk in het `li` met `position: absolute` onder de rij zetten (de hoogte van de balk is niet bekend zodra de rij omloopt, en de pagina eronder zou eronder schuiven).
  Een subgrid (de rij van het menu loopt om op de breedte van de inhoud, en een raster kan dat niet).
- **Later:** zie _Eén stel regels voor het gewicht van letters, met tokens die een bedoeling uitdrukken_ (28 oktober 2026): de huidige pagina in de geneste lijst is nu 600 in plaats van 700, tegen 400 voor de andere links, en het menu in de footer heeft hetzelfde.
  De gewichten van de kop blijven.
- **Later:** zie _De site heeft vier onderdelen: Nieuws, Wedstrijden, Statistieken en Forum_ (31 oktober 2026): de site gebruikt de balk met subpagina's nu voor Nieuws (Podcasts, Archief en Zoeken).
  Het eerste subitem is geen overzichtspagina: het item Nieuws is zelf de link terug.
- **Later:** zie _De balk van Statistieken komt uit een slot van de layout en houdt het seizoen en de keuze vast_ (31 oktober 2026): de balk van Statistieken wordt door een pagina getekend (`NavigationBar`) en via het slot `@subnav` aan het item gegeven.
  Hij blijft in het `li` van zijn onderdeel, in de ene `nav`, dus de nesting blijft zoals hier besloten.
- **Later:** zie _De statusbalk van Safari heeft altijd één van de twee blauwen, tot de modus wisselt_ (1 november 2026): `watchTopEdge` is weg, en de strook voor de statusbalk blijft ook als het menu en de kop uit beeld zijn.

## Het hoofdmenu krijgt een knop "Meer" bij zes of meer onderdelen

- **Datum:** 28 oktober 2026
- **Besluit:** een hoofdmenu (`appearance="header"`) met zes of meer onderdelen en een `moreLabel` toont op een smal scherm het eerste onderdeel, de knop "Meer" en het laatste onderdeel (het forum).
  De onderdelen ertussen staan in een lijst onder de knop.
  Die lijst gaat open in de pagina en duwt de rest naar beneden.
  Vanaf 44rem staan alle onderdelen op één rij en is de knop weg.
  De huidige pagina komt naar voren in de rij, tussen het eerste onderdeel en "Meer", met de rode streep en zijn subpagina's eronder.
  Past hij niet, dan blijft hij in de lijst en krijgt "Meer" de rode streep.
  Bij vijf onderdelen of minder, of zonder `moreLabel`, verandert er niets.
  De site gebruikt de knop nog niet: het hoofdmenu heeft nu vier onderdelen.
- **Hoe:** de instelling heet `moreLabel`, de tekst van de knop, bijvoorbeeld "Meer".
  Zonder tekst is er geen knop, zoals `label` ook van de aanroeper komt.
  Het onderdeel kiest zelf het aantal: de constante `itemsFromMore` is 6.
  De knop is een `details` met een `summary`, zodat hij zonder JavaScript opent en sluit.
  `NavigationMore` is een clientcomponent en voegt toe: Escape sluit de lijst en zet de focus terug op de knop, een klik op een link of ernaast sluit hem, en een andere huidige pagina begint met een gesloten lijst (de `key` van de component is het adres van de huidige pagina).
  De klik buiten de lijst is een `click` en geen `pointerdown`: de pagina schuift omhoog als de lijst sluit, en een druk die onder de vinger uit schuift, gaat verloren.
  `aria-expanded` staat op de knop zodra de pagina geladen is, en volgt de lijst.
  Voor het laden zegt de browser zelf of het `details` open is, en een attribuut dat de browser niet bijhoudt, zou bij de eerste klik zonder JavaScript verkeerd blijven staan.
  `aria-controls` wijst naar de lijst.
  De pijl is `arrow-up` van `Icon`, omgedraaid als de lijst dicht is, met de bewegingstokens.
  Een nieuw pictogram was niet nodig.
  De breedte is een container query op de `nav` (`container: hf-navigation / inline-size`), omdat het menu zo breed is als de pagina en niet als het venster.
  De `nav` is die container alleen als het menu "Meer" heeft.
  Een query kan geen custom property gebruiken, dus de twee getallen staan in `navigation.css`, in drie queries en nergens anders: 44rem voor de rij, en 20rem voor de huidige pagina achter de knop.
  De acht voorbeeldonderdelen van de verhalen hebben ongeveer 41rem nodig op één rij bij de grootste letters, dus 44rem laat ruimte voor iets langere namen.
  Met de namen van de site moet het getal opnieuw gemeten worden.
  Op 20rem passen het eerste onderdeel, een huidige pagina, de knop en het forum niet meer naast elkaar (gemeten: 18,7rem met de langste voorbeeldnaam, Wedstrijden).
  Onder 44rem is de lijst van het menu een raster van vijf kolommen: het eerste onderdeel, de huidige pagina achter de knop, de knop, vrije ruimte en het forum rechts.
  De lijst staat in de cel van de knop en loopt door tot de rechterkant, dus hij begint onder de tekst van "Meer", op een eigen rij onder de andere.
  De balk met subpagina's staat op de rij daaronder en gaat dus mee naar beneden.
  De onderdelen achter de knop staan twee keer in de HTML: als link in de rij (`hf-navigation-wide`) en als link in de lijst.
  De stijlen tonen één van de twee.
  Het andere exemplaar is `display: none`, dus een schermlezer en het toetsenbord komen elk onderdeel één keer tegen, en niet twee keer `aria-current`.
  Alleen het exemplaar in de rij heeft de subpagina's.
  Past de huidige pagina niet in de rij (onder 20rem), dan verbergt de stijl alleen zijn link en niet zijn balk, zodat de subpagina's bereikbaar blijven.
  Een verhaal met een play-functie controleert dat in de browser.
- **Waarom:** zeven of acht links passen niet op één rij op een telefoon, en een menuknop die alles verbergt maakt de navigatie moeilijker te vinden.
  Het forum blijft rechts, zoals nu, en de belangrijkste links blijven zichtbaar.
  Het onderdeel is klaar voor het moment dat het menu groeit en kost de bezoeker nu niets.
  Een `details` werkt zonder JavaScript, en de site draait op gedeelde hosting waar we geen werk voor de browser willen dat ook zonder die werkt.
  De huidige pagina verdwijnt zo nooit achter een knop.
- **Nadeel:** de onderdelen achter de knop staan twee keer in de HTML.
  Wie de HTML leest zonder stijlen, ziet ze twee keer.
  Past een langere naam niet naast de knop, dan loopt de rij over: de drempel van 20rem is gemeten met de voorbeeldnamen en kijkt niet naar de lengte van een naam.
  Is de huidige pagina een onderdeel achter de knop dat niet past, dan staan zijn subpagina's op een andere plek dan zijn link: de balk staat in het `li` van de rij, de link in de lijst.
  De balk staat in de HTML in het `li` van zijn onderdeel, vóór "Meer", dus het toetsenbord komt altijd eerst langs de balk en daarna langs "Meer".
  Dat geldt ook als de huidige pagina wel in de rij past, en het is dezelfde volgorde als bij een menu zonder knop.
- **Alternatieven:** een menuknop met alles erachter (verbergt de navigatie).
  Het menu zijwaarts laten scrollen (de bezoeker ziet niet dat er meer is).
  Alleen de balk voor subpagina's (#363), die het hoofdmenu klein houdt maar niet helpt als het menu zelf groeit.
  Een `button` met een lijst die `hidden` is (werkt niet zonder JavaScript).
  Het `details` zelf in de rij zetten met `::details-content { display: contents }` en geen tweede exemplaar (één keer in de HTML, maar de lijst en de rij hebben dan dezelfde nesting en de techniek is nog jong).
  Een instelling die het aantal bepaalt, zoals `moreFrom={6}` (het issue wil dat het onderdeel zelf kiest).
  Een tweede getal voor het aantal onderdelen in de rij: het is er één, het eerste.
- **Later:** zie _De site heeft vier onderdelen: Nieuws, Wedstrijden, Statistieken en Forum_ (31 oktober 2026): het hoofdmenu van de site blijft bij vier onderdelen, dus de knop blijft ongebruikt.
  Nieuwe pagina's komen als subpagina in de balk.

## Uitersten staan als vijf regels in een lijst, en bij gelijke stand telt de laatste wedstrijd

- **Datum:** 29 oktober 2026
- **Besluit:** de kaart "Uitersten" op `/wedstrijden` toont de grootste overwinning, de grootste nederlaag, de wedstrijd met de meeste doelpunten, ons vroegste en ons laatste doelpunt van de Eredivisie.
  Bij een gelijke stand kiest hij de laatst gespeelde wedstrijd.
  Een regel zonder wedstrijd ontbreekt, en de kaart zegt niet "geen".
  De eerste drie regels tellen elke gespeelde wedstrijd van de Eredivisie, de laatste twee alleen de wedstrijden met bekende doelpunten (zoals `goalsPerQuarter`), zonder verlenging en zonder minuut 0.
  Een doelpunt in de blessuretijd telt met die tijd erbij: 45+2 komt na minuut 46.
  De kaart volgt verder de regels uit _Statistieken komen als kaarten op Wedstrijden, voor de Eredivisie, met "Gebaseerd op"_.
- **Waarom:** het zijn wedstrijden die supporters onthouden, en de gegevens zijn er al.
  Eén wedstrijd per regel houdt de kaart kort.
  De laatste wedstrijd is de nieuwste, dus de kaart verandert als er iets nieuws gebeurt.
- **Vlak en plaats:** de kaart staat als laatste in de zijbalk, met een zacht vlak (`surface="soft"`), want de kaart ervoor, Doelpunten per kwartier, is warm.
  De balk "Op deze pagina:" heeft een link "Uitersten" naar `#uitersten`, als laatste.
- **Vorm:** elke regel is een `ShortMatch` met de naam van de regel eronder in kleine letters (`hf-meta`), bij een doelpunt met de minuut en de speler erbij.
  De naam staat niet erboven, omdat `ShortMatch` in een lijst een lijn boven zichzelf tekent: een naam erboven zou van die lijn een streep onder de naam maken in plaats van tussen de regels.
  De naam erboven vraagt een wijziging in het designsysteem, en het issue vraagt er geen.
- **Alternatieven:** alle wedstrijden met hetzelfde verschil tonen (de kaart wordt lang).
  De doelpunten van de tegenstander ook (dubbel zoveel regels, minder interessant).
  De naam boven de wedstrijd (zie Vorm).
- **Later:** zie _De naam van een regel in Uitersten staat boven de wedstrijd_.
  De naam staat nu boven de wedstrijd, met een middenpunt in plaats van een komma en een dubbele punt.

## De vorige en de volgende wedstrijd volgen uit de aanvangstijd, en een wedstrijd zonder uitslag zegt dat na twee uur

- **Datum:** 29 oktober 2026
- **Besluit:** de kaart Wedstrijden toont de laatste wedstrijd die is begonnen en de eerste die nog niet is begonnen, op aanvangstijd.
  Een wedstrijd zonder uitslag toont twee uur na de aanvang (zonder aanvangstijd vanaf de dag erna) "Gegevens nog niet beschikbaar".
  De kaart op de homepage en de kaarten Programma en Uitslagen delen die verdeling.
  Een wedstrijd die is begonnen, staat in Uitslagen, ook zonder uitslag.
- **Waarom:** een bekerwedstrijd zonder uitslag stond als volgende wedstrijd op de kaart, terwijl hij al was gespeeld.
  Wikipedia kan uren of dagen achterlopen, en een supporter wil toch zien wat de volgende wedstrijd is.
  Twee uur is de grens die de projecteigenaar koos.
  Een gewone wedstrijd is dan afgelopen, een bekerwedstrijd met verlenging en strafschoppen soms nog niet; de zin kan daar dus iets te vroeg komen.
- **Hoe:** `overviewOf(matches, now)` in `src/matches.ts` verdeelt de wedstrijden en krijgt het moment van het verzoek mee, zodat een test het kan zetten.
  - Een wedstrijd is begonnen als zijn aanvangstijd (`kickoffAt`) voorbij is.
    Zonder aanvangstijd is hij begonnen als zijn dag (`matchDate`) in Nederlandse tijd voorbij is, ook rond middernacht en bij het wisselen van de zomertijd.
    Bij een weekend ("12–14 februari") is dat de laatste dag van het bereik (`lastDayOf` in `src/match-format.ts`), want `matchDate` is dan de eerste dag.
  - Een gespeelde wedstrijd is altijd begonnen, een uitgestelde wedstrijd zonder nieuwe datum nooit: die blijft in het programma als "Uitgesteld" en is nooit de vorige of de volgende.
    **Later:** een geannuleerde wedstrijd is altijd begonnen, maar nooit de vorige wedstrijd (zie _Een geannuleerde wedstrijd staat in Uitslagen en niet in Programma_).
  - `lacksResult` kiest de zin: de wedstrijd heeft geen score en de aanvang is twee uur of langer geleden.
    `Match` heeft daarvoor de eigenschap `resultMissing`; de zin staat onderaan, onder de tijd en de plaats, in een gedempt rood maar niet vet, en de tijd blijft staan.
    Dat rood is het token `--hf-colour-text-missing`: stap 800 van de roodschaal in licht, rustiger dan het rood van "Uitgesteld" (`--hf-colour-text-accent`), dat de projecteigenaar daar te fel vond.
    In donker is het stap 300, hetzelfde als dat rood.
    Het token gebruikt bestaande stappen; er komt geen nieuwe kleur bij.
    De tekst zegt het zelf, het rood komt erbij; het haalt 4,5:1 op elk vlak, in licht en donker.
  - De statistiekkaarten tellen alleen wedstrijden met de status `played` en een score, en veranderen niet.
- **Alternatieven:** de status laten bepalen (nu; het probleem van de bekerwedstrijd).
  De wedstrijd verbergen tot er een uitslag is (de kaart zegt dan niets over de laatste wedstrijd).
  Een grens van drie uur (dekt verlenging en strafschoppen, maar laat de melding bij een gewone wedstrijd lang weg).
- **Later:** zie _De Stand zegt dat een uitslag nog ontbreekt, zonder datum op de kaarten_.
  Dezelfde twee uur bepalen ook of de Stand zegt dat hij achterloopt, via `standingsLag`.

## Over ons zegt waar de gegevens vandaan komen en wat er mis kan gaan

- **Datum:** 30 oktober 2026
- **Besluit:** Over ons krijgt een compacte kaart in de zijbalk die zegt dat het nieuws en de wedstrijden door een importer binnenkomen, dat de uitslagen van de Nederlandse Wikipedia komen en kunnen achterlopen, dat namen anders gespeld kunnen zijn dan bij de club, en dat het filter een kop kan missen.
  De kaart is een kop per onderwerp met een korte alinea, zonder lijst, want de koppen geven de onderdelen al aan, en haar koppen zijn kleiner dan die van andere zijbalken: de h2 heeft de stijl van Kop 3 en de h3's die van Kop 4.
  De kaart noemt geen getal dat per omgeving verschilt: het nieuws wordt "regelmatig" opgehaald, en Wikipedia "hoogstens één keer per uur", want dat is de grens in de code (`match_imports.retry_at`) en geen instelling van de host.
- **Waarom:** een bezoeker die een achterlopende uitslag of een afwijkende spelling ziet, moet kunnen lezen waarom.
  Het past bij onze regel om open te zijn over onze bronnen, en bespaart vragen en misverstanden.
- **Alternatieven:** een deel in de hoofdkolom onder _Hoe we werken_ (de projecteigenaar wil de uitleg compact en naast de hoofdtekst, niet erin).
  De uitleg bij elke kaart zetten (veel herhaling op de pagina, en we hebben net vaste teksten ingekort).
  Een aparte pagina "Hoe het werkt" (een pagina meer om bij te houden, en bezoekers vinden hem minder snel).
  Niets zeggen (de achterstand en de spelling blijven onverklaard).

## De naam van een regel in Uitersten staat boven de wedstrijd

- **Datum:** 30 oktober 2026
- **Besluit:** in de kaart Uitersten staat de naam van elke regel ("Grootste overwinning", "Vroegste doelpunt, …") als toelichting (`<Text appearance="meta">`) boven de wedstrijd en niet eronder.
  De naam en de wedstrijd staan in dezelfde `List.Item`, en de naam komt eerst in de HTML, dus een schermlezer leest eerst de naam.
- **Waarom:** de naam werkt als kopje van de regel.
  Boven de wedstrijd zegt hij wat de lezer gaat zien, en onder de wedstrijd leest hij als aanvulling.
- **Scheiding:** bij een doelpunt scheidt een middenpunt de naam, de minuut en de speler: "Vroegste doelpunt · minuut 3 · Kemper", in plaats van een komma en een dubbele punt.
  Een middenpunt gebruikt de site al voor losse onderdelen op een regel, zoals "83 reacties · laatst 13:28" bij een discussie.
  Het teken staat, zoals daar en in `ShortMatch`, in een `span` met `aria-hidden="true"`, met de spaties erbuiten: een schermlezer slaat het over en de delen groeien niet aan elkaar.
- **Hoe:** de lijn tussen de regels, die `ShortMatch` eerst boven zichzelf tekende, staat in `short-match.css` boven alles wat in dezelfde `li` voor de wedstrijd staat.
  Zo blijft de lijn tussen de regels en niet tussen een naam en zijn wedstrijd, wat de vorige beslissing hierover tegenhield.
  De naam staat dicht bij zijn wedstrijd (`0.25rem`), en heeft meer ruimte naar de lijn erboven (`0.75rem` boven de lijn, `0.5rem` eronder).
  Samen met de ruimte onder de vorige wedstrijd (`0.5rem`) is de ruimte tussen twee regels even groot als eerst.
- **Alternatieven:** de naam onder de wedstrijd laten (nu).
  Een `h3` boven elke regel (zes koppen in een kleine kaart, te zwaar).
  Een eigenschap voor de naam op `ShortMatch` (een nieuwe API in het designsysteem, terwijl de CSS al genoeg is).
- **Later:** zie _Onderdelen en formulieren zetten geen verticale witruimte naar buiten_ in `designsysteem.md` (3 november 2026).
  De ruimte boven de lijn van een regel met een naam is niet meer een marge op de naam maar de `gap` van de lijst, en is even groot.

## Het nieuwsarchief staat op `/nieuws`, met 50 koppen per pagina en een filter per bron

- **Datum:** 30 oktober 2026
- **Besluit:** `/nieuws` toont alle koppen die we hebben opgehaald (relevant, niet verborgen, van een bron die aanstaat, geen podcast), met 50 per pagina, de nieuwste eerst en zonder indeling per dag.
  Er is een filter per bron (`?bron=<slug>`) en paginering (`?pagina=N`), zoals bij `/podcasts`.
  De homepage linkt ernaar met "Alle koppen", onder de koppen in de kaart Laatste nieuws.
  Het menu verandert niet tot de opbouw van de site is vastgesteld (#431).
- **Waarom:** de homepage houdt de laatste weken, en wie verder terug wil, heeft een archief nodig.
  Dezelfde onderdelen en adressen als de podcasts houden de site voorspelbaar en besparen werk.
  50 per pagina geeft minder pagina's dan 25, en elke regel toont zijn eigen dag, dus een indeling per dag is overbodig.
  Een bron met een vaste `slug` houdt zijn adres als de naam verandert.
- **Gevolg:** elke bron in de seed die koppen kan hebben, heeft een vaste `slug`; het forum niet, want dat heeft discussies en geen koppen.
  De seed zet de `slug` ook bij een bron die al in het register staat zonder.
  Een bron zonder `slug` staat niet in het filter, maar haar koppen staan wel bij "Alle bronnen".
  Een nieuwe kop schuift de inhoud van de pagina's op (pagina 2 van gisteren is pagina 3 van vandaag).
  Dat is zo bij elk archief en niet te voorkomen met adressen met een paginanummer; de bron en het filter blijven wel vast.
  `nieuws` staat bij de gereserveerde adressen voor een artikel van de redactie.
- **Alternatieven:** laden met "Laad meer", zoals de homepage (geen vaste adressen, terwijl het issue ze vraagt).
  Een indeling per dag (langere pagina's met kopjes die weinig toevoegen).
  Een grens van 12 maanden (oudere koppen verdwijnen van de site terwijl ze in de database staan).
  Meteen een plek in het menu (de opbouw is nog niet gekozen).
- **Later:** zie _Op `/nieuws` kies je bronnen met selectievakjes in een fieldset_: het filter per bron is een groep selectievakjes met een knop "Toon", en "Alle bronnen" als link vervalt.
  `?bron=<slug>` mag vaker voorkomen, en zonder `bron` zijn het alle bronnen.
- **Later:** zie _De site heeft vier onderdelen: Nieuws, Wedstrijden, Statistieken en Forum_ (31 oktober 2026): het archief krijgt een plek in de balk met subpagina's van Nieuws, onder de naam Archief.
- **Later:** zie _De homepage en het nieuws zijn twee pagina's, en het forum staat bovenaan de zijbalk van de homepage_ (1 november 2026): `/nieuws` heet "Nieuws" in plaats van "Nieuwsarchief", de homepage linkt met "Alle nieuws", en de zijbalk heeft ook een artikel van de redactie en de podcasts.

## De homepage heeft geen knop "Laad 5 meer" meer, maar de link "Alle koppen"

- **Datum:** 30 oktober 2026
- **Besluit:** de kaart Laatste nieuws op de homepage toont de tien nieuwste koppen, en onder de lijst staat de link "Alle koppen" naar `/nieuws`.
  De knop "Laad 5 meer" is weg, met `?nieuws=`, de ankers `#nieuws-N` bij de koppen, `parseHeadlineCount`, `maxHeadlines` en `moreHeadlines`.
  Een adres als `/?nieuws=15` laat de homepage zien.
- **Waarom:** het archief op `/nieuws` is er voor ouder nieuws, met vaste adressen en paginering.
  Een tweede manier om meer koppen te laden maakt de pagina langer en de code groter, zonder iets wat het archief niet beter doet.
  De homepage heeft zo geen parameters meer, en de lijst heeft nog maar één plek in het geheugen.
- **Gevolg:** de koppen van de homepage hebben geen `id` meer, en de knop blijft op de pagina met de gehouden nullen en op `/zoeken`.
- **Alternatieven:** de knop houden naast de link (twee manieren om meer koppen te zien, en de knop en de link raken elkaar onder de lijst).
- **Later:** zie _De homepage en het nieuws zijn twee pagina's, en het forum staat bovenaan de zijbalk van de homepage_ (1 november 2026): de link heet "Alle nieuws".
- **Later:** zie _De kaart Laatste nieuws toont de koppen van de laatste 3 dagen, minstens 5 en hoogstens 20_ (9 november 2026): geen tien koppen meer, en de link heet "Al het nieuws".

## Het filter van het nieuwsarchief staat in een lichtblauwe kaart in de zijbalk

- **Datum:** 30 oktober 2026
- **Besluit:** op `/nieuws` staat het filter per bron in een kaart op een zacht vlak (`surface="soft"`) in de zijbalk, met de kop "Bronnen", en niet meer onder de kop van de pagina.
  De naam "Bronnen filteren" en de markering van de huidige bron blijven zoals ze waren.
  Zonder koppen is er geen filter en dus geen zijbalk.
  Op een smal scherm staat de zijbalk onder de lijst en de paginering.
- **Waarom:** het filter hoort bij de lijst en niet boven alles, en de pagina krijgt zo een zijbalk zoals `/podcasts` die heeft bij een gekozen podcast, met dezelfde kaart.
  De zijbalk staat in de bron na de hoofdkolom, en het designsysteem houdt de volgorde van de bron en van het scherm gelijk (geen `order`).
- **Nadeel:** op een telefoon moet de bezoeker voorbij de lijst en de paginering scrollen om een andere bron te kiezen.
  Een balk met een link naar het filter (`Page.Shortcuts`), of een zijbalk die op een smal scherm boven de lijst staat, lost dat op, maar vraagt iets van het designsysteem en is aan de projecteigenaar.
- **Alternatieven:** het filter boven de lijst laten (het was zo, en de zijbalk blijft dan leeg).
  Het filter twee keer op de pagina zetten, boven de lijst op een smal scherm en in de zijbalk op een breed scherm (een dubbele navigatie voor een schermlezer).
- **Later:** zie _Op `/nieuws` kies je bronnen met selectievakjes in een fieldset_: de kaart blijft, maar bevat een formulier met een `fieldset` en een `legend` "Bronnen" in plaats van de kop en de navigatie "Bronnen filteren".
- **Later:** zie _/nieuws heeft een hoofdkolom van 46 rem en een zijbalk van 16 rem_.
  De zijbalk met het filter is 16 rem breed en de lijst 46 rem.

## /nieuws heeft een hoofdkolom van 46 rem en een zijbalk van 16 rem

- **Datum:** 30 oktober 2026
- **Besluit:** op `/nieuws` is de hoofdkolom 46 rem breed, met 2 rem ruimte en een zijbalk van 16 rem, samen de 64 rem van de pagina.
  Andere pagina's houden hun verdeling (38, 2 en 24 rem, of 31, 2 en 31 rem op `/wedstrijden`).
  Een `/nieuws` zonder koppen heeft geen zijbalk en dus de gewone hoofdkolom van 38 rem.
- **Waarom:** de projecteigenaar vindt dat het archief meer aandacht moet krijgen, en de zijbalk heeft alleen een filter nodig.
  De lijst krijgt daarom de breedte en de zijbalk niet meer dan het filter vraagt.
- **Hoe:** de pagina kiest de verdeling met `narrow` op de `Page.Sidebar`, zoals `/wedstrijden` `wide` kiest, want de `Page.Body` staat in de layout van de site en is voor alle pagina's dezelfde.
  `Page.Body` ziet de smalle zijbalk met `:has()`.
  De maten staan als tokens in `layout.css`: `--hf-content-max-width-broad` (46 rem) en `--hf-sidebar-width-narrow` (16 rem).
  Vanaf 52 rem is het raster `minmax(24rem, 46rem)` en 16 rem.
  Tot 66 rem breed krimpt alleen de hoofdkolom mee, tot 24 rem, en de zijbalk blijft 16 rem.
  Samen passen de minima (40 rem) in de 42,25 rem die een telefoon op zijn kant bij 52 rem overhoudt.
  Onder 52 rem is er één spoor van hoogstens 38 rem, zoals op elke pagina, en staat de zijbalk onder de lijst en de paginering, in de volgorde van de bron.
  Op een telefoon staat het filter dus onder de lijst, zoals de beslissing _Het filter van het nieuwsarchief staat in een lichtblauwe kaart in de zijbalk_ al zei; dat verandert hier niet.
- **Alternatieven:** de verdeling aan `Page.Body` meegeven (kan niet: de layout van de site rendert hem voor alle pagina's).
  Een eigenschap `size` met namen als `wide` en `narrow` (voor twee waarden meer dan nodig).
  De breedte van 46 rem ook onder 52 rem gebruiken (op een tablet zou de pagina breder zijn dan alle andere pagina's).

## Op `/nieuws` kies je bronnen met selectievakjes in een fieldset

- **Datum:** 30 oktober 2026
- **Besluit:** het filter per bron op `/nieuws` is een formulier met `method="get"` naar `/nieuws`, met een `fieldset` en een `legend` "Bronnen", een selectievakje per bron (`name="bron"`, de `slug` als waarde) en een knop "Toon".
  - **Geen vinkje betekent alle bronnen**, en alle vinkjes ook.
    Vanaf het eerste vinkje toont de pagina alleen de aangevinkte bronnen.
    "Alle bronnen" als link vervalt.
  - **Het adres** is `?bron=a&bron=b`, in de volgorde van de lijst, en `?pagina=N` blijft.
    Een adres met alle bronnen is dezelfde pagina als het adres zonder `bron`: de pagina toont alle koppen, de vakjes staan aangevinkt zoals het adres zegt, en het canonieke adres en de adressen van de paginering hebben geen `bron`.
    Een andere volgorde in het adres geeft dezelfde pagina.
    Een onbekende slug, een slug die twee keer voorkomt en een verkeerde `pagina` geven "niet gevonden".
    Een nieuwe keuze begint op pagina 1, omdat het formulier geen `pagina` verstuurt.
  - **De knop blijft altijd staan**, ook met JavaScript, anders dan bij de seizoenskiezer.
    Een pagina die bij elk vinkje opnieuw laadt, neemt de focus mee en is lastig voor toetsenbord en schermlezer.
  - **Eén bron aangevinkt:** de naam van de bron staat niet bij elke kop, want hij staat in de kop van de pagina ("Nieuwsarchief van A") en in het vakje.
    De naam blijft in elke regel voor een schermlezer, omdat we de bron altijd noemen (principe 4 van de Redactie).
  - **De titel en de kop** noemen de gekozen bronnen: "Nieuwsarchief van A en B", bij meer bronnen "A, B en C".
- **Waarom:** met links kun je één bron kiezen en met vakjes meer, en een formulier met een GET geeft een adres dat je kunt delen en werkt zonder JavaScript, zoals de seizoenskiezer.
  Dat alle vakjes en geen vakje dezelfde pagina zijn, geeft een bezoeker die alles aanvinkt dezelfde pagina als een bezoeker die niets doet, op één adres.
- **Gevolg:** het designsysteem krijgt `CheckboxGroup` (in de subgroep Formulier), een `fieldset` met een `legend` en een vakje per optie, en `NewsItem` krijgt `showSource` om de naam van de bron te verbergen zonder hem uit de HTML te halen.
  De queries `listArchivePage` en `countArchiveItems` nemen `sources`, een lijst slugs, in plaats van `source`.
  De server bewaart de pagina's per keuze, met de bronnen in de volgorde van de lijst, zodat dezelfde keuze in een andere volgorde dezelfde plek in het geheugen heeft.
  `Filter` blijft, want `/podcasts` gebruikt hem.
- **Alternatieven:** de bron laten staan bij elke kop met een schermlezer (de naam is dan vaker te horen dan nodig) of hem helemaal weglaten (de bron staat dan alleen in de kop).
  Het formulier met JavaScript laten verzenden bij elk vinkje, zoals de seizoenskiezer (de pagina laadt dan opnieuw tijdens het kiezen).
  Een doorverwijzing naar `/nieuws` bij alle vinkjes (een extra stap, en de vakjes staan dan niet aangevinkt zoals de bezoeker koos).

## De site heeft vier onderdelen: Nieuws, Wedstrijden, Statistieken en Forum

- **Datum:** 31 oktober 2026
- **Besluit:** het hoofdmenu heeft vier onderdelen: Nieuws, Wedstrijden, Statistieken en Forum (extern).
  Dit is optie 4 van het ontwerp van #431.
  - **Nieuws** is `/`, en blijft de homepage.
    Onder het menu staat een balk met de subpagina's Podcasts, Archief en Zoeken, in die volgorde.
  - **Podcasts** staat op `/nieuws/podcasts` en het archief op `/nieuws` (#26).
    `/podcasts` vervalt zonder omleiding: productie en lancering (#33, #34) staan nog open, dus er zijn geen openbare links.
  - **Zoeken** staat op `/nieuws/zoeken`, zonder omleiding, om dezelfde reden als bij Podcasts: productie is niet live en er zijn geen openbare links.
    `/zoeken` vervalt.
    De link in de footer blijft en wijst naar het nieuwe adres.
    Zoekt het later ook in spelers en tegenstanders, dan kan het uit Nieuws terug.
  - **Wedstrijden** blijft één pagina met Programma, Uitslagen, Stand en de hoofdtrainers.
    De Beker (#404) hoort erbij.
    Komen er subpagina's, dan krijgt de pagina een balk.
  - **Statistieken** staat op `/statistieken`, met een eigen seizoenskiezer zoals Wedstrijden.
    Later komen Spelers, Tegenstanders en Seizoenen als subpagina's in een balk.
  - **De scheiding:** Wedstrijden is wat je opzoekt: een lijst van wedstrijden, de stand zoals hij is en de hoofdtrainers.
    Statistieken is wat uit veel wedstrijden volgt: een telling, een gemiddelde, een rangorde of een verloop.
  - **De negen kaarten met cijfers** verhuizen van `/wedstrijden` naar `/statistieken`: Onze plek in de competitie, Verloop van het seizoen, Reeksen, Thuis en uit, Doelpuntenmakers, De nul gehouden, Doelpunten per kwartier, Hoe de wedstrijden verlopen en Uitersten.
    De Stand blijft op Wedstrijden, met een link naar de kaarten waar hij bij hoort.
    Ze staan op Statistieken in twee gelijke kolommen, vanaf het breekpunt voor twee kolommen.
  - **De ankers** van die negen kaarten breken, zonder omleiding: een server kan een anker niet omleiden, en er zijn geen openbare links.
  - **De afbeelding van een korte vorm**, zoals de top 5 van Doelpuntenmakers, mag worden gedeeld, met "top 5" in de kop.
  - **De kaart Stand op de homepage** krijgt geen regel met de topscorer: de projecteigenaar wil dat niet.
- **Waarom:** de balk met Podcasts staat op `/` op het eerste scherm, dus Podcasts blijft één tik van de homepage.
  Het menu blijft kort en past op 390 pixels.
  Zonder de negen kaarten is Wedstrijden een korte pagina.
  Optie 4 is optie 1 in stappen, dus wat we nu bouwen gaat niet verloren als Wedstrijden groeit.
  Het zoeken doorzoekt koppen, afleveringen van podcasts en artikelen van de redactie, dus het is een zoekopdracht in het nieuws.
  In de balk van Nieuws is het makkelijker te vinden dan in de footer.
- **Nadeel:** we geven op dat alle onderdelen hetzelfde patroon hebben: Wedstrijden krijgt nog geen korte kaarten en balk.
  Podcasts is vanaf Wedstrijden en Statistieken twee tikken.
  De ankers van negen kaarten breken.
  Met Statistieken is het menu 345 pixels breed, en op een telefoon van 375 pixels valt Forum naar een tweede rij.
- **Gevolg:** de bouw volgt in #482 (Podcasts verhuist en Nieuws krijgt een balk) en #483 (de pagina Statistieken).
  De top 5, Spelers, Tegenstanders en Seizoenen, de wedstrijdpagina en een balk voor Wedstrijden volgen als eigen issues.
- **Alternatieven:** de drie andere opties van het ontwerp.
  - Optie 1: elk onderdeel een hoofdpagina met korte kaarten en een balk.
    Dat is nu te veel werk: negen nieuwe adressen en korte vormen voor een pagina met drie kaarten.
  - Optie 2: Podcasts en Statistieken als eigen onderdelen in een menu van vijf, zonder balk.
    Dat schaalt niet: bij acht onderdelen staan Wedstrijden en Statistieken op een telefoon achter "Meer".
  - Optie 3: elk onderdeel een hub met "Alle …"-knoppen, zonder balk.
    Een stap naar een zusterpagina kost dan twee tikken, en Podcasts staat laag op de homepage.
  - De Stand naar Statistieken: er is geen goede reden voor, want de stand hoort bij de lijsten.
  - `/podcasts` houden en `/nieuws/podcasts` met een omleiding laten verwijzen: zonder openbare links is een omleiding niet nodig.
  - Het zoeken in de footer laten op `/zoeken`: het is daar moeilijk te vinden, en het adres past niet bij de andere pagina's van Nieuws.
- **Later:** de balk van Nieuws heeft op verzoek van de projecteigenaar (31 oktober 2026) de volgorde Archief, Podcasts en Zoeken, en niet Podcasts, Archief en Zoeken.
- **Later:** de top 5 en Spelers staan sinds 31 oktober 2026 op `/statistieken` en `/statistieken/spelers`; zie _Statistieken toont de top 5 van de doelpuntenmakers, en de volledige lijst staat op Spelers_.
- **Later:** zie _Tegenstanders is een lijst van alle clubs en een pagina per club, onder Statistieken_ (31 oktober 2026): Tegenstanders is er, naast Spelers, in de balk van Statistieken.
- **Later:** zie _De homepage en het nieuws zijn twee pagina's, en het forum staat bovenaan de zijbalk van de homepage_ (1 november 2026): `/` is niet meer Nieuws en heeft geen balk, Nieuws is `/nieuws` en is het archief (dat item vervalt), en de balk van Nieuws heeft Podcasts en Zoeken.
  De rest van dit besluit blijft gelden.
- **Later:** zie _De kaart met de uitslagen staat op Wedstrijden en telt dezelfde wedstrijden als Uitslagen_ (2 november 2026): `/wedstrijden` houdt toch een kaart met cijfers, "Hoe vaak welke uitslag", onder de stand en boven de hoofdtrainer in de zijbalk.
- **Later:** zie _Het hoofdmenu heeft vier onderdelen: Nieuws, Wedstrijden, Spelers en Forum_ (6 november 2026): Statistieken is geen onderdeel meer, en Spelers wordt er een (#769).
  Tot #771 heeft het menu vijf onderdelen: Nieuws, Wedstrijden, Statistieken, Spelers en Forum.

## De homepage en het nieuws zijn twee pagina's, en het forum staat bovenaan de zijbalk van de homepage

- **Datum:** 1 november 2026
- **Besluit:** `/` en `/nieuws` zijn twee pagina's met elk hun eigen inhoud.
  - **De homepage `/`** is de voorpagina van de hele site.
    Ze staat niet in het hoofdmenu (het logo wijst ernaartoe) en heeft geen balk met subpagina's.
    De hoofdkolom heeft bovenaan "Van de redactie", in de lange vorm, want daar komt de aankondiging van de livegang, en daaronder "Laatste nieuws" met tien koppen en de link "Alle nieuws" naar `/nieuws`.
    De zijbalk heeft bovenaan het forum ("Nieuwste discussies"), onze zustersite, en daaronder Wedstrijden, Stand en "Nieuwste podcasts".
  - **Het nieuws `/nieuws`** heet "Nieuws" en is het archief: de hoofdkolom heeft alleen koppen, 50 per pagina, met `?bron=` en `?pagina=` zoals eerder.
    De zijbalk heeft van boven naar beneden het filter per bron, één artikel van de redactie als één nieuwsregel (`NewsItem` met de bron "Van de redactie", zonder inleiding en zonder pictogram voor een andere site; zonder artikel geen kaart) en de kaart "Podcasts" met de nieuwste afleveringen.
    Er staan geen wedstrijdkaarten op.
  - **Het hoofdmenu** heeft Nieuws op `/nieuws`.
    Het is het huidige onderdeel op `/nieuws`, `/nieuws/podcasts`, `/nieuws/zoeken` en `/redactie/<naam>`, en de homepage heeft geen huidig onderdeel.
    De balk van Nieuws heeft Podcasts en Zoeken, in die volgorde, op die pagina's; het item Archief vervalt.
  - **Adressen:** geen omleidingen en `?nieuws=` is weg, want er zijn nog geen openbare links (#33).
  - **De aantallen:** elke kaart met een lijst toont standaard vijf items: de discussies en de afleveringen op de homepage, en de afleveringen op `/nieuws` (`itemsPerCard` in `apps/site/src/items-per-card.ts`).
    Het nieuws is de hoofdkaart: "Laatste nieuws" op de homepage blijft tien koppen (`firstHeadlines`), en de lijst op `/nieuws` blijft 50 per pagina (`headlinesPerPage`).
    Kaarten van een eigen soort, zoals de vorige en de volgende wedstrijd en de stand met drie clubs, houden hun eigen aantal.
    De toegestane maten zijn 5, 10, 20 en 50, vast in de code (`listSizes`), en elk aantal in dat bestand komt daaruit; een test zegt dat.
    Een bezoeker kiest geen maat.
    De kolommen zijn niet op gelijke lengte gebracht: bij 1100 pixels breed en met de verzonnen gegevens is de hoofdkolom van de homepage 1339 pixels hoog en de zijbalk 2055.
- **Waarom:** de homepage is het overzicht met de aankondiging bovenaan en het forum prominent, en het nieuws krijgt één plek met zijn eigen balk.
  Een item Nieuws dat naar de homepage wees, gaf op de homepage een balk met subpagina's die de projecteigenaar niet verwachtte.
  Zo bestaat er niets dubbel: Nieuws is het archief, dus een item Archief erbij is overbodig.
  Vijf items per kaart in de zijbalk zijn genoeg om te zien wat er is, en dezelfde maat op elke kaart houdt de pagina's gelijk.
  Een gelijke lengte van de kolommen is minder belangrijk dan genoeg items en gelijke aantallen.
- **Nadeel:** de hoofdkolom van de homepage is korter dan de zijbalk (1339 tegen 2055 pixels bij 1100 pixels), dus onder het nieuws staat leeg vlak naast de zijbalk.
  De hoogte hangt van de gegevens af: lange titels maken een kaart hoger.
  Op een telefoon staat de zijbalk van `/nieuws` na de 50 koppen en de paginering, dus het filter staat ver onderaan (zie #206).
- **Gevolg:** de pagina's en tests van `/` en `/nieuws`, het menu, de e2e-tests en de rooktest zijn bijgewerkt, en de kaarten voor discussies en podcasts zijn onderdelen in `apps/site/src/NewsCards.tsx` die beide pagina's gebruiken.
  Wat verderop in de tijd komt, zoals vijf wedstrijden op de kaart Wedstrijden (#516), verandert de hoogte van de zijbalk.
  De afleveringen van `/nieuws/podcasts` staan op 25 per pagina (`episodesPerPage` in `apps/site/src/podcasts.ts`), en dat is geen maat uit `listSizes`.
- **Alternatieven:** het item Nieuws op `/` laten staan met alleen de balk verborgen op de homepage (twee pagina's op één adres, en Nieuws is dan nooit een eigen plek).
  Een apart item Archief houden naast Nieuws (twee plekken voor dezelfde koppen).
  Omleidingen van de oude adressen (er zijn geen openbare links).
  Twee items per kaart in de zijbalk van de homepage, om de kolommen even lang te maken (de projecteigenaar koos op 1 november 2026 voor vijf per kaart; de eerste versie van dit besluit had twee).
  Een bezoeker laten kiezen tussen 5, 10, 20 en 50 (meer knoppen en een adres per keuze, terwijl de code de maten vastlegt).
  Een korte vorm van `ArticleCard` met de inleiding in de zijbalk van `/nieuws`, zonder "Lees verder" (een tweede vorm van een onderdeel voor één plek; de projecteigenaar koos op 1 november 2026 voor de nieuwsregel, zoals de andere kaarten).
- **Later:** zie _De kaart met podcasts toont de afleveringen van de laatste 8 dagen_ (7 november 2026): de kaart met podcasts op de homepage en op `/nieuws` toont alleen afleveringen van de laatste 8 dagen, tot vijf.
- **Later:** zie _Op de homepage staat Wedstrijden boven het forum_ (6 november 2026): de zijbalk van de homepage begint met Wedstrijden en Stand, dan het forum, dan de podcasts.
- **Later:** zie _De kaart Laatste nieuws toont de koppen van de laatste 3 dagen, minstens 5 en hoogstens 20_ (9 november 2026): de link heet "Al het nieuws", en "Laatste nieuws" toont geen vaste tien koppen (`firstHeadlines`) meer.

## De kaarten van Statistieken staan in een hoofdkolom en een brede zijbalk, vier links en vijf rechts

- **Datum:** 31 oktober 2026
- **Besluit:** de pagina Statistieken maakt zijn twee gelijke kolommen met wat het designsysteem al heeft: een `Page.Main` met de kop en de kiezer als `intro`, en een `Page.Sidebar` met `wide`.
  Er komt geen nieuwe variant van `Page.Body`, alleen een verhaal (_Met twee gelijke kolommen_ bij Patronen › Pagina) en een regel in de documentatie van `Page.Sidebar` en van het patroon.
  - **De verdeling:** de eerste vier kaarten in de volgorde van de balk "Op deze pagina:" staan links in de hoofdkolom (Onze plek in de competitie, Verloop van het seizoen, Reeksen en Thuis en uit).
    De andere vijf staan rechts in de zijbalk (Doelpuntenmakers, De nul gehouden, Doelpunten per kwartier, Hoe de wedstrijden verlopen en Uitersten), met de bronvermelding als laatste.
  - **De volgorde:** de broncode is de volgorde van de balk en van een telefoon, dus eerst de hoofdkolom en dan de zijbalk.
    De kolommen volgen de broncode van boven naar beneden, zonder rijen die elkaar in de weg zitten.
  - **De naam van de zijbalk** is "Meer cijfers over het seizoen", want de zijbalk is een `aside` en krijgt een naam.
- **Waarom:** `wide` maakt de zijbalk even breed als de hoofdkolom en doet dat vanaf het breekpunt dat het designsysteem voor twee kolommen heeft, precies wat Wedstrijden al had.
  Een nieuwe variant zou hetzelfde doen onder een andere naam.
  Een pagina heeft één `main`, dus een tweede hoofdkolom kan niet.
  Gemeten op 1100 pixels breed, met de verzonnen gegevens van de controle, is de linker kolom 2107 pixels hoog en de rechter 2651, met de bronvermelding erbij.
  De kaarten zijn 191 tot 665 pixels hoog, met 32 pixels ertussen.
  Bij een andere verdeling is het verschil groter: bij 5 en 4 is de linker kolom 2773 en de rechter 1985, en bij 3 en 6 is de linker 1547 en de rechter 3211.
  Met 4 en 5 is het verschil het kleinst, 544 pixels.
  De hoogte hangt af van de gegevens: meer doelpuntenmakers of meer wedstrijden met de nul gehouden maken de rechter kolom hoger.
  Dat nemen we aan, want een andere verdeling per seizoen zou de volgorde van de balk breken.
- **Alternatieven:** de kolommen laten vullen door de browser met CSS-kolommen (`columns: 2`).
  Die verdelen de kaarten zelf over de kolommen, maar een kaart die groeit, zoals De nul gehouden met "Laad 5 meer", springt dan naar de andere kolom, en een lange kaart laat een gat achter.
  Een raster met rijen van twee kaarten: de volgorde op een telefoon (links, rechts, links, rechts) is dan niet die van de kolommen, en de kaarten van een rij zijn niet even hoog.
  Een nieuwe prop op `Page.Body` of `Page.Main` voor twee kolommen: dubbel werk naast `wide`.

## Statistieken toont de top 5 van de doelpuntenmakers, en de volledige lijst staat op Spelers

- **Datum:** 31 oktober 2026
- **Besluit:** de kaart Doelpuntenmakers op `/statistieken` toont de top 5, en de volledige lijst staat op een nieuwe pagina Spelers, de eerste subpagina van Statistieken.
  - **De kaart op Statistieken** houdt zijn naam, zijn anker `doelpuntenmakers` (met het oude `topscorers`), zijn afbeeldingsknop, "Gebaseerd op" en de bronvermelding.
    Onder de kop staat "De top 5 van 17 spelers die scoorden", zodat de afbeelding "top 5" zegt, en onder de tabel de link "Alle doelpuntenmakers" naar de pagina Spelers van hetzelfde seizoen.
  - **De gelijke plekken:** de kaart toont iedereen die op een van de eerste vijf plekken staat.
    Delen twee spelers de vijfde plek, dan staan ze er allebei in, en de kaart kan meer dan vijf namen tonen.
    Staan er drie spelers op de vierde plek, dan blijven ze alle drie en is er geen vijfde plek.
    Er is geen grens aan het aantal rijen.
    Is er niemand weggelaten, omdat vijf spelers of minder scoorden of omdat iedereen gelijk staat, dan staat er geen "top 5" maar het aantal spelers, zoals op de pagina Spelers: "4 spelers hebben gescoord".
  - **De adressen** van Spelers zijn `/statistieken/spelers` voor het lopende seizoen en `/statistieken/spelers/2025-26` voor een eerder seizoen, met de kiezer op `/statistieken/spelers/kies`.
    De regels zijn die van Statistieken: één adres per seizoen, een onbekend seizoen geeft "niet gevonden", en lukt het lezen niet, dan staat er de foutpagina.
    De pagina gebruikt `loadSeasonPage`, `seasonOfAddress` en `pickedSeasonResponse` uit `src/season-page.ts`, dus er is niets gekopieerd.
  - **De pagina Spelers** heeft de kaart die op Statistieken stond, met alle spelers, hetzelfde anker en dezelfde kaart (`TopScorersCard`), zonder de link.
    De bezoekteller telt een seizoen van Spelers als een bezoek aan `/statistieken/spelers`, zoals bij Statistieken.
  - **De balk met subpagina's** van Statistieken heeft Spelers.
    Op `/statistieken` is geen subpagina de huidige; op `/statistieken/spelers` is Spelers dat wel (`aria-current="page"`), en Statistieken is op beide pagina's het huidige onderdeel van het menu.
    De balk "Op deze pagina:" van Spelers heeft één link, naar de kaart.
- **Waarom:** de lijst met doelpuntenmakers is met zestien tot twintig rijen te lang voor een pagina met negen kaarten, en het is de kaart die het meest groeit.
  De top 5 laat zien wie er bovenaan staat en is kort genoeg om als afbeelding te delen.
  Wie de rest wil, heeft één tik nodig.
  Gelijke plekken horen er helemaal bij: de zesde speler met evenveel doelpunten als de vijfde weglaten, zou een willekeurige keuze zijn.
  Een grens van acht rijen, zoals de kaart ooit had, geeft hetzelfde probleem een andere plek.
  Het gedeelde stuk maakt dat de top 5 en de lijst nooit uit elkaar lopen: ze komen uit dezelfde telling (`topScorersOf`), en de top 5 is er het begin van (`topFiveOf`).
- **Nadeel:** de kaart op Statistieken heeft een wisselende hoogte, want de gelijke plekken tellen mee: in een seizoen waarin iedereen één doelpunt maakte, staan alle spelers erin.
  De afbeelding van de kaart bevat ook de link "Alle doelpuntenmakers", als tekst, omdat de knop de kaart kopieert.
  De balk "Op deze pagina:" van Spelers heeft één link, naar de enige kaart; hij krijgt er meer als de extra's van #403 en #407 erbij komen.
- **Alternatieven:** de volledige lijst houden en de kaart inklappen met een knop (kost JavaScript of een extra adres, en de afbeelding toont dan de hele lijst); de top 5 op een vaste hoogte afkappen en een speler met evenveel doelpunten weglaten (willekeurig); de vijf met gelijkstaanden tot hoogstens acht rijen, zoals de kaart eerder had (een grens die de gelijke plekken toch afkapt); Spelers alleen met de lijst, zonder balk met subpagina's (de pagina is dan alleen via de link te vinden).
- **Later:** zie _De kaart met topscorers toont alle doelpuntenmakers_ (26 oktober 2026): sinds 31 oktober 2026 toont `/statistieken` weer de top 5, nu met alle gelijke plekken en zonder grens, en de volledige lijst staat op `/statistieken/spelers`.
- **Later:** zie _Spelers met evenveel doelpunten delen één rij in de korte tabel met doelpuntenmakers_ (4 november 2026): de kaart op Statistieken heeft sinds dit besluit hoogstens vijf rijen, ook als meer dan vijf spelers erin staan.
- **Later:** zie _De pagina Spelers toont bijzondere doelpunten_ (31 oktober 2026): Spelers heeft sinds die dag een tweede kaart, en de balk "Op deze pagina:" van Spelers heeft twee links.
- **Later:** zie _Tegenstanders is een lijst van alle clubs en een pagina per club, onder Statistieken_ (31 oktober 2026): de balk met subpagina's van Statistieken heeft sindsdien ook Tegenstanders, en op de pagina's daarvan is Tegenstanders de huidige subpagina.
- **Later:** zie _Doelpuntenmakers staan op één plek: Spelers_ (6 november 2026): Cijfers toont geen top 5 meer (#774).
  Sinds #769 staat Spelers op `/spelers`, met `/spelers/<seizoen>` en `/spelers/kies`, en is Spelers een onderdeel van het hoofdmenu.

## Tegenstanders is een lijst van alle clubs en een pagina per club, onder Statistieken

- **Datum:** 31 oktober 2026
- **Besluit:** onder Statistieken komen de lijst `/statistieken/tegenstanders` en een pagina per club, `/statistieken/tegenstanders/<club>`, met de onderlinge resultaten over alle seizoenen die we hebben (#415).
  - **De lijst** heeft elke club die in de gegevens staat, zonder minimum aantal wedstrijden, van A tot Z.
    De kolommen zijn Club, Gespeeld, Gewonnen, Gelijk, Verloren en Doelpunten (voor–tegen).
    De vijf cijferkolommen hebben een afkorting (G, W, GL, V, D) met het hele woord voor een schermlezer, en een regel onder de tabel legt ze uit, zodat de tabel op een telefoon past.
    Elke clubnaam is een link; de tabel heeft geen knop om te sorteren en geen paginering.
    Een club met alleen wedstrijden die nog niet zijn gespeeld, staat erin met nullen.
  - **De pagina van een club** heeft de naam als h1, met "Eerder: …" eronder als Wikipedia de club onder andere namen schrijft.
    De kaart "Onze uitslagen tegen …" heeft een tabel met Totaal, Thuis en Uit en de rijen gespeeld, gewonnen, gelijk, verloren, doelpunten voor en doelpunten tegen, zonder punten, omdat de beker er geen geeft.
    Eronder staan de grootste overwinning en de grootste nederlaag, als regels zoals op de kaart Uitersten; bij twee even grote wint de latere, zoals daar.
    De kaart heeft de afbeeldingsknop, en de naam van de club staat in de kop, zodat de afbeelding zegt waarover hij gaat.
    De kaart Wedstrijden toont elke gespeelde wedstrijd, de nieuwste eerst, als korte regel (`ShortMatch`) met het seizoen en de competitie erboven.
    De regel noemt de club zoals Wikipedia hem in die wedstrijd schreef, dus een oude naam is zichtbaar.
    Een wedstrijd die nog niet is gespeeld, staat er niet in.
  - **De zin over het aantal** houdt de vorm van de andere kaarten, "Gebaseerd op alle 12 gespeelde wedstrijden", en krijgt "sinds 2010/11" erachter: het eerste seizoen waarvan we wedstrijden hebben, ook als de eerste wedstrijd tegen deze club later was.
    Bij de keuze Eredivisie staat er "in de Eredivisie" bij.
    De vorm van die zin is onderdeel van #494 en verandert hier niet.
  - **De schakelaar van #406** werkt op beide pagina's, met `?competitie=eredivisie` in elke link, en staat er alleen als er een gespeelde bekerwedstrijd is (bij de club: tegen die club).
    Een club die we alleen in de beker troffen, staat bij Eredivisie niet in de lijst, en zijn pagina zegt "In de Eredivisie hebben we nog niet tegen deze club gespeeld."
    Een andere waarde, een lege waarde en een waarde die twee keer staat, geven "niet gevonden", en een slug die geen club heeft ook.
    **Later:** zie _De bron staat bij de wedstrijden, per bron_ (8 november 2026): de schakelaar van een seizoen staat er ook alleen als dat seizoen een wedstrijd van de Eredivisie heeft.
    De pagina's hebben geen seizoenskiezer, want ze tellen alle seizoenen.
  - **De balk van Statistieken** heeft Tegenstanders naast Spelers.
    Op de lijst en op elke clubpagina is Tegenstanders de huidige subpagina (`aria-current="page"`), en Statistieken is het huidige onderdeel van het menu.
  - **De bezoekteller en de sitemap:** de lijst staat in `pages.ts`, dus in de sitemap en de teller.
    Elke clubpagina staat in de sitemap, uit de database zoals de artikelen, en telt mee onder zijn eigen adres, nadat de database heeft bevestigd dat de club bestaat, zoals bij een artikel.
    Een verzonnen adres is dus geen rij in de tellers.
  - **De bron:** onderaan staat de volledige bronvermelding van Wikipedia met een link naar de pagina's van alle seizoenen die in de cijfers zitten (op de lijst alle seizoenen, bij een club de seizoenen waarin we hem troffen), met de licentie CC BY-SA 4.0.
    Daarvoor is er een query, `listAllWikipediaPages`, die de pagina's van alle seizoenen in één keer geeft.
- **Waarom:** een supporter wil weten hoe vaak we van een club wonnen, en de clubs hebben sinds #496 een adres dat blijft werken.
  Een lijst van alle clubs zonder minimum laat zien wat we hebben; de pagina's vullen zich vanzelf als #414 oudere seizoenen importeert.
  De afkortingen houden de tabel op een telefoon smal, en de zin "sinds …" laat zien hoe ver de cijfers teruggaan.
  Een bron die alle seizoenen noemt, is de eerlijke vermelding voor cijfers die uit al die pagina's komen.
- **Hoe:** de cijfers van de lijst komen uit `listClubRecords` en die van een club uit `listClubMatches`, via `src/opponents.ts`.
  Daar staan ook de optelling van een lijst wedstrijden (`tallyOf`, `summaryOf`) en de gecachete lezingen.
  De lijst heeft twee sleutels in de cache, alle wedstrijden en de Eredivisie, en de wedstrijden van een club staan per slug in de cache, pas nadat de slug is gecontroleerd tegen de bekende clubs, want een bezoeker kan elk adres verzinnen.
  Een test laat zien dat Totaal gelijk is aan Thuis plus Uit en dat gewonnen, gelijk en verloren samen het aantal gespeelde wedstrijden zijn, voor alle wedstrijden en voor de Eredivisie, en een e2e-test dat de cijfers van een club in de lijst die van zijn pagina zijn.
  `DataTable` kreeg `href` op een rij, zodat de rijkop een link is.
  `CompetitionSwitch` kreeg een zusje, `CompetitionLinks`, voor een pagina die zelf weet of er iets te kiezen valt.
- **Nadeel:** de bronvermelding wordt lang zodra #414 de oudere seizoenen importeert, want elk seizoen heeft tot drie pagina's.
  Een cel als "7–5" leest een schermlezer als twee getallen zonder het woord "tegen"; de kolomkop zegt "doelpunten" en de regel onder de tabel "voor–tegen".
  De lijst heeft clubs met nullen zolang we alleen een wedstrijd uit de toekomst tegen ze hebben.
- **Alternatieven:** alleen clubs met een minimum aantal wedstrijden (de projecteigenaar koos er geen); hele woorden als kolomkop (past niet op een telefoon); de lijst sorteerbaar of met paginering (te veel voor een lijst van enkele tientallen clubs); een kaart met tegenstanders op de pagina Statistieken (de pagina is al vol); de bronvermelding in korte vorm, "Bron: Wikipedia" (zegt niet uit welke pagina's de cijfers komen); in de cache een sleutel per verzonnen slug (laat het geheugen volgroeien).
- **Later:** zie _Een tabel sorteert op een kolom met knoppen in de koppen, die er alleen met JavaScript zijn_ (31 oktober 2026): de lijst sorteert sindsdien met JavaScript op elke kolom en heeft bij de keuze Eredivisie de kolom Punten.
  De tabel van de server blijft van A tot Z, zonder knoppen.
- **Later:** zie _De pagina van een club toont de namen van zijn stadion en heeft een zijkolom_ (1 november 2026): de pagina van een club heeft sindsdien een hoofdkolom en een zijkolom.
  Wedstrijden staat in de hoofdkolom en is wit, Onze uitslagen staat in de zijkolom en is zacht (niet meer warm), en de kaart Stadion(s) en de bronvermelding staan daaronder.
  De volgorde van de kaarten en hun vlakken zijn dus niet meer die van hier.
- **Later:** zie _De pagina van een tegenstander toont de uitslagen als donutgrafiek per score_ (4 november 2026): de zijkolom van de pagina van een club heeft sindsdien ook de kaart "Hoe vaak welke uitslag", direct onder "Onze uitslagen tegen …".
- **Later:** zie _De tabel in "Onze uitslagen tegen …" heeft Thuis en Uit als rijen met Totaal eronder, zoals de kaart Stand_ (2 november 2026): de tabel op de kaart heeft Thuis, Uit en Totaal als rijen en G, W, L, V, P en D als kolommen, met de woorden onder de tabel, en niet meer de zes onderdelen als rijen.
  De rest van de kaart blijft.
- **Later:** zie _Alle tabellen gebruiken één stel afkortingen voor hun kolommen_.
  De kolommen zijn nu G, W, G, V, D en (bij de Eredivisie) P, met de woorden winst en verlies in plaats van gewonnen en verloren, en G gelijk in plaats van GL.
- **Later:** zie _De kaart Wedstrijden op de pagina van een club heeft een rij met de laatste vijf uitslagen_ (2 november 2026): de kaart Wedstrijden heeft sindsdien direct onder de kop de rij Laatste wedstrijden, bij ten minste vijf gespeelde wedstrijden in de gekozen competitie.
  De lijst eronder blijft.
- **Later:** zie _De pagina van een club toont ook de wedstrijden die nog komen, bovenaan de kaart Wedstrijden_ (3 november 2026): een wedstrijd die nog niet is gespeeld staat er sindsdien wel in, als `Match` bovenaan in dezelfde lijst, vóór de gespeelde wedstrijden.
  De lijst en de samenvatting tellen nog steeds alleen gespeelde wedstrijden.
- **Later:** zie _`Match` is voor een volledige lijst, `ShortMatch` voor een selectie_ (4 november 2026): de kaart Wedstrijden toont sindsdien elke wedstrijd als `Match`, met de competitie en de ronde in de regel en het jaar bij de dag, en niet meer als korte regel (`ShortMatch`) met het seizoen en de competitie erboven.
- **Later:** zie _Tegenstanders heeft een zijkolom met de kaart Gemiddeld resultaat, en "Alle tegenstanders" is wit_ (4 november 2026): de lijst heeft een zijkolom met de top 10 en de bronvermelding, en is wit.
- **Later:** zie _"Eerder" toont alleen echte naamswijzigingen_ en _De wedstrijdlijsten tonen de naam van het seizoen, de kop de naam van nu_ (4 november 2026): de regel "Eerder: …" onder de kop komt sindsdien uit de lijst van de redactie in plaats van uit de schrijfwijzen van Wikipedia, en de wedstrijden noemen de club met de naam van het seizoen als de club een lijst heeft.
  Een club zonder lijst heeft geen regel, en toont de schrijfwijze van Wikipedia in zijn wedstrijden zoals voorheen.
- **Later:** zie _Het hoofdmenu heeft vier onderdelen: Nieuws, Wedstrijden, Spelers en Forum_ (6 november 2026): Tegenstanders en de cijfers van het seizoen komen onder Wedstrijden (#770 en #771).
  Tot dan staat Tegenstanders nog in de balk van Statistieken, die geen Spelers meer heeft.
- **Later:** zie _Tegenstanders hoort bij Wedstrijden_ (6 november 2026): de lijst en de pagina's van de clubs staan sinds #770 op `/tegenstanders` en `/tegenstanders/<club>`, in de balk onder Wedstrijden.
  De oude adressen onder `/statistieken` bestaan niet meer, zonder omleiding.

## De pagina van een club toont ook de wedstrijden die nog komen, bovenaan de kaart Wedstrijden

- **Datum:** 3 november 2026
- **Besluit:** de kaart Wedstrijden op de pagina van een club toont ook elke wedstrijd tegen die club die nog komt (#669).
  - **Wat telt als komend** is wat Programma onder het programma zet: `programmeOf` in `src/matches.ts` is de ene regel voor allebei (`overviewOf` en `upcomingOf` in `src/opponents.ts` gebruiken hem).
    Een geplande wedstrijd, een uitgestelde en een wedstrijd zonder aanvangstijd van een dag die nog niet voorbij is, staan erbij; een wedstrijd die begonnen is zonder uitslag staat er niet bij.
  - **Alle competities, en de keuze telt mee:** zonder maximum, en bij `?competitie=eredivisie` valt een bekerwedstrijd weg, zoals bij de gespeelde wedstrijden.
    De schakelaar staat er ook als de club alleen een komende bekerwedstrijd heeft.
  - **Dezelfde kaart, dezelfde lijst, geen onderkoppen:** de komende wedstrijden staan vóór de gespeelde in de lijst van de kaart, onder de rij Laatste wedstrijden.
    Een komende wedstrijd heeft geen uitslag en een andere regel (`Match`, met de competitie), en dat is genoeg om hem van een gespeelde te onderscheiden.
    Zonder komende wedstrijden is de kaart zoals hij was.
  - **De regel is `Match`**, met de competitie in de regel zoals in Programma: de dag en tijd met het stadion, de clubs, en de competitie met de ronde, zonder seizoen en zonder toeschouwers of scheidsrechter.
    De wedstrijden staan op datum, de eerstvolgende bovenaan; een uitgestelde staat waar zijn datum hem zet, zoals in Programma.
  - **Een club die we nog niet speelden** (een promovendus) met een komende wedstrijd heeft de kaart met alleen die wedstrijden, zonder zin: dat er geen uitslag staat, zegt genoeg.
    Heeft de club niets gespeeld en niets dat komt, dan staat er buiten de kaart de zin "We hebben nog niet tegen deze club gespeeld." zoals eerder.
    De zijkolom met Onze uitslagen en Stadion(s) blijft weg, want die hebben gespeelde wedstrijden nodig.
    De bronvermelding komt wel, in een zijkolom met alleen de bron, want de komende wedstrijden komen van dezelfde pagina's van Wikipedia; ze telt de seizoenen van de komende wedstrijden mee.
- **Waarom:** wie een club zoekt, wil ook weten wanneer en waar we hem weer treffen, op één plek voor alle wedstrijden tegen die club.
  Eén regel voor wat komt, in Programma en hier, voorkomt dat de twee pagina's het oneens zijn over een uitgestelde of een begonnen wedstrijd.
- **Alternatieven:** een eigen kaart voor de komende wedstrijden, erboven of in de zijkolom; de keuze voor de competitie negeren, zoals de kaart Stadion doet; alleen de eerstvolgende wedstrijd tonen; een zin "we spelen niet meer tegen deze club" als er niets komt (fout als het programma nog niet gepubliceerd is); `ShortMatch` als regel, zoals de gespeelde wedstrijden; twee onderkoppen, "Komende wedstrijden" en "Gespeelde wedstrijden", en een zin onder de tweede voor een club die we nog niet speelden (de projecteigenaar wilde geen koppen; het ontbreken van een uitslag zegt genoeg).
- **Later:** zie _`Match` is voor een volledige lijst, `ShortMatch` voor een selectie_ (4 november 2026): `ShortMatch` voor de gespeelde wedstrijden is vervallen.
  De kaart Wedstrijden heeft sindsdien één soort regel, `Match`, voor de komende en de gespeelde wedstrijden; een komende wedstrijd valt nog altijd op omdat hij geen uitslag heeft.

## De balk van Statistieken komt uit een slot van de layout en houdt het seizoen en de keuze vast

- **Datum:** 31 oktober 2026
- **Besluit:** de links van de balk onder het hoofdmenu bij Statistieken, Spelers en Tegenstanders, houden het seizoen en de keuze tussen alle wedstrijden en de Eredivisie vast (#498).
  De balk komt uit een nieuw slot van de layout, `@subnav`, en niet meer uit de vaste lijst in `SiteNavigation`.
  - **De adressen:** op `/statistieken/2025-26?competitie=eredivisie` gaat Spelers naar `/statistieken/spelers/2025-26?competitie=eredivisie`, en op Spelers gaat Tegenstanders naar `/statistieken/tegenstanders?competitie=eredivisie`.
    Het lopende seizoen heeft zoals overal één adres zonder seizoen, en zonder keuze is er geen parameter.
    Tegenstanders telt alle seizoenen, dus die link houdt alleen de keuze vast.
    Een keuze die de pagina niet kent is de pagina "niet gevonden", en dan wijzen de links naar de standaard.
  - **Het hoofdmenu** houdt niets vast: Statistieken in het menu is altijd `/statistieken`, het lopende seizoen met alle wedstrijden.
    De balk heeft geen link terug naar Statistieken; dat is het item van het menu.
  - **Het slot:** `layout.tsx` zet `@subnav` naast `@shortcuts` en geeft het aan `SiteNavigation` (`statisticsBar`), dat het aan het item Statistieken geeft.
    Alleen de pagina's van Statistieken hebben een route in het slot: `/statistieken`, `/statistieken/<seizoen>`, `/statistieken/spelers`, `/statistieken/spelers/<seizoen>`, `/statistieken/tegenstanders` en `/statistieken/tegenstanders/<club>`.
    Elke route leest `?competitie=` en het seizoen uit het adres op de server en tekent de balk met dezelfde functie, `StatisticsBar` in `src/statisticsBar.tsx`.
    Elk ander adres, ook de homepage, krijgt een leeg slot (`[...rest]`, `page.tsx` en `default.tsx`).
  - **Het designsysteem:** een item van `Navigation` kreeg de eigenschap `bar`, een `ReactNode` die de balk vervangt die `Navigation` uit `subitems` tekent, onder dezelfde voorwaarden.
    De balk zelf is nu een eigen onderdeel, `NavigationBar`, zodat een pagina hem kan tekenen.
    De `subitems` blijven nodig, want die zeggen welke subpagina de huidige is.
    Zonder `bar` is de uitvoer gelijk aan die van vroeger, dus de balk van Nieuws verandert niet; een test laat dat zien.
- **Waarom:** de keuze staat in de query string, en die lezen kan alleen een pagina of een slot op de server, of een clientcomponent met `useSearchParams`.
  `useSearchParams` in een clientcomponent van de root-layout vraagt een Suspense-grens in de layout, en die raakt elke pagina van de site; zonder JavaScript kent de balk de keuze dan ook niet.
  Een slot doet dat in de HTML van de server, voor alleen de pagina's die het nodig hebben, zoals `@shortcuts` dat voor de balk "Op deze pagina:" al doet.
  De balk blijft zo in het `li` van zijn onderdeel in de ene `nav`, zoals _Het hoofdmenu en het submenu zijn één `nav` tussen de `header` en de `main`, met een geneste lijst_ wil.
- **Gemeten:** de build van deze branch en die van `main` hebben dezelfde vier statische routes (`/_global-error`, `/_not-found`, `/contact/verstuurd` en `/manifest.webmanifest`).
  Alle andere pagina's waren al dynamisch en zijn dat gebleven; geen pagina is dynamisch geworden.
  De pagina's van Statistieken lezen al `searchParams`, dus het slot kost daar geen extra render.
- **Nadeel:** de negen kleine bestanden in `app/@subnav` (zes routes en drie lege) volgen de pagina's van Statistieken; een nieuwe pagina op een dieper adres krijgt zonder route in het slot geen balk.
  Een pagina op één niveau onder `/statistieken` valt onder `[seizoen]`, en een adres dat geen seizoen is, krijgt daar de balk naar het lopende seizoen.
  Een "niet gevonden" onder een diepere map heeft geen balk meer, waar de vaste lijst hem wel liet zien.
  Het slot en de zichtbare balk zijn los van elkaar: het slot tekent de links, `SiteNavigation` kiest uit het pad of ze getoond worden.
  Komt er ooit `next/link`, dan wordt de balk bij een klik vervangen door de balk van de volgende pagina en gaat de focus verloren.
  Nu laadt elke klik de hele pagina, want de site heeft geen `next/link`: de balk is met elke pagina nieuw en de focus begint bovenaan, zoals na elke andere link.
  Een e2e-test controleert de volgorde van het toetsenbord in het menu en de balk.
- **Alternatieven:** `useSearchParams` met een Suspense-grens in `SiteNavigation` (raakt elke pagina en werkt niet zonder JavaScript).
  Het hele menu als slot, `@menu` (het menu wordt bij elke pagina een nieuw onderdeel).
  De balk als tweede `nav` in `@shortcuts` (twee landmarks en een nieuw onderdeel in plaats van de geneste lijst).
  De URL van het verzoek in een header lezen in de layout (elke pagina wordt dynamisch; zie _Het hoofdmenu leest het pad in een clientcomponent_).
  De keuze onthouden in een cookie (zie _De statistieken tellen standaard alle wedstrijden_).
- **Later:** zie _Het hoofdmenu neemt het seizoen van de pagina mee_ (1 november 2026): op de pagina van een afgelopen seizoen is Statistieken in het menu het adres van dat seizoen (`/statistieken/2025-26`) en niet meer altijd `/statistieken`, en Wedstrijden is dat ook; de keuze tussen alle wedstrijden en de Eredivisie houdt het menu nog steeds niet vast.
- **Later:** zie _De schakelaars wisselen met JavaScript in de pagina, en de links blijven de terugval_ (4 november 2026): een klik op Welke wedstrijden wisselt met de router, zonder een nieuwe pagina.
  De balk blijft staan, `@subnav` ververst zijn links met de nieuwe keuze, en de focus blijft op de link waarop is geklikt.
  Voor elke andere link geldt wat hier staat.
- **Later:** sinds #769 (6 november 2026) heeft de balk van Statistieken alleen nog Tegenstanders, want Spelers is een onderdeel van het hoofdmenu (`/spelers`, zonder balk).
  Het seizoen reist mee via het hoofdmenu (`hrefOf`), en de keuze Alle wedstrijden / Eredivisie via de balk van Statistieken.
  De slot `@subnav` heeft geen route meer voor Spelers.
- **Later:** sinds #770 (6 november 2026) is het de balk van Wedstrijden, met alleen Tegenstanders.
  Het slot `@subnav` heeft routes voor `/wedstrijden` en `/tegenstanders`, en Statistieken heeft geen balk meer.
  De bestanden heten `matchesBar.tsx` en `MatchesBar`.

## De pagina van een club toont de namen van zijn stadion en heeft een zijkolom

- **Datum:** 1 november 2026
- **Besluit:** de pagina van een tegenstander (`/statistieken/tegenstanders/<club>`) krijgt de kaart "Stadion" of "Stadions" en een nieuwe indeling (#557).
  - **De namen** komen uit de Eredivisie-wedstrijden waarin de tegenstander thuis speelde, dus onze uitwedstrijden, want daar is het stadion dat van de club.
    Bekerwedstrijden en play-offs tellen niet mee, omdat die op een neutraal veld kunnen zijn, zoals een finale.
    Een gestaakte wedstrijd telt voor zijn begin (zie _Een gestaakte wedstrijd telt voor zijn begin, het restant geeft de uitslag en een regel_), dus ook daar is het stadion dat van de club.
    De kaart staat er ook bij de keuze Eredivisie en bij alle wedstrijden, want de keuze verandert de namen niet.
  - **De namen staan in de volgorde van de wedstrijden**, zoals Wikipedia ze toen schreef.
    Spellingen die alleen verschillen in hoofdletters, spaties of een koppelteken zijn één naam, geschreven zoals de eerste wedstrijd met die naam hem schreef.
    Een twijfelgeval, zoals "Galgenwaard" naast "Stadion Galgenwaard", blijft liever twee regels dan een foute samenvoeging.
    Een naam die na een andere terugkomt (A, B, A) staat als drie regels.
    Een wedstrijd zonder stadion telt niet mee.
  - **De perioden** volgen die van de kaart Hoofdtrainers (`stadiumPeriods` in `src/match-format.ts`): bij één naam staat alleen de naam, bij meer heeft elke naam behalve de laatste "tot" en de dag van de laatste wedstrijd met die naam, en de laatste "vanaf" en de dag van de eerste wedstrijd met die naam.
    Het zijn de dagen van onze wedstrijden, niet van de dag dat de naam veranderde, en een regel onder de lijst zegt dat.
    Bij één naam geen "vanaf", want dat zou zeggen dat het stadion pas toen begon, terwijl onze gegevens maar tot een bepaald seizoen teruggaan.
  - **De kaart** is sterk (regel 2 van _De vier vlakken van een kaart hebben een betekenis_: de organisaties achter de inhoud), heeft een `h2` met het anker `#stadion` voor beide titels en een lijst met `ShortStaff`-regels, zoals Hoofdtrainers.
    Een club zonder wedstrijd waarin hij thuis speelde, of zonder stadion in die wedstrijden, heeft geen kaart.
    De bronvermelding onderaan geldt ook voor deze kaart.
  - **De indeling:** de hoofdkolom heeft de keuze voor de competitie en de kaart Wedstrijden, nu op het witte vlak (regel 1: de hoofdinhoud).
    De zijkolom (`Page.Sidebar`, breed, zo breed als de hoofdkolom, zoals op Statistieken) heeft Onze uitslagen op het zachte vlak (regel 4: cijfers en records die bij de hoofdinhoud horen), dan de kaart Stadion(s) en dan de bronvermelding.
    Op een telefoon volgt de zijkolom op de hoofdkolom.
    Onze uitslagen houdt de tabel, de tekst en de afbeeldingsknop; alleen het vlak en de plaats veranderen.
    De pagina heeft geen warme kaart meer.
    Een club zonder wedstrijden toont dezelfde zin als eerst, zonder kaarten en zonder zijkolom.
- **Waarom:** een stadion krijgt vaak een nieuwe naam, en supporters willen weten hoe het eerder heette.
  Wikipedia noemt in elke wedstrijd de naam die toen gold, dus de wedstrijden die we al hebben, zeggen het al.
  Er is geen nieuwe bron en geen nieuwe tabel nodig.
  De uitwedstrijden in de competitie zijn de enige wedstrijden waarvan het stadion zeker dat van de tegenstander is.
  De wedstrijden zijn de hoofdinhoud van de pagina, dus wit; de cijfers over onze uitslagen zijn het gewone voorbeeld van "records die bij de hoofdinhoud horen".
- **Nadeel:** de periodes zijn zo precies als onze wedstrijden: een stadion dat van naam veranderde tussen twee uitwedstrijden, heeft de overgang ergens in die tussentijd.
  Een club die we nooit in de Eredivisie bezochten, heeft geen kaart, ook al kennen we zijn stadion uit de beker.
  Twee spellingen die we niet samenvoegen, staan als twee namen met een eigen periode.
- **Alternatieven:** ook de bekerwedstrijden en play-offs tellen (een finale op een neutraal veld zou het stadion van de club lijken); "vanaf" ook bij één naam (zegt dat het stadion pas toen begon); alle spellingen in één naam samenvoegen met een lijst van afkortingen en voorvoegsels (een foute samenvoeging is erger dan twee regels); een eigen tabel met stadions en de datum waarop we een naam het eerst zagen (#549, een groter werk dat dit issue niet nodig heeft); Onze uitslagen warm laten (de kaart is geen uitnodiging of iets opmerkelijks, en de pagina heeft dan twee kaarten die de aandacht vragen).
- **Later:** een eigen lijst met stadions per club (#549) zou de namen uit deze kaart kunnen halen, met de datum waarop we een naam het eerst zagen in plaats van de dag van een wedstrijd.
- **Later:** zie _Het beheer bewaart een eigen lijst per club, die de lijst van Wikipedia vervangt_ (4 november 2026): een club met een eigen lijst toont alleen die, met een toelichting onder de naam, en ook als hij geen uitwedstrijd in de Eredivisie had.
- **Later:** zie _Een stadion toont seizoenen, en een dag alleen als het beheer die kent_ (4 november 2026): de perioden zijn seizoenen en geen dagen van wedstrijden, en de regel onder de lijst is weg.
- **Later:** zie _Een staafje is een wedstrijd van de Eredivisie, twee per seizoen, op een as van seizoenen_ (4 november 2026).
  De zijkolom heeft tussen Onze uitslagen en Hoe vaak welke uitslag de kaart Resultaten sinds, op het witte vlak.

## Op Spelers is de ranglijst witte inhoud, en de bijzondere doelpunten staan in de zijkolom

- **Datum:** 1 november 2026
- **Besluit:** op de pagina Spelers (`/statistieken/spelers` en de pagina's van een seizoen) is Doelpuntenmakers de inhoud van de pagina en heeft het witte vlak.
  Bijzondere doelpunten staat in de zijkolom op het zachte vlak.
  Op Statistieken blijft de top 5 in de zijkolom op het zachte vlak (#583).
  - **Het vlak:** `TopScorersCard` krijgt een eigenschap `surface`, `soft` als niets is opgegeven en `default` (wit) op Spelers, zodat Statistieken niet verandert.
  - **De zijkolom:** een `Page.Sidebar` van de gewone breedte, want de kaart is een lijst van korte regels en heeft de breedte van een tabel niet nodig.
    Hij heet "Meer cijfers over de spelers" en volgt op een telefoon op de hoofdkolom, dus de volgorde is er dezelfde.
    De bronvermelding sluit de zijkolom af, zoals op Statistieken.
  - **Ongewijzigd:** de inhoud van de kaart Bijzondere doelpunten, het anker `#bijzondere-doelpunten`, de balk "Op deze pagina:" en de knop voor een afbeelding van beide kaarten.
    Alleen de plaats en het vlak van de kaarten veranderen.
    De balk is vanaf 52 rem weg, en dat is ook de breedte waarop de zijkolom naast de hoofdkolom komt.
- **Waarom:** op Spelers is de ranglijst waarvoor de bezoeker komt, dus wit past bij de inhoud van de pagina (regel 1 van _De vier vlakken van een kaart hebben een betekenis, en elke kaart volgt de eerste regel die past_).
  Bijzondere doelpunten is een record en een bijzaak, dus de zijkolom en het zachte vlak.
- **Alternatieven:** beide kaarten wit onder elkaar (de bijzaak weegt dan even zwaar als de lijst); alles zoals nu; de zijkolom zo breed als de hoofdkolom (de kaart heeft die breedte niet nodig, en de lijst met doelpuntenmakers wordt er smaller van).
- **Later:** vult voor de pagina Spelers de beslissing _De vier vlakken van een kaart hebben een betekenis, en elke kaart volgt de eerste regel die past_ (#537) aan, waarin een ranglijst op het zachte vlak staat.
- **Later:** zie _Op Spelers is de selectie de inhoud van de pagina, en de doelpuntenmakers staan in de zijkolom_ (6 november 2026): de kaart Doelpuntenmakers heeft op Spelers weer het zachte vlak, in de zijkolom, en de kaart Selectie is de witte inhoud van de pagina.

## Het hoofdmenu neemt het seizoen van de pagina mee

- **Datum:** 1 november 2026
- **Besluit:** op een pagina met een seizoen in het adres wijzen de menu-items Wedstrijden en Statistieken naar het adres van datzelfde seizoen.
  Het seizoen komt uit het pad en niet uit een parameter of een cookie.
  - **Welke pagina's:** `/wedstrijden/<seizoen>`, `/statistieken/<seizoen>` en `/statistieken/spelers/<seizoen>`.
    Op elke andere pagina, ook op die van het lopende seizoen, blijven de adressen zoals ze waren.
  - **Hoe:** `seasonOfPath` in `SiteNavigation.tsx` leest het seizoen uit het pad met `seasonFromSlug`, dezelfde controle als de pagina's, dus `/wedstrijden/kies` of `/wedstrijden/2023-25` verandert niets.
    `hrefOf` zet het seizoen achter het adres van het menu-item.
    Welk item huidig is (`aria-current`) verandert niet.
  - **De keuze voor de competitie gaat niet mee:** die hoort bij Statistieken, en Wedstrijden heeft haar niet.
    Het menu kan haar niet lezen zonder `useSearchParams` en een Suspense-grens, en de balk onder Statistieken houdt haar al vast.
- **Waarom:** een bezoeker die een afgelopen seizoen bekijkt, verwacht dat de pagina's die erbij horen hetzelfde seizoen tonen.
  Een clientcomponent leest het pad ook op de server, dus het kost geen Suspense-grens en geen onthouden voorkeur.
  Een seizoen dat bij de ene pagina bestaat, bestaat ook bij de andere, dus een meegenomen seizoen leidt nooit naar "niet gevonden".
- **Alternatieven:** een parameter `?seizoen=` (de pagina's hebben al een adres per seizoen, dus dat zou een tweede adres voor dezelfde pagina zijn); het gekozen seizoen onthouden in een cookie (we volgen bezoekers niet, en een cookie maakt het adres afhankelijk van een eerder bezoek).
- **Later:** zie _Het hoofdmenu leest het pad in een clientcomponent_ (22 oktober 2026): het menu leest het pad nu ook voor de adressen van twee onderdelen, niet alleen voor de markering.
- **Later:** sinds #769 (6 november 2026) nemen Wedstrijden, Statistieken en Spelers het seizoen van elkaars pagina mee: `/wedstrijden/<seizoen>`, `/statistieken/<seizoen>` en `/spelers/<seizoen>`.
  Het adres `/statistieken/spelers/<seizoen>` bestaat niet meer.

## De lijst in het beheer heeft een schakelaar voor wel en niet op de site

- **Datum:** 2 november 2026
- **Besluit:** `/beheer/berichten` toont de nieuwste 50 berichten van één groep, met een schakelaar (`SegmentedLinks`, kleine maat, naam "Welke berichten") met "Op de site" en "Niet op de site".
  - **De groep:** "Op de site" is de standaard en heeft niets in het adres.
    "Niet op de site" is `?toon=niet-op-de-site`.
    Een andere waarde valt terug op de standaard.
  - **De regel:** `isOnSite` in `apps/site/src/beheer/items.ts` zegt dat een bericht op de site staat als het niet verborgen is, de import het `relevant` vond en de publicatietijd niet in de toekomst ligt.
    Alle andere berichten staan niet op de site: de verborgen, de twijfelgevallen, de berichten die niet over de club gaan en de berichten met een tijd die nog komt.
    `listItems` gebruikt alleen die functie, en haalt "niet op de site" uit hetzelfde zoekwerk met `not`, dus een bericht staat in precies één groep.
  - **Het vakje:** onder "Niet op de site" staat in het zoekformulier "Alleen door de redactie verborgen" (`?redactie=1`), dat alleen de berichten toont die een redacteur verborg.
    Onder "Op de site" is er geen vakje en telt `redactie` niet, want daar kan geen verborgen bericht staan.
    De schakelaar naar "Op de site" laat het vakje los, die naar "Niet op de site" houdt het vast als het aangevinkt was, en "Toon alle berichten" wist alleen de zoekopdracht.
    Het formulier is een GET-formulier zonder JavaScript met één knop "Zoeken", die de groep meestuurt (`name="toon"` en `value="niet-op-de-site"` op de knop, want het designsysteem heeft geen verborgen veld).
  - **Wie verborg het:** bij een verborgen bericht staat "Verborgen op {tijd} door {e-mailadres}. Reden: …", uit het account in `hidden_by`.
    Bestaat het account niet meer, dan staat er "een verwijderd account".
  - **Geen formulier waar het niets doet:** een bericht dat de import niet op de site zet en dat niemand verborg, krijgt geen formulier om te verbergen.
    De vermelding "twijfelgeval, niet op de site" of "niet over de club, niet op de site" blijft.
    Een bericht met een tijd die nog komt, houdt het formulier en krijgt de vermelding "nog niet gepubliceerd, niet op de site".
  - **Verbergen en tonen:** de acties krijgen de groep, het vakje en de zoekopdracht mee en eindigen op dezelfde groep.
    Het bericht staat daarna in de andere groep, en de melding "Verborgen" of "Weer getoond" zegt wat er gebeurde.
    De acties, de logregels en de rechten zijn niet veranderd.
- **Waarom:** een moderator die iets wil verbergen, scrolde langs berichten die er nooit op stonden, en wie iets weer wil tonen, zocht tussen alles.
  De lengte van 50 geldt per groep, zodat de twijfelgevallen de berichten die wel op de site staan niet wegdrukken.
- **Het verschil met de site:** `isShown` in `packages/db/src/queries.ts` (zie _De site toont alleen `relevant`, en het beheer toont alles met een woord erbij_) is geen losse voorwaarde.
  Hij kijkt ook of de bron aanstaat, laat bij een bericht met een `thread_key` alleen de laatste versie van het verhaal door en voegt een verhaal van twee bronnen van één uitgever samen.
  `isOnSite` doet dat niet, en kijkt per bericht.
  Een bericht dat de site samenvouwt met een nieuwer bericht van dezelfde krant (zelfde onderwerp), of dat van een bron staat die uit is, kan hier dus "op de site" staan terwijl de bezoeker het niet ziet.
  We nemen dat voor lief: de groep is er om een bericht te vinden dat een redacteur wil verbergen, en dat bericht staat er dan nog steeds.
- **Nadeel:** de groep "Op de site" kan een bericht tonen dat de bezoeker door de samenvouwregel of een bron die uitstaat niet ziet.
- **Alternatieven:** `isShown` hergebruiken (hij is geen losse voorwaarde: hij hoort bij de query van de homepage en heeft de bron en de andere versies van het verhaal nodig); een derde keuze "Alles" (de projecteigenaar koos twee groepen); een apart vakje voor de twijfelgevallen (een eigen issue als het nodig blijkt).
- **Later:** zie _Een redacteur kan een twijfelgeval of een bericht dat het filter weghoudt op de site zetten_ (9 november 2026): een bericht staat ook op de site als een moderator het goedkeurde (`approved_at`), en een goedgekeurd bericht zegt "door een moderator op de site gezet".

## Het hoofdmenu toont Beheer voor wie ingelogd is, met een teken in `localStorage`

- **Datum:** 2 november 2026
- **Besluit:** de browser van wie in het beheer komt met een geldige sessie, bewaart een teken in `localStorage`, onder de sleutel `fansite-beheer` met de waarde `1`.
  Het hoofdmenu (`SiteNavigation`) leest het teken en toont dan voor Forum het item Beheer.
  Het laatste item van het menu staat rechts, dus zo blijft Forum waar het stond.
  - **Zetten en weghalen:** `app/beheer/layout.tsx` controleert de sessie op de server (`sessionToken` en `findSession`) en geeft het antwoord aan `AdminMarker`, een clientcomponent die het teken zet of weghaalt.
    De inlogpagina haalt het ook weg: na een zachte navigatie naar een pagina die doorverwijst, wordt de layout niet opnieuw gevraagd.
    Uitloggen leidt naar de inlogpagina, en daar gaat het teken weg.
  - **Lezen:** `useSyncExternalStore` met `false` op de server, dus de HTML is voor elke bezoeker hetzelfde en er is geen hydratiefout.
    Zonder JavaScript is er geen item.
  - **Geen toegang:** het teken is een hulp om een koppeling te tonen.
    Wie het zelf maakt, komt bij de inlogpagina uit.
  - **Inhoud:** alleen het teken.
    Geen geheim, geen rol en geen adres, en het gaat nooit naar de server.
- **Waarom:** een redacteur komt zo vanuit het menu bij het beheer, zonder `/beheer` te typen.
  Het cookie van het beheer is `HttpOnly` en geldt alleen onder `/beheer`, dus de server ziet op een publieke pagina niet wie ingelogd is.
  Kon hij dat wel, dan werd elke pagina een pagina per bezoeker en werkte de cache niet meer.
  De themakeuze staat al zo in `localStorage`, en het past bij de bereidheid om voorkeuren op te slaan.
- **Nadeel:** het item verschijnt een moment na het laden, want de browser leest het teken pas na het hydrateren.
  Een redacteur die in een andere browser inlogt, ziet het item daar pas na een bezoek aan het beheer.
- **Gevolg:** het hoofdstuk Cookies op `/privacy` en de README van de site zeggen dat de browser van een redacteur dit teken bewaart.
- **Alternatieven:** een tweede cookie dat bij elk verzoek meegaat (een tweede cookie naast het enige cookie van de site); een verzoek naar `/beheer` bij elke paginaweergave van elke bezoeker (extra verkeer voor iedereen, en het beheer ziet elk bezoek); het cookie van het beheer voor de hele site laten gelden (elke pagina wordt een pagina per bezoeker, en het geheim gaat bij elk verzoek mee).
- **Later:** zie _De invoer van het verslag staat in `localStorage`, met een knop om te herstellen_ (10 november 2026): `localStorage` bewaart in het beheer ook de invoer van het formulier van een verslag, en de inlogpagina haalt die weg als de redacteur uitlogt.

## De kaart Stand heeft een schakelaar voor de stand over de laatste vijf wedstrijden

- **Datum:** 2 november 2026
- **Besluit:** op `/wedstrijden` heeft de kaart Stand (en Eindstand) onder de kop een schakelaar met "Hele seizoen" en "Laatste 5" (#602).
  - **De weergave:** "Hele seizoen" is de standaard en heeft geen opdracht in het adres.
    "Laatste 5" is `?stand=laatste-5`.
    Elke andere waarde, een lege en een die twee keer staat, is "Hele seizoen" en geeft nooit "niet gevonden" (`parseStandingsView` in `src/standings-view.ts`).
    De links zijn koppelingen die op het anker van de kaart eindigen, zodat de pagina niet naar boven springt.
  - **De berekening:** `lastFiveStandings` in `src/last-five.ts` telt per club de vijf competitiewedstrijden die het laatst zijn gespeeld, op dag en bij dezelfde dag op speelronde.
    Een club met minder dan vijf telt wat hij heeft, en de kolom G laat zien hoeveel dat is.
    Een winst geeft drie punten, een gelijkspel één.
    De volgorde is punten, doelsaldo, gemaakte doelpunten, en dan de naam van de club van A tot Z.
    De plaatsen lopen van 1 tot en met 18, zonder gedeelde plaatsen.
  - **Waar de wedstrijden vandaan komen:** de wedstrijden van sc Heerenveen uit `matches`, dus met wat de redactie zelf invulde, en die van de andere clubs uit `league_results` (zie _De import bewaart de uitslagen van alle clubs_).
    Een wedstrijd van ons staat ook in `league_results`: die rij vervangt de site door die uit `matches`.
    De naam van de tegenstander volgt de rij van dezelfde speelronde waar sc Heerenveen in staat (`leagueResultsOfAllClubs`), want `matches.opponent` schrijft `Excelsior` waar de stand `Excelsior Rotterdam` heeft.
    Een speelronde zonder rij houdt de naam van de wedstrijd.
  - **Wanneer de schakelaar er staat:** alleen als voor elke club het aantal uitslagen in `league_results` gelijk is aan het aantal gespeelde wedstrijden in de stand, er geen uitslag is van een club die de stand niet heeft en er een gespeelde wedstrijd is (`hasAllLeagueResults`).
    Een seizoen waar dat niet zo is, bijvoorbeeld omdat het nog niet opnieuw is geïmporteerd, toont de kaart zoals tot nu toe.
    Dat de uitslagen niet te lezen zijn is een regel in het logboek en geen foutpagina.
  - **De kaart:** dezelfde kolommen en opmaak.
    Het bijschrift voor een schermlezer is "Stand over de laatste vijf wedstrijden op 18 oktober 2026", met de dag waarvoor de stand van het seizoen geldt.
    Een eerder seizoen houdt de naam Eindstand voor de kaart.
    "Gegevens nog niet bijgewerkt" blijft onder de tabel.
    De afbeelding van de kaart maakt een kopie van de kaart, dus de schakelaar staat erin en laat zien welke weergave het is.
  - **Het geheugen:** de uitslagen hebben een eigen cache per seizoen (`getLeagueResults` in `src/matches.ts`), vijf minuten voor het lopende seizoen en een uur voor een afgelopen seizoen, zoals `getMatchData`.
    De andere pagina's vragen ze niet.
    De keuze zit niet in de sleutel van de cache: de berekening is een rekensom op de lijsten die er al zijn.
  - **Wat niet verandert:** de canonieke koppeling, de adreslijst en de seizoenskiezer.
    De kiezer stuurt de keuze niet mee, want een ander seizoen heeft misschien geen schakelaar.
    De kleine tabel op de homepage en de pagina Statistieken blijven zoals ze zijn.
- **Waarom:** de projecteigenaar wil zien wie er nu goed staat, ongeacht het hele seizoen.
  Een eigen berekening uit de uitslagen kan dat, en de stand zelf kan het niet.
  De schakelaar is een koppeling zoals bij `CompetitionSwitch`, zodat hij zonder JavaScript werkt en de keuze te delen is.
  Een schakelaar die alleen verschijnt bij een volledig seizoen voorkomt een tabel die er goed uitziet en niet klopt: de eerdere seizoenen misten soms een paar uitslagen (#608).
  De vergelijking met `played` is dezelfde als die van de import voor zijn waarschuwing.
- **Nadeel:** staat de redactie een uitslag van sc Heerenveen in die Wikipedia nog niet heeft, dan telt die mee in "Laatste 5" en nog niet in de stand van het hele seizoen.
  Tot de volgende import verschillen de twee dan een wedstrijd.
  De schakelaar verdwijnt niet door zo'n uitslag, want de controle telt de uitslagen van de import.
  Een speelronde van sc Heerenveen zonder rij in `league_results` kan de naam van de tegenstander niet corrigeren.
  Dan telt de wedstrijd niet voor die tegenstander als de naam anders is dan in de stand.
- **Alternatieven:** de uitslagen bij de wedstrijden van het seizoen in `getMatchData` laden (elke pagina betaalt voor een vraag die alleen deze kaart nodig heeft); de schakelaar altijd tonen en bij een onvolledig seizoen een melding geven (een tabel die verkeerd kan zijn, of een kaart met een melding die bezoekers niets zegt); de uitslagen van sc Heerenveen uit `league_results` nemen (de uitslag die de redactie invulde zou dan niet meetellen); de keuze in de seizoenskiezer meenemen (een seizoen zonder schakelaar zou dan een keuze krijgen die het niet kent); een onbekende waarde "niet gevonden" laten geven, zoals `?competitie=` (een gedeelde koppeling naar een seizoen dat later geen schakelaar meer heeft, werkt dan niet meer).
- **Later:** de schakelaar staat er alleen in het lopende seizoen, en een club mag één uitslag minder hebben dan de stand zegt; het bijschrift noemt de dag van de laatste uitslag, zie _De schakelaar Laatste 5 hoort bij het lopende seizoen en accepteert één uitslag minder_ (2 november 2026).

## De schakelaar Laatste 5 hoort bij het lopende seizoen en accepteert één uitslag minder

- **Datum:** 2 november 2026
- **Besluit:** op `/wedstrijden` staat de schakelaar "Laatste 5" alleen bij het lopende seizoen, en in het lopende seizoen verschijnt hij ook als de uitslagen één wedstrijd achterlopen (#622).
  - **Een afgelopen seizoen:** de kaart heet Eindstand en heeft geen schakelaar.
    `?stand=laatste-5` geeft daar de gewone kaart, en de pagina vraagt de uitslagen van de clubs niet op.
  - **Het lopende seizoen:** de schakelaar staat er als elke club hoogstens één uitslag minder heeft dan het aantal gespeelde wedstrijden in de stand (`hasEnoughLeagueResults` in `src/last-five.ts`).
    Meer dan één uitslag minder, een uitslag méér dan de stand, een uitslag van een club die niet in de stand staat en een seizoen zonder uitslagen verbergen hem zoals eerst.
  - **Het bijschrift:** "Stand over de laatste vijf wedstrijden op 1 november 2026" noemt de dag van de laatste uitslag in onze gegevens (`lastResultOn` van `lastFiveOf`), niet de dag van de stand.
- **Waarom:** de pagina's van Wikipedia worden los van elkaar bijgewerkt, dus de uitslagen lopen soms een dag of een speelronde achter de stand.
  De strikte regel van _De kaart Stand heeft een schakelaar voor de stand over de laatste vijf wedstrijden_ verborg de schakelaar daardoor vaak in het lopende seizoen.
  Een eerlijk bijschrift met de werkelijke dag is beter dan geen schakelaar.
  De stand over de laatste vijf wedstrijden zegt aan het eind van een seizoen weinig, net als de laatste vijf wedstrijden bij de reeksen (zie _Een eerder seizoen toont bij de reeksen alleen de langste_).
- **Nadeel:** een club met één uitslag minder mist in "Laatste 5" zijn laatste wedstrijd, tot de bron is bijgewerkt.
  Het bijschrift noemt de dag van de laatste uitslag, maar alleen een schermlezer krijgt dat bijschrift: wie ziet, merkt het niet.
- **Alternatieven:** de strikte regel houden (de schakelaar verschijnt zelden); nooit controleren (een ontbrekende wedstrijd kan onopgemerkt een verkeerde stand geven); de schakelaar in elk seizoen laten staan, zoals #602 deed (een eindstand over vijf wedstrijden zegt weinig).

## In de site noemt een import een bestand in `src` met `#src/`, niet met `../../`

- **Datum:** 2 november 2026
- **Besluit:** in `apps/site/src` en `apps/site/e2e` gebruikt elke import die twee of meer mappen omhoog gaat het voorvoegsel `#src/`: `#src/archive` in plaats van `../../archive`.
  - **Wat blijft:** een import uit dezelfde map (`./x`) of de map erboven (`../x`) blijft zoals hij is.
    Dat geldt ook voor een pad naar buiten `src`, zoals `new URL('../../../packages/…', import.meta.url)`: dat is een bestandspad en geen import.
  - **Waar het staat:** `imports` in `apps/site/package.json` (`"#src/*": "./src/*"`) en `paths` in `apps/site/tsconfig.json` (`"#src/*": ["./src/*"]`).
    Ze zeggen hetzelfde.
    Node en Vitest lezen `imports`.
    TypeScript probeert bij het doel van `imports` geen extensies, dus `#src/archive` zonder `.ts` vindt het alleen via `paths`.
  - **Wat Node rechtstreeks laadt:** een bestand dat Node zelf laadt, zoals `src/icon-sets.ts` en wat de scripts in `apps/site/scripts` importeren, schrijft de extensie erbij (`#src/icon-sets.ts`), net als bij `./x.ts` nu.
    Die bestanden gebruiken nu alleen `./`.
  - **De lintregel:** `fansite/site-import-prefix` in `eslint.config.js` weigert een nieuwe import van `../../` in de site, ook de module in `vi.mock` en `vi.importActual`, en noemt het voorvoegsel in de melding.
    Een dynamische `import('../../x')` ziet de regel niet, het script zet hem wel om.
  - **De omzetting:** `apps/site/scripts/use-import-prefix.js` zette 394 imports in 105 bestanden om, met ESLint `--fix` achteraf voor de volgorde.
    Het script blijft staan voor een branch die na de samenvoeging nog zulke imports heeft.
  - **Waar het niet geldt:** `apps/importer` en `packages/*`, waar de paden kort zijn.
    Een pakket in de werkruimte heet al `@fansite/…` en blijft zo.
- **Waarom:** `../../../season-page` zegt niet waar een bestand staat, breekt als je een bestand verplaatst, en maakt elk nieuw bestand diep in `app/` lastiger te lezen.
  Het kwam naar boven toen de Builder van #599 dertien van zulke regels schreef.
  Eén afspraak voor de hele site is beter dan een oplossing per pull request.
  `#` is het enige voorvoegsel dat `imports` in `package.json` toestaat, en het botst niet met een pakket zoals `@fansite/db`.
- **Nadeel:** het voorvoegsel staat op twee plaatsen (`package.json` en `tsconfig.json`).
  `#src` is voor de volgorde van imports een eigen groep, tussen de pakketten en de `../`-imports, met een lege regel erboven en eronder.
  Een branch die vóór deze wijziging is gemaakt, krijgt een samenvoegconflict in elk bestand waar de importregels zijn omgezet.
- **Alternatieven:** alleen `paths` in `tsconfig.json` met `@/` of `~/` (Node laadt `scripts` en `vitest.config.ts` rechtstreeks en kent het niet, en Vitest heeft er een plug-in voor nodig); alleen `imports` met `#src/*` (TypeScript vindt een import zonder `.ts` dan niet); overal `.ts` schrijven bij het voorvoegsel (honderden regels meer om te wijzigen, en een andere schrijfwijze dan de rest van de code); een `baseUrl` met kale paden als `season-page` (botst met pakketnamen); de regels laten zoals ze zijn en alleen een lintregel tegen drie mappen omhoog (de helft van het probleem blijft).

## De kaart met de uitslagen staat op Wedstrijden en telt dezelfde wedstrijden als Uitslagen

- **Datum:** 2 november 2026
- **Besluit:** de kaart "Hoe vaak welke uitslag" staat in de zijbalk van `/wedstrijden`, direct onder de stand en boven de hoofdtrainer, en telt de gespeelde wedstrijden van de competitie en de beker die de lijst Uitslagen toont, zonder schakelaar (#638).
  Een bekerwedstrijd telt met de stand na verlenging, zonder strafschoppen.
  De balk "Op deze pagina:" heeft er een link naar, na Stand.
  **Later:** zie _Een wedstrijd die we op strafschoppen winnen, telt overal als winst_ (7 november 2026): de stand blijft die na de verlenging, maar de uitkomst van een wedstrijd na strafschoppen is een winst of een verlies.
- **Waarom:** de projecteigenaar wil de kaart op Wedstrijden, naast de lijst van de uitslagen die hij samenvat.
  Een telling die minder wedstrijden telt dan de lijst ernaast, zou verwarren.
  De pagina heeft geen schakelaar tussen Eredivisie en alle wedstrijden.
- **Alternatieven:** de kaart op Statistieken, in de kolom met cijfers, met de schakelaar en de regel dat een kaart alleen de Eredivisie telt (#397, #431), waar hij past bij de andere negen kaarten; alleen de Eredivisie tellen op Wedstrijden (het totaal verschilt dan van de lijst).
- **Later:** zie _Een kaart die een telling van meer wedstrijden is, staat op Cijfers, en de schakelaar staat bovenaan de hoofdkolom_ (6 november 2026): de kaart staat op Cijfers en volgt daar de schakelaar; Wedstrijden heeft hem en zijn link in de balk niet meer.

## Uitslagen staan van goed naar slecht: winst, gelijk, verlies, dan doelsaldo, dan doelpunten

- **Datum:** 2 november 2026
- **Besluit:** de uitslagen staan vanuit sc Heerenveen gezien en gesorteerd op uitkomst (winst, gelijk, verlies), dan op doelsaldo (groot naar klein), dan op het aantal doelpunten in de wedstrijd (veel naar weinig) (`scoreCountsOf` in `src/matches.ts`).
- **Waarom:** het beste resultaat staat bovenaan, zoals de projecteigenaar vroeg.
  Doelsaldo en aantal doelpunten leggen de uitslag vast, dus er is geen gelijke stand om op te lossen.
  Een nederlaag met één doelpunt verschil staat vóór een zwaardere.
- **Alternatieven:** sorteren op doelpunten voor (3–0 vóór 4–1); de nederlagen van slecht naar goed.

## Het beheer heeft een balk onder de kop met de schermen, en geen eigen schil

- **Datum:** 2 november 2026
- **Besluit:** het beheer houdt de kop en de voet van de site, met onder het hoofdmenu een balk met de schermen op elke pagina onder `/beheer`, behalve de inlogpagina's.
  Een beheerder ziet Beheer, Berichten, Artikelen, Wedstrijden en Bezoek, een moderator Berichten.
  Wie is ingelogd en de knop Uitloggen staan niet in de balk maar op de startpagina van het beheer, onder de kop: één plek is genoeg, en in de balk passen ze niet op een telefoon (de projecteigenaar koos dat op 2 november 2026).
  De lijst van schermen per rol staat op één plek (`apps/site/src/beheer/screens.ts`), zodat een nieuw scherm één regel erbij krijgt.
  De balk is `SectionBar` in het designsysteem, en de site tekent hem op de server uit de sessie (`AdminBar`), via het slot `@shortcuts` (`app/@shortcuts/beheer`).
  De balk is geen toegangscontrole: elke pagina roept `requireRole` zelf aan, en zonder geldige sessie is er geen balk.
- **Waarom:** er zijn nog maar vier of vijf schermen en de redactie kent de site, dus een eigen schil loont pas bij meer dan zes schermen.
  Wie in het beheer is, moet zien waar hij is en bij de andere schermen kunnen komen, ook op een telefoon.
  De balk staat niet in `app/beheer/layout.tsx`, zoals het issue (#617) zei: een layout tekent in de `Page.Body`, en een extra kind daar breekt de indeling van het raster en de kolommen, vooral bij een pagina met een introductie.
  Het slot staat tussen het hoofdmenu en de `Page.Body`, en leest de sessie op de server, dus de balk is er ook zonder JavaScript en zonder de markering in `localStorage` (die het menu alleen gebruikt om Beheer te tonen).
  `Page.Main` blijft een direct kind van `Page.Body`.
  Een nieuw onderdeel was nodig: `NavigationBar` hoort bij een onderdeel van het hoofdmenu en heeft de ruimte van die `nav` nodig.
  `SectionBar` heeft dezelfde uitstraling (de pillen van de submenubalk, dezelfde rij die zijwaarts scrolt) en hoort bij een onderdeel dat niet op elke pagina in het menu staat.
- **Alternatieven:** een eigen schil met een andere kop (veel werk, en de moderator verliest het menu); alleen de koppeling "Terug naar het beheer" op elke pagina houden (wijst niet naar de andere schermen); de balk als subitems van het item Beheer in het hoofdmenu (het item hangt af van de markering in de browser, dus een redacteur zonder `localStorage` ziet geen balk, en het menu kent de rol niet); de balk in `Page.Body` met CSS naar buiten trekken (zie _De balk komt via een slot in de layout, een parallelle route_).
- **Later:** zie _De balk komt via een slot in de layout, een parallelle route_ (27 oktober 2026): ook `/beheer` vult het slot `@shortcuts`, met een route voor de startpagina en een voor alles eronder.
- **Later:** zie _Uitloggen is de laatste knop van de balk van het beheer_ (2 november 2026): Uitloggen staat niet op de startpagina maar in de balk, op elke pagina; wie is ingelogd (het adres en de rol) blijft onder de kop op de startpagina.
- **Later:** zie _Eén balk voor de subpagina's van het hoofdmenu en de schermen van een onderdeel_ in `designsysteem.md` (2 november 2026): `SectionBar` bestaat niet meer; het beheer gebruikt `NavigationBar` met een `label`, en die balk eindigt vanaf 66rem aan de rand van de kolom.

## Een ontwerp voor een telefoon is het ontwerp voor het hele beheer

- **Datum:** 2 november 2026
- **Besluit:** de telefoon is een eersteklas apparaat voor het hele beheer.
  Wat een pagina daar nodig heeft, maakt ook de bureaubladvorm beter: kortere regels, grotere doelen en minder kolommen.
- **Waarom:** moderators verbergen berichten ook onderweg, en een ontwerp dat op een telefoon werkt, werkt breed ook.
- **Alternatieven:** het beheer voor het bureaublad ontwerpen en de telefoon alleen laten werken (moderators zijn ook onderweg aan het werk).

## De startpagina van het beheer toont tegels in de hoofdkolom en een kaart Te doen in de zijbalk

- **Datum:** 2 november 2026
- **Besluit:** de startpagina van het beheer (`/beheer`) heeft in de hoofdkolom een tegel (zie _De tegel is een kaart die één link is, in een lijst van tegels_) voor elk scherm van de rol, en in de zijbalk de kaart "Te doen", die alleen verschijnt als er iets wacht (#616).
  - **De tegels:** een moderator ziet Berichten, een beheerder ook Artikelen, Wedstrijden en Bezoek.
    Elke tegel heeft een beschrijving van een regel in gewone woorden.
  - **De kaart Te doen** heeft een regel per wat wacht, elk een link met het aantal erin: afwijkingen van Wikipedia die op een besluit wachten, naar de lijst "Aangepast" van het seizoen dat ze heeft (zoals bij de lijst van de wedstrijden), en wedstrijden van het lopende seizoen zonder uitslag (`countMatchesWithoutResult`, met dezelfde regel als de lijst: twee uur na de aftrap), naar de lijst die opent op die wedstrijden.
    Een volgend scherm voegt een regel toe door een item aan `todo` in `src/app/beheer/page.tsx` toe te voegen.
  - **Wacht er niets,** dan is er geen kaart en geen zijbalk.
    Een moderator heeft nu niets dat wacht, dus die ziet nooit een kaart.
  - **Op een telefoon** staat de kaart onder de tegels.
    `Page` zet de zijbalk in de volgorde van de bron na de hoofdkolom, en gebruikt bewust geen `order`, zodat de leesvolgorde en de volgorde van het toetsenbord gelijk blijven aan wat je ziet.
  - **Het kopje** zegt het adres en de rol: "Je bent ingelogd als jelle@voorbeeld.nl (beheerder)."
    De knop Uitloggen blijft onder de tegels.
- **Waarom:** wie inlogt, wil zien waar hij nodig is.
  Een lijst met koppelingen zegt dat niet, en een tegel laat zien wat er te vinden is.
  Wat wacht, hoort bij elkaar op één plek die je meteen ziet, en niet als een zin achter een koppeling.
  Een zijbalk die alleen er is als er iets wacht, laat de pagina leeg als er niets te doen is.
- **Nadeel:** op een telefoon moet je langs de tegels scrollen voor wat wacht; met vier tegels is dat kort.
  Een tegel Wedstrijden die niet meer naar `?tonen=aangepast` wijst, is een klik meer voor wie alleen de afwijkingen wil zien, maar de kaart heeft die link.
- **Alternatieven:** een doorverwijzing naar het vaakst gebruikte scherm (werkt niet voor twee rollen met andere schermen); alleen de lijst houden (blijft onduidelijk wat wacht); de kaart boven de tegels op een telefoon met `order` (breekt de leesvolgorde en vraagt een aanpassing aan `Page`); het aantal als label op de tegel (een tegel is één link, en een label zegt niet waar het naartoe gaat); een lege kaart "Niets te doen" (een kaart die niets zegt, naast de lege hoofdkolom).
- **Later:** zie _Uitloggen is de laatste knop van de balk van het beheer_ (2 november 2026): de knop Uitloggen staat niet meer onder de tegels maar in de balk van het beheer.

## Uitloggen is de laatste knop van de balk van het beheer

- **Datum:** 2 november 2026
- **Besluit:** Uitloggen is een knop in een formulier, het laatste item van de balk van het beheer (#650).
  - **De plek:** `SectionBar` heeft de prop `end` voor één knop die geen scherm is (`action` en `label`), als laatste item van de rij, in dezelfde `nav`.
    Op een bureaublad staat de knop aan het rechteruiteinde van de balk; op een telefoon schuift hij mee met de schermen en bereik je hem door te scrollen of met het toetsenbord.
  - **De knop:** een pil als de koppelingen, in een formulier met de serveractie `logOut`, dus een POST die ook zonder JavaScript werkt.
    Een koppeling die uitlogt kan een andere site laten uitvoeren.
  - **Het adres en de rol** blijven onder de kop Beheer op `/beheer`, en komen niet in de balk.
- **Waarom:** wie uitlogt hoeft dat niet elk moment te kunnen, en de balk blijft één regel hoog zonder extra plek of aparte regel.
  In de balk passen het adres en de rol niet op een telefoon, en wie wil weten met welk account hij is ingelogd, vindt het op de startpagina.
- **Alternatieven:** Uitloggen vast in beeld aan het rechteruiteinde, buiten de scrollende rij (neemt op een telefoon ruimte van de schermen); een tweede regel onder de koppelingen (de balk wordt twee regels hoog op elke pagina); een koppeling naar een uitlogpagina (een extra stap en een pagina erbij); het adres als `title` of verborgen tekst bij de knop (een tooltip bestaat niet op een telefoon).
- **Later:** zie _Eén balk voor de subpagina's van het hoofdmenu en de schermen van een onderdeel_ in `designsysteem.md` (2 november 2026): de prop `end` zit op `NavigationBar`, dat een `label` moet hebben, en `SectionBar` bestaat niet meer.

## De regel van een wedstrijd zegt niet "Thuis" of "Uit"

- **Datum:** 3 november 2026
- **Besluit:** `Match` noemt "Thuis" en "Uit" niet meer, ook niet voor een schermlezer (#665).
  De volgorde van de clubs (de thuisclub eerst) en het stadion zeggen het al, en een schermlezer hoort dezelfde volgorde: "sc Heerenveen 2 tegen 0 Testdorp FC".
  Een test laat dat zien.
- **Waarom:** een bezoeker die ziet, krijgt hetzelfde, en `ShortMatch` doet het al zo (beslissing van 2 november 2026).
- **Alternatieven:** een verborgen woord "Thuiswedstrijd" of "Uitwedstrijd" voor een schermlezer (een extra woord in elke regel).

## De volgorde van de regels van een wedstrijd hangt af van de competitie

- **Datum:** 3 november 2026
- **Besluit:** `Match` heeft twee vormen, die `competition` kiest (#665).
  - **Met `competition`** (Programma en de kaart Wedstrijden op de homepage): de eerste regel is `zo 8 nov 12:15 · Abe Lenstra Stadion`, daaronder staan de clubs en eventueel de doelpunten, en de laatste regel is `Eredivisie · Speelronde 12`.
  - **Zonder `competition`** (onder een kop die de competitie noemt): de eerste regel is `Speelronde 1 · zo 11 aug 2024 · Johan Cruijff ArenA`, gevolgd door de clubs en de doelpunten.
  - **In beide vormen:** "Gegevens nog niet beschikbaar" en een `note` blijven de laatste regels.
    Een uitslag toont de dag en geen tijd, en het jaar alleen als het niet dit jaar is.
    Een uitgestelde wedstrijd zegt "Uitgesteld" waar de dag zou staan, dus `Uitgesteld · <stadion>` als eerste regel (zonder `competition` komt de ronde ervoor).
    Een wedstrijd zonder stadion toont alleen de dag of de tijd.
  - De kaart Wedstrijden op de homepage gebruikt de vorm met de competitie, want ze mengt een uitslag en een programma zonder kop die de competitie noemt.
- **Waarom:** in Programma bepaalt de datum de volgorde, dus die staat bovenaan; onder de kop van een competitie leest de ronde als het begin van de regel.
  De volgorde in de broncode is de volgorde op het scherm en voor een schermlezer.
- **Alternatieven:** overal dezelfde volgorde (de competitie staat dan tientallen keren onder een kop die haar al noemt, zoals bij #658 is besloten).

## De site toont de play-offs voor de Europa League zoals die voor de Conference League

- **Datum:** 3 november 2026
- **Besluit:** `Play-offs Europa League` staat overal waar `Play-offs Conference League` staat (#672).
  - **De kaart:** een afgelopen seizoen van vóór 2020/21 met zulke wedstrijden krijgt een kaart met de kop `Play-offs Europa League` en het anker `uitslagen-play-offs-europa-league`.
    De kaart staat na die van de beker, zoals die van de Conference League, en de balk "Op deze pagina:" heeft er een link naar.
  - **De cijfers:** de wedstrijden tellen alleen onder "Alle wedstrijden", niet bij "Eredivisie".
    De schakelaar staat er ook als de enige extra wedstrijd een play-offwedstrijd is, en de bijschriften zeggen "de play-offs" voor allebei.
  - **De bronvermelding:** de pagina met de soort `playoffs` heet `Play-offs Europa League <seizoen>` voor een seizoen van vóór 2020/21 en `Play-offs Conference League <seizoen>` daarna.
  - **Het beheer:** de competitie staat in het formulier van een wedstrijd, en verlenging is er toegestaan, zoals bij de beker.
- **Waarom:** een bezoeker ziet de naam die bij het seizoen hoort, en een seizoen heeft de ene of de andere, dus er komt geen tweede kaart met dezelfde betekenis.
  Een eigen anker houdt de ankers op een pagina uniek, ook als de beheerder per ongeluk beide invoert.
- **Alternatieven:** hetzelfde anker `uitslagen-play-offs` voor allebei (twee kaarten op één pagina zouden dan hetzelfde id hebben).
  Eén kaart "Play-offs" voor beide (de kop zou de naam van de competitie niet meer zijn, zoals #658 het besloot).

## Een geannuleerde wedstrijd staat in Uitslagen en niet in Programma

- **Datum:** 3 november 2026
- **Besluit:** een wedstrijd met de status `cancelled` zegt "Geannuleerd" waar de tijd of de uitslag zou staan, in dezelfde plaats en vorm als "Uitgesteld" in `Match`.
  Hij staat niet in Programma, is nooit "de volgende wedstrijd" of "de vorige wedstrijd" op de homepage, en staat wel in de lijst met uitslagen van zijn seizoen, in zijn speelronde.
  - **Hoe:** `hasBegun` in `src/matches.ts` telt een geannuleerde wedstrijd als begonnen, zodat `programmeOf` hem niet meer geeft en `overviewOf` hem bij de uitslagen zet.
    `previous` slaat hem over.
    `lacksResult` zegt niets bij hem, dus de regel "Gegevens nog niet beschikbaar" komt er niet.
  - **De pagina van een tegenstander:** hij staat niet bij de wedstrijden die nog komen (dat is Programma, zie `upcomingOf`) en telt niet mee in de onderlinge cijfers en de laatste vijf, want die tellen alleen `played`.
    De pagina toont geen lijst van eerdere wedstrijden zonder uitslag, dus daar staat hij ook niet.
  - **De cijfers:** de statistieken, de vorm, de topscorers en de stand tellen alleen `played`, dus een geannuleerde wedstrijd telt nergens.
    De stand komt uit de tabel van de pagina en verandert niet.
  - **Beheer:** de keuzes voor de status hebben "Geannuleerd" (`statusChoices`), de lijst zegt "Geannuleerd", en een invoer met die status wordt bewaard zonder uitslag en zonder toeschouwers.
    Er komt geen reden bij; beheer kan zelf een `note` toevoegen.
  - **Toegankelijkheid:** "Geannuleerd" staat als tekst en heeft hetzelfde gewicht en dezelfde kleur als "Uitgesteld" (`.hf-match-cancelled` naast `.hf-match-postponed`).
    Een schermlezer hoort "Speelronde 27, Geannuleerd, sc Heerenveen tegen Willem II".
- **Waarom:** een wedstrijd die nooit meer wordt gespeeld, is geen wedstrijd die nog komt en geen uitslag, maar hij hoort in de lijst van zijn seizoen, zodat speelronde 27 tot en met 34 van 2019/20 geen gat is zonder uitleg.
- **Alternatieven:** de wedstrijd in Programma laten staan met "Geannuleerd" (hij staat daar dan eeuwig, tussen wedstrijden die nog komen); hem uit alle lijsten halen (een gat zonder uitleg); een eigen kaart "Geannuleerd" naast de uitslagen (meer plekken om te onderhouden voor acht wedstrijden).

## De pagina van een tegenstander toont de uitslagen als donutgrafiek per score

- **Datum:** 4 november 2026
- **Besluit:** de zijkolom van de pagina van een tegenstander krijgt, direct onder "Onze uitslagen tegen …", de kaart "Hoe vaak welke uitslag": dezelfde kaart als op de pagina Wedstrijden, met een plakje voor elke uitslag, voor alle gespeelde wedstrijden tegen die club (#690).
  De kaart is er vanaf één gespeelde wedstrijd, met "Gebaseerd op …", en niet voor een club waartegen we niet speelden.
  - **Dezelfde code:** `ScoreCountsView` in `src/MatchViews.tsx` is de kaart, met de zin, de grafiek en de tabellen; `ScoreCountsCard` (Wedstrijden) en `ClubScoreCountsCard` (de club) geven hem alleen de aantallen en de regel eronder.
    `countScores` in `src/matches.ts` telt en sorteert de uitslagen voor allebei.
    Er komt geen nieuw onderdeel in het designsysteem.
  - **De regel eronder** is die van de andere kaarten van de pagina, `BasedOnSince`, ook bij één gespeelde wedstrijd.
    Het id van de kop, `hoe-vaak-welke-uitslag`, botst niet met dat van een andere kaart van de pagina.
- **Waarom:** de projecteigenaar wil dezelfde grafiek als op Seizoen.
  De twee kaarten over onze uitslagen horen bij elkaar, en het warme vlak laat de kaarten in de zijkolom afwisselen met het zachte vlak.
  Een kaart blijft zichtbaar bij weinig wedstrijden en zegt waarop hij rust (zie _Statistieken komen als kaarten op Wedstrijden, voor de Eredivisie, met "Gebaseerd op"_).
- **Alternatieven:** alleen drie plakjes voor winst, gelijk en verlies (herhaalt de tabel van "Onze uitslagen" en lijkt niet op Seizoen); de kaart in de hoofdkolom boven de lijst (duwt de wedstrijden naar beneden); de kaart pas tonen vanaf drie wedstrijden (een nieuwe regel die nergens anders op de site geldt).
- **Later:** zie _De kaart "Hoe vaak welke uitslag" toont de aantallen in de tabelkoppen, de competities in een tabel en de doelpunten in een diagram_ (4 november 2026): de regel onder de kaart is niet meer `BasedOnSince` maar de korte vorm van het aantal wedstrijden, en de zin boven de grafiek is weg.

## De kaart met de uitslagen op de pagina van een tegenstander volgt de schakelaar

- **Datum:** 4 november 2026
- **Besluit:** de donut telt dezelfde wedstrijden als de lijst en "Onze uitslagen tegen …", dus volgens de keuze van de schakelaar op de pagina van de tegenstander, standaard met de beker (#690).
  Een bekerwedstrijd die door strafschoppen werd beslist, telt als gelijkspel, zoals op Wedstrijden.
  Een test controleert dat de aantallen kloppen met de rij Totaal, voor beide keuzes.
  **Later:** zie _Een wedstrijd die we op strafschoppen winnen, telt overal als winst_ (7 november 2026): zo'n wedstrijd telt als winst of verlies, op Wedstrijden en op de pagina van de tegenstander.
- **Waarom:** twee kaarten naast elkaar met verschillende aantallen zouden verwarren.
  De kaart krijgt de wedstrijden van `meetingsOf`, dezelfde als de samenvatting, dus ze kunnen niet uit elkaar lopen.
- **Alternatieven:** altijd alleen de Eredivisie (de donut zou de rest van de pagina tegenspreken zodra de beker meetelt).
- **Later:** zie _Een staafje is een wedstrijd van de Eredivisie, twee per seizoen, op een as van seizoenen_ (4 november 2026).
  De kaart Resultaten sinds volgt de schakelaar niet en telt de Eredivisie, ook bij Alle wedstrijden; de zin onder de grafiek zegt dat.

## `Match` is voor een volledige lijst, `ShortMatch` voor een selectie

- **Datum:** 4 november 2026
- **Besluit:** de site kiest `Match` voor een volledige lijst (een seizoen, een competitie, alle wedstrijden tegen één club) en `ShortMatch` voor een selectie: een lijst of kaart die op een eigenschap uit de wedstrijden kiest, of een stuk van een lijst (#693).
  `ShortMatch` staat nooit voor een volledige lijst, en een lijst mengt de twee niet.
  - **`Match`** is de standaard voor Programma, Uitslagen, de wedstrijden tegen een tegenstander en de wedstrijden op de homepage.
  - **`ShortMatch`** is voor de wedstrijden waarin we de nul hielden, de laatste vijf wedstrijden bij Reeksen, de benoemde wedstrijden bij Uitersten en Onze uitslagen, en de grootste overwinning en nederlaag op de pagina van een club.
  - **De pagina van een club** toont daarom ook de gespeelde wedstrijden als `Match`, in dezelfde lijst als de komende, nieuwste eerst.
    De regel "seizoen · competitie" boven een gespeelde wedstrijd is weg: de competitie en de ronde staan in de regel, en de dag heeft het jaar (`withYear` van `matchMoment`), zodat een wedstrijd uit een eerder seizoen te herkennen is.
    Een gespeelde wedstrijd toont wat hij bij Uitslagen toont: de doelpuntenmakers waar we ze kennen, verlenging en strafschoppen, en onder de lijst staat de legenda van de afkortingen.
  - **Dezelfde code:** de kaart gebruikt `MatchLine` en `MatchLegend` van `src/MatchViews.tsx`, zoals Uitslagen, en geen tweede kopie.
    `listClubMatches` geeft daarvoor ook de aantekening, de stand na 90 minuten en de doelpuntenmakers, met dezelfde hulpfunctie als `listSeasonMatches`.
    Het jaar staat bij de dag van elke gespeelde wedstrijd op deze pagina, ook in het lopende jaar, want de pagina loopt over seizoenen; een komende wedstrijd houdt de dag zoals Programma.
- **Waarom:** een lijst met twee soorten regels leest onrustig, en wie alle wedstrijden tegen één club bekijkt, wil dezelfde gegevens (competitie, ronde, doelpuntenmakers) bij elke wedstrijd.
  De korte regel past bij een selectie, waar de uitslag genoeg is en de kaart klein moet blijven.
  Een keuze op doel, niet op welke gegevens nodig zijn, want dat bepaalt niemand per lijst.
- **Alternatieven:** `ShortMatch` voor alles op de pagina van een club (het onderdeel kent geen wedstrijd die nog komt, en competitie, stadion en tijd zouden verdwijnen); de gemengde lijst laten zoals ze is (de projecteigenaar wil dat niet); alle `ShortMatch`-plekken ook `Match` maken (de kaarten van Statistieken worden lang voor een uitslag die ze al geven).
- **Nadeel:** de pagina van een club met veel wedstrijden wordt langer, omdat een `Match` meer ruimte neemt dan een `ShortMatch`.
  Een grens aan de lengte of "Laad meer" is een eigen issue als dat nodig blijkt.
- **Later:** zie _De wedstrijden van een club staan bladerend, tien per pagina_ (6 november 2026): de lijst is nog steeds volledig, maar verdeeld over pagina's, en de pagina heeft een balk "Op deze pagina:".

## De kaart "Hoe vaak welke uitslag" toont de aantallen in de tabelkoppen, de competities in een tabel en de doelpunten in een diagram

- **Datum:** 4 november 2026
- **Besluit:** de kaart "Hoe vaak welke uitslag" laat de zin met de optelling weg, zet de aantallen in de kop van elke tabel ("Winst 12×") en heeft op de pagina van een club onderaan een tabel met de competities van de getelde wedstrijden.
  De regel onder de kaart is de korte vorm van het aantal wedstrijden ("Alle 40 gespeelde wedstrijden", "1 gespeelde wedstrijd"), zonder "Gebaseerd op", zonder "sinds" en zonder "in de Eredivisie" (#697).
  - **De kop:** de kop is "Winst 12×" voor het oog en "Winst, 12 keer" voor een schermlezer, uit één plek in de code (`outcomeColumn` in `src/MatchViews.tsx`).
    `DataTable` kreeg daarvoor de eigenschap `shown` voor een kolom: de kop toont `shown` en een schermlezer hoort `name`.
    De `abbreviation` van een kolom zou het ook doen, maar zet de tekst in een `abbr`, en "Winst 12×" is geen afkorting.
  - **De tabel met competities** heeft de kolommen Competitie en Wedstrijden, de meeste wedstrijden bovenaan en bij gelijk aantal de volgorde van `competitions` in `@fansite/db/schema`.
    Hij telt dezelfde wedstrijden als de rest van de kaart, dus de schakelaar beslist, en hij staat ook met één competitie.
    Er is geen rij Totaal: het totaal staat in de regel eronder.
    De volgorde van de kaart is kop, diagrammen, tabellen van de uitslagen, competities, regel.
  - **Dezelfde code:** de kaart op Wedstrijden heeft de korte regel en de kopaantallen ook, want `ScoreCountsView` is gedeeld.
    De tabel met competities en het tweede diagram staan alleen op de pagina van een club.
- **Waarom:** de zin, de kopaantallen en de regel onderaan zeiden hetzelfde.
  Met de aantallen in de kop leest de tabel zelf, ook voor een schermlezer ("Winst, 12 keer"), en hoeft de lezer de zin niet apart te lezen.
  Welke competities meetellen was nergens te zien; de tabel zegt het bij de schakelaar.
  "Sinds …" staat op de kaart erboven, en het aantal blijft in de regel, dus de kaart zegt nog steeds waarop hij rust.
- **Ook:** de pagina van een club krijgt naast het diagram van de uitslagen een tweede, kleiner donutdiagram met de gemaakte en de tegendoelpunten (twee plakken, groen en rood), van dezelfde wedstrijden, met het bijschrift "Doelsaldo" erboven en in het gat de doelpunten als "45–31".
  Het groen staat links en het rood rechts, zoals de uitslag leest; de ring loopt met de klok mee vanaf boven, dus de tegendoelpunten komen eerst in de lijst met plakken.
  Een schermlezer hoort de getallen in een zin die alleen hij hoort ("Doelpunten: 45 gemaakt, 31 tegen."), direct na de diagrammen.
  Het eerste voorstel had de tekst "Gemaakt" en "Tegen" om de ring; de projecteigenaar wilde liever het bijschrift en de twee getallen in het gat (4 november 2026).
  Op Wedstrijden komt het niet.
  - **De maat:** `DonutChart` kreeg `size="small"`, een smallere ring met een kleinere tekst in het gat, in een kolom van 7rem naast het grotere diagram in een `DonutChart.Group`, en `centre` voor de tekst in het gat in plaats van het totaal.
    Op een telefoon van 390 pixels staan de twee naast elkaar, het eerste groter.
- **Waarom het tweede diagram:** het eerste diagram zegt hoe vaak we wonnen en verloren, maar niet hoeveel doelpunten erbij vielen; dat is wat een supporter van een club wil weten.
  Twee plakken zijn een eenvoudig plaatje met de tekst eraan, zoals bij Doelpunten per kwartier, en herhalen de uitslagen niet.
  Alleen de pagina van een club, omdat de projecteigenaar het daar wil zien; Wedstrijden heeft al de kaart Doelpunten per kwartier met diagrammen van de doelpunten.
- **Nadeel:** de kaart op de pagina van een club heeft een andere regel dan de andere kaarten van die pagina, tot #494 ze gelijktrekt.
  Het tweede diagram heeft de getallen als verborgen tekst en niet in een tabel, dus een lezer met alleen een gezichtsprobleem moet de tekst in het gat lezen; de getallen staan dus op twee plekken.
  Het gat zegt niet welk getal gemaakt en welk tegen is: dat volgt uit de volgorde en de kleuren, en het bijschrift "Doelsaldo" noemt het verschil tussen de twee.
- **Alternatieven:** de zin alleen op de pagina van een club weglaten (de twee kaarten verschillen dan, en de gedeelde code krijgt een schakelaar); de regel helemaal weglaten (dan staat het aantal wedstrijden nergens, tenzij een Totaal-rij het zegt); de koppen laten zoals ze zijn en het aantal in de rijen zetten (het aantal per uitslag is dan alleen uit te rekenen); winst, gelijk en verlies per competitie in de tabel (breder op een smalle zijkolom, en de koppen hebben ze al).
- **Later:** zie _Statistieken komen als kaarten op Wedstrijden, voor de Eredivisie, met "Gebaseerd op"_ (#397) in `redactie.md`: deze kaart zegt het aantal zonder "Gebaseerd op" en zonder "sinds"; de regel voor de andere kaarten blijft tot #494.
  Zie ook _Twee donutdiagrammen in een groep staan midden in hun eigen kolom_ (#700) in `designsysteem.md`: het kleine diagram staat niet in een vaste kolom van 7rem, maar in een kolom die naar verhouding bij zijn breedte past, en staat daarin midden.

## Tegenstanders heeft een zijkolom met de kaart Gemiddeld resultaat, en "Alle tegenstanders" is wit

- **Datum:** 4 november 2026
- **Besluit:** de pagina `/statistieken/tegenstanders` heeft een zijkolom (`Page.Sidebar`) met de zachte kaart "Gemiddeld resultaat" met de top 10 (#699), en de kaart "Alle tegenstanders" in de hoofdkolom wordt wit (`default`).
  - **De zijkolom** heet "De punten per wedstrijd en de bron".
    De bronvermelding (`OpponentsCredit`) staat daarin onder de kaart, zoals op Spelers en op de pagina van een club, en niet meer onder de lijst.
    Op een telefoon volgt de zijkolom de hoofdkolom, dus de top 10 staat onder de lijst met alle tegenstanders.
  - **De tabel** is een `DataTable` met de kolommen plaats (#), club (een link), de punten per wedstrijd (P, in het halfvette gewicht) en gespeeld (G).
    De plaats komt uit de nieuwe eigenschap `position` van een rij (zie _`DataTable` kan de plaats van een rij in een ranglijst tonen_ in `designsysteem.md`).
    De tabel is niet te sorteren: de volgorde is het punt van de kaart.
    Het bijschrift is onzichtbaar en noemt de volgorde, en een regel eronder legt P en G uit: "P punten per wedstrijd, G gespeeld".
    De # van de plaats staat nooit in de legenda: de eigenaar wil dat niet (4 november 2026), en de plaats is geen afkorting die uitleg nodig heeft.
    De kaart is een onderdeel van de site (`TopPointsCard`), geen onderdeel van het designsysteem.
  - **De berekening** staat in `topPointsOf` in `src/opponents.ts`, zonder database, en de regels staan in _De kaart Gemiddeld resultaat toont de top 10 van clubs met minstens 5 wedstrijden en volgt de schakelaar_ in `redactie.md`.
- **Waarom:** de lijst met alle tegenstanders is de hoofdinhoud van de pagina en dus wit (regel 1 van _De vier vlakken van een kaart hebben een betekenis_); een ranglijst die erbij hoort is zacht (regel 4).
  Een zijkolom is de plek voor wat de hoofdinhoud aanvult, zoals op Spelers.
  De bronvermelding hoort bij beide kaarten, dus ze staat bij de zijkolom en niet tussen de lijst en de top 10 op een telefoon.
- **Nadeel:** de top 10 is op een telefoon pas na een lange lijst te zien.
- **Alternatieven:** de kaart in de hoofdkolom (de lijst met alle tegenstanders komt dan later in beeld); "Alle tegenstanders" zacht laten (twee kaarten zouden dan dezelfde betekenis krijgen); `DataTable` met de plaats als markering voor de rijkop (de plaats is dan geen kolom met een kop en staat niet recht onder elkaar); een gewone `table` in de site (de lint verbiedt HTML-elementen in de site); de bronvermelding in de hoofdkolom laten.
- **Later:** zie _Tegenstanders is een lijst van alle clubs en een pagina per club, onder Statistieken_ (31 oktober 2026): de pagina heeft sindsdien een zijkolom, en de lijst staat op het witte vlak.
- **Later:** zie _De vier vlakken van een kaart hebben een betekenis, en elke kaart volgt de eerste regel die past_ (1 november 2026) in `designsysteem.md`: "Alle tegenstanders" volgt regel 1, de top 10 regel 4.
- **Later:** zie _In een tabel is vet voor het kerngetal, niet voor onze club of een achternaam_ in `designsysteem.md`.
  De punten per wedstrijd zijn de `key`-kolom en staan in het zwaarste gewicht, niet in het halfvette.

## Een stadion toont seizoenen, en een dag alleen als het beheer die kent

- **Datum:** 4 november 2026
- **Besluit:** de periodes op de kaart Stadion zijn seizoenen (#695): "t/m 2018/19" voor de eerste naam, "2019/20" of "2019/20 t/m 2021/22" voor een naam in het midden, en "vanaf 2020/21" voor de laatste.
  Bij één naam staat geen periode.
  Een naam die na een andere terugkomt (A, B, A) blijft drie regels.
  Een exacte dag midden in een seizoen komt alleen uit het beheer (#694), want onze wedstrijden zeggen niets over de dag dat de naam veranderde.
  - **De vorm:** `stadiumsOf` geeft per naam `firstSeason` en `lastSeason` (het seizoen van de wedstrijd), niet meer de dagen, en `stadiumPeriods` in `src/match-format.ts` maakt daar de tekst van.
    De kaart krijgt de tekst per regel, dus een exacte dag kan er later in zonder dat de kaart opnieuw wordt gebouwd.
  - **De breedte:** de kolom met de periode van `ShortStaff` is breder (9,5 in plaats van 8,5 rem), zodat "2019/20 t/m 2021/22" erin past en de namen van alle regels op dezelfde plaats beginnen.
    Hoofdtrainers krijgt dezelfde bredere kolom.
- **Waarom:** een stadion krijgt meestal een nieuwe naam met een nieuw seizoen, en we bezoeken een club maar één keer per seizoen.
  Een dag van een wedstrijd leest als de dag van de wijziging en is dat niet.
- **Alternatieven:** de dagen laten staan met het seizoen erachter (meer ruis, en de zin over de dagen blijft nodig).
- **Later:** zie _De pagina van een club toont de namen van zijn stadion en heeft een zijkolom_ (1 november 2026): de perioden zijn seizoenen, en de dagen en de regel onder de lijst zijn weg.
- **Later:** zie _Een naam begint met een seizoen of met een dag, en de volgende bepaalt waar hij eindigt_ (4 november 2026): de exacte dag komt uit het beheer (#694), met `ownStadiumPeriods` in `src/match-format.ts`, en de kaart krijgt de tekst per regel, zoals hier bedoeld.

## De zin over Wikipedia onder de kaart Stadion gaat weg

- **Datum:** 4 november 2026
- **Besluit:** de kaart heeft geen zin meer over waar de namen vandaan komen (#695).
  De bronvermelding onderaan de pagina geldt voor de kaart (besluit van 1 november 2026).
- **Waarom:** de projecteigenaar vindt de zin overbodig naast de bronvermelding.
  Regel 4 van het hoofdstuk Redactie vraagt de bron te noemen, en dat doet de bronvermelding.
  De zin over de dagen is niet meer nodig, want er staan geen dagen meer.
- **Alternatieven:** de zin laten staan (dubbel met de bronvermelding, en niet meer waar zodra het beheer namen toevoegt, #694).
- **Later:** zie _Een toelichting is korte tekst bij een naam_ (4 november 2026): bij een eigen lijst komen de namen van de redactie en niet van Wikipedia.
  De bronvermelding onderaan blijft staan voor de wedstrijden, en een toelichting die niet van Wikipedia komt, noemt haar bron zelf in de zin.

## Het beheer bewaart een eigen lijst per club, die de lijst van Wikipedia vervangt

- **Datum:** 4 november 2026
- **Besluit:** het beheer bewaart per club een eigen lijst van namen van het stadion, met een start en een toelichting (#694).
  Heeft een club een lijst, dan toont de kaart op zijn pagina alleen die; heeft hij er geen, dan blijft de kaart wat de wedstrijden zeggen (zie _De pagina van een club toont de namen van zijn stadion en heeft een zijkolom_).
  - **De kaart:** `stadiumViewsOf` in `src/opponents.ts` kiest tussen de lijst van de redactie en die van de wedstrijden.
    Een club met een eigen lijst heeft de kaart ook als de wedstrijden geen stadion noemen en ook met de keuze Eredivisie als we hem alleen in de beker troffen; de zijkolom is er dan ook zonder gespeelde wedstrijden.
  - **Het scherm:** `/beheer/stadions` toont de clubs waarvan we wedstrijden hebben, met het label "Eigen lijst", het filter Alles of Eigen lijst en zoeken op de naam.
    `/beheer/stadions/<club>` is de brede pagina met een zijbalk, zoals een wedstrijd: het formulier met de regels in de hoofdkolom, en in de zijbalk "Opslaan", wat de wedstrijden zeggen met de knop "Overnemen", en het uitklapblok "Terug naar Wikipedia".
    "Overnemen" vult het formulier en slaat niets op; "Terug naar Wikipedia" haalt de hele lijst weg, ook de toelichtingen, na een bevestiging.
    Voor dezelfde rollen als de wedstrijden: alleen een beheerder.
  - **Geen reden:** een opslag of een "Terug naar Wikipedia" vraagt geen reden, anders dan een wedstrijd.
    Het logboek heeft het nummer van de club en de aantallen (`stadium.save` en `stadium.reset`), en de lijst is te lezen op de pagina zelf.
  - **De tabel:** zie _De eigen lijst van stadions van een club staat in `club_stadiums`_ in `hosting-en-data.md`.
- **Waarom:** één regel is genoeg om uit te leggen en te testen, en de redactie ziet precies wat bezoekers zien.
  Een aanvulling op de namen uit de wedstrijden zou aan de spelling van Wikipedia hangen, die bij A-B-A of een andere schrijfwijze breekbaar is.
  Het formulier vraagt geen reden omdat de lijst de eigen tekst van de redactie is en niet een verbetering van gegevens die Wikipedia anders heeft.
- **Nadeel:** een nieuwe naam op Wikipedia verschijnt bij een club met een eigen lijst niet vanzelf.
  De lijst van de wedstrijden staat naast het formulier, dus de redactie ziet het verschil.
- **Alternatieven:** een toelichting of een dag aan een naam uit de wedstrijden hangen (blijft kloppen bij een nieuwe naam op Wikipedia, maar koppelt aan een spelling die we niet beheren); een reden bij elke opslag, zoals bij een wedstrijd (een lijst heeft geen eerdere waarde om te verantwoorden, en de aantallen in het logboek volstaan).

## Een naam begint met een seizoen of met een dag, en de volgende bepaalt waar hij eindigt

- **Datum:** 4 november 2026
- **Besluit:** de start van een naam is een seizoen (`2019/20`, telt als 1 juli van dat jaar) of een exacte dag, nooit allebei, en alleen de eerste naam van een lijst mag zonder start; de starts lopen strikt op.
  De naam ervoor eindigt "t/m" het seizoen ervoor of "tot" die dag, en een naam heeft geen eigen einde.
  - **De tekst:** `ownStadiumPeriods` in `src/match-format.ts` maakt de tekst per regel.
    De eerste naam heeft alleen zijn einde ("t/m 2018/19", "tot 14 feb 2021") en de laatste "vanaf" met zijn start ("vanaf 2020/21", "vanaf 14 feb 2021").
    Een naam in het midden heeft zijn begin en zijn einde: "2019/20" als hij één seizoen duurde, "2019/20 t/m 2021/22", "2019/20 tot 14 feb 2021", "10 aug 2019 t/m 2019/20" of "10 aug 2019 tot 14 feb 2021".
    Bij één naam staat geen periode.
  - **De controle:** `validateStadiumRows` in `src/beheer/stadium-form.ts` controleert op de server de vorm van een seizoen (vier cijfers, een schuine streep en de laatste twee cijfers van het jaar erna), een dag die bestaat, en de volgorde.
    De tabel controleert wat zij kan (zie `hosting-en-data.md`).
- **Waarom:** een stadion krijgt meestal met een nieuw seizoen een andere naam, en alleen soms midden in een seizoen (zoals AZ in 2019, na de instorting van een deel van het dak).
  Een einde dat uit de volgende start volgt, kan niet tegenspreken en laat geen gat.
- **De maand is een afkorting:** een dag in de lijst heeft een korte maand ("14 feb 2021"), zoals het hoofdstuk Redactie voor een maand in een lijst vraagt en zoals de lijst van hoofdtrainers het schrijft (`formatStaffDate`).
  Het issue schreef "tot 14 februari 2021" als voorbeeld; de korte vorm houdt de periode ook op een telefoon kort.
- **Alternatieven:** een start én een einde per regel (kan gaten en overlap hebben en vraagt meer controles).
- **Later:** zie _Een stadion toont seizoenen, en een dag alleen als het beheer die kent_ (4 november 2026) voor de kaart zonder eigen lijst: daar blijven de perioden seizoenen.

## Een toelichting is korte tekst bij een naam

- **Datum:** 4 november 2026
- **Besluit:** een regel van de eigen lijst kan een toelichting hebben van hoogstens 200 tekens, als gewone tekst onder de naam op de kaart (#694), zoals "AZ speelde tijdelijk in Den Haag".
  - **De weergave:** `ShortStaff` heeft een prop `note` (met een verhaal en een test), die de tekst op een regel van zichzelf onder de naam zet, in de stijl van een metatekst.
    Zonder die prop stond de toelichting als losse tekst onder de regel zonder ruimte erboven, op de rand van de volgende regel.
  - **De controle:** de toelichting en de naam zijn gewone tekst: een regeleinde wordt een spatie, een stuurteken of onzichtbaar opmaakteken wordt geweigerd, en opmaak of een link blijft de tekst die het is.
    De pagina geeft hem weer als tekst, nooit als markup.
  - **De hulptekst:** "Schrijf in eigen woorden. Komt het niet van Wikipedia, noem dan de bron in de zin." staat als tekst boven de tabel met de regels, niet bij elk veld, want `InputTable` heeft geen hulptekst per veld en dezelfde zin bij elke regel is veel herhaling.
- **Waarom:** de projecteigenaar wil dat een lezer begrijpt waarom AZ tijdelijk in Den Haag speelde, zonder dat het een fout lijkt.
  De toelichting is een feit in eigen woorden, geen tekst van een journalist, en past dus in het bronbeleid (hoofdstuk Redactie).
- **Alternatieven:** een vaste lijst toelichtingen in de code (nieuw bij elke club een wijziging van de code); opmaak of links in de toelichting (de bron staat dan in de tekst); een hulptekst bij elk veld (een nieuwe prop van `InputTable` voor een herhaalde zin).

## Spelers met evenveel doelpunten delen één rij in de korte tabel met doelpuntenmakers

- **Datum:** 4 november 2026
- **Besluit:** in de korte vormen van de tabel met doelpuntenmakers (de kaart op de pagina van een club en de top 5 op Statistieken) delen spelers met evenveel doelpunten één rij, bij elke gelijke stand, met de namen in één cel gescheiden door komma's (#710).
  De pagina Spelers houdt een rij per speler.
  - **Waar:** `scorersByPlace` in `src/matches.ts` groepeert de spelers van `topScorersOf` of `topFiveOf` per plaats, in de volgorde van de lijst.
    `TopScorers` in `src/MatchViews.tsx` geeft de tabel die plaatsen bij `topOnly` en een plaats met één speler per speler zonder `topOnly`, dus er is één tabel en één telling.
  - **De zin boven de tabel:** hij telt spelers en blijft zoals hij was ("De top 5 van 17 spelers die scoorden"): "top 5" gaat over plaatsen en er valt niemand weg.
- **Waarom:** de kaart op de pagina van een club werd lang: 241 rijen over 25 kaarten, en bij sommige clubs 21 tot 23 namen.
  Met één rij per plaats zijn het er 67, en een kaart heeft nooit meer dan vijf rijen.
  Elke gelijke stand samenvoegen is één regel zonder drempel, en laat de plaatsen in de kolom niet herhalen.
  Het besluit dat gelijke plekken er allemaal bij horen, blijft waar: er valt niemand weg.
  De pagina Spelers is de volledige lijst, waarin een bezoeker zijn speler zoekt, en daar zou één cel met twintig namen hem verstoppen.
- **Nadeel:** een rij met meer dan één naam is hoger dan een rij met één, en de doelpunten in de rij gelden per speler, wat de cel niet zegt.
  Een bezoeker kan "3" bij drie namen lezen als het totaal van de groep.
  Een schermlezer leest de namen als één rijkop.
- **Alternatieven:** alleen de laatste plaats samenvoegen (86 rijen, en een gelijke stand eerder in de tabel blijft vijf rijen met dezelfde plaats); groepen van drie of meer (77 rijen, met een drempel die niemand ziet); alleen de kaart op de pagina van een club (Statistieken houdt zijn lange gelijke stand op plaats 5); alle drie de tabellen, Spelers ook; "elk" in de cel of een regel onder de tabel die zegt dat de doelpunten per speler zijn (afgewezen: de plaats en de komma's zeggen genoeg); één naam per regel in de cel (even hoog als nu); namen die midden in een naam mogen breken.
- **Later:** bij _Statistieken toont de top 5 van de doelpuntenmakers, en de volledige lijst staat op Spelers_ (31 oktober 2026): de kaart op Statistieken heeft sinds dit besluit hoogstens vijf rijen, ook als meer dan vijf spelers erin staan.
- **Later:** zie _Een spelersnaam mag afbreken op een spatie, ook in een tabel_ in `designsysteem.md` (5 november 2026): een naam mag toch afbreken op een spatie.
- **Later:** zie _De doelpuntenmakers op Spelers tonen D/W waar de wedstrijden van elke speler bekend zijn_ (7 november 2026): een kaart met de kolom D/W heeft een rij per speler, dus daar vervalt het samenvoegen van spelers met evenveel doelpunten.
  De korte vormen zonder die kolom delen nog altijd één rij.

## De wedstrijdlijsten tonen de naam van het seizoen, de kop de naam van nu

- **Datum:** 4 november 2026
- **Besluit:** heeft een club een lijst van namen (#705), dan tonen de wedstrijdlijsten en teksten de naam die gold in het seizoen van de wedstrijd, en bij een start met een dag op de dag van de wedstrijd.
  De kop van de pagina van de club toont de naam van nu.
  Zonder lijst, of voor een wedstrijd van vóór de eerste start, blijft het de schrijfwijze van Wikipedia (`matches.opponent`).
  - **Waar de naam wordt bepaald:** in de queries `listSeasonMatches` en `listClubMatches` van `@fansite/db`, met `nameOnDay` en `withSeasonNames` in `club-name-periods.ts`.
    Elke pagina die een wedstrijd toont, krijgt zo de naam van het seizoen zonder een regel eigen code: de wedstrijdlijsten, `noteworthy`, de laatste vijf en de pagina van een club.
    `listSeasonMatches` leest het nummer van de club erbij en geeft het niet door.
  - **Wat de datum is:** een seizoen telt als 1 juli van zijn eerste jaar, een dag als die dag, en de wedstrijd telt met zijn datum (`matchDate`).
  - **Het beheer niet:** de schermen voor wedstrijden lezen `matches.opponent` zelf (`match-entries.ts`) en tonen dus altijd de schrijfwijze van Wikipedia, want daar vergelijkt de redactie met de bron.
- **Waarom:** een lezer ziet FC Zwolle in 2011/12, wat de club toen heette, en de kop zegt wie de club nu is.
  De regel "Eerder" legt het uit.
- **Nadeel:** dezelfde club heeft op één pagina twee namen: de kop en de rijen eronder.
- **Alternatieven:** overal de naam van nu (de uitslag van 2011/12 noemt dan een club die nog niet zo heette); de naam bepalen in elke pagina (een regel code per pagina die er een vergeet).

## "Eerder" toont alleen echte naamswijzigingen

- **Datum:** 4 november 2026
- **Besluit:** de regel "Eerder: …" onder de kop van een club komt uit de lijst van de redactie, met de periode van elke naam: "Eerder: FC Zwolle t/m 2011/12" (#705).
  De schrijfwijzen van Wikipedia staan er niet meer, ook die van IJsselmeervogels en NEC.
  - **Welke namen:** de namen van de lijst vóór de naam van nu.
    Is de laatste naam van de lijst de naam in de kop (zonder verschil in hoofdletters, accenten en leestekens), dan valt die weg; is het een andere naam, dan komt de kop van de import en zijn alle namen van de lijst eerder.
    Een club zonder lijst, of met één naam, heeft geen regel (`earlierNames` in `src/opponents.ts`).
  - **De toelichting:** onder de regel staat het uitklapblok "Over de namen", alleen als een naam een toelichting heeft, met elke naam, zijn periode en de toelichting als gewone tekst (`ClubNamesNotes`, met `ShortStaff` zoals de kaart Stadion).
    Er is geen nieuw component voor nodig.
- **Waarom:** "Eerder: V.V. IJsselmeervogels" is geen naamswijziging, en een regel "Eerder: N.E.C." zegt de lezer niets.
  Wat de redactie invult, is gecontroleerd.
- **Nadeel:** tot de redactie iets invult, hebben alle clubs geen regel.
- **Alternatieven:** de schrijfwijzen laten staan voor clubs zonder lijst (de regel zegt dan twee verschillende dingen); de toelichting altijd zichtbaar onder de regel (een lange tekst onder de kop, voor wie hem niet zoekt).

## De namen van een club hebben een eigen scherm, `/beheer/clubnamen`, naast Stadions

- **Datum:** 4 november 2026
- **Besluit:** de tabel, de weergave en het scherm zijn één issue, na #694 dat het patroon van het scherm legde (#705).
  `/beheer/clubnamen` volgt `/beheer/stadions`: dezelfde rollen (alleen een beheerder), dezelfde lijst met filter en zoeken zonder JavaScript, hetzelfde formulier met herhaalde velden, dezelfde regels voor een start, dezelfde functie voor de periodes (`ownListPeriods`, eerder `ownStadiumPeriods`) en dezelfde verversing.
  - **Anders dan Stadions:** er is geen "Overnemen", want de schrijfwijzen van Wikipedia zijn geen naamswijzigingen; ze staan in de zijbalk, alleen lezen.
    Het uitklapblok heet "Lijst weghalen" en laat de schrijfwijzen in `club_names` staan.
    Boven het formulier staat de naam die de site nu in de kop toont, en een melding in gewone tekst als de laatste naam van de lijst een andere is.
  - **Een naam van een andere club:** het formulier weigert hem met een fout bij het veld, en dan wordt niets opgeslagen.
    De controle staat in de transactie van `replaceClubNamePeriods`, op de naam in de kop en de andere namen van de andere clubs, zoals de import zoekt.
- **Waarom:** zonder het scherm blijft de tabel leeg, en #694 bewijst dat de combinatie in één pull request past.
  Eén patroon voor de twee schermen houdt het beheer te leren en te onderhouden.
- **Alternatieven:** twee issues, eerst de tabel met een lijst in de code en dan het scherm (de lijst in de code moet daarna weer weg); `Overnemen` ook hier (maakt van elke schrijfwijze een naamswijziging, wat de lijst juist niet wil zijn).

## Een staafje is een wedstrijd van de Eredivisie, twee per seizoen, op een as van seizoenen

- **Datum:** 4 november 2026
- **Besluit:** de kaart "Resultaten sinds <jaar>" op de pagina van een club telt alleen de Eredivisie en geeft elk seizoen twee plekken: de eerste en de tweede gespeelde wedstrijd tegen de club, op datum (`timelineOf` in `src/opponents.ts`, #718).
  De as loopt van het eerste seizoen waarvan we wedstrijden hebben tot het seizoen van nu, met een label (de laatste twee cijfers van het beginjaar) onder het eerste jaar en daarna elke vijf jaar.
  De kaart volgt de schakelaar niet.
  Hij staat in de zijkolom direct onder "Onze uitslagen tegen …", op het witte vlak: het zachte vlak erboven en het warme eronder zijn dan niet gelijk aan het zijne.
- **Waarom:** twee wedstrijden per seizoen zijn de vaste maat van de competitie, dus "twee staafjes per jaar" klopt altijd.
  Plaatsen op de kalenderdatum werkt niet: in 14 combinaties van club en seizoen vallen beide wedstrijden in hetzelfde halfjaar (AZ in 2013/14: augustus en december), en dan botsen de staafjes.
  Een beker- of play-offwedstrijd heeft geen vaste plek in een jaar en past niet in twee plekken.
  Een label elke vijf jaar vanaf het eerste jaar houdt de as leesbaar op een telefoon.
- **Alternatieven:** per halfjaar op de datum van de wedstrijd (botst); de schakelaar volgen met een regel voor een derde en vierde wedstrijd in een seizoen (de grafiek kan ze niet tonen); een label op de veelvouden van vijf in plaats van vanaf het eerste jaar (dat eerste jaar heeft dan soms geen label).

## Het gemiddelde loopt over hoogstens acht gespeelde plekken, zodat elk staafje een punt heeft

- **Datum:** 4 november 2026
- **Besluit:** elk punt van de lijn van "Resultaten sinds" is het gemiddelde aantal punten per wedstrijd over die wedstrijd en de wedstrijden ervoor in dezelfde reeks, hoogstens acht, vier seizoenen (`timelineWindow` in `src/opponents.ts`, `runningAverage` in het designsysteem, #718).
  De eerste punten van een reeks middelen dus over minder dan acht wedstrijden, en elke gespeelde wedstrijd heeft een punt.
  Een gat (een seizoen zonder wedstrijd) stopt de lijn, en na het gat begint een nieuwe reeks.
  De kaart is er alleen als we minstens 4 wedstrijden in de Eredivisie tegen de club speelden (`hasTimeline`), zonder zin die zegt waarom.
- **Waarom:** de projecteigenaar bekeek vensters van 4, 6, 8 en 10 wedstrijden met de echte uitslagen tegen AZ en FC Groningen en koos 8, en daarna een grens van hoogstens 8 voor AZ en Excelsior Rotterdam, zodat de lijn bij elk staafje begint.
  Een gemiddelde over een volle reeks van acht liet de eerste jaren en elke reeks na een gat zonder lijn.
  Het gemiddelde over een gat heen trekken laat zien wat er niet is, dus een gat blijft een gat.
  `runningAverage` staat naast `movingAverage` (dat op een vol venster wacht, zoals de vormgrafiek van het seizoen).
- **Nadeel:** een punt aan het begin van een reeks middelt over weinig wedstrijden en springt meer; een reeks van één wedstrijd heeft alleen een stip.
- **Alternatieven:** een vol venster van 8 (een lijn die pas na vier seizoenen achter elkaar begint); een venster van 4, 6 of 10; het gemiddelde over een gat heen trekken.

## De as begint bij het eerste seizoen met gegevens, en de kaart zegt alleen dat het de Eredivisie is

- **Datum:** 4 november 2026
- **Besluit:** de as van "Resultaten sinds <jaar>" begint met het eerste seizoen waarvan we wedstrijden hebben, voor alle clubs samen en niet voor deze club (nu 2010/11, dus de kop "Resultaten sinds 2010").
  Onder de grafiek staat één alinea met alleen de sleutel (W, G, V) en "Alleen de Eredivisie."
  Er is geen zin over de lijn, geen telling van de wedstrijden en geen link naar de lijst Wedstrijden (#718).
  - **Het schuift mee:** komen er eerdere seizoenen bij (#414), dan begint de as eerder en de kop noemt dat jaar.
- **Waarom:** de projecteigenaar wil dat elke club dezelfde as heeft en dat er geen lege jaren zijn waarin niemand wedstrijden heeft.
  Een kaart met alleen de grafiek, de sleutel en de competitie is rustig; de lijst Wedstrijden op dezelfde pagina heeft elke wedstrijd met zijn uitslag.
- **Nadeel:** een schermlezer hoort de grafiek niet (die is verborgen) en krijgt alleen de sleutel en de competitie; de uitslagen staan in de lijst Wedstrijden.
- **Alternatieven:** de as laten beginnen in 1990 (twintig jaar leeg tot #414, en de zin moest uitleggen waarom); de as laten beginnen bij de eerste wedstrijd van deze club (elke club heeft een andere as); zinnen over de lijn en de aantallen onder de grafiek (de projecteigenaar wil ze niet).

## De schakelaars wisselen met JavaScript in de pagina, en de links blijven de terugval

- **Datum:** 4 november 2026
- **Besluit:** Welke stand, Welke wedstrijden en Welke berichten voelen sneller: met JavaScript wordt een gewone klik een wissel binnen de pagina, zonder JavaScript blijven het echte links.
  `SwitchLinks` in `apps/site/src/SwitchLinks.tsx` is een clientonderdeel dat `SegmentedLinks` omhult en de klik op de groep opvangt.
  `SegmentedLinks` zelf blijft een onderdeel zonder script en zonder afhankelijkheid van Next.js: het heeft al een `onClick` op de groep, zoals het verhaal "De knop schuift naar een andere keuze" laat zien.
  - **Een gewone klik:** met de linkermuisknop of Enter, zonder Ctrl, Cmd, Shift of Alt en op een link zonder `target` of `download`.
    De waarde van de schakelaar (de knop en `aria-current`) staat meteen op de keuze en de pagina volgt met `router.push(href, { scroll: false })`, dus een regel in de geschiedenis en de pagina springt niet.
    Een andere klik laat het onderdeel aan de link.
  - **De knop schuift met de bestaande CSS-overgang** op `translate` van `segmented-control.css` (0 seconden bij verminderde beweging), niet met een overgang tussen documenten.
    Dat werkt in elke browser, ook in Firefox.
    `@view-transition` blijft voor de terugval zonder JavaScript.
  - **Tijdens het laden** schuift alleen de knop en staat `aria-busy="true"` op de groep.
    De oude inhoud blijft staan tot de nieuwe er is, zonder schemering en zonder draaiend teken.
    Valt de wissel weg of mislukt hij, dan staat de schakelaar weer op de waarde van de pagina (`useOptimistic` in een overgang).
  - **Een beleefde regel:** een `Text` met `role="status"`, naast de groep en niet te zien, die er al voor de klik is en na de wissel "<keuze> gekozen" zegt, zoals "Laatste 5 gekozen", zoals bij de sorteerbare tabel.
    De focus blijft op de link waarop is geklikt.
    `link.focus()` staat in de klik omdat Safari een link bij een klik niet focust.
- **Waarom:** op een trage server lijkt een klik eerst niets te doen: elke klik laadt de hele pagina (0,16 tot 0,24 seconde op acceptatie, zonder cache), en de knop schuift pas als de nieuwe pagina er is.
  De pagina laadt al 11 scripts (193 kB met gzip) waar React en de browserkant van Next.js in zitten, dus een klein onderdeel met `useRouter` voegt weinig toe.
  De inhoud staat buiten de schakelaar en een pagina zou zelf moeten meedoen voor een schemering, en de regel met `role="status"` en de focus houden de wissel hoorbaar zonder dat de focus verhuist (4.1.3, 2.4.3 in `docs/toegankelijkheid.md`).
  Een gewone klik in de geschiedenis houdt Terug en Vooruit zoals bij de links.
- **Let op:** `useRouter` uit `next/navigation` en niet `next/link`: de site heeft geen `next/link`, omdat de teller alleen een aanvraag voor een hele pagina telt (zie _Een klik op een schakelaar telt niet als paginaweergave_ in `redactie.md`).
  De pagina's die de keuze lezen zijn server-onderdelen en komen mee met de router: de links van de balk "Op deze pagina:" (`@subnav`), `aria-current` in het menu, de titel en de canonical link.
  De tests van de pagina's draaien zonder router, dus `src/test-setup.ts` zet een `useRouter` die niets doet.
- **Alternatieven:** `next/link` op de hele site (veel groter, en dan telt geen enkele klik meer); het hele onderdeel in het designsysteem met een eigen script (het designsysteem krijgt dan een afhankelijkheid van Next.js); `document.startViewTransition` om de wissel (meer code, niet in elke browser, en het voegt niets toe aan een knop die al schuift); `router.replace` (Terug slaat de keuzes over, dat wijkt af van de links); de inhoud lichter tonen tijdens het laden (een pagina moet zelf meedoen en het geeft een nieuwe contrastcontrole in licht en donker); de focus naar de inhoud verplaatsen (haalt de bezoeker weg bij de schakelaar).

## De pagina Statistieken heeft een kaart met het aantal toeschouwers per thuiswedstrijd

- **Datum:** 5 november 2026
- **Besluit:** de kaart Toeschouwers staat in de hoofdkolom direct onder Thuis en uit, met een staaf per thuiswedstrijd van het gekozen seizoen (#729).
  Onder de grafiek staan twee zinnen (het gemiddelde en het hoogste aantal) en een tabel met elke thuiswedstrijd.
  Dit vervangt het besluit in #416 om de grafiek samen met de pagina van een wedstrijd te bouwen, na #108.
- **Welke wedstrijden:** alleen thuiswedstrijden, want het publiek bij een uitwedstrijd is dat van de tegenstander.
  De schakelaar telt mee: bij Eredivisie alleen die competitie, bij Alle wedstrijden ook de beker en de play-offs.
  Een geannuleerde wedstrijd telt niet, en een thuiswedstrijd die nog gespeeld moet worden is een lege plek, zodat de grafiek het hele seizoen laat zien (`attendanceOf` in `src/matches.ts`).
- **Onbekend en nul:** een thuiswedstrijd zonder getal houdt zijn plek zonder staaf, en `0` is een streepje.
  In de tabel staat "Niet bekend", "Zonder publiek" en "Nog niet gespeeld".
  Het gemiddelde en het hoogste tellen alleen getallen boven 0, afgerond op een heel getal, en bij gelijke aantallen telt de eerste wedstrijd.
- **De schaal:** van 0 tot het hoogste aantal van het seizoen, naar boven afgerond op een veelvoud van 5.000, met een lijn en een cijfer bij elke 5.000 in Nederlandse notatie.
  Daarvoor krijgt `BarChart` de eigenschap `tickText`, de tekst van een cijfer aan de zijkant; de bestaande grafieken houden het kale getal.
  Er is geen lijn door de staven en geen tooltip: die komen met #726.
- **Zonder grafiek:** drie zinnen voor bezoekers, voor een seizoen zonder thuiswedstrijd, zonder getal en met alleen `0`.
- **Waarom:** het aantal staat sinds #558 bij elke wedstrijd, en de kaart heeft de pagina van een wedstrijd (#108) niet nodig.
  Een bezoeker leest een aantal van de schaal en de tabel; het is een schatting van Wikipedia, en dat staat erbij.
- **Alternatieven:** de kaart in #416 laten, dan wacht de grafiek op #108; altijd alleen de Eredivisie, dan komt het publiek bij een bekerwedstrijd nooit in beeld; wedstrijden zonder getal weglaten, dan klopt de plek van de staven niet meer; een lijn met het gemiddelde.

## De site telt per persoon en toont de bewaarde naam, en raadt niets

- **Datum:** 4 november 2026
- **Besluit:** de site telt doelpunten per persoon (`person_id`), anders per speler, anders per titel, anders per naam.
  De naam komt uit `persons`: `given_name` gewoon, en het voorvoegsel met `family_name` vet.
  Zonder persoon toont de site de naam van de wedstrijdpagina als achternaam.
  De functies die uit een titel of een zoekterm een voor- en achternaam raden, zijn weg (`splitPageName`, `splitPlayerName` en `pageTitleName`).
  Een lijst die op achternaam staat, sorteert op `family_name` zonder voorvoegsel, dus Joost van Aken staat onder de A.
  `goalsWithInitials` vergelijkt de namen zoals de wedstrijdpagina ze schrijft, met het voorvoegsel.
- **Waarom:** de gok bij het tonen faalt zodra de korte naam gelijk is aan de titel ("Ramon Zomer"), en de titel als sleutel telt twee titels van één speler dubbel.
  De import weet het beter dan de pagina: hij heeft de doorverwijzing en de sorteersleutel gelezen (#714 en #715).
- **Hoe:** `listSeasonMatches` en `listClubMatches` geven bij elk doelpunt `personId`, `personGivenName`, `personFamilyNamePrefix` en `personFamilyName` (ook bij een tegenstander), en `listSquad` geeft de naam van de persoon van de speler.
  `playerName` en `playerSearchTerm` zijn uit de doelpunten gehaald.
  De zoekterm `players.search_term` blijft voor het zoeken.
  De `id` van een rij in de lijst met doelpuntenmakers is een tekst (`person:7`, `id:9`, `page:Boy Kemper`, `name:Kemper`), zodat het nummer van een persoon niet gelijk kan zijn aan dat van een speler.
  Een doelpunt zonder speler maar met een pagina telt niet meer voor een gekoppeld doelpunt met dezelfde pagina: de persoon doet dat nu.
- **Alternatieven:** de titel blijven gebruiken en alleen de doorverwijzingen bij het tonen oplossen (een verzoek per bezoek of een lijst in de site).
  De gok bij het tonen verbeteren (een gok blijft een gok, en elke pagina doet hem opnieuw).
- **Later:** zie _Een naam zonder persoon splitsen we op het eerste woord, met een vaste lijst voorvoegsels_ (8 november 2026): zonder persoon staat de naam van de wedstrijdpagina niet meer helemaal als achternaam.

## Een vastgehouden wijziging van Wikipedia beslist een beheerder in het beheer, in de schermen van de wedstrijden

- **Datum:** 5 november 2026
- **Besluit:** alleen een beheerder neemt een vastgehouden wijziging over of wijst haar af, met een reden die in het logboek komt (#752).
  De wijzigingen staan in de lijst per seizoen onder "Wikipedia wacht (n)", als kaart op de pagina van de wedstrijd en als regel op de kaart "Te doen".
  Het logboek gebruikt `match.take-over` en `match.keep`, de soorten van een afwijking met de invoer van de redactie: de enum van `audit_log.action` verandert niet, en het `detail` zegt dat het een wijziging van Wikipedia is.
- **Waarom:** de schermen van de wedstrijden en het besluit over een afwijking met de invoer van de redactie zijn al voor de beheerder, en een vastgehouden wijziging is verdacht, dus beslist wie al over de gegevens van Wikipedia beslist.
  Eén plek per soort voorkomt dat de eigenaar op de host moet zijn voor wat een scherm kan.
- **Alternatieven:** ook redacteuren laten beslissen (verworpen: zij komen niet op de schermen van de wedstrijden en het zou de groep vergroten die wedstrijdgegevens raakt).
  Eén nieuwe pagina met alle wijzigingen van alle seizoenen (verworpen: een nieuw scherm naast drie die het al kunnen, en de wedstrijd zelf staat er niet bij).
  Nieuwe soorten in het logboek (verworpen: het vraagt een migratie van de enum, en de twee soorten zeggen al wat er gebeurt).

## Een vastgehouden wijziging in een afgelopen seizoen neemt alleen een mens over

- **Datum:** 5 november 2026
- **Besluit:** er komt geen geplande import die een afgelopen seizoen opnieuw leest, zodat de zeven dagen daar werken.
  Het scherm zegt bij zo'n wijziging dat er zonder besluit niets verandert, en de kaart "Te doen" zorgt dat een beheerder haar ziet.
  Een seizoen is afgelopen als het vóór het seizoen van vandaag ligt (`describeWithoutDecision`).
- **Waarom:** een afgelopen seizoen verandert niet meer, en wat Wikipedia daar nog wijzigt is verdacht.
  Een extra opdracht op de host kost werk en opent het seizoen voor bewerkingen zonder dat iemand kijkt; het scherm maakt het besluit goedkoop.
- **Alternatieven:** een geplande opdracht die afgelopen seizoenen met een vastgehouden wijziging opnieuw leest (verworpen: een cron-opdracht en een extra import erbij, en een vandaal kan wachten).
  Wachten tot iemand `pnpm run import:season` draait, de gang van zaken tot nu toe (verworpen: niemand ziet de wijziging).
- **Later:** zie _Het seizoen dat net voorbij is, wordt tot 1 september nog elke week gelezen_ in `importer.md` (9 november 2026): voor het seizoen dat net voorbij is komt er toch een geplande lezing, één keer per week in juli en augustus, in de bestaande run van cron.
  Daar werken de zeven dagen dus weer, en een wijziging die een week blijft staan neemt de import over.
  Voor elk ouder seizoen, en vanaf 1 september ook voor dit seizoen, blijft dit besluit gelden.
  Het scherm zegt in die twee maanden nog dat er zonder besluit niets verandert (`describeWithoutDecision`); dat is nog niet aangepast.
- **Later:** zie _In een seizoen dat voorbij is wint Wikipedia niet vanzelf van de redactie_ in `importer.md` (10 november 2026): de lezing van elke week in juli en augustus neemt een wijziging die wacht niet meer over.
  Dit besluit geldt dus weer voor elk seizoen dat voorbij is, en het scherm klopt ook in die twee maanden.
  Het scherm zegt nu "Het seizoen is voorbij of bijna voorbij, dus de import neemt dit niet vanzelf over", want de import leest het seizoen in die maanden wel.

## Het scherm en het commando gebruiken dezelfde code voor het besluit, en het scherm toont wat de import bewaarde

- **Datum:** 5 november 2026
- **Besluit:** de code die een voorstel toepast verhuist van de importer naar `packages/db/src/match-changes.ts`, zoals `decideConflict` in `match-conflicts.ts`: `decideChange`, met `updateMatch`, `storeGoals`, het voorstel en de typen `ReadMatch` en `ReadGoal`.
  De importer haalt ze uit dat pakket.
  Het scherm laat zien wat de site heeft en wat Wikipedia nu zegt, in woorden en per onderdeel dat verschilt, uit het voorstel dat de import bewaarde.
  Het toont ook sinds wanneer en hoe vaak de import het zag, waarom de wijziging wacht (de Engelse reden van de import in het Nederlands), wat er zonder besluit gebeurt en een link naar de pagina van het seizoen op Wikipedia.
  Een besluit over een wedstrijd die er niet meer is, verandert niets en zegt dat.
- **Waarom:** twee wegen naar hetzelfde besluit moeten hetzelfde doen, en een beheerder die niet ziet sinds wanneer en waarom iets wacht, kan niet beslissen.
  De regel van de import in één regel tekst (`old_value` en `new_value`) is Engels en voor een machine; het voorstel heeft de velden.
- **Alternatieven:** de code in de importer laten en in de site kopiëren (verworpen: ze lopen uit elkaar).
  Alleen de oude en de nieuwe waarde tonen (verworpen: de beheerder moet raden hoe oud het is en waar hij het controleert).
  De regel `old_value` en `new_value` tonen (verworpen: Engels, en een lange regel op een telefoon).

## Op Spelers is de selectie de inhoud van de pagina, en de doelpuntenmakers staan in de zijkolom

- **Datum:** 6 november 2026
- **Besluit:** de kaart Selectie is de hoofdkaart van Spelers, op het witte vlak, met de zin over de volledigheid van het seizoen (#765, dat #747 overneemt).
  De kaart Doelpuntenmakers gaat naar de zijkolom, op het zachte vlak, met Bijzondere doelpunten en de bronvermelding.
  De schakelaar voor de competitie gaat mee naar de zijkolom.
  De selectie toont het rugnummer en de naam, zonder link, en ook spelers die de selectie verlieten.
  **Later:** sinds #1087 (11 november 2026) is de naam van een speler met een pagina een link (zie _De naam van een speler van ons linkt naar zijn pagina_).
  - **De kaart:** `SeasonSquadCard` in `src/SeasonSquadCard.tsx` heeft een kop van niveau 2 met het anker `#selectie`, de zin, en een kop van niveau 3 en een lijst per positie: Doelmannen, Verdedigers, Middenvelders en Aanvallers.
    Een positie zonder spelers blijft weg.
    Een speler zonder positie, tussen spelers mét positie, staat in een laatste deel "Positie onbekend".
    Heeft geen enkele speler van het seizoen een positie (de tabellen tot en met 2005/06), dan is er één lijst zonder kopjes.
    De regel is `ShortPlayer` van het designsysteem: het rugnummer en de naam, met de klassen van `ShortMatch`.
    **Later:** sinds 7 november 2026 is de regel een `PlayerName` met `shirtNumber` in een `ShortFact`; `ShortPlayer` bestaat niet meer (zie _Het rugnummer en een regel achter de naam zijn opties van PlayerName, en ShortPlayer vervalt_ in `designsysteem.md`).
  - **De volgorde:** op rugnummer, spelers zonder rugnummer achteraan, dan op de zoekterm (de achternaam, dus `van Aken` staat onder de V) en de naam.
    De volgorde komt uit de query `listSeasonPlayers` in `packages/db`; die geeft, anders dan `listSquad`, ook spelers die de selectie verlieten.
  - **De zin:** uit `squad_completeness` (de teksten van #747) onder de kop, zonder percentage.
    Bij `onbekend` en bij een seizoen zonder rij staat alleen de kop en de zin, ook als er spelers zijn opgeslagen.
    Een seizoen met alleen `statistieken` zegt dat wie op de bank bleef waarschijnlijk ontbreekt.
  - **De bronvermelding:** `SourceCredit` noemt ook de pagina's van de selectie (`wikipedia_pages` met de soort `squad`), de Engelse met "(Engelse Wikipedia)", en Wikidata met de licentie CC0 als een speler daarvandaan komt.
  - **De volgorde in de bron:** de kaart Selectie staat vóór de zijkolom, dus op een telefoon komt de selectie eerst.
    Er is geen `order` in de CSS.
    De schakelaar staat bovenaan de zijkolom, boven de kaarten die hij verandert.
    **Later:** zie _Een kaart die een telling van meer wedstrijden is, staat op Cijfers, en de schakelaar staat bovenaan de hoofdkolom_ (6 november 2026): de schakelaar staat bovenaan de hoofdkolom.
- **Waarom:** de projecteigenaar vroeg om de selectie als hoofdkaart en de doelpuntenmakers in de zijkolom op blauw.
  De zin hoort bij de lijst waarover hij gaat.
  De schakelaar verandert alleen de kaarten met doelpunten.
  Een speler die vertrok, hoort bij het seizoen.
  Een naam zonder link vraagt geen verzoek en laat de bezoeker niet de site verlaten.
- **Alternatieven:** de schakelaar boven de selectie laten staan (hij lijkt dan de selectie te sturen).
  Alleen spelers die nu in de selectie staan (een seizoen mist dan wie in de winter vertrok).
  De naam als link naar Wikipedia (kan later).
  De zin onderaan de kaart (de bezoeker leest de lijst eerst zonder de kanttekening).
- **Later:** vult _Op Spelers is de ranglijst witte inhoud, en de bijzondere doelpunten staan in de zijkolom_ (1 november 2026) aan: de ranglijst is niet meer de inhoud van de pagina.
- **Later:** de kaart Selectie toont sinds 9 november 2026 ook een seizoen met alleen spelers uit de verslagen, als één lijst met namen en met een zin die de bron noemt; zie _De kaart Selectie toont de spelers uit de verslagen alleen als ze de beste bron zijn_ (#935).

## Spelers staat in het menu na Wedstrijden

- **Datum:** 6 november 2026
- **Besluit:** de volgorde is Nieuws, Wedstrijden, (Statistieken), Spelers, Forum.
  Spelers is een onderdeel van het hoofdmenu op `/spelers`, huidig (`aria-current="page"`) op elk adres eronder, zonder balk eronder.
  `/statistieken/spelers`, `/statistieken/spelers/<seizoen>` en `/statistieken/spelers/kies` bestaan niet meer, zonder omleiding.
  - **De code:** de map `app/spelers` (de pagina's en de route van de kiezer) en het slot `@shortcuts/spelers` zijn met `git mv` verhuisd.
    Het slot `@subnav` heeft geen route voor Spelers meer, en `statisticsBar.tsx` kent alleen Tegenstanders.
    `playersPath` is `/spelers`; de balk "Op deze pagina" van Spelers blijft Selectie, Doelpuntenmakers en Bijzondere doelpunten.
  - **Het adres is gereserveerd:** `spelers` staat in `reservedSlugs`, zodat een artikel dat adres niet kan nemen.
- **Waarom:** het eindbeeld is Nieuws, Wedstrijden, Spelers, Forum, en Spelers hoort bij de wedstrijden eerder dan bij het nieuws.
  De site is nog niet openbaar, dus er zijn geen links om te bewaren.
- **Alternatieven:** Spelers vóór Wedstrijden.
  Omleidingen met 308 van de oude adressen (nu niet nodig).
- **Later:** het onderdeel Statistieken tussen haakjes is sinds #771 weg: de volgorde is Nieuws, Wedstrijden, Spelers, Forum (zie _Cijfers staat in de balk van Wedstrijden, en Statistieken is geen onderdeel meer_).

## Het hoofdmenu heeft vier onderdelen: Nieuws, Wedstrijden, Spelers en Forum

- **Datum:** 6 november 2026
- **Besluit:** Statistieken is geen onderdeel meer.
  Spelers wordt een eigen onderdeel.
  Tegenstanders en de cijfers van het seizoen staan onder Wedstrijden.
  Forum blijft een externe link.
- **Waarom:** Statistieken was een verzameling: cijfers, een selectie en een lijst met clubs.
  Wie de selectie zoekt, kijkt niet onder Statistieken.
  Nieuwe cijfers horen bij de spelers, de wedstrijden of de clubs waar ze over gaan.
- **Alternatieven:** alles laten zoals het is, met een regel voor kaarten (Statistieken blijft dan de plek waar elke nieuwe kaart terechtkomt).
  Eén onderdeel Seizoen met tabbladen voor Wedstrijden, Stand, Spelers en Cijfers (verbergt Wedstrijden en Spelers achter een nieuw woord, en de meeste bezoeken gaan over nu).
  Een vijfde onderdeel Tegenstanders.
  Een vijfde onderdeel Geschiedenis.
- **Later:** dit vervangt _De site heeft vier onderdelen: Nieuws, Wedstrijden, Statistieken en Forum_.

## Geschiedenis wordt geen eigen onderdeel van het menu

- **Datum:** 6 november 2026
- **Besluit:** de seizoenen, de hoofdtrainers en de records komen onder Wedstrijden, op een pagina `/seizoenen` in de balk, zodra #414 de seizoenen voor 2010/11 heeft.
- **Waarom:** de projecteigenaar wil het menu strak houden.
  De wedstrijden gaan nu terug tot 2010/11, dus een onderdeel Geschiedenis zou dun zijn.
- **Alternatieven:** een vijfde onderdeel Geschiedenis met Seizoenen, Tegenstanders, Trainers en Records.

## Zoeken blijft onder Nieuws

- **Datum:** 6 november 2026
- **Besluit:** de balk van Nieuws wordt Podcasts, Redactie, Zoeken.
  Zoeken komt niet in de kop, en het adres blijft `/nieuws/zoeken`.
  De link in de footer blijft.
- **Waarom:** een zoekveld of knop in de kop past niet op een telefoon.
  Zoeken vindt nu alleen nieuws, podcasts en artikelen.
  Het toont wel de lijst met spelers van dit seizoen.
- **Alternatieven:** een zoeklink rechts in de kop op elke pagina.
  Zoeken alleen in de footer.

## Adressen noemen de zaak en niet het menu, en er komen geen omleidingen

- **Datum:** 6 november 2026
- **Besluit:** de pagina's heten `/wedstrijden`, `/cijfers`, `/spelers`, `/tegenstanders`, `/redactie` en later `/seizoenen`.
  De oude adressen onder `/statistieken` verdwijnen zonder omleiding.
- **Waarom:** de site is nog niet openbaar, dus er zijn geen links om te bewaren.
  Staat een adres los van het menu, dan kan het menu later weer veranderen zonder omleidingen.
- **Alternatieven:** adressen onder hun menu-onderdeel, zoals `/wedstrijden/cijfers` (zou bij een volgende wijziging van het menu opnieuw verhuizen).
  Omleidingen met 308 (nu niet nodig).

## Een kaart staat op de pagina van de zaak die hij beschrijft, en de hoofd- en zijkolom hebben vaste rollen

- **Datum:** 6 november 2026
- **Besluit:** de hoofdkolom (wit) heeft de lijst of tabel waar de pagina voor bestaat.
  De zijkolom heeft cijfers erover, elk op een zacht, warm of sterk vlak, met de bronvermelding als laatste.
  Cijfers is de uitzondering, met twee even brede kolommen, omdat daar elke kaart een cijferkaart is.
- **Waarom:** nu betekent hoofdkolom of zijkolom per pagina iets anders.
  Spelers (#765) heeft de duidelijkste vorm: witte lijst, blauwe cijfers.
- **Alternatieven:** elke pagina zelf laten kiezen (zoals nu).
- **Later:** de zijkolom van een club heeft ook de kaart "Nieuws over <club>" (#777, zie _De pagina van een club toont de nieuwste vijf koppen die de club noemen_ in `redactie.md`): een lijst met links van anderen, op het zachte vlak, naast de cijfers.

## Doelpuntenmakers staan op één plek: Spelers

- **Datum:** 6 november 2026
- **Besluit:** Cijfers toont geen top 5 doelpuntenmakers meer.
  De pagina van een club houdt haar eigen top 5 tegen die club.
- **Waarom:** de top 5 op Statistieken en de volledige lijst op Spelers is dezelfde kaart op twee plaatsen.
  Met Spelers in het menu is de top 5 overbodig.
- **Alternatieven:** de top 5 laten staan als voorproefje.
- **Later:** dit vervangt _Statistieken toont de top 5 van de doelpuntenmakers, en de volledige lijst staat op Spelers_.

## Het seizoen blijft een instelling van de pagina en wordt geen globale keuze

- **Datum:** 6 november 2026
- **Besluit:** de seizoenskiezer blijft in de titel van Wedstrijden, Cijfers en Spelers, en het gekozen seizoen reist mee door de menulinks tussen die drie.
  Een algemeen overzicht van seizoenen komt als `/seizoenen`.
- **Waarom:** Nieuws, Tegenstanders en de homepage hebben geen seizoen.
  Een globale keuze in de kop zou daar niets doen.
- **Alternatieven:** een seizoenskiezer in de kop van elke pagina.

## Tegenstanders hoort bij Wedstrijden

- **Datum:** 6 november 2026
- **Besluit:** Tegenstanders staat in de balk van Wedstrijden en niet als eigen onderdeel van het menu (#770).
  - **De adressen:** de lijst en de pagina's van de clubs staan op `/tegenstanders` en `/tegenstanders/<club>`.
    De oude adressen onder `/statistieken` geven "niet gevonden", zonder omleiding (zie _Adressen noemen de zaak en niet het menu, en er komen geen omleidingen_).
    `tegenstanders` staat in `reservedSlugs`.
  - **Het menu:** Wedstrijden is het huidige onderdeel op `/wedstrijden`, en op `/tegenstanders` en de pagina's van de clubs is het `aria-current="true"` met Tegenstanders als huidige subpagina in de balk, zoals Nieuws op Podcasts.
    Statistieken heeft geen balk meer.
  - **Wat meereist:** de keuze Alle wedstrijden / Eredivisie reist mee in de link van de balk.
    Het seizoen reist niet mee, want Tegenstanders telt alle seizoenen.
  - **De code:** de map `app/tegenstanders` en het slot `@subnav` verhuisden met `git mv`.
    `statisticsBar.tsx` is `matchesBar.tsx` geworden, en `opponentsPath` is `/tegenstanders`.
- **Waarom:** elk gegeven op een clubpagina komt uit de wedstrijden tegen die club, en je komt er via de clubnaam in een wedstrijdregel.
- **Alternatieven:** een eigen onderdeel Tegenstanders (vijf onderdelen).
  Onder Geschiedenis.
- **Later:** vervangt voor Tegenstanders de beslissing _Tegenstanders is een lijst van alle clubs en een pagina per club, onder Statistieken_ (31 oktober 2026).
  De balk heeft sinds #771 ook Cijfers, vóór Tegenstanders (zie _Cijfers staat in de balk van Wedstrijden, en Statistieken is geen onderdeel meer_).

## De balk van Nieuws heeft Podcasts, Redactie en Zoeken, in die volgorde, altijd alle drie

- **Datum:** 6 november 2026
- **Besluit:** de balk onder Nieuws heeft Podcasts, Redactie en Zoeken, in die volgorde.
  Redactie staat er ook als er nog geen artikel is.
  Redactie is de huidige subpagina op `/redactie` en op elk artikel (`/redactie/<naam>`), en Nieuws is daar `aria-current="true"`, zoals op Podcasts.
  `/redactie` toont de gepubliceerde artikelen, de nieuwste eerst, met de titel, de dag en de inleiding, tien per pagina, met `Pagination` en `?pagina=` zoals het nieuwsarchief.
  Zonder artikel staat er "We hebben nog geen artikelen.", en een pagina na de laatste is "niet gevonden".
  De kaart "Van de redactie" op `/nieuws` heeft de link "Alle artikelen", en een artikel heeft de link "Alle artikelen van de redactie".
- **Waarom:** Podcasts is het grootste deel, en Zoeken doorzoekt alles en staat dus als laatste.
  Een balk die per aantal artikelen verandert, is meer om te testen dan de lege zin waard is.
  De inleiding mag op de lijst staan, want het is onze eigen tekst.
- **Alternatieven:** Zoeken eerst.
  Redactie pas tonen vanaf twee artikelen.
- **Later:** vult _Het hoofdmenu kiest het onderdeel en de subpagina uit het pad_ (31 oktober 2026) aan: op een artikel van de redactie is Nieuws niet meer `aria-current="page"`, maar `aria-current="true"`, en Redactie is de huidige subpagina.
  Dat verkleint ook het nadeel dat daar stond.
  Het vult _De homepage en het nieuws zijn twee pagina's, en het forum staat bovenaan de zijbalk van de homepage_ (1 november 2026) aan: de balk van Nieuws heeft ook Redactie.

## De wedstrijden van een club staan bladerend, tien per pagina

- **Datum:** 6 november 2026
- **Besluit:** de kaart Wedstrijden op de pagina van een club toont de gespeelde wedstrijden tien per pagina, de nieuwste eerst, met `Pagination` en `?pagina=` zoals het nieuwsarchief, op één pagina per club (#775).
  - **De adressen:** `/tegenstanders/<club>?pagina=2`, en met de keuze `/tegenstanders/<club>?competitie=eredivisie&pagina=2`.
    Pagina 1 heeft geen `pagina`.
    De schakelaar tussen alle wedstrijden en de Eredivisie gaat naar pagina 1, want het aantal pagina's verschilt per keuze.
    Een pagina na de laatste (`meetingPageCount` in `src/opponents.ts`), of een `pagina` die geen positief getal is (`parseFilterQuery`), is "niet gevonden".
    Zonder `pagina` en met tien gespeelde wedstrijden of minder is er geen `Pagination`.
  - **Wat op pagina 1 staat:** de wedstrijden die nog komen en de rij Laatste wedstrijden staan alleen op de eerste pagina, bovenop de tien gespeelde.
    De legenda onder de lijst telt de wedstrijden van de pagina.
  - **De volgorde blijft:** de lijst staat vóór de cijferkaarten, ook op een telefoon.
- **Balk "Op deze pagina:":** de pagina van een club heeft de balk met een link naar elke kaart die er is, in de volgorde van de pagina (`clubShortcutsOf` in `src/opponents.ts`, `app/@shortcuts/tegenstanders/[club]`): Wedstrijden, Onze uitslagen, Resultaten sinds …, Hoe vaak welke uitslag, Doelpuntenmakers en Stadion.
  Een kaart die er niet is, heeft geen link.
  De balk is er op een telefoon, zoals bij Wedstrijden.
  De ankers zijn de bestaande `id`'s van de koppen.
  De kop Stadion staat al in `src/anchors.ts` (voor een club met twee namen van het stadion); de andere ankers zijn geen belofte en staan er niet in.
- **Waarom:** het werkt zonder JavaScript, past bij Nieuws en Redactie en vraagt geen extra pagina per club.
  Een lijst van dertig wedstrijden op een telefoon is een lange scroll, en de acht kaarten erna waren niet te bereiken.
- **Alternatieven:** vijf regels en een aparte pagina met de hele lijst (zoals #516, maar een extra pagina per club).
  Een samenvatting vóór de lijst op een telefoon (breekt de regel van #768 dat de hoofdkolom vooraan staat).

## Cijfers staat in de balk van Wedstrijden, en Statistieken is geen onderdeel meer

- **Datum:** 6 november 2026
- **Besluit:** de pagina Statistieken heet Cijfers en staat in de balk van Wedstrijden, naast Tegenstanders (#771).
  - **De adressen:** `/cijfers`, `/cijfers/<seizoen>` en `/cijfers/kies`, met dezelfde regels als de oude adressen voor een onbekend seizoen en een onbekende keuze.
    `/statistieken`, `/statistieken/<seizoen>` en `/statistieken/kies` bestaan niet meer, zonder omleiding (zie _Adressen noemen de zaak en niet het menu, en er komen geen omleidingen_).
    `cijfers` staat in `reservedSlugs` en `statistieken` is eruit, omdat het geen pagina meer is.
  - **Het menu:** Nieuws, Wedstrijden, Spelers en Forum.
    Wedstrijden is het huidige onderdeel op `/wedstrijden`, en op `/cijfers` en op `/cijfers/<seizoen>` is het `aria-current="true"` met Cijfers als huidige subpagina in de balk, zoals bij Tegenstanders.
  - **Wat meereist:** de balk houdt de keuze Alle wedstrijden / Eredivisie vast in beide links, en de link naar Cijfers houdt ook het seizoen van de pagina vast, zoals het menu doet voor Wedstrijden en Spelers.
    Van Cijfers naar Spelers en terug reist het seizoen dus mee: Spelers staat in het menu, en terug gaat via Wedstrijden naar de balk.
  - **De naam:** de kop, de titel, de beschrijving, de balk "Op deze pagina:", de README's en de pagina's Over ons en Updates zeggen Cijfers.
    Het label `statistics` op GitHub en de namen van bestanden en functies, zoals `statisticsShortcuts` en `statistics-page.tsx`, blijven zoals ze zijn.
  - **De code:** de mappen `app/statistieken` en `app/@shortcuts/statistieken` verhuisden met `git mv` naar `cijfers`.
    Het slot `@subnav` kreeg een route voor `/cijfers` en `/cijfers/[seizoen]`, en `MatchesBar` krijgt het seizoen van de pagina.
- **Waarom:** de pagina heette al in de beslissing van #768 Cijfers, en een balk met alleen Tegenstanders had ruimte voor de cijfers van het seizoen.
  Wie wedstrijden zoekt, vindt de cijfers eronder, en het menu blijft op vier onderdelen.
- **Alternatieven:** Cijfers als eigen onderdeel van het menu (vijf onderdelen).
  Omleidingen met 308 van de oude adressen (nu niet nodig).
- **Later:** vult _Het hoofdmenu heeft vier onderdelen: Nieuws, Wedstrijden, Spelers en Forum_ aan: de cijfers van het seizoen staan onder Wedstrijden.
  Alle beslissingen hierboven die de pagina Statistieken noemen, bedoelen sinds #771 Cijfers.

## Een kaart die een telling van meer wedstrijden is, staat op Cijfers, en de schakelaar staat bovenaan de hoofdkolom

- **Datum:** 6 november 2026
- **Besluit:** de kaart "Hoe vaak welke uitslag" verhuist van de zijbalk van Wedstrijden naar Cijfers en volgt daar de schakelaar tussen alle wedstrijden en de Eredivisie (#774).
  De kaart Doelpuntenmakers (de top 5) verdwijnt van Cijfers; Spelers heeft de hele lijst.
  - **Eredivisie-kaarten bij elkaar:** op Cijfers staan de drie kaarten die de schakelaar negeren, Onze plek in de competitie, Verloop van het seizoen en Hoe de wedstrijden verlopen, bij elkaar bovenaan de hoofdkolom, boven de schakelaar.
    Elk eindigt met de regel "Alleen de Eredivisie".
    De schakelaar staat direct boven de eerste kaart die hem volgt.
  - **De schakelaar op alle pagina's:** op Cijfers, Spelers en Tegenstanders is de schakelaar een cel van de hoofdkolom (op Spelers en Tegenstanders de eerste, op Cijfers na de drie Eredivisie-kaarten).
    Op Spelers staat hij dus niet meer bovenaan de zijkolom.
  - **De kolommen van Cijfers:** hoofdkolom: onze plek, het verloop, hoe de wedstrijden verlopen, de schakelaar, de reeksen, thuis en uit en Opmerkelijk.
    Zijkolom: toeschouwers, hoe vaak welke uitslag, de nul gehouden, de doelpunten per kwartier, de uitersten en de bronvermelding.
    De volgorde van de bron is de volgorde van de balk "Op deze pagina:" en van een telefoon.
  - **De regel voor de kolommen** staat in de documentatie van `Page.Main` en `Page.Sidebar` in Storybook, zonder maten: de hoofdkolom heeft de lijst of tabel waar de pagina voor bestaat, de zijkolom heeft cijfers erover, en Cijfers is de uitzondering met twee even brede kolommen.
  - **Ankers:** `#hoe-vaak-welke-uitslag` is verhuisd van `/wedstrijden` naar `/cijfers`, en `#doelpuntenmakers` en `#topscorers` zijn van `/cijfers` verdwenen, zonder omleiding (zie _Adressen noemen de zaak en niet het menu, en er komen geen omleidingen_).
- **Waarom:** de schakelaar leek op Cijfers voor alle kaarten te gelden, en dat klopte niet.
  Een vaste plek maakt hem overal te vinden.
  Een telling van de uitslagen past bij de andere tellingen op Cijfers en volgt daar de keuze, terwijl Wedstrijden de lijst en de stand houdt.
- **Alternatieven:** elke kaart een eigen schakelaar (te veel herhaling); de schakelaar bovenaan de zijkolom, zoals Spelers had; de kaart op Wedstrijden laten staan met alle wedstrijden; een voorproefje van de doelpuntenmakers op Cijfers.
- **Later:** vervangt _De kaart met de uitslagen staat op Wedstrijden en telt dezelfde wedstrijden als Uitslagen_ (2 november 2026).
  Het vult _Doelpuntenmakers staan op één plek: Spelers_ (6 november 2026) aan: de code toont op Cijfers nu ook geen anker `#doelpuntenmakers` meer.
  Het vult _Een kaart staat op de pagina van de zaak die hij beschrijft, en de hoofd- en zijkolom hebben vaste rollen_ (6 november 2026) aan: de schakelaar is een cel van de hoofdkolom.

## Onze eindplek per seizoen staat als lijn op Wedstrijden

- **Datum:** 6 november 2026
- **Besluit:** de kaart "Onze plek door de jaren" toont als lijn onze eindplek per seizoen, met plek 1 bovenaan, en een tabel voor een schermlezer.
  Hij staat in de zijkolom van Wedstrijden, direct onder Stand of Eindstand, op het zachte vlak, en negeert de seizoenskiezer en de schakelaar (#776).
  - **De gegevens:** `listClubStandings` geeft onze rij uit `standings` in elk seizoen, en `listStandingsSeasons` de seizoenen met een stand.
    `finalPlacesOf` maakt er een plek per seizoen van, van het eerste seizoen met een stand tot het lopende.
    Een seizoen zonder onze rij is een lege plek: een onderbreking in de lijn en een rij "geen stand".
    Het lopende seizoen staat erbij als "nu", want zijn stand is nog niet af.
    De vraag geeft de club als argument, zodat de pagina van een club (#779) dezelfde vraag kan stellen.
  - **De lijn:** `BarChart` met alleen de grond en `BarChart.Trend`.
    De omgekeerde schaal is geen nieuw onderdeel: de pagina zet plek 1 om in de hoogste waarde (`max + 1 - plek`, met 18 clubs als vaste schaal) en geeft de plekken 1, 5, 10, 15 en 18 aan de zijkant.
    De lijn is voor een schermlezer verborgen.
  - **De tabel:** seizoen (nieuwste bovenaan, het lopende met "(nu)"), plek, punten en doelsaldo, altijd zichtbaar.
    Een seizoen zonder stand heeft streepjes, en een schermlezer hoort "geen stand".
    Afgetrokken punten staan als regel onder de tabel ("2025/26: 2 punten afgetrokken"), zoals onder de tabel Stand.
    Een tabel met tekst past niet op 300 pixels breed.
    Een seizoen is een link naar `/wedstrijden/<seizoen>` als het wedstrijden heeft; zonder wedstrijden is er geen pagina om naar te linken.
  - **De regels onder de kaart:** "Sinds 2010/11" (het eerste seizoen met een stand) en, als laatste, "Alleen de Eredivisie" (zie _Een kaart die een telling van meer wedstrijden is, staat op Cijfers, en de schakelaar staat bovenaan de hoofdkolom_).
  - **De balk:** "Onze plek door de jaren" staat in "Op deze pagina" na Stand of Eindstand, zodra een seizoen een stand heeft.
- **Waarom:** de stand van één seizoen laat niet zien hoe het de jaren daarvoor ging, en de gegevens zijn er.
  Een lijn laat de lezer in een oogopslag zien of het beter of slechter gaat.
- **Alternatieven:** staafjes (zeggen minder over beter of slechter); op Cijfers (de kaart hoort bij de stand); alleen een tabel; een nieuw onderdeel in het designsysteem voor de omgekeerde schaal (niet nodig, zolang er één plek is die hem gebruikt).
- **Later:** vult _Een kaart staat op de pagina van de zaak die hij beschrijft, en de hoofd- en zijkolom hebben vaste rollen_ (6 november 2026) aan: de zijkolom van Wedstrijden heeft nu Stand, Onze plek door de jaren en de bronvermelding, met Hoofdtrainer tussen de laatste twee.
- **Later:** vervangen door _"Onze plek door de jaren" verhuist naar Cijfers_ (9 november 2026) waar het de plek van de kaart betreft: hij staat op Cijfers en niet meer op Wedstrijden, onder Stand of Eindstand staat nu de kaart Onze plek per speelronde.
  De rest (de lijn, de tabel, de gegevens, de regels onder de kaart) blijft.

## Spelers toont ook de doelpuntenmakers aller tijden, als top 10

- **Datum:** 6 november 2026
- **Besluit:** een kaart "Alle tijden" met de eerste tien plaatsen, over alle seizoenen, per persoon, die de schakelaar volgt (#780).
  - **Plek:** zacht vlak in de zijkolom van Spelers, direct onder Doelpuntenmakers, met een item "Alle tijden" in de balk "Op deze pagina:" en het anker `#alle-tijden`.
  - **Telling:** `topScorersOf` over de wedstrijden van alle seizoenen, in één query (`listAllMatchGoals`), een uur bewaard.
    Het seizoen van de kiezer verandert de kaart niet.
  - **Plaatsen:** de kaart toont de eerste tien plaatsen, met alle spelers die de tiende delen, in rijen met gelijkstaanden zoals `TopScorersTable` ze toont.
    Valt er iemand weg, dan staat er "De top 10 van N spelers die scoorden".
  - **Vanaf wanneer:** de kaart zegt "Sinds 2010/11", het eerste seizoen met wedstrijden, en wordt vanzelf voller als er meer seizoenen komen.
  - **Fout:** kan de kaart niet worden gelezen, dan blijft ze weg en houdt de rest van de pagina zijn inhoud.
- **Waarom:** de pagina toont één seizoen, en wie wil weten wie de meeste doelpunten maakte sinds 2010/11, vindt dat nergens.
  De persoonskoppeling is er nu.
- **Alternatieven:** de hele lijst (#727, groter).
  Een vaste tien rijen met afkappen van gelijke plekken (willekeurig).
- **Later:** dit vult _Doelpuntenmakers staan op één plek: Spelers_ (6 november 2026) aan: Spelers heeft nu de lijst van het seizoen en de top 10 aller tijden.

## Op de homepage staat Wedstrijden boven het forum

- **Datum:** 6 november 2026
- **Besluit:** de zijkolom van de homepage is Wedstrijden, Stand, Forum ("Nieuwste discussies"), Nieuwste podcasts.
- **Waarom:** op een wedstrijddag komt de bezoeker vooral voor de uitslag of het programma, en het forum is een link naar buiten.
- **Alternatieven:** het forum bovenaan laten (de keuze van 1 november 2026).
- **Later:** dit vervangt het deel van _De homepage en het nieuws zijn twee pagina's, en het forum staat bovenaan de zijbalk van de homepage_ (1 november 2026) dat zegt dat het forum bovenaan staat.

## Resultaten per hoofdtrainer staan als tabel op Cijfers

- **Datum:** 6 november 2026
- **Besluit:** een kaart "Resultaten per hoofdtrainer" met een tabel op Cijfers, voor de trainers met minstens één gespeelde wedstrijd in onze gegevens, volgens de schakelaar (#781).
  - **Plek:** zacht vlak als laatste kaart van de zijkolom van Cijfers, met een item in "Op deze pagina:" en het anker `#resultaten-per-hoofdtrainer`.
    Een lange tabel krijgt geen knop voor een afbeelding.
    De kaart telt alle seizoenen en verandert niet met het seizoen van de kiezer.
  - **Telling:** een wedstrijd telt voor de trainer in wiens periode de dag valt, als hij is gespeeld en een uitslag heeft (`coachResultsOf`).
    Een periode loopt van de eerste dag van zijn begin tot en met de eerste dag van zijn einde; kennen we een datum alleen op de maand of het jaar, dan is dat de eerste dag van de maand of het jaar.
    Een trainer zonder wedstrijd staat er niet in, dus de trainers van vóór 2010/11 ook niet.
  - **Overlap:** twee periodes kunnen door een vage datum elkaar raken (Marco van Basten tot juli 2014 en Dwight Lodeweges vanaf 2014).
    Een dag die in twee periodes valt, telt voor de trainer die als eerste begon, want zijn begin is het zekerst.
  - **Interim:** een eigen rij, met "interim" voor de periode op de regel onder de naam: "interim · feb 2025 – mrt 2025".
  - **Tabel:** de nieuwste trainer eerst, met de kolommen gespeeld, winst, gelijk, verlies en punten per wedstrijd (de sleutelwaarde).
    De rijkop is de naam, met `PlayerName` zoals elders (de voornaam gewoon, de achternaam zwaarder), en daaronder op een eigen regel in secundaire tekst de periode, "Dwight Lodeweges" met "jan 2014 – okt 2015" eronder.
    Een kolom van tekst voor de periode maakte de tabel breder dan een telefoon (bij 320 pixels liep de pagina 65 pixels over).
    `DataTable` kreeg daarvoor `display` (wat de rijkop toont) en `secondary` (een tweede regel) voor een tabel met cijfers; de gewone `header` blijft de sleutel van de rij.
    Een periode staat op de maand, of op het jaar als alleen het jaar bekend is; een trainer die nog bezig is, eindigt op "nu".
    De letters komen uit `tableColumns`, met de uitleg eronder.
    De punten per wedstrijd zijn 3 per winst en 1 per gelijkspel, gedeeld door de wedstrijden, met twee decimalen en een komma.
  - **Fout:** kunnen de trainers of de wedstrijden niet worden gelezen, dan blijft de kaart weg en houdt de rest van de pagina zijn inhoud.
- **Waarom:** de gegevens (`staff` en de wedstrijden) zijn er, en de pagina Seizoenen bestaat pas als #414 is gebouwd.
  Cijfers is de plek voor cijfers over alle seizoenen.
- **Alternatieven:** wachten op #782.
  De kaart Hoofdtrainer(s) op Wedstrijden uitbreiden (die toont één seizoen).
  Een dag in een overlap voor beide trainers tellen (dubbel geteld), of voor geen van beide (een gat in de telling).
- **Later:** vult _Geschiedenis wordt geen eigen onderdeel van het menu_ (6 november 2026) aan: tot #782 gebouwd is, staan de resultaten per hoofdtrainer op Cijfers, en kan die pagina de kaart overnemen.

## De plek van de club en de onze staan in een tabel op de pagina van de club

- **Datum:** 6 november 2026
- **Besluit:** de pagina van een club krijgt de kaart "De plek van <club> en de onze": een tabel met per seizoen onze eindplek en die van de club, voor de seizoenen waarin we allebei in de Eredivisie speelden, de nieuwste eerst (#779).
  De kaart staat in de zijkolom na Hoe vaak welke uitslag, op het zachte vlak, en heeft een item "Plek in de competitie" in de balk "Op deze pagina".
  - **Onze plek:** uit `getFinalPlaces` (#776), dus geen tweede vraag naar onze rij.
    Het lopende seizoen telt niet mee: zijn stand is niet af en de kaart toont eindplekken.
  - **De plek van de club:** `listStandingsPlaces` geeft de plek van elke club in elk seizoen, in één vraag die vijf minuten wordt bewaard.
    De koppeling met de club loopt via de namen: de naam van de club, de andere namen (`club_names`), de namen van zijn eigen lijst (`club_name_periods`) en de naam van elke wedstrijd tegen hem, allemaal vergeleken zonder hoofdletters, accenten en leestekens (`normaliseClubName`).
    Een seizoen onder een oude naam telt dus mee, en "P.E.C. Zwolle" is "PEC Zwolle".
  - **Geen kaart:** zonder seizoen waarin allebei in de stand staan is er geen kaart en geen item in de balk.
  - **De schakelaar:** de kaart negeert hem en zegt het met de laatste regel "Alleen de Eredivisie".
  - **Toegankelijkheid:** een tabel met bijschrift dat de club noemt, kolomkoppen met `scope` en een rijkop per seizoen; geen grafiek.
- **Waarom:** wie een club bekijkt, wil weten hoe de club het deed in de jaren dat we elkaar troffen, en een tabel is genoeg voor een paar tientallen seizoenen.
  De namen van de wedstrijden erbij nemen vangt een naam die in de stand anders is geschreven dan in `club_names`: de importer legt de namen in de stand niet vast aan een club.
- **Alternatieven:** een grafiek met twee lijnen (meer ontwerp, weinig extra); een rij onder Verloop sinds 1990; het lopende seizoen met "nu" erbij (zijn stand is nog niet af).
- **Later:** vult _Onze eindplek per seizoen staat als lijn op Wedstrijden_ (6 november 2026) aan: de vraag die `finalPlacesOf` voor de club van de pagina kon stellen, wordt hier alleen voor onze eigen plek gebruikt; de plek van de club komt uit `listStandingsPlaces`.

## Late doelpunten en doelpunten in blessuretijd staan onder Doelpunten per kwartier

- **Datum:** 6 november 2026
- **Besluit:** twee regels onder de tabel van de kaart Doelpunten per kwartier: "Na de 80e minuut" en "In blessuretijd", voor ons en tegen ons, volgens de schakelaar (#783).
  - **Telling:** `lateGoalsOf` in `src/matches.ts` telt in dezelfde wedstrijden als de kaart zelf (gespeeld, met bekende doelpunten, de competitie en bij Alle wedstrijden de beker).
    Na de 80e minuut is vanaf minuut 81: 80 telt niet, 81 wel, en 90+3 en een doelpunt in de verlenging ook.
    In blessuretijd is een doelpunt met toegevoegde tijd: 45+1, 90+3 en 105+1.
    Een doelpunt zonder toegevoegde tijd telt alleen voor zijn minuut, want Wikipedia noemt die niet altijd, en de kaart zegt niet dat de blessuretijd volledig is.
    90+3 telt in beide regels.
    Een doelpunt telt voor de club die ervan profiteert (`ours`), en minuut 0 telt niet.
  - **Verlenging:** de tabel laat de verlenging weg en de twee regels niet.
    De zin onder de kaart zegt dat nu: "Doelpunten in de verlenging tellen niet mee in de tabel, wel in de twee regels erboven."
  - **Weergave:** twee regels gewone tekst, in die volgorde, met 0 als er geen doelpunt is ("Na de 80e minuut: 0 voor, 0 tegen").
    De tabel en de diagrammen veranderen niet.
- **Waarom:** de gegevens staan er al, en een extra kaart voor twee getallen zou de pagina drukker maken.
  80 is de grens die supporters "laat" noemen.
- **Alternatieven:** een eigen kaart.
  Een lijst van de late winnende doelpunten (groter, een ander issue).
  De grens bij de 85e minuut.
- **Later:** dit vult _De kaart Doelpunten per kwartier telt de doelpunten van de wedstrijden met bekende minuten_ (`redactie.md`) aan: de blessuretijd (`stoppage_minutes`) doet voor de kwartieren nog niet mee, maar telt wel in de regel "In blessuretijd", en de verlenging blijft buiten de tabel maar telt in de twee regels.

## Een tabel die een grafiek herhaalt, staat in een Disclosure

- **Datum:** 6 november 2026
- **Besluit:** staat bij een grafiek een tabel met dezelfde gegevens, per wedstrijd of per seizoen, dan staat die tabel in een `Disclosure`.
  De grafiek en de samenvatting blijven zichtbaar.
  Dit geldt voor Toeschouwers (#808) en Onze plek door de jaren (Plek per seizoen, op verzoek van de projecteigenaar in dezelfde pull request); andere kaarten volgen in eigen issues.
  De opmerkingen over afgetrokken punten blijven buiten de Disclosure, en de links naar de seizoenen staan ook dicht in de pagina.
- **Waarom:** de tabel is lang en de kaart wordt rustiger zonder.
  Bezoekers met een schermlezer houden de tabel, want de samenvatting van een Disclosure is bereikbaar met het toetsenbord.
  Het is dezelfde keuze als bij Verloop van het seizoen.
- **Alternatieven:** de tabel laten staan; de tabel schrappen (verliest de cijfers per wedstrijd).
- **Later:** vult _Onze eindplek per seizoen staat als lijn op Wedstrijden_ (6 november 2026) aan: de tabel voor een schermlezer staat nu in een Disclosure, dicht bij het laden.

## De kaart met toeschouwers op de pagina van een club telt alleen thuiswedstrijden

- **Datum:** 6 november 2026
- **Besluit:** "Toeschouwers tegen <club>" (#778) toont de thuiswedstrijden tegen de club, als eigen kaart en niet in de grafiek Verloop sinds 1990.
  Het is een staaf per wedstrijd, van het eerste seizoen naar het laatste, met het gemiddelde en het hoogste aantal (met het seizoen), en de tabel met het aantal per wedstrijd staat in een `Disclosure`.
  De kaart telt zoals de kaart op Cijfers (`attendanceOf`), volgt de schakelaar, en staat na "De plek van … en de onze" en vóór "Doelpuntenmakers tegen …".
  Zonder bekend aantal bij een thuiswedstrijd is er geen kaart.
- **Waarom:** het aantal bij een uitwedstrijd hoort bij het stadion van de ander.
  Een eigen kaart houdt de grafiek van het verloop eenvoudig.
  De tabel herhaalt de grafiek, dus ze staat in een Disclosure (zie _Een tabel die een grafiek herhaalt, staat in een Disclosure_).
- **Nadeel:** de kaart volgt de schakelaar, dus ze verdwijnt met de keuze Eredivisie bij een club waarvan alleen de bekerwedstrijden een bekend aantal hebben.
- **Alternatieven:** ook uitwedstrijden (zegt iets anders).
  Een regel in Verloop sinds 1990.
- **Later:** dit past bij _Een kaart die een telling van meer wedstrijden is, staat op Cijfers, en de schakelaar staat bovenaan de hoofdkolom_ met een uitzondering: de kaart telt de wedstrijden tegen één club en hoort daarom bij die club.

## De kaart met podcasts toont de afleveringen van de laatste 8 dagen

- **Datum:** 7 november 2026
- **Besluit:** de kaart met podcasts (`EpisodesCard`) toont alleen afleveringen van de laatste 8 dagen, gerekend vanaf nu, tot het aantal van `itemsPerCard`.
  Een aflevering van precies 8 dagen oud staat er nog in.
  Zonder afleveringen staat er "We hebben de laatste 8 dagen geen podcastafleveringen gevonden." en blijft de link "Alle podcasts".
- **Waarom:** de projecteigenaar wil op de homepage en bij het nieuws alleen verse afleveringen zien.
  Een aflevering van weken oud is geen nieuws meer.
  8 dagen dekt een wekelijkse podcast.
- **Alternatieven:** altijd de vijf nieuwste tonen (zoals eerder).
  Een venster van 7 dagen (mist een wekelijkse aflevering die iets later komt).
- **Later:** dit vervangt het deel van _De homepage en het nieuws zijn twee pagina's, en het forum staat bovenaan de zijbalk van de homepage_ (1 november 2026) en van _Het blok op de homepage staat in de zijbalk onder het forum_ in `docs/beslissingen/importer.md` (24 oktober 2026) dat zegt dat de kaart de nieuwste afleveringen toont zonder grens in de tijd.

## De kaart Resultaten per hoofdtrainer zegt achter de naam hoeveel wedstrijden en hoeveel punten per wedstrijd

- **Datum:** 7 november 2026
- **Besluit:** achter de naam van elke hoofdtrainer op Cijfers staat de regel van `PlayerName`: "34 wedstrijden, 1,85 punten per wedstrijd" (bij één wedstrijd "1 wedstrijd", bij precies 1,00 "punt"), met de periode eronder zoals nu (#812).
  De kolommen G en P van de tabel blijven; de regel is er voor wie de naam leest zonder de tabel te volgen.
- **Waarom:** de projecteigenaar wilde de aantallen bij de naam, en het is de eerste plek die de regel van `PlayerName` gebruikt.
- **Alternatieven:** de regel in de plaats van de periode (dan mist de periode); de kolommen weghalen (de tabel wordt minder te vergelijken).

## De doelpuntenmakers op Spelers tonen D/W waar de wedstrijden van elke speler bekend zijn

- **Datum:** 7 november 2026
- **Besluit:** de kaart Doelpuntenmakers op Spelers krijgt een kolom D/W, de doelpunten per wedstrijd van elke speler, alleen als voor elke speler in de lijst vaststaat hoeveel wedstrijden hij speelde en de cijfers kloppen (#819).
  Anders heeft de kaart geen D/W, ook geen streepje en geen uitleg.
  - **Alles of niets per kaart:** `goalsPerMatchOf` in `src/goals-per-match.ts` is een functie zonder database en zonder verzoek.
    Ze geeft de waarden of niets, en de kaart toont de kolom alleen als ze waarden geeft.
  - **De regel:** de kolom is er als aan drie dingen is voldaan.
    1: elke gespeelde wedstrijd die de kaart telt, is een wedstrijd van de Eredivisie of de KNVB Beker, want de selectietabel heeft alleen daar cijfers voor.
    Bij de keuze Eredivisie is dat altijd zo; bij Alle wedstrijden niet in een seizoen met een gespeelde wedstrijd van de play-offs of van Europa.
    2: elke speler in de lijst heeft minstens één optreden in de competities die de kaart telt.
    3: voor elke speler zijn de doelpunten in `player_season_stats`, in die competities, gelijk aan de doelpunten van de kaart.
    Een speler met een doelpunt dat niet aan een speler van de selectie hangt (`playerId`), heeft geen cijfers, dus dan is er ook geen kolom.
    Heeft een persoon meer spelers (titels), dan tellen hun cijfers samen, zoals de kaart een persoon één keer telt.
  - **De waarde:** de doelpunten van de kaart gedeeld door de optredens, ook als invaller, in de competities die de kaart telt, met een decimale komma en twee decimalen ("0,50"), afgerond zoals `perMatch` in `MatchViews.tsx`.
  - **Alleen de lijsten van een seizoen:** de kaart Doelpuntenmakers op Spelers, voor het gekozen seizoen en de gekozen competitie.
    De top 5 op Cijfers is er niet meer (#774).
    Niet Alle tijden: daar zijn de wedstrijden van bijna elk seizoen sinds 2010/11 onbekend, dus het getal zou onwaar of onvolledig zijn.
    Niet de kaart op de pagina van een club: dat zijn doelpunten tegen één club, en de wedstrijden tegen die club kennen we niet.
  - **Een rij per speler:** een kaart met D/W heeft voor elke speler een eigen rij met de plaats, de naam, de doelpunten (met de staaf) en D/W.
    Spelers met evenveel doelpunten houden dezelfde plaats, en het plaatsnummer staat bij elke rij.
    De pagina Spelers had al een rij per speler, dus daar verandert alleen de kolom; het component splitst een gedeelde rij als de kolom aanstaat (`showGoalsPerMatch`).
  - **De cijfers:** het aantal wedstrijden komt alleen uit de selectietabel van de Nederlandse Wikipedia (`player_season_stats`, via `listSeasonPlayerStats` en `getSeasonPlayerStats` in `src/season-player-stats.ts`, vijf minuten bewaard).
    Ze zijn er voor 2005/06 en 2023/24 en niet voor de seizoenen ertussen, dus de kolom staat er nu voor die seizoenen.
    Lukt het lezen niet, dan staat de kaart zonder de kolom en schrijft de site de reden in het logboek.
  - **De verzonnen gegevens:** het verzonnen seizoen van de seed heeft optredens voor de spelers die scoorden (`madeUpPlayerStats`), en een gespeelde wedstrijd van de play-offs.
    Zo heeft `/spelers?competitie=eredivisie` de kolom en `/spelers` (alle wedstrijden) niet, en de pagina van het seizoen daarvoor, uit de controle, heeft geen cijfers.
- **Waarom:** de projecteigenaar wilde de doelpunten per wedstrijd van een speler, samen met de punten per wedstrijd van een hoofdtrainer (#812).
  Een lijst met gaten nodigt uit tot vergelijken op ongelijke gegevens, en een onwaar getal is erger dan geen getal.
  Twee spelers kunnen niet één D/W delen, dus een kolom vraagt een rij per speler.
- **Alternatieven:** per speler een streepje waar het onbekend is.
  Alle tijden alleen over de seizoenen met cijfers ("sinds 2023/24", met twee beginjaren op één kaart).
  Een regel achter de naam, zoals bij de hoofdtrainers in #812, die de gedeelde rijen laat staan.
- **Later:** dit vervangt voor kaarten met D/W het besluit van 4 november 2026 dat spelers met evenveel doelpunten één rij delen (_Spelers met evenveel doelpunten delen één rij in de korte tabel met doelpuntenmakers_).

## Geen frames en geen vensters met een opener: `frame-ancestors 'none'`, `X-Frame-Options: DENY` en COOP `same-origin`

- **Datum:** 6 november 2026
- **Besluit:** de proxy zet drie headers op elk antwoord, op productie en acceptatie: `frame-ancestors 'none'` in de CSP, `X-Frame-Options: DENY` en `Cross-Origin-Opener-Policy: same-origin` (#801).
  Dat geldt voor pagina's, bestanden onder `/_next`, de 404, de feeds en het beheer.
  `frame-src 'self'`, de rest van de CSP en `'unsafe-inline'` blijven zoals ze zijn.
- **Waarom:** het beheer heeft een inlog, en een pagina die in een frame van een andere site kan staan, kan voor clickjacking dienen.
  `same-origin` voor COOP scheidt onze pagina's van vensters van andere sites.
  De site toont zelf geen frames en opent geen vensters, dus niets breekt (gecontroleerd met `git grep`).
  Het Lighthouse-rapport van 6 november 2026 meldde beide ontbrekende headers.
- **Gemeten:** `src/proxy.test.ts` en de rooktest controleren de drie op een pagina, een bestand onder `/_next`, de 404 en een pagina van het beheer.
- **Alternatieven:** alleen voor `/beheer` (verworpen: eenvoudiger en veiliger voor alles, niets frameet ons).
  `X-Frame-Options: SAMEORIGIN` (verworpen: we framen onszelf niet).
  Headers via `.htaccess` of `next.config.ts` (verworpen: de headers staan al in de proxy en blijven op één plek).
- **Let op:** niet in dit besluit: `Strict-Transport-Security`, want HTTPS en zijn headers zijn van de host.

## Eerst meten, bestanden zonder hash een korte cache, pagina's niets voor tussenstations

- **Datum:** 7 november 2026
- **Besluit:** de antwoordtijd is gemeten vanuit Nederland (zie `docs/prestaties.md`, onder _Waar de antwoordtijd zit_) en bijna alles daarvan is afstand en host: een pagina komt 10 tot 15 ms later dan een bestand van dezelfde host, de eerste byte is 36 tot 54 ms, en het tellen van bezoeken kost niets merkbaars, want het gebeurt na het antwoord (#799).
  Daarom is er niets aan de pagina's veranderd.
  - **Bestanden zonder hash:** de bestanden in `public/` krijgen via `headers` in `next.config.ts` een korte cache: de pictogrammen en het plaatje voor gedeelde links een dag (`public, max-age=86400`), `theme.js` een uur (`public, max-age=3600`).
    `src/cache-headers.ts` heeft de lijst en een test eist een regel voor elk bestand in `public/`.
  - **Wat al goed was:** `/_next/static`, met de scripts, de stijlen en de lettertypes, heeft `public, max-age=31536000, immutable` van Next.js.
    Dat blijft zoals het is.
  - **Pagina's:** geen `s-maxage`, `stale-while-revalidate` of `public`.
    De beheerpagina's houden `no-store` van de proxy.
    De rooktest controleert beide, en dat `/_next/static` een jaar en `immutable` houdt.
- **Waarom:** een cache vóór de site laat de proxy niet draaien, dus bezoeken tellen niet meer (`/beheer/bezoek` klopt dan niet), we weten niet of de host zo'n cache heeft, en nieuws moet snel op de site staan.
  De 800 ms van het rapport was afstand vanuit de VS.
  Een bestand zonder hash kan onder hetzelfde adres veranderen, dus het krijgt geen jaar en geen `immutable`.
  `theme.js` blokkeert het tekenen: met `max-age=0` wacht elke pagina op de vraag of het bestand veranderd is.
- **Alternatieven:** een korte `s-maxage` (onderschat het aantal bezoeken, en helpt alleen met een cache die we niet kennen); de pagina's statisch maken (de koppen komen uit de database en ISR en `'use cache'` vielen eerder af); de cache van de bestanden in de proxy zetten, zoals de beveiligingsheaders (die zijn een besluit per verzoek, dit is een vaste lijst per pad, en `headers` in `next.config.ts` is wat Next.js daarvoor biedt); een jaar en `immutable` voor `theme.js` en de pictogrammen (een wijziging bereikt een bezoeker dan een jaar niet).
- **Later:** dit raakt _Geen frames en geen vensters met een opener: `frame-ancestors 'none'`, `X-Frame-Options: DENY` en COOP `same-origin`_ (6 november 2026) niet: die headers blijven in de proxy.
  De cache van bestanden staat in `next.config.ts`, omdat het een lijst per pad is.

## De bouw weet welke browsers we ondersteunen: een `browserslist` gelijk aan Baseline 'widely available'

- **Datum:** 7 november 2026
- **Besluit:** `apps/site/package.json` heeft een `browserslist` met de oudste versies van de vier browsers die op 7 november 2026 in Baseline 'widely available' vallen: Chrome en Edge 124, Firefox 125 en Safari en iOS Safari 17.4 (#802).
  Het ontwerpsysteem zegt in `package.json` dat alleen zijn CSS bijwerkingen heeft (`"sideEffects": ["**/*.css"]`), zodat een pagina de code van onderdelen die ze niet gebruikt, niet laadt.
  - **De grens:** een functie is 'widely available' als alle grote browsers haar minstens 30 maanden hebben, dus de oudste versies zijn die van 30 maanden geleden: van vóór 7 mei 2024.
    Dat zijn Chrome 124 (16 april 2024), Edge 124 (18 april 2024), Firefox 125 (16 april 2024) en Safari 17.4 (5 maart 2024); de volgende versies kwamen op 13 en 14 mei 2024, dus die vallen er niet in.
    Op een andere dag schuift de lijst op: wie hem verandert, rekent opnieuw vanaf die dag en past de test `src/browserslist.test.ts` aan.
  - **Geen bewaking:** de lijst is de opdracht aan de bouw om weg te laten wat die browsers niet nodig hebben.
    De linters bewaken nog altijd wat we schrijven (zie _Alleen Baseline 'widely available', bewaakt door linters_ in `werkruimte.md`).
  - **Wat de lijst opbrengt:** bijna niets.
    Next.js zet zijn eigen polyfills (`Array.prototype.at`, `flat`, `Object.hasOwn` en vier andere, 1,4 KiB) altijd in het hoofdbestand, ook met een lijst die ze niet nodig heeft; met `chrome >= 60` blijft hij gelijk en wordt de rest een KiB groter.
    De 13 KiB aan "verouderde JavaScript" in het rapport van Lighthouse is zijn schatting voor het bestand van `react-dom` waarin die regels staan; de regels zelf zijn 1,4 KiB.
  - **De meting met de analyse van Next.js:** `@next/bundle-analyzer` werkt alleen met webpack, en de site bouwt met Turbopack, dus de meting gebruikt `next experimental-analyze --output`, dat in Next.js zit en niets toevoegt.
    De homepage laadt 153,9 KiB JavaScript (gecomprimeerd, in een lokale build).
    Daarvan is 134,2 KiB van React en Next.js: `react-dom` 71,1 KiB (het grootste stuk), de client van Next.js 37,2 KiB, de hulpcode van Next.js 8,8 KiB, de server-aanroepen 9,3 KiB, de uitvoeromgeving 5,0 KiB en de foutpagina 2,8 KiB.
    Onze eigen code is 18,5 KiB: de navigatie en de themaknop 10,6 KiB, de kaart met het deelplaatje en de aanwijzer van de staafjes 5,2 KiB, en de rest 2,7 KiB.
  - **Wat de pagina's laadden:** elk bestand van het ontwerpsysteem dat `'use client'` heeft, stond in de lijst van elke pagina, omdat `index.ts` alles opnieuw exporteert en de bouw niet weet dat de rest zonder bijwerkingen is.
    Met `sideEffects` weet hij dat, en de homepage laadt nu 5,3 KiB minder (van 159,2 naar 153,9 KiB, 3,3%).
- **Waarom:** zonder lijst neemt Next.js de standaard (Chrome 111, Safari 16.4), die ruimer is dan ons beleid.
  De projecteigenaar koos voor dezelfde grens als het beleid.
- **Geen 25% minder:** het issue vroeg minstens 25% minder JavaScript op de homepage, en dat is niet haalbaar.
  De projecteigenaar koos op 7 november 2026 voor het criterium dat de `browserslist` en `sideEffects` gedaan en gemeten zijn, dat de oorzaak van het gewicht in de pull request en in `docs/prestaties.md` staat, en dat TBT onder 50 ms blijft (nu 2 ms).
  Er worden geen onderdelen omgebouwd.
  Ook zonder een enkel eigen onderdeel is de bodem 134,2 KiB, 16% minder dan de 159,2 KiB van de meting vooraf, want 134,2 KiB is `react-dom` en de client van Next.js.
- **Meting vooraf en achteraf** (Lighthouse 13.6.0, de opdracht van `docs/prestaties.md` op een lokale build, mediaan van drie runs): JavaScript 159,2 KiB na 153,9 KiB, TBT 2 ms voor en na, prestaties 100, CLS 0,000.
  De waarde van de homepage in `.github/lighthouse.json` gaat 5,3 KiB omlaag, van 151,8 naar 146,5 KiB.
- **Alternatieven:** de standaard van Next.js houden (de meeste polyfills blijven niet door deze lijst maar door Next.js zelf); een lijst met een vaste grens zoals de laatste twee versies (een ander beleid dan we besloten); de themaknop, de navigatie en `PullToRefresh` omzetten naar servercomponenten of ze later laden (geeft hooguit 10 KiB, en verandert het gedrag of de toegankelijkheid van onderdelen die elke bezoeker gebruikt).
- **Later:** dit vervangt het deel van _Alleen Baseline 'widely available', bewaakt door linters_ in `werkruimte.md` (21 oktober 2026) dat een `browserslist` verwerpt.

## De pagina van een wedstrijd staat op `/wedstrijden/<seizoen>/<datum>-<club>`, en alleen voor een verslag dat klaar is en klopt

- **Datum:** 7 november 2026
- **Besluit:** het adres heeft altijd het seizoen, ook voor het lopende seizoen, en de datum van de wedstrijd en de `slug` van de tegenstander, zoals `/wedstrijden/2026-27/2026-11-01-fc-twente` (#831).
  De pagina bestaat als het verslag de status `klaar` heeft en de regels van `@fansite/shared/match-report` geen fout geven.
  In elk ander geval is het adres "niet gevonden".
  De regel van een wedstrijd op Wedstrijden is alleen een link als de pagina bestaat.
- **Waarom:** een wedstrijd zonder verslag heeft niets te melden dat Wedstrijden niet al zegt, en een pagina die half klopt is erger dan geen pagina.
  Datum en club blijven leesbaar in een adres en botsen niet met `/wedstrijden/<seizoen>`.
- **Alternatieven:** het nummer van de wedstrijd in het adres (niet te lezen en niet te raden); een pagina voor elke gespeelde wedstrijd (dat zijn er honderden die leeg zouden zijn).
- **Keuzes bij het bouwen** (7 november 2026):
  - **Wat de pagina controleert:** `getPublicReports` leest de verslagen van een seizoen met status `klaar` en laat de regels over elk verslag lopen.
    Een verslag dat sinds het opslaan niet meer klopt, bijvoorbeeld omdat de import de uitslag veranderde, heeft geen pagina en geen link, en staat niet in de sitemap.
    De lezingen worden net als de wedstrijden bewaard: vijf minuten voor het lopende seizoen, een uur voor een seizoen dat voorbij is.
  - **De link:** de regel krijgt de link "Het verslag", met de clubs in de verborgen tekst, als laatste regel van de wedstrijd (`Match` heeft daarvoor `reportHref`).
    De sleutel is de competitie met de ronde, want dat is één wedstrijd in een seizoen.
    De scheidsrechter en het aantal toeschouwers staan nog steeds niet in de regel (#416).
  - **De onderdelen:** het ontwerpsysteem krijgt `MatchHeader` (de clubs met de uitslag en de feiten), `MatchTimeline` (het verloop) en `MatchLineup` (de opstelling van één team).
    Ze nemen gewone gegevens en schrijven alles in woorden: de naam van de gebeurtenis ("Gele kaart", "Doelpunt uit een strafschop", "Wissel"), de minuut voor een schermlezer ("Minuut 45 plus 2") en wat een speler overkwam in een zin.
    Een kleur of een teken is nergens het enige teken.
  - **Een eigen doelpunt** heeft in het verloop het team van de speler die het maakte, zodat de regel zegt wiens speler het was; de uitslag telt het voor het andere team.
  - **De wissels bij de speler:** wie eruit gaat heeft "Gewisseld in de 61e minuut, vervangen door Jansen" en wie erin komt "Ingevallen in de 61e minuut voor Jansen".
    Het issue gaf "Gewisseld in de 61e minuut voor Jansen" als voorbeeld, maar die zin kan twee kanten op.
  - **De naam van een speler van ons** komt uit de persoon (voornaam en achternaam) of, zonder persoon, uit de zoekterm van de speler als achternaam.
    Een speler van de tegenstander is één naam in het gewone gewicht: we raden de delen niet.
  - **De tegenstander die niet af is** (`opponent_complete` uit) heeft in plaats van een opstelling één zin: "De opstelling van <club> hebben we niet."
    Wat we van hem hebben, zoals zijn doelpunten, staat wel in het verloop.
  - **De bron:** de pagina noemt in de zijbalk de eigen administratie (met de bron van het verslag erachter) en de bestaande vermelding van de Nederlandse Wikipedia, voor de uitslag, de aftrap en de doelpunten die Wikipedia ook heeft.
- **Later:** zie _De formatie staat op de pagina van de wedstrijd bij het team_ (7 november 2026): onder de naam van een team staat nu ook zijn formatie, als er een is.
- **Later:** zie _De wedstrijdpagina is optie B, "Het veld"_ en _De verlenging en de strafschoppenserie komen uit de wedstrijd, de schoten uit het verslag_ (7 november 2026): de pagina is opnieuw opgebouwd met het veld, de wissels, het verloop in helften en de strafschoppenserie, en de opstelling staat niet meer in lijsten per team (`MatchLineup`) maar op het veld, met de lijsten in een Disclosure.
- **Later:** zie _Een wissel is één regel met één pictogram: "A voor B"_, _De minuut in het verloop staat in een pil: gevuld voor sc Heerenveen, open voor de tegenstander_ en _Het verloop verdeelt de gebeurtenissen over de helften, en de kop krijgt de doelpuntenmakers per club_ in `designsysteem.md` (7 november 2026): `MatchTimeline` heeft twee helften en een verlenging, één regel per gebeurtenis zonder het woord naast een pictogram dat hetzelfde zegt, en de minuut in een pil; de naam van het team staat alleen nog in de verborgen tekst, en "Doelpunt uit een strafschop" is nu "Doelpunt (strafschop)".
  `MatchHeader` heeft een pil met de uitkomst en de doelpuntenmakers per club.
  De regel onder de uitslag is nu één zin met een tussenstand erbij, zoals "Na verlenging (na 90 minuten 1–1)".
- **Later:** zie _De pagina bestaat ook voor een verslag dat nog niet klaar is, met de melding "We vullen dit verslag nog in"_ (7 november 2026): de pagina bestaat ook voor een verslag dat `bezig` is of niet meer klopt, met een melding, `noindex` en zonder plek in de sitemap; alleen een wedstrijd zonder verslag heeft geen pagina.
- **Later:** zie _De kaart Wedstrijden op home toont de vorige ontmoeting, de vorm van de tegenstander en de scheidsrechter_ (9 november 2026): de scheidsrechter staat in de regel van de kaart Wedstrijden op home.

## De pagina bestaat ook voor een verslag dat nog niet klaar is, met de melding "We vullen dit verslag nog in"

- **Datum:** 7 november 2026
- **Besluit:** de pagina van een wedstrijd bestaat voor elke gespeelde wedstrijd waarvan een verslag is begonnen, ook als het niet klaar is (#857).
  Een wedstrijd zonder verslag houdt geen pagina en geen link, zoals nu.
  Wat in het verslag staat, tonen we zoals het is; wat ontbreekt, laten we weg zonder lege plekken of nullen.
  - **De melding** staat boven op de pagina, boven de kop: "We vullen dit verslag nog in."
    Daarachter staat een zin die zegt dat de opstelling, de wissels of de gebeurtenissen nog kunnen ontbreken of veranderen.
    Ze staat in tekst, niet alleen in kleur of een pictogram, en is geen `status` (de pagina laadt er al mee).
    Ze verdwijnt zodra het verslag klaar is.
  - **Wanneer een verslag niet klaar telt:** bij de status `bezig`, en bij een verslag dat `klaar` was maar de regels van het verslag niet meer volgt, bijvoorbeeld nadat de import de uitslag veranderde.
  - **Wedstrijden en Uitslagen linken** naar de pagina zodra die bestaat, met dezelfde link "Het verslag" als bij een klaar verslag.
  - **Zoekmachines:** de pagina van een verslag dat niet klaar is, heeft `noindex`, staat niet in de sitemap en heeft een beschrijving die niets beweert over wat ontbreekt: "Wat we tot nu toe hebben van het verslag van ...: de uitslag was ...".
    De titel is die van een klaar verslag, want de uitslag staat vast.
  - **De cijfers** van de spelers en van het seizoen (#832) tellen alleen klare verslagen, zoals nu.
  - **Het voorbeeld in het beheer** (#851) toont dezelfde melding zolang de status van het formulier Bezig is.
- **Waarom:** de projecteigenaar wil een wedstrijd al kunnen openen terwijl het verslag wordt ingevuld; de pagina laat zien wat er is en zegt dat de rest nog komt.
- **Alternatieven:** de pagina pas tonen bij een klaar verslag (zo was het); de melding alleen bij de status `bezig` (een verslag dat niet meer klopt heeft dan een pagina die iets stelt wat niet zeker is).
- **Keuzes bij het bouwen** (7 november 2026):
  - **De lezers:** `listReportedMatches` en `findReportedMatch` geven een verslag met elke status, met de status in `stored.report.status`, en `isCompleteReport` in `src/report-data.ts` beslist of het klaar is en klopt.
  - **De gegevens:** `MatchPageData` heeft `complete`, en `MatchPageHeader` zet de melding boven de kaart van de kop, voor de pagina en voor het voorbeeld.
    Een rugnummer dat twee keer staat in een verslag dat nog wordt ingevuld, staat één keer op het veld.
    De balk Wedstrijdverloop staat er bij een klaar verslag altijd, en bij een verslag dat nog wordt ingevuld alleen als de doelpunten van het verslag optellen tot de uitslag: zo'n verslag kan minder doelpunten hebben, en een balk met 0–0 boven een wedstrijd die 2–0 eindigde, zou iets onwaars zeggen.
  - **De controle in de browser:** `pnpm test:a11y` heeft een verzonnen verslag dat `bezig` is (`e2e/incomplete-report.ts`), dat de controles voor het eerste testen in de database zetten en daarna weghalen, omdat een verslag dat `bezig` is de links op andere pagina's verandert.
- **Later:** vervangt _De pagina van een wedstrijd staat op `/wedstrijden/<seizoen>/<datum>-<club>`, en alleen voor een verslag dat klaar is en klopt_ (7 november 2026) waar die zegt dat de pagina alleen voor een klaar verslag bestaat: het adres, de `slug` en de sitemap voor klare verslagen blijven.
- **Later:** zie _Een wedstrijd die nog wordt gespeeld heeft een pagina met "Live" en een knop voor het einde_ (8 november 2026): de pagina bestaat ook voor een wedstrijd die nog `scheduled` is, vanaf zijn dag.
  Zijn titel en beschrijving noemen dan geen stand, want die verandert; alleen de titel "... 2–1 ..." van een wedstrijd met een uitslag blijft zoals hij was.

## Het voorbeeld van de wedstrijdpagina staat naast het formulier van het verslag

- **Datum:** 7 november 2026
- **Besluit:** het formulier van het verslag heeft een voorbeeld van de echte pagina ernaast, dat bij elke wijziging opnieuw wordt opgebouwd uit dezelfde onderdelen als de pagina (#851).
  Op een bureaublad staat het voorbeeld rechts (ongeveer 55 om 45) en blijft het staan bij het scrollen; op een telefoon zijn er twee tabs, Formulier en Voorbeeld.
  De gekozen tab wordt niet bewaard: de site bewaart geen keuzes van bezoekers, en wanneer dat verandert, is dat een beslissing van een eigen issue.
- **Waarom:** wie typt wil zien wat er uit komt zonder op te slaan.
- **Alternatieven:** een knop "Bekijk de pagina" die het verslag bewaart en de pagina opent (ook als het verslag nog niet klopt).
- **Keuzes bij het bouwen** (7 november 2026):
  - **Hetzelfde onderdeel als de pagina:** `ReportPreview` bouwt met `previewDataOf` (`src/beheer/report-preview.ts`) de gegevens van de pagina uit de waarden van het formulier en geeft ze aan `MatchPageView`, met `preview` aan.
    In een voorbeeld staan de koppen een niveau lager, is er geen `h1` en is geen kop een anker, omdat de pagina eromheen die al heeft.
  - **Een rij die nog niet af is, staat niet in het voorbeeld**: een doelpunt zonder minuut, een kaart zonder speler of een speler zonder rugnummer.
    Het voorbeeld toont wat klopt, en de fouten blijven bij het formulier, waar de regels van het verslag ze vinden.
    De stand en de balk tellen de doelpunten die erin staan.
    Een doelpuntenmaker die alleen met zijn naam is geschreven, staat in het verloop en in de kop, en niet op het veld.
  - **Het kader:** de regel in Verloop van het veld dat de beheerder het laatst veranderde, krijgt een kader (`highlighted` bij `MatchTimeline`).
    Het veld van een speler of van een knop geeft geen kader, en het kader blijft staan tot de volgende wijziging.
  - **De wedstrijd, niet het formulier:** de feiten, de verlenging, de stand na 90 minuten en de uitslag van een serie komen uit de wedstrijd (`previewMatchOf`).
    De strafschoppenserie staat er niet in: die komt met #852.
  - **Indeling:** `SideBySide` uit het ontwerpsysteem (zie _`SideBySide` zet twee delen van één taak naast elkaar_ in `designsysteem.md`).
    De tabs zijn een `SegmentedControl`, en wat niet getoond wordt, houdt `hidden`, zodat het formulier zijn waarden houdt.
    Een antwoord van de server, zoals een opslag met fouten of een rij die erbij komt, toont het formulier weer, in dezelfde render: de focus gaat naar een veld of naar de lijst met fouten, en een deel dat niet getoond wordt kan hem niet krijgen.
  - **Zonder JavaScript** heeft de pagina alleen het formulier, zoals nu: het voorbeeld en de tabs komen pas als de pagina in de browser leeft, en de pagina zegt dat niet.
  - **Alleen voorbeeld:** het voorbeeld bewaart niets en praat niet met de server.
    Het wacht even op de laatste toets (`useDeferredValue`), zodat typen nooit trager wordt.
    Het vak is geen `aria-live`: een schermlezer zou de hele pagina bij elke toets opnieuw lezen.
    Het is een gebied met een naam (de kop "Voorbeeld — Zo ziet de pagina eruit") dat met het toetsenbord te bereiken is.

## Het verslag is een eigen scherm bij de wedstrijd: `/beheer/wedstrijden/<nummer>/verslag`

- **Datum:** 7 november 2026
- **Besluit:** het verslag van een gespeelde wedstrijd vul je in op een scherm van zijn eigen, naast het formulier van de wedstrijd (#829).
  Het scherm heeft kopjes voor Gegevens (de bron, de status en of de tegenstander ook af is) en, voor sc Heerenveen en daarna voor de tegenstander, Opstelling en bank, Wissels, Doelpunten, Kaarten en Gemiste strafschoppen.
  De tegenstander is optioneel: "Is de kant van de tegenstander ook af?" zet `opponent_complete`.
  Een wedstrijd die niet bestaat of niet gespeeld is, geeft de pagina "niet gevonden".
  - **De lijst met wedstrijden** heeft een kolom Verslag met Leeg, Bezig, Klaar of Controleer, en een link naar het scherm; het formulier van de wedstrijd linkt er ook naartoe.
    Later: zie _De lijst met wedstrijden in het beheer heeft één link per regel, die volgt uit de staat_ (8 november 2026): de kolom heeft nu andere woorden en geen link meer.
  - **Rijen en knoppen:** elke lijst is een `InputTable` met een knop om een rij toe te voegen en een knop per rij om hem weg te halen, zodat het scherm zonder JavaScript werkt.
    Elk veld en elke knop noemt zijn rij ("Wissel 2, minuut"), en de eerste knop van het formulier is een verborgen "Opslaan", zodat Enter niets weghaalt.
  - **Een gebeurtenis wijst naar een speler met het nummer van zijn rij** in de lijst van zijn team (`3`), en een doelpunt wijst met het team en het nummer (`wij-3`), omdat de scorer van een eigen doelpunt bij het andere team staat.
    Haal je een speler weg, dan wissen de plekken die naar hem wezen en schuiven de nummers erachter op (`applyReportButton`).
    De keuzelijsten met spelers volgen de opstelling zoals ze getypt is: met JavaScript meteen, zonder JavaScript na elke knop en na elke keer opslaan.
  - **Een nieuw verslag** begint met elf lege rijen voor onze opstelling en met de doelpunten van de wedstrijd op naam, zodat de redacteur alleen hoeft te kiezen wie speelde.
    Een rij waar niets in staat, telt niet mee.
  - **Het veld Bron:** erboven staat in één zin wat erin hoort: de naam van wat je overtypt, nooit tekst van een verslag en geen hele tabellen van een site met statistieken.
- **Waarom:** het formulier van de wedstrijd gaat over de uitslag en de aftrap, het verslag is veel groter.
  Twee schermen houden beide klein, en een beheerder kan een wedstrijd opslaan zonder het verslag te raken.
- **Alternatieven:** alles in één formulier (honderd velden op één pagina, en elke kleine correctie bewaart ook het verslag).

## De doelpunten van een wedstrijd met een verslag bewerk je alleen in het verslag

- **Datum:** 7 november 2026
- **Besluit:** heeft een wedstrijd een verslag (in elke status), dan toont het formulier van de wedstrijd de doelpunten als tekst, zonder velden, met een link naar het verslag (#829).
  Het verslag schrijft de doelpunten naar `match_goals` en zet de markering `goals_edited`, met de vaste reden "Verslag van de wedstrijd".
  Er is geen veld voor een reden: een verslag in meerdere keren invullen kost dan bij elke keer een zin.
  - **Het formulier van de wedstrijd** laat de doelpunten dan zoals het verslag ze maakte, en slaat de aftrap en de uitslag op zoals altijd.
    Een wedstrijd met een verslag blijft gespeeld: de status veranderen kan pas als het verslag weg is.
  - **"Invoer weghalen"** zet de aftrap en de uitslag terug en laat de doelpunten en hun markering staan.
    Die haalt alleen "Verslag weghalen" weg.
  - **Wikipedia neemt de doelpunten over** (de afwijking die een beheerder beslist, of de import na zeven dagen): de doelpunten verliezen dan de speler van het verslag.
    Het verslag blijft, en de lijst zegt Controleer als het `klaar` was en niet meer klopt.
- **Waarom:** twee plekken om dezelfde doelpunten te bewerken maken verschillen die niemand ziet.
  De markering houdt de import van Wikipedia van de doelpunten af.
- **Alternatieven:** een reden bij elke keer opslaan (zoals de rest van het beheer), wat bij tientallen keren per seizoen vervelend is voor wat een gewone invoer is.
- **Later:** vult _De invoer van de redactie staat in de gewone tabellen, met een markering_ in `importer.md` aan: ook een verslag zet `goals_edited`, en de import houdt de spelers (`appearance_id`) van de doelpunten vast zolang de markering staat.
- **Later:** zie _Een wedstrijd die nog wordt gespeeld heeft een pagina met "Live" en een knop voor het einde_ (8 november 2026): een wedstrijd met een verslag is gespeeld, of wordt nog gespeeld (`scheduled`) en blijft dat tot de knop "Wedstrijd afgelopen" of de import hem een uitslag geeft; andere statussen kan het formulier nog niet zetten zolang het verslag er is.
- **Later:** zie _De doelpunten van een wedstrijd met een verslag zijn van het verslag_ in `importer.md` (11 november 2026): Wikipedia neemt de doelpunten van een wedstrijd met een verslag nooit meer over, niet door een beheerder en niet na zeven dagen.
  De startpagina van het beheer telt de verslagen die niet meer kloppen.

## Een speler kies je uit de selectie van het seizoen, of je voegt hem toe

- **Datum:** 7 november 2026
- **Besluit:** elke speler van sc Heerenveen in het verslag kies je uit een lijst met de selectie van het seizoen van de wedstrijd (rugnummer en naam), met de keuze Andere speler met een veld voor de naam (#829).
  Het rugnummer van de selectie is de standaard, maar het verslag heeft zijn eigen rugnummer, want het kan voor deze wedstrijd anders zijn.
  Een speler van de tegenstander is altijd een naam met een rugnummer.
  - **Bij opslaan** krijgt een speler die niet in de selectie staat een rij in `players` met bron `verslag`, of de rij die er al was met die naam (zonder hoofdletters te vergelijken).
    Dezelfde speler twee keer in een verslag geeft een fout bij de tweede rij, ook als de ene gekozen is en de andere met de naam is getypt.
  - **Bij een doelpunt zonder speler uit de lijst** vul je zijn naam in bij Andere naam.
    Zo blijft het doelpunt van Wikipedia staan met zijn naam, en past het verslag bij de uitslag, ook voor de tegenstander als zijn kant niet af is.
  - **Het zoekwoord** van een nieuwe speler (`search_term`) is zijn naam zonder de eerste naam, zoals de importer het maakt, maar zonder zijn lijst met voorvoegsels.
- **Waarom:** de selectie van Wikipedia loopt soms achter, en een verslag mag daar niet op wachten.
- **Alternatieven:** alleen de selectie (een verslag wacht dan op Wikipedia); elke speler als losse naam (dan kan het verslag geen cijfers per speler geven).
- **Later:** zie _De bank kiest uit wie niet in de basis staat_ (7 november 2026): een speler staat in het verslag één keer, in de basis of op de bank, en de keuzelijst van elke plek houdt daar rekening mee.
- **Later:** zie _Een rugnummer mag ontbreken_ in `hosting-en-data.md` (8 november 2026): een speler van de tegenstander is een naam, met of zonder rugnummer, en het rugnummer van een speler van ons mag leeg blijven zonder dat de selectie er een geeft.

## "Klaar" kan alleen zonder fouten, en een verslag dat later niet meer klopt, krijgt "Controleer"

- **Datum:** 7 november 2026
- **Besluit:** opslaan met status `bezig` kan altijd, als de gegevens zelf te bewaren zijn (#829).
  Opslaan met `klaar` doet alleen als de regels van #828 geen fout geven, en laat anders het verslag op `bezig` staan, met de fouten bij de velden en een melding bovenaan.
  Verandert de uitslag van Wikipedia daarna zo dat de doelpunten niet meer kloppen, dan blijft de status staan en toont de lijst Controleer en het scherm de fout, tot het is hersteld.
  - **Wat de gegevens zelf te bewaren maakt:** de database wil een minuut van 1 tot 120, blessuretijd van 1 tot 15 na minuut 45, 90, 105 of 120, een rugnummer van 1 tot 99 dat één keer in een team voorkomt, en een speler die één keer eruit en één keer erin gaat en elke soort kaart één keer krijgt.
    Een verslag dat daar niet aan voldoet, wordt niet bewaard, ook niet als `bezig`: de fout staat bij het veld en niets wordt opgeslagen.
    Voor het overige (een elftal van tien, een tweede aanvoerder, een assist van een speler die niet op het veld stond) bewaart het scherm het verslag als `bezig` en noemt de fouten.
  - **Controleer** wordt bij het lezen van de lijst en van het scherm uitgerekend uit de regels, en niet opgeslagen: de status in `match_reports` blijft `klaar`.
  - **Een opslag zonder verschil schrijft niets**, ook geen regel in het logboek en geen nieuwe tijd van `saved_at`.
    Het scherm vergelijkt het verslag met wat er staat (spelers, gebeurtenissen en doelpunten, met de plek van elke gebeurtenis).
  - **Waarschuwingen** (te veel wissels, een korte bank) staan bij hun lijst en houden niets tegen.
- **Waarom:** iemand moet een verslag kunnen onderbreken, en toch weet de lezer van de pagina (#831) alleen van een verslag dat klopt.
- **Alternatieven:** "klaar" ook met fouten laten opslaan en alleen waarschuwen (dan telt een verslag dat niet klopt mee in de cijfers); Controleer opslaan als status (een derde waarde die de import of een pagina moet bijhouden terwijl de regels het altijd kunnen uitrekenen).
- **Later:** zie _De kolom Verslag heeft gewone woorden_ (8 november 2026): de lijst zegt nu "Klopt niet" in plaats van Controleer.

## Het verslag weghalen zet de doelpunten terug

- **Datum:** 7 november 2026
- **Besluit:** "Verslag weghalen" haalt de rijen van het verslag weg en zet de doelpunten terug op wat Wikipedia zei voor de eerste invoer van de doelpunten, zoals het bestaande "Weghalen" van de invoer van een wedstrijd (#829).
  Het vraagt een reden, zoals elke weghaalactie, en schrijft `match.undo` in het logboek.
  - **Zonder markering** (Wikipedia had dezelfde doelpunten al overgenomen en de import had de markering gewist) blijven de doelpunten staan zoals ze zijn, zonder spelers.
  - **Een speler die voor het verslag aan `players` werd toegevoegd,** blijft in de selectie van het seizoen: hij kan in een ander verslag staan, en de selectie is geen werk van dit scherm.
  - **Een afwijking van Wikipedia over de doelpunten** die nog wachtte, vervalt, omdat de doelpunten weer volgen wat Wikipedia zegt.
- **Waarom:** een verslag dat je weghaalt moet geen stukken van zichzelf achterlaten die de pagina's als doelpunt blijven tonen.
- **Alternatieven:** de doelpunten van het verslag laten staan met de markering (de import blijft ze dan afhouden van Wikipedia, terwijl het verslag weg is).

## Plakken vult het formulier in, het bewaart niets

- **Datum:** 7 november 2026
- **Besluit:** op `/beheer/wedstrijden/<nummer>/verslag/plakken` plakt de beheerder een tekst en krijgt het formulier van het verslag terug met alles ingevuld en wat de site niet kon lezen gemarkeerd (#830).
  De ingang is de kaart "Tekst plakken" in de zijbalk van het scherm van het verslag.
  Wat er dan staat, bewaart hij met dezelfde knop en dezelfde controle als bij een verslag dat hij met de hand invulde (`submitReport`).
  Plakken schrijft niets: niet het verslag, niet de doelpunten, niet de selectie en niet het logboek, en de tekst wordt nergens bewaard.
- **Waarom:** één controle en één plek waar iets wordt bewaard, dus geen tweede manier om een fout verslag in de database te krijgen.
  Een fout in de tekst kost een correctie in het formulier, geen nieuwe tekst.
- **Alternatieven:** de tekst direct bewaren (de controle zou dan twee keer bestaan); alleen een voorbeeld tonen en de tekst bewaren zonder formulier (een kleine fout betekent alles opnieuw plakken).
- **Keuzes bij het bouwen** (7 november 2026):
  - **Eén actie voor het hele scherm:** `submitPaste` beantwoordt de twee posts van het scherm, de tekst en daarna het formulier van het verslag, en heeft daarvoor één `useActionState`.
    Met een tweede hook voor het formulier valt een post zonder JavaScript terug op het lege veld voor de tekst, omdat het antwoord dan bij een hook hoort die niet draait.
    De post van het formulier is `submitReport` van het scherm van het verslag, en zijn antwoord vervangt het formulier in dezelfde staat.
    Het werkt zonder JavaScript.
    De lijst "Niet gelezen" en de keuzes staan in een kaart boven het formulier die de focus krijgt, en elke twijfel staat ook als fout bij zijn veld, omdat de controle van het formulier "kies een speler" al zegt.
    Een fout in het veld voor de tekst of bij het vakje om te vervangen staat in een lijst van fouten die de focus krijgt, zoals bij het formulier.
  - **De waarden die het formulier krijgt:** de status is `bezig`, de bron blijft die van het verslag dat er al is, en de kant van de tegenstander staat op ja als de tekst elf spelers in zijn opstelling heeft.
    De controle van het formulier loopt over wat er staat, dus wat nog ontbreekt (zoals doelpunten die niet kloppen met de uitslag) staat meteen als fout bij het veld.

## Het formaat is een tekst met kopjes, een regel per speler of gebeurtenis, en zo weinig tekens als kan

- **Datum:** 7 november 2026
- **Besluit:** de tekst heeft kopjes, elk op een eigen regel, voor onze kant (`Opstelling`, `Bank`, `Wissels`, `Doelpunten`, `Kaarten`, `Strafschoppen`) en daarna `Tegenstander` met dezelfde kopjes (#830).
  Een kopje dat ontbreekt, is leeg, en hoofdletters en de volgorde van de kopjes doen er niet toe.
  Elke regel is een speler of een gebeurtenis:
  - `Opstelling` en `Bank`: `<rugnummer> <naam>`, en `(a)` achter de naam van de aanvoerder, zoals `4 Van Aken (a)`.
    Voor onze kant volstaat een rugnummer van de selectie van het seizoen.
  - `Wissels`: `<minuut> <in> voor <uit>`, zoals `61 12 voor 8` of `90+2 Smit voor Jansen`.
  - `Doelpunten`: `<minuut> <scorer>` met `assist <naam>`, `strafschop` of `eigen doelpunt` erachter (`penalty` blijft ook gelezen worden).
    Onder het kopje van een kant staan de doelpunten die die kant kreeg.
    Bij een eigen doelpunt is de naam een speler van de andere kant: `70 Jansen eigen doelpunt` onder onze kant is een eigen doelpunt van de tegenstander.
  - `Kaarten`: `<minuut> geel|geel-rood|rood <naam>`, zoals `34 geel Jansen`.
  - `Strafschoppen`: `<minuut> gemist|gestopt <naam>`.
  - Een naam mag een rugnummer zijn, en een regel die met `#` begint, is commentaar.
- **Waarom:** de beheerder typt dit uit een bron die hij naast zich heeft, en elk teken dat niet hoeft, kost een fout.
- **Keuzes bij het bouwen** (7 november 2026):
  - **De regels van de lezer:** `readPastedReport` neemt de tekst, de selectie en wat het verslag al als bron had, en geeft de waarden van het formulier, wat elke regel werd, de keuzes en de regels die niet te lezen waren.
    Het leest eerst alle spelers, want een wissel, kaart of doelpunt kan boven of onder hen staan.
  - **Een kopje boven de eerste regel ontbreekt:** een regel zonder kopje is "niet gelezen", want niets zegt waar hij bij hoort.
  - **Een speler van de bank is geen aanvoerder:** het formulier kent die keuze niet (de rol is basis, basis en aanvoerder, of bank), dus `(a)` bij de bank is "niet gelezen".
  - **Een doelpunt van de tegenstander zonder opstelling:** staat de opstelling van de tegenstander niet of niet af in de tekst (minder dan elf spelers), dan is de naam van zijn scorer genoeg en komt hij in het veld "Andere naam".
    Is zijn kant af, dan moet de scorer in zijn opstelling staan.
  - **Een eigen doelpunt:** de scorer wordt gezocht aan de andere kant dan het kopje waaronder de regel staat, en het formulier krijgt `eigen`.
  - **Grenzen:** de tekst is hoogstens 20.000 tekens en er worden hoogstens 500 regels gelezen; een naam heeft hoogstens 100 tekens.
    Een regel in de lijst "Niet gelezen" toont hoogstens 120 tekens.
    Alles wat de lezer terugschrijft is tekst; React schrijft het uit en er is geen opmaak.
- **Later:** zie _De formatie staat in een keuzelijst met Anders, en de regel "Formatie: 4-3-3" leest het plakscherm met dezelfde regel_ (7 november 2026): het formaat heeft een regel voor de formatie erbij.
- **Later:** zie _Een rugnummer mag ontbreken_ in `hosting-en-data.md` (8 november 2026): een regel onder `Opstelling` of `Bank` die niet met een getal begint, is een speler zonder rugnummer, zoals `Van Aken (a)`.
- **Later:** het woord achter een strafschop is `strafschop`; `penalty` blijft ook gelezen worden (zie _Een strafschop heet strafschop of str., nooit pen. of penalty_ in `redactie.md`, 8 november 2026).

## Een naam wordt eerst op rugnummer gezocht, dan op de naam, en een twijfel is een keuze, geen gok

- **Datum:** 7 november 2026
- **Besluit:** een speler van ons komt eerst via zijn rugnummer in de selectie van het seizoen, dan via de volledige naam, dan via de zoekterm (de achternaam, `search_term`, zonder hoofdletters en accenten) (#830).
  Is er niet precies één speler, dan staat hij in het formulier als "kies een speler", met de gevonden namen onder "Kies een speler" in de kaart boven het formulier.
  Een regel die niet te lezen is, komt in een lijst "Niet gelezen" met zijn regelnummer en de reden, en verandert niets.
  Er wordt nooit een speler aan de selectie toegevoegd zonder dat de beheerder dat zelf kiest.
- **Waarom:** precisie.
  Een speler die verkeerd wordt gekoppeld is erger dan een veld dat leeg blijft, want niemand ziet het.
- **Keuzes bij het bouwen** (7 november 2026):
  - **Rugnummer en naam samen:** staan er een rugnummer en een naam, dan telt het rugnummer als de naam bij die speler past: de hele naam, de achternaam, of hele woorden van zijn naam (`Joost` of `Aken` bij Joost van Aken).
    Een stuk van een woord telt niet: `Voskuilen` past niet bij een Vos.
    Past de naam bij een andere speler of bij niemand, dan zijn het twee spelers of een twijfel, en kiest de beheerder.
  - **Een speler die niet in de selectie staat:** het formulier krijgt "kies een speler" met de naam in het verborgen veld, dus "Andere speler" kiezen laat de naam zien.
    De beheerder voegt hem toe door dat te kiezen en op te slaan, zoals bij een verslag dat hij met de hand invulde; het scherm doet dat nooit zelf.
  - **Een verwijzing in een regel** (de speler van een wissel, kaart, strafschop, doelpunt of assist) zoekt in de opstelling en de bank van het verslag zelf: op rugnummer, dan op de naam, dan op de achternaam.
    Meer spelers is een keuze, geen speler is "niet gelezen" (bij de assist een keuze, want de rest van het doelpunt klopt).
  - **De achternaam van een speler uit de selectie** is zijn zoekterm; zonder zoekterm is het de laatste woorden van de naam vanaf het eerste woord in kleine letters (`van Aken`), en anders het laatste woord.

## Wie plakt, vervangt het hele verslag in het formulier, na een waarschuwing

- **Datum:** 7 november 2026
- **Besluit:** staat er al iets in het verslag, dan vraagt het scherm eerst of het vervangen mag, met wat er nu is (het aantal spelers, wissels, kaarten en strafschoppen) en een vakje dat de beheerder aanvinkt (#830).
  Het verslag in de database verandert pas bij opslaan.
- **Waarom:** een tekst die half in het formulier staat, is een verslag dat niemand heeft nagekeken.
  Eén bevestiging voor het plakken is minder werk dan een verslag dat per ongeluk uit het formulier verdwijnt.
- **Keuzes bij het bouwen** (7 november 2026):
  - **Zonder verslag** vraagt het scherm niets, ook al staan de doelpunten van Wikipedia in het formulier: die vervangt het plakken ook, en het verslag in de database verandert toch niet.
  - **Zonder JavaScript** is de bevestiging een vakje dat het scherm bij een fout aangevinkt laat staan, samen met de tekst.

## De kaarten Assists, Minuten en Alle spelers lezen alleen de verslagen, en zeggen hoeveel wedstrijden ze tellen

- **Datum:** 7 november 2026
- **Besluit:** `/spelers` krijgt drie kaarten met cijfers uit de verslagen van #828, die #493 vroeg (#832): de ranglijsten Assists en Minuten en de tabel Alle spelers.
  Ze tellen alleen de wedstrijden die een verslag met status `klaar` hebben, in de competities die de schakelaar van #406 kiest, en zeggen het onder de kaart: "Op basis van 12 van de 14 gespeelde wedstrijden."
  Hebben alle gespeelde wedstrijden een verslag, dan staat er "Op basis van alle 14 gespeelde wedstrijden."
  - **Een seizoen zonder verslag dat `klaar` is,** heeft de kaarten niet en geen zin erover; de balk "Op deze pagina:" heeft er dan ook geen links naar.
    Heeft het seizoen wel een verslag, maar niet in de gekozen competitie, dan blijven de kaarten staan met "Er is nog geen assist in de verslagen" en "Op basis van 0 van de 12 gespeelde wedstrijden", zodat de pagina niet verspringt als je de schakelaar omzet.
  - **Waar ze staan:** Alle spelers staat in de hoofdkolom onder de Selectie, want de tabel is breed.
    Assists en Minuten staan achteraan in de zijkolom, voor de bronvermelding.
    De balk noemt ze in die volgorde.
  - **De ranglijsten** hebben de top 5, met alle spelers die een plek delen, zoals de doelpuntenmakers: wie evenveel heeft, deelt de plek en de volgende plek wordt overgeslagen.
    Een speler zonder assists of zonder minuten staat er niet in, en bij gelijke aantallen telt de achternaam.
  - **De tabel** heeft een rij voor elke speler die in een verslag stond, dus ook een speler van de bank die niet inviel, met nullen.
    De volgorde is minuten en dan achternaam.
    De kolommen zijn G gespeeld (ook als invaller), B basis, I invallers, M minuten, D doelpunten, A assists, Y geel en R rood; een geel-rode kaart telt als een gele en een rode, en dat staat onder de tabel.
    De minuten zijn vet, want de lijst is erop gesorteerd.
  - **De letters** komen uit `tableColumns`, dat er zes bij krijgt (B, I, M, A, Y en R); A was gereserveerd voor deze tabel.
    G is al gelijk en gespeeld, dus de gele kaarten hebben Y.
  - **De bron:** onder elke kaart en onder het plaatje staat "Bron: eigen administratie".
    Daarmee loopt deze kaart vooruit op de bronvermelding van #831: zodra die er is, neemt de pagina die over.
  - **Een geel-rode kaart en een rode kaart** tellen als de kaarten die ze zijn; de minuten van een speler die eruit ging of werd weggestuurd, zijn die van `minutesPlayed` (zie _Minuten gespeeld tellen op de klok, in hele minuten_ in `hosting-en-data.md`).
- **Waarom:** de lezer moet weten hoe compleet een cijfer is, en een seizoen waarvan we de helft hebben, mag toch iets tonen.
  Zo kunnen oudere seizoenen later volgen zonder dat een kaart verandert.
- **Alternatieven:** alleen tonen als elke wedstrijd een verslag heeft (de kaart blijft dan maanden weg); stilzwijgend de cijfers van Wikipedia aanvullen (twee bronnen in één getal); een eigen letter voor geel en rood die op G en R lijkt (G is al twee woorden).
- **Later:** vervangt de kaarten die #493 vroeg, en vult _De cijfers van een speler staan in een eigen tabel, per seizoen en competitie_ in `importer.md` aan.

## De cijfers van Wikipedia blijven een controle op onze verslagen, en een verschil gaat naar het logboek

- **Datum:** 7 november 2026
- **Besluit:** de kaarten van #832 lezen `player_season_stats` niet, maar de doelpunten ervan worden vergeleken met die van de verslagen, en een verschil gaat in het logboek van het beheer (#832).
  Het is een regel `player.stats-differ` met de speler (`item_id`) en de tekst "Doelpunten Eredivisie 2026/27: verslagen 1, Wikipedia 2"; de pagina's tonen het niet.
  - **Wanneer:** op twee momenten waarop een verschil kan ontstaan (`logReportGoalDifferences` in `@fansite/db/match-reports`): als de importer nieuwe cijfers in de tabel van de selectie zet (zonder account, "de import"), en als de redactie een verslag met status `klaar` opslaat (met het account van de redacteur).
    Het logboek wordt alleen aangevuld en door geen code gelezen (een test bewaakt het), dus de functie kan niet zien wat er al staat: zonder gebeurtenis schrijft ze niets, en elke gebeurtenis schrijft een regel per speler die afwijkt.
  - **Alleen als het te vergelijken valt:** elke gespeelde wedstrijd van de competitie heeft een verslag dat `klaar` is.
    Mist een verslag, dan hebben de verslagen vanzelf minder doelpunten, en dat is geen nieuws.
    Een speler die de tabel niet heeft, telt daar 0 doelpunten.
  - **Een fout bij het schrijven** is bij de import een waarschuwing en stopt hem niet.
  - **De migratie** `0046_add_player_stats_differ_audit_action` zet de actie in de lijst van `audit_log.action`.
    Ze voegt alleen een waarde toe en kan opnieuw draaien.
- **Waarom:** de nieuwe bron wint omdat hij preciezer is, en de cijfers van Wikipedia zijn een controle op onze invoer.
  Een verschil is voor de redactie, niet voor de bezoeker.
- **Alternatieven:** het verschil op de pagina tonen (de bezoeker kan er niets mee); de vergelijking bij elke aanvraag van de pagina doen (een bezoeker laat de database schrijven); bij elke lezing van de importer schrijven en zelf bijhouden wat er al staat (het logboek wordt niet gelezen, dus elke run zou het herhalen); vergelijken ook als een verslag ontbreekt (een regel per speler die niets zegt).
- **Later:** sinds #974 gaat het verschil niet meer naar het logboek maar naar `player_stat_differences`, waar de redactie het beslist; zie _Een verschil in de cijfers van een speler staat in een eigen tabel_ in `importer.md` (9 november 2026).
  De vergelijking zelf, en wanneer een competitie te vergelijken valt, blijven zoals hier staat.

## De bank kiest uit wie niet in de basis staat

- **Datum:** 7 november 2026
- **Besluit:** een speler staat in het verslag óf in de basis óf op de bank, en de keuzelijsten van het scherm "Opstelling en bank" en "Wissels" houden daar rekening mee (#838).
  - **Een plek op de bank** toont de spelers van de selectie die niet in de basis staan, en een speler die al op de bank staat, is op een andere plek van de bank niet meer te kiezen.
  - **Een plek in de basis** toont de spelers die niet al in de basis staan, dus ook een speler van de bank.
    Kies je hem, dan wordt zijn plek op de bank leeg gemaakt.
    Een schermlezer hoort dat in een melding die niet te zien is (`role="status"`).
  - **De lijsten volgen de basis:** met JavaScript veranderen ze meteen als de basis of een rol verandert.
    Zonder JavaScript maakt de server ze opnieuw na elke knop en elke keer opslaan, en een speler die dan toch twee keer staat, geeft bij het opslaan een fout bij het veld ("Speler 3 staat al in het verslag, bij Speler 3").
  - **Bij een wissel** toont "Erin" alleen de spelers met de rol Bank, en "Eruit" iedereen die in het verslag staat: wie erin komt, zat op de bank.
    **Later:** zie _De lijst Erin zegt waarom hij leeg is_ (7 november 2026): staat er niemand op de bank, dan zegt het scherm dat bij het veld.
    **Later:** zie _De lijsten van het verslagformulier volgen de opstelling en staan op volgorde_ (10 november 2026): "Eruit" toont met JavaScript alleen wie op dat moment op het veld staat.
  - **De tegenstander** heeft geen keuzelijst, want zijn spelers zijn namen.
    Dezelfde naam twee keer in zijn verslag, ook met andere hoofdletters, geeft dezelfde fout.
  - **Het plakscherm** (#830) leest een speler die twee keer in de tekst staat één keer, en meldt de tweede regel als niet gelezen.
  - **De regels van #828** veranderen niet.
- **Waarom:** de lijst van een plek op de bank liet alle spelers van de selectie zien, ook die in de basis stonden, zodat de bank met een speler uit de basis gevuld kon worden.
  De regels vingen dat pas bij het opslaan op.
- **Alternatieven:** alleen bij het opslaan een fout geven (de beheerder ziet pas daar dat de lijst fout was); een aparte lijst voor de bank in plaats van een rol bij elke speler (een verslag met twee tabellen die elkaar moeten kennen, en een speler verplaatsen vraagt dan weghalen en opnieuw invullen).

## De lijst Erin zegt waarom hij leeg is

- **Datum:** 7 november 2026
- **Besluit:** de lijst "Erin" van een wissel toont altijd de spelers met de rol Bank van dat team, zoals ze nu in het formulier staan, en zegt bij het veld waarom hij leeg is als niemand op de bank staat (#856).
  Dat geldt voor sc Heerenveen en voor de tegenstander, met en zonder JavaScript, en ook als de bank net is ingevuld en het verslag nog niet is opgeslagen.
  - **Staat er geen bank**, dan heeft de keuzelijst de tekst "Niemand op de bank" in plaats van "Kies een speler", en staat boven de tabel van de wissels een tekst met een link.
    Hij zegt "Bij sc Heerenveen staat niemand met de rol Bank, dus de lijst Erin is leeg." en daarna "Zet eerst een speler op de bank, bij Opstelling en bank."
    De link gaat naar de kop van Opstelling en bank van dat team, die de focus krijgt.
    De zin staat er alleen als het team een wissel heeft: zonder wissel is er geen lijst om uit te leggen.
  - **De regels van #838** blijven: de bank toont geen spelers uit de basis, en een speler staat niet dubbel.
- **Waarom:** een nieuwe rij van de opstelling heeft de rol Basis, dus een speler die de beheerder bij "Opstelling en bank" invult maar op Basis laat staan, is geen speler van de bank.
  De lijst Erin was dan leeg zonder dat het scherm zei waarom.
  De zin staat bij het veld, want daar kijkt de beheerder naar.
- **Alternatieven:** de lijst Erin weer alle spelers laten tonen (dan kan een wissel iemand brengen die niet op de bank zat, en de regels vangen dat pas bij het opslaan op); de keuzelijst uitzetten als de bank leeg is (een uitgezet veld wordt niet meegestuurd, dus een eerder gekozen speler gaat verloren); de rol van een nieuwe rij standaard op Bank zetten (de eerste elf rijen zijn dan de basis en alleen de nieuwe rijen de bank, wat bij een tweede rij in de basis weer verkeerd is).
- **Later:** vult de vorige beslissing aan: bij een wissel toont "Erin" alleen de spelers met de rol Bank, en zegt zelf waarom hij leeg is.
- **Later:** zie _De lijsten van het verslagformulier volgen de opstelling en staan op volgorde_ (10 november 2026): een nieuwe rij van de opstelling heeft vanaf rij 12 de rol Bank, bij beide teams.

## De formatie staat in een keuzelijst met Anders, en de regel "Formatie: 4-3-3" leest het plakscherm met dezelfde regel

- **Datum:** 7 november 2026
- **Besluit:** bij de opstelling van elk team in het formulier van het verslag staat een keuzelijst voor de formatie, met "Geen formatie", de gebruikelijke formaties (`formationChoices`: 4-3-3, 4-4-2, 4-2-3-1, 3-5-2, 3-4-3, 4-1-4-1, 4-3-1-2, 4-4-1-1, 4-5-1, 5-3-2, 5-4-1 en 3-4-2-1) en "Anders" (#840).
  Bij "Anders" hoort een tekstveld voor een eigen formatie, dat met `formationProblem` wordt gecontroleerd.
  Het plakscherm leest een regel "Formatie: 4-3-3" onder het kopje van een team met dezelfde regel.
- **Waarom:** de lijst voorkomt tikfouten bij de formaties die bijna altijd voorkomen, en "Anders" houdt een eigen formatie mogelijk zonder een tweede regel.
- **Alternatieven:** alleen een tekstveld (elke tikfout is dan een fout); alleen de lijst (een formatie als 4-1-2-1-2 kan dan niet).
- **Keuzes bij het bouwen** (7 november 2026):
  - **Zonder JavaScript** staat het tekstveld er altijd, want de pagina kan het niet laten verschijnen; met JavaScript staat het er alleen bij de keuze "Anders" (`hidden`, pas als de pagina live is).
    Het veld telt alleen bij die keuze: bij een formatie uit de lijst, of zonder keuze, laat het formulier de tekst staan zonder hem te lezen.
  - **Een eigen formatie die eerder is opgeslagen** komt terug onder "Anders" met zijn tekst; een formatie uit de lijst komt terug als die keuze (`formationValueOf`).
  - **De fouten:** elk veld heeft zijn eigen fout, met het team in de zin: `formatie-wij` voor een keuze die niet in de lijst staat, en `formatie-wij-eigen` voor de tekst (leeg bij "Anders", of een zin van de regel).
    Het formulier slaat een formatie die niet klopt niet op, ook niet als het verslag bezig is, want de database kan hem niet bewaren.
  - **Het plakscherm:** een regel "Formatie: ..." staat bij het kopje waaronder hij staat, of bij onze kant als hij boven het eerste kopje staat.
    Een waarde die de regel afkeurt, is een regel onder "Niet gelezen" met de zin van de regel, en geen stille keuze; een tweede formatie voor dezelfde kant ook.
    Een formatie van de lijst komt in het formulier als die keuze, een andere als "Anders" met zijn tekst.

## De formatie staat op de pagina van de wedstrijd bij het team

- **Datum:** 7 november 2026
- **Besluit:** de pagina van een wedstrijd toont de formatie van een team als een korte regel onder zijn naam, "Formatie: 4-3-3"; heeft het team er geen, dan staat er niets (#840).
  Het is eigen administratie, met dezelfde bronvermelding als de rest van het verslag.
- **Waarom:** de lezer ziet bij de opstelling hoe het team stond, zonder dat een verslag zonder formatie iets mist.
- **Keuzes bij het bouwen** (7 november 2026):
  - `MatchLineup` heeft een eigenschap `formation`, een tekst zonder eigen regels: de pagina geeft de waarde zoals het verslag hem bewaarde.
    De regel is een `Text` met de meta-uitvoering onder de kop met de naam van het team, zodat de kop alleen de naam is.
  - Een verslag met een formatie die de regels afkeuren (bijvoorbeeld na een wijziging buiten het formulier om), heeft geen pagina: `checkMatchReport` keurt hem af zoals elke andere fout.
- **Later:** zie _De wedstrijdpagina is optie B, "Het veld"_ (7 november 2026): `MatchLineup` bestaat niet meer en de formatie staat bij de naam van het team boven het veld ("4-3-3" naast de naam, en achter de naam in "Opstelling als lijst"), niet meer als de regel "Formatie: 4-3-3" onder de naam.

## De wedstrijdpagina is optie B, "Het veld"

- **Datum:** 7 november 2026
- **Besluit:** de pagina van een wedstrijd met een verslag volgt optie B uit het ontwerp "Wedstrijdpagina versie 4": de opstelling staat op een veld, en de ring om een speler toont zijn minuten (#850).
  De projecteigenaar koos uit drie opties: A een minuutas met banen per team (idee #853), B het veld, C een minutenbalk per speler (idee #854).
- **Waarom:** bij B zie je de opstelling meteen zoals op het veld, en de ring toont de minuten al, zodat een aparte minutenbalk niet nodig is.
- **Alternatieven:** A en C, die als ideeën bewaard zijn (#853, #854).
- **Keuzes bij het bouwen** (7 november 2026):
  - **De volgorde:** de kop met de doelpuntenmakers en de balk Wedstrijdverloop, de kaart Opstelling (het veld, de uitleg van de merken, de wissels van beide teams en "Opstelling als lijst"), de kaart Verloop, de kaart Strafschoppenserie als die er is, en de bronvermelding in de zijbalk.
    De `h1` is voor een schermlezer (visueel verborgen): de namen en de uitslag zijn wat het oog ziet.
    Elke kaart heeft een `h2`, en de teams, de helften en de wissels een `h3`.
  - **Eén onderdeel van de site** (`MatchPageView`, met `MatchPageHeader` en `MatchPageCards`) maakt de pagina uit gewone gegevens (`MatchPageData`), zodat het voorbeeld in het beheer (#851) hetzelfde onderdeel gebruikt.
    `buildMatchPage` rekent uit wat de onderdelen nodig hebben, en `matchPageDataOf` zet een bewaard verslag om in die gegevens.
  - **De volgorde van de spelers** is die van het formulier: de database bewaart de spelers in de volgorde van hun rijen, `readMatchReport` leest ze op `id`, en een test bewaart een andere volgorde dan die van de rugnummers.
    Het veld zet de eerste speler van een team als keeper en de rest rij voor rij van achter naar voren.
  - **De minuten van een speler** lopen van zijn invallen tot zijn wissel, zijn rode of geel-rode kaart of het einde van de wedstrijd (90, bij verlenging 120).
    Wie in de laatste minuut inviel, speelde minstens een minuut.
  - **Een tegenstander die niet af is** staat niet op het veld en heeft geen wissels; de zin "De opstelling van <club> hebben we niet." blijft.
    `MatchPitch` heeft daarvoor een tegenstander die je kunt weglaten, en een plek voor de wissels (`children`) tussen de uitleg van de merken en de lijst.
  - **Wat weg is:** `MatchLineup` (de lijst van een team) komt nergens meer voor, want "Opstelling als lijst" is een onderdeel van `MatchPitch`.
    De formatie staat nu naast de naam van het team boven het veld.
  - **De feiten onder de uitslag** hebben de ronde als eigen feit, naast de competitie.
- **Later:** vervangt voor de opbouw van de pagina _De pagina van een wedstrijd staat op `/wedstrijden/<seizoen>/<datum>-<club>`, en alleen voor een verslag dat klaar is en klopt_ (`MatchLineup`, de opstelling in lijsten per team).

## De verlenging en de strafschoppenserie komen uit de wedstrijd, de schoten uit het verslag

- **Datum:** 7 november 2026
- **Besluit:** of er een verlenging was, de stand na 90 minuten en de uitslag van de strafschoppenserie komen uit de wedstrijd, niet uit het verslag (#850).
  De schoten van de serie komen wel uit het verslag (#844).
  Bij een verlenging loopt de balk Wedstrijdverloop tot 120 minuten, lopen de ringen tot 120 en heeft Verloop een derde blok "Verlenging".
  Met een serie staat de kaart Strafschoppenserie op de pagina; een wedstrijd met alleen een uitslag van de serie heeft de regel in de kop en geen kaart.
- **Waarom:** de wedstrijd weet dit al, en zo is er één plek om het in te vullen (zie ook #852).
- **Alternatieven:** de verlenging uit de minuten van de gebeurtenissen afleiden (een verlenging zonder gebeurtenissen bestaat dan niet).
- **Later:** vult _De formatie staat op de pagina van de wedstrijd bij het team_ aan: de formatie staat nu bij de naam van het team boven het veld.
- **Later:** zie _De strafschoppenserie staat in het formulier van het verslag, en alleen bij een wedstrijd met een uitslag van de serie_ (7 november 2026): het formulier van het verslag vult de schoten van de serie in.

## Een wedstrijd die we op strafschoppen winnen, telt overal als winst

- **Datum:** 7 november 2026
- **Besluit:** een wedstrijd die we op strafschoppen winnen, telt overal waar de site winst, gelijkspel en verlies telt als winst, en een die we zo verliezen als verlies (#845).
  Doelpunten en doelsaldo tellen de serie niet mee: de uitslag van de wedstrijd is die na de verlenging.
  Besloten door de projecteigenaar.
- **Waarom:** een beker kent geen gelijkspel, en de kop van de wedstrijd laat de serie al beslissen.
- **Alternatieven:** gelijkspel laten tellen, zoals Wikipedia de uitslag schrijft; een eigen categorie "winst na strafschoppen" (veel extra uitleg voor weinig wedstrijden).
- **Keuzes bij het bouwen** (7 november 2026):
  - **Eén regel:** `resultOf` in `src/match-result.ts` geeft winst, gelijkspel of verlies, eerst naar de serie als die er is en anders naar de doelpunten; `letterOf` maakt er W, G of V van.
    De letters, de reeksen, Thuis en uit, de resultaten per hoofdtrainer, de kaart Hoe de wedstrijden verlopen, de opmerkelijke wedstrijden, de kaarten van een tegenstander en de score-donut gebruiken haar.
    De clubcijfers van `listClubRecords` in `packages/db` rekenen dezelfde regel in SQL uit (`coalesce` van de strafschoppen en de doelpunten).
  - **Wat op de doelpunten blijft:** doelpunten, doelsaldo, zonder tegendoelpunt, de grootste winst en het grootste verlies (die vragen een verschil in doelpunten, dat een serie niet heeft), de stand en de punten van de Eredivisie, de laatste vijf van de stand (`last-five.ts`) en de controle van de importer tegen de stand: de competitie kent geen strafschoppen.
  - **De score-donut** telt een stand met een serie apart van de gelijke spelen met dezelfde stand: 1–1 na strafschoppen staat bij Winst of Verloren, 1–1 zonder serie bij Gelijk.
  - **`ShortMatch`** krijgt `penaltiesFor` en `penaltiesAgainst`, voor de kleur van de uitslag; de regel toont geen serie.
    Een schermlezer hoort er "na strafschoppen 4 tegen 3" bij, omdat de kleur anders het enige teken van de winst is bij een stand van 1–1.
    De lijsten die wedstrijden kiezen (De nul gehouden, Doelpuntenmakers, de laatste vijf van de reeksen) geven de serie door; de grootste winst en het grootste verlies hebben nooit een serie.
  - **Punten:** op de kaarten die 3 punten per winst rekenen over de beker, zoals Thuis en uit bij "Alle wedstrijden" en de kolom Punten van Tegenstanders, is een winst na strafschoppen 3 punten.

## De strafschoppenserie staat in het formulier van het verslag, en alleen bij een wedstrijd met een uitslag van de serie

- **Datum:** 7 november 2026
- **Besluit:** het formulier van het verslag krijgt voor elk team een lijst Strafschoppenserie, met een rij per schot: de speler en de uitkomst (Raak, Naast of Gestopt) (#852).
  - **De schakelaar "Verlenging" komt niet in het formulier van het verslag.**
    De wedstrijd heeft al Verlenging, de stand na 90 minuten en de uitslag van de serie (het formulier van de wedstrijd in het beheer), en het verslag laat minuten tot 120 toe als de wedstrijd een verlenging had.
    Waarom: één plek om het in te vullen.
    Alternatief: een tweede schakelaar in het verslag met een regel dat ze gelijk moeten zijn.
  - **De lijst staat alleen in het formulier als de wedstrijd een uitslag van de serie heeft.**
    Staat die er niet, dan zegt het formulier waar je hem invult.
    Waarom: de serie wordt tegen die uitslag gecontroleerd (#844).
- **Keuzes bij het bouwen** (7 november 2026):
  - **Een lijst per team, zoals de andere lijsten:** `serie` is een soort rij met de velden `speler` en `uitkomst`, en een veld heet `serie-wij-2-uitkomst`.
    Het team is dat van de kaart waar de rij in staat, zoals bij de kaarten en de gemiste strafschoppen.
    De knoppen om een schot toe te voegen en weg te halen zijn knoppen van hetzelfde formulier, dus het werkt ook zonder JavaScript.
  - **De ronde volgt uit de volgorde:** het eerste schot van een team is ronde 1.
    Een rij zonder speler en zonder uitkomst telt niet mee, zodat de rondes niet overslaan.
    Een team heeft hoogstens 50 schoten (de grens van de database).
  - **De speler:** de keuzelijst heeft de spelers van het verslag van dat team.
    Bij sc Heerenveen kies je een speler.
    Bij de tegenstander mag de speler leeg blijven ("Onbekende speler") zolang zijn kant niet af is; is zijn kant af, dan zegt de regel dat er een speler moet zijn.
    De regels van het verslag zeggen ook of een speler twee keer schiet of aan het einde niet op het veld stond (een waarschuwing).
  - **De meldingen van de regels** staan bij het veld van het schot, of bij de lijst voor een melding over de hele serie: "geen uitslag van de serie", "het aantal raak komt niet op de uitslag" en "de teams verschillen meer dan één schot".
    Die laatste krijgen in het overzicht van fouten de focus op de kop van de lijst.
    Een waarschuwing staat bij de lijst, met de naam van het schot, omdat een waarschuwing geen veld heeft.
  - **Een lijst die al schoten heeft, blijft zichtbaar,** ook als de wedstrijd geen uitslag van de serie meer heeft (de import kan hem weghalen).
    Zo kun je de schoten nog weghalen, en de regels zeggen waarom ze niet kloppen.
  - **Opslaan** zet de serie in `match_shootout_kicks` en haalt hem weg als de lijst leeg is.
    Dat vervangt de oplossing van #844, waar het opslaan de schoten van het oude verslag bewaarde omdat het formulier ze niet kende.
  - **Tekst plakken** leest geen serie, en wat er staat blijft staan: `keepShootout` zet de schoten van het opgeslagen verslag terug in het ingelezen formulier, bij dezelfde speler op team en rugnummer.
    Staat een speler niet meer in de nieuwe opstelling, dan is het schot zonder speler en zegt de regel dat.
  - **Het voorbeeld** toont de rondes van de serie, ook voordat het is opgeslagen.
- **Waarom:** de pagina (#850) toont de serie, en de redactie moet hem kunnen invullen zonder aparte schermen.
  Dezelfde lijsten en regels als de doelpunten en de kaarten houden het formulier gelijk en bruikbaar met een toetsenbord en een schermlezer.
- **Alternatieven:** één lijst voor beide teams met een kolom Team (de volgorde en de ronde per team worden dan lastiger te lezen); de serie in het plakformaat (dat blijft buiten dit besluit); een tweede schakelaar Verlenging in het verslag.
- **Later:** vult _De verlenging en de strafschoppenserie komen uit de wedstrijd, de schoten uit het verslag_ aan: de schoten komen uit het verslag, en het formulier van het verslag vult ze in.

## De bron staat bij de wedstrijden, per bron

- **Datum:** 8 november 2026
- **Besluit:** de site toont de wedstrijden van de oude fansite (1990 tot 2007) met de zes nieuwe competities, een datum zonder tijd en een eigen bronvermelding (#874).
  Een pagina of kaart met wedstrijden van Wikipedia noemt Wikipedia, zoals nu.
  Eén met wedstrijden van de oude fansite noemt "het archief van de oude sc Heerenveen Fansite".
  Eén met allebei noemt beide.
- **Keuzes bij het bouwen** (8 november 2026):
  - **De bronvermelding:** `ArchiveCredit` is één regel die altijd te zien is: "Bron: het archief van de oude sc Heerenveen Fansite".
    Het archief is van ons, dus er is geen licentie, pagina of tijd van lezen om te noemen en geen uitklap nodig.
    `WikipediaCredit` kreeg `archive`: de korte vorm zegt dan "Bron: Wikipedia en het archief van de oude sc Heerenveen Fansite", en de volledige vorm zegt het in de `summary` en voegt in de uitklap toe "Oudere wedstrijden komen uit het archief van de oude sc Heerenveen Fansite."
    De zin over CC BY-SA 4.0 blijft over de gegevens die we van Wikipedia nemen.
    De projecteigenaar leest de zin in de pull request.
  - **Welke bron:** `sourceOf` leest `data_source` van de wedstrijden die op de pagina of de kaart staan (`PublicMatch.dataSource`).
    Een pagina met pagina's van Wikipedia, voor de stand of het programma van het seizoen, noemt Wikipedia altijd erbij, ook als alle wedstrijden uit het archief komen.
    De lijst van de tegenstanders en de pagina's die alle seizoenen tellen, noemen de bron van alle wedstrijden in de database (`listMatchDataSources`).
    De kaarten met een knop voor een plaatje geven de bron van hun eigen wedstrijden.
    De bronvermelding van de selectie (`SquadCredit` in Zoeken en de kaart Selectie) blijft Wikipedia: de selecties komen alleen van daar.
    De beschrijving van de pagina van een seizoen, van een club en van Spelers noemt dezelfde bron (`sourceName`), en die van de lijst Tegenstanders noemt beide.
  - **De volgorde van de competities** op de pagina van een seizoen: de competitie (Eredivisie of Eerste divisie), de beker, de Champions League, de Europacup II, de UEFA Cup, de Intertoto Cup, de play-offs van de UEFA Cup, en dan de volgorde die al bestond (de play-offs van de Conference League, de Europa League en de play-offs van de Europa League).
    De anker-ids van de kaarten stonden al in `matchShortcuts.ts`.
    Een test controleert dat elke competitie precies één keer in de volgorde staat.
  - **De Eerste divisie telt mee bij "Alle wedstrijden"** en niet bij de keuze "Eredivisie", net als de beker.
    De schakelaar staat er alleen als het seizoen een wedstrijd van de Eredivisie heeft en een gespeelde wedstrijd van een andere competitie.
    Een seizoen in de Eerste divisie (1991/92 en 1992/93) heeft dus geen schakelaar, want de keuze Eredivisie zou niets tellen.
    De seizoenskiezer neemt de keuze mee naar een ander seizoen, dus `choiceFor` telt in zo'n seizoen de keuze Eredivisie als Alle wedstrijden: er zijn geen lege kaarten zonder schakelaar om terug te gaan.
    De zin onder de kaarten noemt de competities die zijn gespeeld ("de Eerste divisie en de KNVB Beker", "de Eredivisie, de KNVB Beker, de UEFA Cup en de Intertoto Cup").
    Op de pagina's van de tegenstanders blijft de keuze Eredivisie alleen de Eredivisie.
  - **Een datum zonder tijd:** een gespeelde wedstrijd toont op de site al alleen de dag ("za 21 nov 1992") en het `time`-element heeft alleen de datum, met of zonder aftrap in de database.
    Er is dus geen tekst als "tijd nog niet bekend" en geen weekend.
    Het beheer laat voor een wedstrijd van het archief de tijd en de tekst allebei leeg (het formulier zegt het bij het veld Tijd), en schrijft in de regel boven het formulier de dag uit ("21 november 1992") in plaats van `1992-11-21`.
    De wedstrijden van Wikipedia houden de eis dat de tijd of de tekst er is.
    De Eerste divisie heeft geen verlenging in het formulier, net als de Eredivisie.
  - **De seed** (`madeUpOldMatches`): drie verzonnen wedstrijden met `data_source = 'oude-fansite'` in vaste seizoenen, een Eerste-divisiewedstrijd (1992/93) en een wedstrijd van de Intertoto Cup (1996/97) zonder tijd, en een wedstrijd van de UEFA Cup (2004/05) met aftrap.
    Elke wedstrijd heeft een tegenstander die het lopende seizoen niet kent, zodat de pagina van die club het archief als enige bron heeft.
    Ze komen erbij als de seed de verzonnen wedstrijden van het lopende seizoen zet, en niet als de database al wedstrijden van het archief heeft.
    De import van de oude fansite haalt ze weg, want hij haalt elke wedstrijd van zijn bron weg die niet in zijn bestanden staat.
  - **Wat hier niet verandert:** de kaarten Onze plek in de competitie en Stand zeggen voor een seizoen zonder stand nog dat we de eindstand nog niet gevonden hebben, en "Alleen de Eredivisie".
    Een stand voor de Eerste divisie en de oude seizoenen is werk van #782 en van de opvolger van de stand.
    De statistieken (hoekschoppen enzovoort) staan niet op de site.
- **Waarom:** de redactieregel is dat we de bron altijd noemen (principe 4 van de Redactie), en de oude gegevens zijn van het project zelf, niet van Wikipedia.
  Een oude wedstrijd met "Bron: Wikipedia" erbij zou onwaar zijn.
- **Alternatieven:** één algemene bronregel voor de hele site (zegt niet wat waar vandaan komt); de Eerste divisie als "de competitie" van haar seizoen laten tellen bij de keuze Eredivisie (het label van de schakelaar zou per seizoen moeten wisselen en elke kaart met "Eredivisie" in de tekst ook); de bron van het archief achter een uitklap met een link (er is niets om heen te linken); een datum als "21 november 1992" in `date_text` (zie _De wedstrijden van de oude fansite komen in `matches`_ in `hosting-en-data.md`).

## Een afgeleide formatie wordt als zodanig getoond

- **Datum:** 8 november 2026
- **Besluit:** onder het veld van de wedstrijdpagina staat één zin: "De formatie is afgeleid uit de linie van de spelers en kan afwijken van wat er is gespeeld."
  Ze staat er voor een verslag met de bron `Oude fansite` (`oldSiteReportSource` in `@fansite/db/schema`) zonder `saved_by` met een formatie voor onze ploeg, en voor geen enkel ander verslag.
  `matchPageDataOf` zet daarvoor `formationOursDerived`; de voorvertoning in het beheer zet het onwaar.
  De zin is een gewone alinea (`Text`) in de leesvolgorde direct na het veld en de uitleg van de merken, en vóór de wissels en de lijst.
  Zodra de redactie het verslag opslaat, zet `saved_by` de formatie op eigen gezag en verdwijnt de zin.
  Een verslag dat de redactie opslaat zonder iets te veranderen, krijgt geen `saved_by` (de opslag ziet geen verschil), dus de zin blijft staan tot er iets verandert.
- **Waarom:** de linie is een eigenschap van de loopbaan van de speler en geen positie in die wedstrijd, dus de formatie kan afwijken.
  We laten geen gok als feit zien (zie _De formatie van onze ploeg wordt afgeleid uit de linie van de oude fansite, alleen als de volgorde en de lijnen het eens zijn_ in `importer.md`).
  De bron en `saved_by` zijn er al, dus er komt geen kolom bij.
- **Alternatieven:** tonen als een echte formatie (eenvoudiger, maar een afgeleide waarde als feit); een kolom `formation_derived` (een tweede waarheid naast `saved_by`).

## Een wedstrijd die nog wordt gespeeld heeft een pagina met "Live" en een knop voor het einde

- **Datum:** 8 november 2026
- **Besluit:** de redactie kan een verslag invullen en publiceren terwijl de wedstrijd wordt gespeeld, en de pagina zegt dan "Live" (#906).
  De basis staat in _Een wedstrijd die nog wordt gespeeld blijft "gepland", met een verslag dat `bezig` is_ in `hosting-en-data.md`.
  - **De pagina:** vanaf de aftrap (zonder bekende aftrap: op de dag) zegt de kop van de pagina "Live" in de pil, in woorden en niet alleen in kleur, en de stand is het aantal doelpunten per kant uit het verslag; een schermlezer hoort "Tussenstand: 2 tegen 1".
    Voor de aftrap staan de aftrap en de opstelling er, met streepjes in plaats van een stand en "Nog niet begonnen" in de pil, zonder "Live".
    De melding "We vullen dit verslag nog in" blijft staan.
    `MatchHeader` heeft daarvoor `phase` (`live` of `upcoming`), en `MatchPageData` ook.
  - **Zoekmachines en delen:** de pagina heeft `noindex`, staat niet in de sitemap, en de titel ("sc Heerenveen – N.E.C., 31 oktober 2026") en de beschrijving noemen geen stand.
  - **Links:** een wedstrijd die live is, linkt in Wedstrijden naar zijn pagina met de tekst "Live" in plaats van "Het verslag" (`Match` met `live`).
    Een wedstrijd met een verslag voor de aftrap linkt met "Het verslag".
    Een geplande wedstrijd zonder verslag houdt geen link.
    De regel meldt bij een live wedstrijd niet dat de gegevens nog niet beschikbaar zijn.
  - **Het beheer:** het scherm van het verslag staat open voor een wedstrijd die `scheduled` is vanaf zijn dag, de lijst Verslag toont "Live" erbij, en het formulier van de wedstrijd laat een wedstrijd met een verslag `scheduled` blijven (voorheen "blijft gespeeld").
  - **De knop "Wedstrijd afgelopen"** staat in de zijbalk van het scherm van het verslag en gaat naar een eigen scherm, `/beheer/wedstrijden/<nummer>/verslag/afgelopen`, met twee velden (de stand uit de doelpunten van het bewaarde verslag, te wijzigen) en een knop.
    Dat is de bevestiging: het werkt zonder JavaScript, en de redactie ziet de stand voordat de wedstrijd zijn uitslag krijgt.
    Een stand die geen heel getal van 0 tot 99 is, komt terug met een fout bij het veld en in een lijst die het focus krijgt.
    Verlenging en strafschoppen vult de redactie daarna in met het formulier van de wedstrijd.
  - **De import van Wikipedia:** zet de import de wedstrijd op `played` voordat de knop is gebruikt, dan stopt "Live" ook, en een verschil met de doelpunten volgt de bestaande afhandeling (`edited-matches.ts`); gebruikt de redactie de knop eerst, dan is de uitslag een invoer van de redactie die de import als zodanig beoordeelt.
    Tests in `import-edited-matches.test.ts` dekken beide volgorden.
- **Waarom:** bezoekers willen de opstelling en de doelpunten zien zodra ze er zijn, en een wedstrijd die nog bezig is mag niets veranderen aan de lijsten en cijfers van de site.
  De knop maakt het einde een bewuste stap, waarna de wedstrijd zijn uitslag heeft zonder te wachten op Wikipedia.
- **Nadeel:** een pagina wordt tot vijf minuten bewaard (de verslagen van het lopende seizoen), dus een doelpunt staat niet meteen op de pagina.
  Het verversen is werk van #908.
- **Alternatieven:** een bevestiging als dialoog met JavaScript (werkt niet zonder, en de focus is moeilijker goed te krijgen); de knop meteen laten schrijven zonder bevestiging (een verkeerde stand komt dan op de site); de stand in de titel en de beschrijving (die veranderen na elk doelpunt).

## De laatste wedstrijd staat in een eigen kaart bovenaan Wedstrijden

- **Datum:** 8 november 2026
- **Besluit:** Wedstrijden toont in het lopende seizoen een kaart "Laatste wedstrijd" boven Programma, met de nieuwste wedstrijd die begonnen is (`previous` van `overviewOf`, dezelfde als op de homepage) en alleen die (#920).
  De kaart heeft het anker `laatste-wedstrijd` en een item in de balk "Op deze pagina:" vóór Programma.
  - **De regel:** dezelfde `MatchLines` als Uitslagen, dus de uitslag (een schermlezer hoort "2 tegen 0"), de doelpuntenmakers, de competitie, de ronde, het stadion en de link "Het verslag".
    Een wedstrijd die live is staat er met "Live" en zonder uitslag, en een begonnen wedstrijd zonder uitslag met de zin die ook in Uitslagen staat.
  - **Dubbel:** de wedstrijd blijft in Uitslagen staan, dus die kaart telt dezelfde wedstrijden als eerst.
  - **Waar niet:** een afgelopen seizoen en een seizoen zonder begonnen wedstrijd hebben de kaart en het item niet.
    Programma staat dan bovenaan.
  - **De kaart** volgt de vaste regels voor kaarten van #768: wit in de hoofdkolom, een kop van niveau 2 met anker.
- **Waarom:** de laatste wedstrijd is het eerste wat supporters willen weten, en stond onder een lange lijst.
  Dezelfde wedstrijd twee keer is goedkoper dan Uitslagen een wedstrijd laten missen, want Uitslagen telt dezelfde wedstrijden als de rest van de site.
- **Alternatieven:** een grotere regel in Uitslagen (valt minder op); de laatste wedstrijd uit Uitslagen halen (geen dubbele regel, maar Uitslagen mist dan de nieuwste); de kaart ook in een afgelopen seizoen (de laatste is daar niet bijzonder).

## Een naam zonder persoon splitsen we op het eerste woord, met een vaste lijst voorvoegsels

- **Datum:** 8 november 2026
- **Besluit:** één functie, `splitPersonName` in `apps/site/src/player-name.ts`, voor trainers en voor doelpuntenmakers zonder persoon (#917).
  Het eerste woord is de voornaam.
  De achternaam begint bij het eerste woord na het eerste dat een voorvoegsel is uit een vaste lijst (`van`, `de`, `der`, `den`, `ten`, `ter`, `te`, `het`, `'t`, `von`, `di`, `da`), anders bij het tweede woord.
  Een tweede voornaam hoort dus bij de voornaam: "Jan Willem van Hanegem" is "Jan Willem" en "van Hanegem".
  Begint de hele naam met een voorvoegsel, of is het één woord, dan is alles achternaam.
  Verder raden we niets: "Jon Dahl Tomasson" is "Jon" en "Dahl Tomasson", een bekende grens.
  `surnameOnly` is weg.
- **Rijen zonder persoon staan op de achternaam, zoals de rest:** de volgorde bij gelijke aantallen volgt de achternaam zonder voorvoegsel (`textSortName`), dus "Afonso Alves" staat onder de A.
- **Waarom:** de hele naam in het vet leest als een vette voornaam.
  Een vaste lijst is klein, voorspelbaar en raadt niet, en de naam van de wedstrijdpagina is de enige bron die we hebben.
  De oude volgorde op de hele naam kwam voort uit de fout, niet uit een keuze.
- **Alternatieven:** alleen het eerste woord nemen (laat "Jan Willem van Hanegem" verkeerd staan); de laatste woorden raden (breekt "Jan Olde Riekerink"); alles in het vet laten staan (de fout van nu); de oude volgorde vastzetten (extra code voor een gevolg van de fout).
- **Later:** het koppelen van doelpunten aan een persoon in de importer (#918) maakt dit voor de meeste doelpunten overbodig.

## De pagina van een wedstrijd eindigt met links naar de vorige en de volgende wedstrijd

- **Datum:** 8 november 2026
- **Besluit:** onderaan de hoofdkolom van de pagina van een wedstrijd staat een transparante kaart, `MatchNeighbours` (#928).
  De volgorde loopt over alle wedstrijden in de database, van alle competities en seizoenen: op datum, dan op aanvangstijd (een wedstrijd zonder aanvangstijd eerst), dan op id.
  `listMatchSequence` leest de lijst, `apps/site/src/match-neighbours.ts` zoekt de buren en bouwt de regel, en de lijst blijft vijf minuten in het geheugen.
  - Bij onze eerste wedstrijd ontbreekt "Vorige", bij de laatste "Volgende".
    Een enkele kant blijft op zijn eigen plek.
  - Een wedstrijd met een uitslag toont de stand vanuit ons gezien in de kleur van de uitslag (`outcomeOf`, bij strafschoppen de uitslag daarvan), met verborgen "Gewonnen", "Gelijkspel" of "Verloren".
  - Een wedstrijd zonder uitslag toont de datum in de korte vorm van de lijsten (zonder tijd), of "Live", "Uitgesteld" of "Geannuleerd", zonder kleur.
  - Een wedstrijd zonder pagina staat als tekst zonder link in dezelfde opbouw.
  - Onder 40 rem breed staan de links onder elkaar, daarboven naast elkaar met de volgende wedstrijd rechts.
- **Waarom:** een supporter wil het seizoen doorlezen zonder terug te gaan naar de lijst, en een link die een wedstrijd overslaat, zegt niet dat er een wedstrijd mist.
  Kleur is nooit het enige teken, en de woorden zijn die van de kop van de wedstrijd.
- **Alternatieven:** alleen wedstrijden met een pagina (dan lijkt een wedstrijd te ontbreken); alleen de stand voorlezen (kleur is dan het enige teken); altijd naast elkaar (lange clubnamen breken slecht in twee smalle kolommen).

- **Later:** 8 november 2026 (#930): de links beginnen niet meer met "Vorige:" en "Volgende:" en "thuis" en "uit" staan zonder haakjes: "Testdorp FC thuis 2–1".
  Een schermlezer hoort verborgen "Vorige wedstrijd: " of "Volgende wedstrijd: " voor de club, ook bij een wedstrijd zonder pagina.

## Een opslag van een artikel in het beheer probeert de transactie opnieuw bij een deadlock

- **Datum:** 8 november 2026
- **Besluit:** `createArticle` en `saveArticle` draaien hun transactie via `retryOnDeadlock` (`apps/site/src/beheer/retry-deadlock.ts`).
  Bij `ER_LOCK_DEADLOCK` (1213) probeert die de hele transactie opnieuw, in totaal vijf keer.
  Elke andere fout gaat meteen door.
  Na de laatste poging gaat ook de deadlock door.
  De andere opslagen in het beheer hebben geen unieke sleutel die bij gelijktijdige opslagen beslist, dus alleen de artikelen gebruiken de hulpfunctie (#933).
  **Later:** 8 november 2026 (#907): ook het bijhouden van een verslag tijdens de wedstrijd gebruikt `retryOnDeadlock`, omdat daar meerdere redacteuren tegelijk schrijven.
- **Waarom:** MariaDB kan bij gelijktijdige inserts op dezelfde unieke sleutel een deadlock geven en raadt zelf aan opnieuw te proberen.
  De nieuwe poging ziet de rij van de winnaar en geeft de gewone uitkomst: het adres bestaat al.
  Zonder dit kreeg een redacteur een foutpagina.
- **Alternatieven:** de test minder gelijktijdig maken (verbergt de fout); een slot op de tabel (trager, en een deadlock blijft mogelijk).

## Een verslag bijhouden vanaf een telefoon: een snel scherm naast het volledige formulier

- **Datum:** 8 november 2026
- **Besluit:** naast het volledige formulier staat een snel scherm op `/beheer/wedstrijden/<nummer>/verslag/live` (#907).
  De opstelling blijft in het volledige formulier of komt via plakken (#830).
  Het snelle scherm is voor wat tijdens de wedstrijd gebeurt: een doelpunt, een kaart of een wissel, elk met een minuut en een speler, en elk meteen opgeslagen en zichtbaar voor bezoekers.
  Corrigeren kan met "Haal weg" per gebeurtenis, achter een vraag die zonder JavaScript werkt (een `Disclosure`), en met het volledige formulier.
  - Elke gebeurtenis is een post van een eigen formulier, dus het scherm werkt zonder JavaScript.
    Met JavaScript zijn de velden na een opslag leeg, staat de focus op het eerste veld en zegt een regel met `role="status"` wat is toegevoegd.
  - De spelers in de lijsten zijn de rijen van het verslag, gegroepeerd per team.
    Bij een wissel gaat iemand eruit die op het veld staat en komt iemand erin van de bank.
    Een speler van de tegenstander zonder rij in de opstelling kan bij een doelpunt met een getypte naam.
  - Wat de opbouw van de gegevens breekt (een minuut buiten de wedstrijd, blessuretijd midden in een helft, een speler die twee keer eruit gaat) wordt geweigerd met een fout bij het veld.
    Wat een regel van het verslag raakt, zoals een kaart voor iemand die al was gewisseld, wordt opgeslagen.
    Een verslag dat klaar was, wordt dan weer bezig, zoals bij het volledige formulier, en het scherm toont wat de regels vinden.
    Dezelfde controle (`checkReportForm`) beslist voor beide schermen.
- **Waarom:** een telefoon heeft geen plek voor een formulier van een pagina lang, en een redacteur kijkt naar het veld.
- **Alternatieven:** alleen het volledige formulier en vaak opslaan; alleen doelpunten snel en de rest na afloop.

## Elke gebeurtenis van het snelle scherm voegt toe in een transactie met een slot op de wedstrijd

- **Datum:** 8 november 2026
- **Besluit:** `addLiveEvent` en `removeLiveEvent` (`apps/site/src/beheer/live-report.ts`) lezen het bewaarde verslag, controleren de nieuwe gebeurtenis en voegen één rij toe of halen er één weg, in één transactie die eerst de rij van de wedstrijd vergrendelt (`for update`), zoals elke andere opslag van een verslag.
  De rest van het verslag wordt niet opnieuw geschreven, dus de rijen van de spelers houden hun id.
  Twee redacteuren die tegelijk een gebeurtenis toevoegen, wachten op elkaar en allebei de gebeurtenissen blijven staan.
  De transactie loopt via `retryOnDeadlock`.
  - Het volledige formulier draagt een tekst mee van het verslag waarmee het werd geopend (`reportBasis`, een korte hash van de inhoud).
    `saveReport` vergelijkt die binnen de transactie met het bewaarde verslag.
    Is het verslag veranderd, dan schrijft het niets, zegt het formulier dat iemand anders het verslag heeft bewaard en houdt het wat is getypt.
    Een formulier zonder die tekst slaat op zoals voorheen.
  - Ook het scherm van plakken draagt de tekst mee, want het slaat op met dezelfde actie.
- **Waarom:** het volledige formulier schrijft het hele verslag opnieuw, en de laatste opslag won zonder dat iemand het merkte.
  Een gebeurtenis die tijdens de wedstrijd tussendoor wordt ingevoerd, zou zo verdwijnen.
  Het slot op de wedstrijd bestond al voor het volledige formulier en voor "Wedstrijd afgelopen", dus alle schrijvers wachten op dezelfde rij en kunnen elkaar niet in een kring blokkeren.
- **Alternatieven:** de laatste opslag laten winnen; het verslag vergrendelen voor één redacteur; een versienummer in `match_reports` (een migratie voor iets wat de inhoud al zegt).

## Het logboek krijgt één regel per gebeurtenis van het snelle scherm

- **Datum:** 8 november 2026
- **Besluit:** elke toevoeging en elke verwijdering schrijft één regel `match.edit` met een korte omschrijving, zoals "Doelpunt 23' Van Aken" of "Doelpunt 23' Van Aken weggehaald", en de reden "Verslag bijgehouden tijdens de wedstrijd".
  `saved_at` en `saved_by` van het verslag volgen elke opslag.
  Een doelpunt markeert de doelpunten als de invoer van de redactie (`match_edits`), zodat de import ze met rust laat, en laat een wijziging van Wikipedia die op de doelpunten wachtte vervallen.
  Weghalen van een gebeurtenis die er al niet meer is, schrijft niets.
- **Waarom:** wie wanneer iets invoerde moet te zien blijven, en een lopende wedstrijd geeft hooguit enkele tientallen regels.
- **Alternatieven:** één regel per opslag van het hele verslag (zegt niet wat er veranderde); geen regel voor een kaart of wissel (dan is het logboek onvolledig).

## Een sessie duurt 9 dagen zonder gebruik en 14 dagen hoe dan ook

- **Datum:** 8 november 2026
- **Besluit:** de grens voor gebruik gaat van 12 uur naar 9 dagen, en de absolute grens van 7 naar 14 dagen.
  Het cookie krijgt `Max-Age` van 14 dagen en houdt de andere eigenschappen: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/beheer`.
  Elk verzoek verlengt alleen de 9 dagen (`last_seen_at`); `created_at` verandert nooit, dus verlengen kan een sessie niet voorbij de 14 dagen rekken, ook niet met een gestolen token.
  Het cookie wordt niet vernieuwd, dus het browserdeel loopt gelijk met de absolute grens, en de server beslist.
  Uitloggen verwijdert de rij en het cookie, zoals eerst.
- **Waarom:** de redactie werkt rond wedstrijden, van een vrijdag tot een zondag, en 12 uur is dan te kort.
  Het cookie blijft een functioneel cookie voor redacteuren, en de server kan elke sessie beëindigen.
  De prijs is dat een gestolen telefoon langer ingelogd blijft.
- **Alternatieven:** 14 dagen zonder gebruik en 30 hoe dan ook (langer risico voor weinig winst); alles laten zoals het is (blijft vaak inloggen).
- **Later:** vervangt de 12 uur en 7 dagen uit _Een link en een sessie bewaren we als SHA-256, in de database_.

## Inloggen kan ook met een code uit de mail

- **Datum:** 8 november 2026
- **Besluit:** de mail bevat naast de link een code van 6 cijfers, die je invult op de pagina "verstuurd".
  Een app op het beginscherm van een iPhone heeft een eigen cookiepot, en de link opent in Safari, dus de sessie komt niet in de app.
  Met de code log je in waar je de pagina open hebt.
  Het veld heeft `autocomplete="one-time-code"` en `inputmode="numeric"`, zodat iOS de code uit de mail kan aanbieden.
  - De code werkt 15 minuten en één keer, samen met zijn link: gebruik je de een, dan is ook de ander op.
  - Elk verzoek krijgt een willekeurige verwijzing (`ref`, 32 bytes).
    Die staat in het adres van de pagina "verstuurd" en in het formulier, en bevat niets over het e-mailadres.
    De tabel bewaart de SHA-256 van de verwijzing en de SHA-256 van verwijzing en code samen; de code zelf staat nergens.
    Zo hoort een code bij het verzoek, en dus bij het adres, dat hem vroeg, en kan een kopie van de database de 6 cijfers niet raden.
  - Na 5 foute pogingen werkt de code niet meer, ook de goede niet.
    De teller loopt met één `UPDATE` die alleen onder de grens telt, dus gelijktijdige gokken krijgen er samen niet meer dan 5.
  - Vraag je een nieuwe link aan, dan verliest de code van de vorige zijn werking (de link blijft werken).
    Zo levert opnieuw vragen geen extra pogingen op één code op.
    Met de grens van 5 links per kwartier is het meest wat iemand kan gokken 25 pogingen op 1.000.000 per kwartier, voor een adres dat hij zelf al moet kennen.
  - Een adres zonder account, of dat is uitgezet, krijgt dezelfde pagina met ook een verwijzing; de code werkt daar nergens op, en een fout geeft overal dezelfde melding.
  - De bestaande grens voor het aanvragen van links blijft gelden.
- **Waarom:** de link werkt niet in de app, en een wachtwoord is meer om te beheren en te beveiligen.
- **Alternatieven:** alleen de link (werkt niet in de app); een wachtwoord; een link die in de app opent (iOS kan een link uit Mail niet naar een app op het beginscherm sturen); het e-mailadres in het adres van de pagina meegeven (persoonsgegevens in een URL).

## De footer heeft een gewone koppeling naar het beheer

- **Datum:** 8 november 2026
- **Besluit:** "Beheer" staat als laatste in de footer, voor iedereen zichtbaar, en vervangt "Zoeken" daar.
  Het wijst naar `/beheer/inloggen`.
- **Waarom:** de app op het beginscherm heeft geen adresbalk en geen teken in de opslag.
  Een koppeling is geen beveiliging: de inlogpagina is al openbaar en staat niet in zoekmachines, en de toegang blijft bij de sessie.
  Zoeken staat nog in de balk van Nieuws.
- **Alternatieven:** de koppeling alleen tonen voor wie ingelogd is (werkt in de app juist niet); een geheim adres (verbergen is geen beveiliging); een cookie delen met Safari (kan niet op iOS).
- **Later:** vervangt de footer met "Zoeken" als eerste item.

## Het teken voor het menu wordt in de app gezet

- **Datum:** 8 november 2026
- **Besluit:** na het inloggen met de code zet het beheer het teken in de eigen opslag van de app, zoals het in een browser doet.
  Dat is geen nieuw werk: de layout van het beheer zet het teken bij elke geldige sessie, ook na `logInWithCode`.
- **Waarom:** het menu kent dan "Beheer" ook daar.
- **Alternatieven:** niets, dan toont het menu in de app geen Beheer.

## Het snelle scherm vraagt minder: Blessuretijd op zijn plek, geen geel-rood en geen kruimelpad

- **Datum:** 8 november 2026
- **Besluit:** het snelle scherm voor het bijhouden van een verslag wordt eenvoudiger (#939).
  - Het veld Blessuretijd staat naast Minuut, heet alleen "Blessuretijd" en toont zelf dat het niet verplicht is.
    Met JavaScript is het er alleen bij minuut 45, 90, 105 en 120, de minuten die `checkReportForm` toestaat.
    Het verschijnt en verdwijnt terwijl je typt, zonder dat de focus verspringt, en een veld dat weg is, wordt niet meegestuurd.
    Zonder JavaScript, en met een fout erop, staat het er altijd.
  - De vraag boven sc Heerenveen of de tegenstander is "Voor wie".
  - Geel-rood is geen keuze meer: een tweede gele kaart voor een speler die er precies één heeft, wordt een kaart `geel-rood`, en de bevestiging zegt "Geel-rode kaart opgeslagen".
    Het volledige formulier, plakken, de importer en de wedstrijdpagina houden geel-rood zoals het was.
  - De knoppen om op te slaan hebben het icoon `save`, de Disclosure van "Haal weg" herhaalt de vraag niet en het kruimelpad vervalt voor de balk "Op deze pagina:" onder de beheerbalk (de slot `@shortcuts`).
  - Na "Haal weg" met JavaScript gaat de focus naar de kop Gebeurtenissen.
- **Waarom:** redacteuren gebruiken het scherm vaak, kennen de woorden en hebben op een telefoon weinig ruimte.
  Wat de regels toch al eisen, zoals een geel-rode kaart na precies één gele, hoeft niemand te kiezen.
- **Alternatieven:** Blessuretijd altijd tonen (neemt ruimte, vraagt iets wat meestal leeg is); alleen bij 45 en 90 (verlenging kan dan niet snel); een tweede geel blijft geel (corrigeren in het volledige formulier).
- **Later:** dit vult _Een verslag bijhouden vanaf een telefoon: een snel scherm naast het volledige formulier_ aan: de kant heet nu "Voor wie", en het scherm biedt geen geel-rood aan.

## De wedstrijdpagina haalt zichzelf elke 60 seconden opnieuw op, alleen zolang de wedstrijd live is en het tabblad zichtbaar is

- **Datum:** 8 november 2026
- **Besluit:** het onderdeel `LiveRefresh` vraagt de pagina elke 60 seconden opnieuw aan onze eigen server, zolang `phaseOf` zegt dat de wedstrijd live is, uiterlijk vier uur na de aftrap.
  Het is één verzoek per bezoeker per minuut, zonder cookies, zonder opslag in de browser en zonder identifier, met `Accept: */*`, zodat het niet als paginaweergave telt (`visitOf`).
  Is het tabblad verborgen, dan wacht het verversen en komt er één zodra het tabblad weer zichtbaar is.
  De delen van de pagina die veranderen (`Contents` met `data-live-region`) worden vervangen als hun inhoud anders is; de rest, de focus en de plaats op de pagina blijven staan.
  Het antwoord is de pagina zelf, dus niet groter dan de pagina.
  Een verdere maatregel voor de belasting is niet nodig; komt die er toch, dan in een eigen issue.
- **Waarom:** elke bezoeker belast de gedeelde hosting, die het forum ook draait, en 60 seconden is genoeg voor een doelpunt.
  In `hosting-en-data.md` staan "live-updates om de paar seconden" als reden om naar een VPS te gaan; elke minuut valt daarbuiten.
  We halen de pagina zelf op en gebruiken niet `router.refresh`: als dat verzoek mislukt, laadt Next.js de pagina opnieuw, en zonder verbinding is dat een foutpagina van de browser midden in de wedstrijd.
- **Alternatieven:** alleen een knop "Ververs nu" (geen extra belasting, maar de bezoeker moet tikken); elke 20 seconden (ruim drie keer zoveel verzoeken); `router.refresh` (zie hierboven).

## De bezoeker kan het verversen uitzetten en ziet wanneer de pagina voor het laatst is bijgewerkt

- **Datum:** 8 november 2026
- **Besluit:** boven de kop van een wedstrijd die live is staan "Bijgewerkt om 15:42" (Nederlandse tijd), een knop "Ververs nu" en een schakelaar "Ververs automatisch" die aan staat (`Switch` uit het designsysteem).
  Zonder JavaScript is "Ververs nu" een gewone link naar dezelfde pagina en is er geen schakelaar.
  Een bezoeker die de schakelaar uitzet, houdt hem uit tot de pagina opnieuw wordt geladen: de site bewaart geen keuzes van bezoekers.
  Mislukt een verzoek, dan blijven de pagina en de tijd van het laatste gelukte verzoek staan, en volgt de volgende poging een minuut later.
- **Waarom:** bewegende of veranderende inhoud moet te stoppen zijn (WCAG 2.2.2).
- **Alternatieven:** de keuze bewaren (de site bewaart niets van bezoekers); geen schakelaar.

## Een schermlezer hoort alleen doelpunten en het einde van de wedstrijd

- **Datum:** 8 november 2026
- **Besluit:** een beleefde regel met `role="status"` staat er al bij het laden en blijft leeg.
  Bij een nieuw doelpunt zegt ze "Doelpunt sc Heerenveen. Stand 1–0, 23e minuut.", bij het einde "Einde van de wedstrijd. Eindstand 2–1."
  Een kaart, een wissel of een verversing zonder nieuws zegt niets, en de eerste keer laden ook niet.
  De pagina zet de zinnen en het aantal doelpunten in een verborgen regel (`data-live-state`), en `LiveRefresh` vergelijkt die met die van het antwoord.
- **Waarom:** elke minuut een melding is ruis; een doelpunt is wat iemand wil weten (WCAG 4.1.3).
- **Alternatieven:** alles voorlezen wat verandert; de hele pagina opnieuw laten voorlezen.

## Een wedstrijd die live is, staat 15 seconden in het geheugen van de server

- **Datum:** 8 november 2026
- **Besluit:** `getPublicReports` leest het huidige seizoen opnieuw na 15 seconden zolang het een wedstrijd heeft die live is (`liveSeasonPeriod` in `report-data.ts`), en anders na 5 minuten.
  Andere wedstrijden en seizoenen houden hun periode.
- **Waarom:** een doelpunt moet binnen een halve minuut op de pagina staan, en 15 seconden houdt de database rustig bij veel bezoekers.
- **Alternatieven:** voor alle pagina's 15 seconden (veel meer lezingen voor niets); een doelpunt dat de cache meteen leegt (werkt niet als er meer processen zijn).

## `Switch` en `Contents` komen in het designsysteem

- **Datum:** 8 november 2026
- **Besluit:** het designsysteem krijgt `Switch` (een selectievakje met de rol `switch` en een label) en `Contents` (een omhulsel zonder eigen vorm, `display: contents`).
- **Waarom:** de sjablonen van de site hebben geen HTML (zie _Sjablonen bevatten geen HTML, alleen componenten uit het designsysteem_), dus een schakelaar en een omhulsel om een deel van de pagina te vinden moeten een component zijn.
- **Alternatieven:** de regel van lint voor deze bestanden uitzetten (de regel is er juist om de HTML uit de site te houden).

## De kaart Selectie toont de vlag van het land, en een speler zonder land krijgt een lege plek

- **Datum:** 9 november 2026
- **Besluit:** `SeasonSquadCard` geeft het land van elke speler (`listSeasonPlayers`, `players.country`, #946) door aan `PlayerName` (#947).
  Staat er in een deel van de lijst (de spelers van één positie) niemand met een land, dan krijgt dat deel geen plek voor een vlag, net als bij het rugnummer.
  Staat er wel iemand, dan krijgt een speler zonder land of zonder vlag in onze set een lege plek van dezelfde breedte.
- **Waarom:** de namen van één deel blijven zo op één lijn, en een seizoen zonder landen (de tabellen van 1990/91 tot 2005/06) verandert niet.
- **Alternatieven:** de plek altijd tonen (een lege kolom in een lijst zonder één land); de vlag overal waar een speler staat (veel componenten, en tegenstanders hebben geen land).
- **Later:** een speler met een land zonder tekening krijgt geen lege plek meer, maar de landcode in een kader van dezelfde breedte (10 november 2026, #1071); alleen een speler zonder land houdt de lege plek.

## De plek per speelronde staat op Wedstrijden, onder de stand

- **Datum:** 9 november 2026
- **Besluit:** de kaart "Onze plek per speelronde" staat in de zijkolom van Wedstrijden, direct onder Stand of Eindstand, op de plek waar "Onze plek door de jaren" stond (#411).
  Hij heeft het anker `#onze-plek-per-speelronde`, een link in "Op deze pagina:", de regel "Alleen de Eredivisie" en de bronvermelding onderaan de zijkolom.
  - **De lijn:** `BarChart.Trend` met een omgekeerde schaal (plek 1 bovenaan, 1 tot 18) en de speelrondes 1 tot 34 onderaan.
    De lijn is voor een schermlezer verborgen.
  - **De gegevens:** `placePerRoundOf` rekent de stand na elke ronde uit `league_results`, dus er is niets nieuws bewaard.
    De volgorde is punten, doelsaldo, gescoorde doelpunten, en dan de naam van A tot Z voor clubs die dan nog gelijk staan (zoals `lastFiveStandings`); de echte regels voor een onderling duel kennen we niet uit de uitslagen.
    Een ronde telt als er negen uitslagen van 18 verschillende clubs zijn, en een ronde is een punt als ook alle rondes ervoor tellen.
    Een uitgestelde wedstrijd houdt zijn eigen ronde en is er pas als hij gespeeld is, dus tot dan is zijn ronde en elke ronde erna een open plek in de lijn.
    Het lopende seizoen toont de lijn tot de laatste complete ronde.
  - **Onder de lijn:** een gesloten `Disclosure` met één zin met de hoogste en de laagste plek van het seizoen, met de ronde erbij (de eerste ronde waarin we die plek hadden), en een `DataTable` met Ronde, Plek en Punten, de nieuwste bovenaan.
    Een open ronde tussen twee rondes met een punt is een rij met streepjes en de notitie "nog niet alle wedstrijden gespeeld".
    Elk punt heeft een label zoals "Ronde 12: plek 4, 20 punten".
- **Waarom:** de stand en onze plek erin horen bij elkaar, en de plek in de zijbalk was al van een kaart met een lijn.
  Een open plek is eerlijker dan een gok.
- **Alternatieven:** op Cijfers, naast "Onze plek in de competitie"; een nieuw onderdeel `LineChart`.
- **Later:** zie _De kaart heet "Verloop op de ranglijst" en toont de hoogste en laagste plek als lijst_ in `redactie.md`: de kaart heet nu "Verloop op de ranglijst" met het anker `#verloop-op-de-ranglijst`, de zin boven de tabel is een lijst boven de uitklapper en het label van een punt noemt de punten niet meer.

## Een seizoen zonder gegevens heeft geen kaart Onze plek per speelronde

- **Datum:** 9 november 2026
- **Besluit:** de kaart ontbreekt, en dus ook de link in "Op deze pagina:", als de uitslagen niet van alle clubs zijn, er geen stand is of er in de stand punten zijn afgetrokken.
  Er komt geen lege kaart en geen zin voor in de plaats.
  De regel is `placePerRoundOf` (undefined betekent geen kaart), met tests voor elk van de gevallen.
- **Waarom:** een kaart die niets toont, vraagt om uitleg die niet helpt.
  Een foute lijn is erger dan geen lijn: de uitslagen laten een aftrek van punten niet zien, dus de plek na elke ronde zou kloppen met niets.
  Wikipedia heeft voor sommige seizoenen alleen onze eigen wedstrijden.
- **Alternatieven:** een zin dat we de plek per ronde niet hebben; de lijn tonen en een aftrek vermelden.

## "Onze plek door de jaren" verhuist naar Cijfers

- **Datum:** 9 november 2026
- **Besluit:** de kaart `FinalPlacesCard` staat op Cijfers, direct onder "Onze plek in de competitie", in de hoofdkolom, en is op elke seizoenspagina van Cijfers dezelfde.
  Zijn link staat in "Op deze pagina:" van Cijfers en niet meer in die van Wedstrijden.
  Het anker `onze-plek-door-de-jaren` blijft, en het oude adres op Wedstrijden vervalt zonder omleiding (de site is nog niet openbaar).
  Cijfers heeft nu twaalf kaarten, zes in elke kolom.
  Later kan de kaart naar `/seizoenen` (#782).
- **Waarom:** het is een kaart met cijfers, en #768 zet die op Cijfers.
  Wachten op `/seizoenen` laat de kaart zonder plek.
- **Alternatieven:** wachten op `/seizoenen` (#414 en #782 zijn nog niet gebouwd); op Wedstrijden laten staan.
- **Later:** vult _Een kaart staat op de pagina van de zaak die hij beschrijft, en de hoofd- en zijkolom hebben vaste rollen_ (6 november 2026) aan: de zijkolom van Wedstrijden heeft nu Stand, Onze plek per speelronde en de bronvermelding, met Hoofdtrainer tussen de laatste twee.

## De lijst met wedstrijden in het beheer heeft één link per regel, die volgt uit de staat

- **Datum:** 8 november 2026
- **Besluit:** in de lijst met wedstrijden in het beheer is de naam van de wedstrijd de enige link.
  Het doel volgt uit de staat: het scherm Bijhouden vanaf de aftrap tot twee uur later (daarna mist de wedstrijd zijn uitslag, en is hij niet meer "live"), het verslag als de wedstrijd er een kan hebben (`mayHaveReport`), anders de pagina van de wedstrijd.
- **Waarom:** de naam en "Openen" gingen naar net andere pagina's, en drie links per regel waren onduidelijk.
  De redacteur wil bijna altijd naar het verslag, en tijdens de wedstrijd naar Bijhouden.
- **Alternatieven:** de naam altijd naar de pagina van de wedstrijd, met daar een blok voor het verslag (een klik meer); de naam plus één actielink per regel (nog steeds twee links).

## De kolom Verslag heeft gewone woorden

- **Datum:** 8 november 2026
- **Besluit:** de staat van het verslag heet "Geen", "Niet af", "Klaar" of "Live", en een verslag dat niet meer past heet "Klopt niet".
  De tag "Live" naast de staat is weg: "Live" is zelf de staat.
- **Waarom:** "Leeg", "Bezig" en "Controleer" zeiden niet wat er aan de hand was.
- **Alternatieven:** de oude woorden houden met een legenda boven de tabel.

## Uitslag en Status zijn één kolom, met alleen tags die om actie vragen

- **Datum:** 8 november 2026
- **Besluit:** de kolom Uitslag toont de stand, of anders "Gepland", "Uitgesteld" of "Geannuleerd".
  Alleen "Uitslag ontbreekt", "Wikipedia wacht" en "Wikipedia wijkt af" staan als tag in de regel; "Aangepast" staat alleen in het filter en op de pagina van de wedstrijd.
- **Waarom:** "Gespeeld" naast elke uitslag herhaalt zich, en "Aangepast" vraagt geen actie.
- **Alternatieven:** de kolommen samenvoegen en alle tags houden.

## Datum, tijd, competitie en ronde staan als één regel onder de naam van de wedstrijd

- **Datum:** 8 november 2026
- **Besluit:** de lijst heeft geen kolommen Datum en Competitie meer.
  Onder de naam staat één korte regel zonder jaar, zoals "za 1 nov, 20.00 · Eredivisie, ronde 11"; een wedstrijd zonder tijd toont alleen de korte datum.
- **Waarom:** de kolommen herhaalden zich in elke regel en namen op een telefoon de meeste ruimte.
- **Alternatieven:** groeperen per maand (veel tabellen voor een schermlezer); kortere tekst in aparte kolommen; de competitie alleen noemen als het niet de Eredivisie is.
- **Later:** deze beslissing vervangt de kolommen Datum en Competitie die onder de naam inklapten (zie de beslissing over de lijst in het beheer van eerder).

## De kaart Het moeilijkst is een eigen kaart onder Gemiddeld resultaat, berekend met `hardestOf`

- **Datum:** 9 november 2026
- **Besluit:** de zijkolom van Tegenstanders toont onder `TopPointsCard` de zachte kaart `HardestCard`, die niets rendert als `hardestOf` in `src/opponents.ts` geen plaatsen geeft.
  `hardestOf` gebruikt dezelfde punten (`pointsOf`), hetzelfde minimum (`topPointsMinimum`) en dezelfde volgorde op de echte verhouding als `topPointsOf`, maar dan laag naar hoog, met de vijf laagste, zonder database.
  Heeft minder dan `topPointsPlaces` (10) clubs het minimum, dan zijn `places` leeg en `played` 0.
  De regels voor wat bezoekers zien staan in _De kaart Het moeilijkst toont de vijf clubs met de minste punten, vanaf 10 clubs_ in `redactie.md`.
- **Waarom:** een eigen kaart en een eigen functie houden de top 10 zoals hij was, en de kaart verdwijnt zonder lege staat, want een zin "geen clubs" zou hier niets toevoegen.
- **Alternatieven:** `topPointsOf` laten kiezen tussen boven- en onderkant (de teruggegeven vorm wordt dan voor twee dingen gebruikt); de kaart een zin laten tonen als er te weinig clubs zijn.

## Het aantal toeschouwers staat als feit op de pagina van een wedstrijd, met de bron en de melding dat het een schatting is

- **Datum:** 9 november 2026
- **Besluit:** de pagina van een gespeelde wedstrijd toont "Toeschouwers" bij de feiten, thuis en uit: een getal met punten als duizendtallen, "Zonder publiek" bij `0` en niets bij een leeg veld.
  Onder de pagina staat de zin "Het aantal toeschouwers is een schatting, volgens Wikipedia." zodra er een aantal is.
  `Match` en `ShortMatch` en de lijsten tonen het niet (#416).
- **Waarom:** het is een feit over één wedstrijd waar weinig supporters in een lijst op letten, en een lijst wordt er op een telefoon vier regels langer van.
  Redacteuren van Wikipedia schatten het aantal en stellen het bij, dus we noemen het een schatting.
- **Alternatieven:** het aantal in de regel van elke wedstrijd; "onbekend" tonen bij een leeg veld.

## De kaart Selectie toont de spelers uit de verslagen alleen als ze de beste bron zijn

- **Datum:** 9 november 2026
- **Besluit:** de kaart Selectie toont een speler met de bron `verslag` alleen als `verslag` de beste bron van het seizoen is in `squad_completeness` (`cardPlayers` in `src/season-squad.ts`, #935).
  "Alle spelers" toont iedereen uit de verslagen, wat de bron van het seizoen ook is.
  - Bij `verslag` zegt de zin onder de kop waar de lijst vandaan komt, zonder percentage:
    "We kennen 25 spelers van dit seizoen, uit de verslagen. Wie niet speelde, ontbreekt waarschijnlijk."
    Er komt geen bronvermelding bij, want de gegevens zijn van onszelf.
  - Zonder rugnummers en posities is de kaart één lijst met alleen namen, zonder koppen.
  - Een seizoen zonder rij blijft "onbekend" zonder lijst.
- **Waarom:** een seizoen met verslagen mag geen leeg vak hebben, maar een lijst uit de zwakste bron mag niet naast een echte selectie staan: een gemengde lijst zegt niet meer waar de spelers vandaan komen.
- **Alternatieven:** spelers uit verslagen onder een echte selectie bijvoegen; spelers groeperen naar wat de verslagen zeggen, zoals doelmannen uit de opstelling (gokwerk).

## De homepage kiest zijn kaartvlakken op soort inhoud, en dit geldt alleen voor de homepage

- **Datum:** 9 november 2026
- **Besluit:** op de homepage is het eigen stuk van de redactie warm, zijn nieuws, discussies en podcasts wit (redactionele inhoud) en zijn Wedstrijden en Stand zacht (wedstrijdcijfers naast de hoofdkolom).
  `ArticleCard` krijgt warm als standaardvlak, want het wordt alleen op de homepage gebruikt.
  `MatchesCard` en `StandingsCard` krijgen zelf het zachte vlak, want ze worden alleen op de homepage gebruikt (#979).
- **Waarom:** het eigen stuk van de redactie is iets opmerkelijks (regel 3 van _De vier vlakken van een kaart hebben een betekenis_), en Wedstrijden en Stand vullen de pagina aan (regel 4).
  De regel "de blokken van de homepage zijn allemaal wit" gaf de homepage te weinig aanwijzingen over wat bij elkaar hoort.
  Een kaart die alleen op één plek staat, krijgt zijn vlak in het onderdeel zelf, zodat de pagina er niets voor hoeft door te geven.
- **Geen algemene regel:** het vlak van een kaart hangt van de pagina af.
  Wat voor de homepage klopt, hoeft niet te kloppen voor de pagina's van wedstrijden, spelers en statistieken: daar zijn cijfers de hoofdinhoud, en een pagina met alleen zachte of blauwe kaarten helpt niemand.
  De regels van 1 november 2026 blijven daar zoals ze zijn.
- **Stand, eigen rij:** de lichtblauwe vulling van onze eigen rij (`--hf-colour-background-highlight`) haalt 1,11:1 op het zachte vlak (op wit 1,21:1).
  Dat blijft zo: de vulling is decoratief, en de donkerblauwe balk aan het begin van de rij en de tekst maken de rij herkenbaar.
- **Donker:** zacht en wit zijn daar gelijk (blauw-900), dus alleen Van de redactie verandert (warm is blauw-800).
  Het scheiden van de vlakken in donker is een eigen issue.
- **Contrast:** alle tekst haalt minstens 5,9:1, in licht en in donker.
  De randen van de kaarten en de lijnen tussen rijen zijn decoratief.
- **Alternatieven:** `surface="warm"` meegeven vanuit `page.tsx` en `ArticleCard` zacht laten; Wedstrijden en Stand alleen op de homepage zacht maken met een prop of een `surface` vanuit de pagina (beide: meer code op de pagina voor een onderdeel dat nergens anders staat); de eigen rij in Stand een sterkere vulling geven (niet nodig, de balk draagt de betekenis); alle homepagekaarten wit laten.

## De kaart Laatste nieuws toont de koppen van de laatste 3 dagen, minstens 5 en hoogstens 20

- **Datum:** 9 november 2026
- **Besluit:** de kaart Laatste nieuws op de homepage toont de koppen van de 72 uur tot nu, minstens 5 en hoogstens 20.
  Onder de kop staat "N artikelen over de laatste T dagen".
  T is de ouderdom van de oudste getoonde kop in hele dagen, naar boven afgerond, minstens 1, met enkelvoud bij 1 ("1 artikel", "de laatste dag").
  De regel heeft de stijl `meta`.
  De link onder de lijst heet "Al het nieuws".
- **Waarom:** op acceptatie (25 oktober tot 9 november 2026, 106 koppen) had een venster van 3 dagen minstens 3, meestal 15 en in 90% van de uren hoogstens 21 koppen, met een piek van 51 na de 5-3 tegen Feyenoord.
  Tien vaste koppen verborgen toen 33 koppen, en reikten op rustige dagen een week terug.
  Met 3 dagen en 5 tot 20 toont de kaart meestal 16 koppen, en knipt het maximum in ongeveer 16% van de uren af.
  Een T die de echte ouderdom van de lijst volgt, klopt altijd, ook als de 5 of de 20 de lijst bepaalt.
  Een venster van 72 uur verspringt niet om middernacht, anders dan kalenderdagen.
  "Al het nieuws" is beter Nederlands dan "Alle nieuws".
- **Gevolg:** `getHeadlines` haalt de 20 nieuwste koppen op (vijf minuten in het geheugen), en `headlinesOfTheWindow` in `src/headlines.ts` kiest er bij elk bezoek de lijst uit, zodat het venster met de klok meeloopt.
  `firstHeadlines` is vervangen door `fewestHeadlines`, `mostHeadlines` en `headlineWindowDays`.
- **Alternatieven:** 4 dagen met hoogstens 30 koppen (meer nieuws, maar een langere homepage).
  Altijd "3 dagen" in de regel, ook als de lijst verder teruggaat of korter is.
  De regel weglaten als de 5 of de 20 geldt.
  Kalenderdagen in Nederlandse tijd, of "vandaag" bij één dag.
  De regel in dezelfde grootte als de koppen.

## De kaart Wedstrijden op home toont de vorige ontmoeting, de vorm van de tegenstander en de scheidsrechter

- **Datum:** 9 november 2026
- **Besluit:** onder de clubs van de volgende wedstrijd staan twee regels in kleine tekst, en de regel van een gespeelde wedstrijd eindigt met de scheidsrechter:
  - "Vorige keer: 12 apr 2026, 2–1": de laatste gespeelde wedstrijd tegen die club op dezelfde grond (thuis of uit), uit alle competities en alle seizoenen, met het archief van de oude fansite erbij.
    De thuisclub staat eerst in de uitslag.
    De uitslag is vet in de kleur van de uitkomst voor sc Heerenveen, en een schermlezer hoort "2 tegen 1".
    Zonder eerdere ontmoeting is er geen regel.
  - "Vorm <club>: W G V W G": de laatste vijf competitieuitslagen van de tegenstander, de oudste eerst, uit `league_results` (met onze eigen wedstrijden erbij).
    Er zijn er minder dan vijf als de tegenstander er minder speelde, en geen regel zonder uitslag, zoals bij een bekertegenstander uit een lagere divisie of een promovendus in de eerste ronde.
    Er is geen terugval op vorig seizoen.
  - De scheidsrechter staat zonder label aan het eind van de laatste regel: "Eredivisie · Speelronde 2 · Danny Makkelie".
    De volgende wedstrijd toont hem ook als Wikipedia hem al noemt (de projecteigenaar, 9 november 2026); zonder naam toont een wedstrijd niets.
  - Geen kop, geen doelpuntenmakers en dus geen legenda in dit deel van de kaart.
  - De bronregel van de kaart vervalt.
    De kaart Stand heeft de bronvermelding "Wedstrijden en stand: Wikipedia", met het archief erbij als de vorige ontmoeting daaruit komt (`WikipediaCredit` met `archive`).
    Eén regel voor de twee kaarten naast elkaar voldoet aan principe 4 van de Redactie: de bron staat op de pagina.
- **Waarom:** supporters vragen zich voor een wedstrijd af hoe het de vorige keer ging en hoe de tegenstander speelt.
  De scheidsrechter is een feit dat in de media bij elke wedstrijd staat.
  De query en de tests staan in `apps/site/src/upcoming-match.ts` en `findPreviousMeeting` in `packages/db`, en de kaart krijgt ze van de pagina, zodat `MatchesCard` geen database kent.
  Als de query mislukt, staat de kaart zonder de twee regels en logt de site waarom.
- **Gevolg:** de scheidsrechter staat alleen op de kaart op home.
  De lijsten Wedstrijden en de pagina's van clubs tonen hem niet; de projecteigenaar kijkt later of dat ook moet.
  `Match` heeft de props `referee` en `extra` (zie de beslissing in `designsysteem.md`).
- **Alternatieven:** de vorm laten terugvallen op vorig seizoen (een andere ploeg en een andere stand); alleen competitiewedstrijden tellen voor "Vorige keer" (mist de bekerontmoeting van vorige maand); een eigen kop met een tabel (te zwaar voor de kaart); de scheidsrechter meteen in elke lijst (de regel wordt overal een regel langer, wat #416 juist wilde voorkomen).

## Een redacteur kan een twijfelgeval of een bericht dat het filter weghoudt op de site zetten

- **Datum:** 9 november 2026
- **Besluit:** `items` krijgt `approved_at` en `approved_by` (de moderator).
  Een bericht staat op de site als `hidden_at IS NULL` en (`relevance = 'relevant'` of `approved_at IS NOT NULL`).
  Verbergen wint van goedkeuren.
  De importer raakt `approved_at` en `approved_by` nooit aan, ook niet als het filter later anders oordeelt.
  `isShown` in `@fansite/db/queries` en `isOnSite` in `apps/site/src/beheer/items.ts` volgen die regel, en een goedgekeurd bericht telt ook mee bij een verhaal met meerdere versies.
- **Besluit:** elke moderator met een beheerrol (dezelfde rollen als bij verbergen) kan een twijfelgeval of een "niet over de club"-bericht goedkeuren, zonder reden, met de knop "Op de site zetten".
  Het logboek (`audit_log`) krijgt de acties `item.approve` en `item.unapprove`.
- **Besluit:** een goedgekeurd bericht kan weer van de site worden gehaald met "Terug naar het oordeel van het filter": `approved_at` en `approved_by` worden leeg, en het bericht is weer wat het filter zei.
  Een bericht dat de import `relevant` vond, is niets om goed te keuren: `approveItem` doet er niets mee (`unchanged`).
- **Waarom:** een eigen kolom overleeft elke import en laat in de database zien wie het deed.
  Zonder reden is het één klik, en het logboek bewaart wie en wanneer.
  De moderator hoeft geen gelijk te halen op het filter.
- **Alternatieven:** `relevance` zelf overschrijven (gaat tegen de import in, die het bij elke run opnieuw bepaalt); een reden verplichten zoals bij verbergen; de goedkeuring laten vervallen als het filter van mening verandert (een keuze van een mens verdwijnt dan ongemerkt).
- **Gevolg:** het beheer heeft geen scherm voor het logboek, dus de twee acties staan alleen in `audit_log`.

## Het zicht op de kwaliteit komt eerst in het beheer

- **Datum:** 9 november 2026
- **Besluit:** de pagina met de kwaliteit van de gegevens per seizoen, `/beheer/kwaliteit`, is alleen voor de redactie (#972).
  Later krijgt elke seizoenspagina een zin over wat we weten, zoals de kaart Selectie al doet.
- **Waarom:** de werklijsten zijn voor de redactie, en een bezoeker heeft genoeg aan één zin.
- **Alternatieven:** de tabel meteen openbaar.

## De werklijsten van de kwaliteit zijn eigen pagina's, en een cel zegt in woorden wat ze telt

- **Datum:** 9 november 2026
- **Besluit:** een werklijst heeft een eigen adres, `/beheer/kwaliteit/<seizoen>/<lijst>`, en is geen filter van `/beheer/wedstrijden` (#972).
  De tabel van de seizoenen is een `DataTable` met tekst waarvan elke kolom kan inklappen.
  Een cel is daarom een hele zin, zoals "2 doelpunten zonder speler" en "Geen spelers", en geen los getal.
  De tabel heeft zes kolommen: de koppelingen naar de werklijsten staan samen in de laatste, Te doen.
  `similarPersons` staat nu in `@fansite/db/persons`, zodat de site en de importer dezelfde functie gebruiken.
- **Waarom:** de lijst van `/beheer/wedstrijden` opent op wat er vandaag te doen is, en haar filters gaan over de uitslag en over Wikipedia.
  Vier filters erbij maken haar drukker voor wie een uitslag invult.
  Een tabel met zes kolommen past niet op een telefoon, en het beheer schuift nergens opzij.
  Met een kolom voor elk getal, negen in totaal, paste ze ook niet in de brede kolom van een bureaublad.
  Een ingeklapte cel staat zonder haar kolomkop onder het seizoen, dus ze moet zelf zeggen wat ze telt.
- **Gevolg:** de rijkop van een tabel met tekst houdt in het designsysteem ruimte voor zeven tekens (`data-table.css`).
  Zonder die regel brak de tabel een seizoen als `2025/26` in tweeën, naast kolommen vol tekst.
- **Alternatieven:** vier filters erbij in `/beheer/wedstrijden`; een tabel met getallen en afkortingen die opzij schuift; `similarPersons` in de site nog een keer schrijven.

## Spelers voegt de redactie toe door een persoon te kiezen of te maken

- **Datum:** 9 november 2026
- **Besluit:** de redactie voegt een speler toe aan een seizoen door een bestaande persoon te kiezen of een nieuwe te maken, met voor- en achternaam, rugnummer, positie en een optionele Wikipedia-pagina (#1020).
  Land, geboortegegevens en vertrek blijven bij de import.
- **Waarom:** dezelfde persoon in meer seizoenen telt als één doelpuntenmaker (#716), en de import leest de rest.
- **Alternatieven:** alleen bestaande personen (een speler zonder pagina zou onmogelijk zijn), of alleen een vrije naam per seizoen (geen persoon, dus een gesplitste doelpuntenmaker).

## Een speler van de redactie is zichtbaar voor bezoekers, met de bron `redactie`

- **Datum:** 9 november 2026
- **Besluit:** hij staat in de selectie en bij de doelpuntenmakers, met de bron `redactie`, zoals een wedstrijd van de redactie (#999).
  De pagina Spelers toont hem met dezelfde bronvermelding als de andere spelers: de bron staat in de gegevens, niet in een eigen regel op de pagina.
- **Waarom:** een doelpunt zonder speler op de site is een gat dat we juist willen dichten.
- **Alternatieven:** alleen in het beheer te kiezen, maar dan blijft de selectie onvolledig voor bezoekers.

## Het formulier van een speler zoekt eerst een persoon, en weigert wat het niet veilig kan

- **Datum:** 10 november 2026
- **Besluit:** `/beheer/spelers/nieuw` heeft een zoekformulier met methode GET, en wat het vindt staat als `Select` "Persoon" in het formulier van de speler, met "Een nieuwe persoon" als laatste keuze (#1020).
  - **Verplicht is alleen de achternaam** van een nieuwe persoon.
    Voornaam, tussenvoegsel, Wikipedia-pagina, rugnummer en positie mogen leeg blijven.
  - **De Wikipedia-pagina** is de titel van het artikel, zoals de redactie hem invult.
    De site vraagt Wikipedia niets, en een adres in plaats van een titel wordt geweigerd.
  - **Aanpassen:** een andere naam geldt ook voor de persoon, in elk seizoen.
    Een pagina geeft een persoon zonder titel zijn titel, en een speler zonder persoon de persoon van die titel.
    Een pagina van een andere persoon, en een andere pagina voor een persoon die er al een heeft, weigert het formulier.
    **Later:** sinds 10 november 2026 heeft de weigering van een pagina van een andere persoon een link naar het samenvoegen; zie _De redactie voegt twee personen samen in het beheer_.
    Een speler zonder persoon en zonder pagina krijgt bij het aanpassen geen persoon.
  - **Uit de selectie halen** zet `in_squad` uit en laat de rij staan, na een bevestiging in een uitklapblok.
    Een speler met een doelpunt, een optreden in een verslag of cijfers in de tabel kan niet weg: de pagina toont dan geen knop, en zegt waarom.
  - **De lijst** van een seizoen is een `DataTable` met tekst waarvan elke kolom behalve de naam kan inklappen.
    Een cel zegt daarom in woorden wat ze bevat, zoals "Rugnummer 7" en "Positie onbekend".
  - **Het logboek** krijgt `player.add`, `player.edit` met wat er veranderde, of `player.remove`; een opslag die niets verandert, schrijft niets.
- **Waarom:** een zoeklijst als gewone `Select` werkt zonder JavaScript en met elk hulpmiddel, en het designsysteem heeft geen zoekveld met suggesties.
  De seizoenen tot 2006 hebben geen rugnummers en vaak geen posities, dus die velden kunnen niet verplicht zijn.
  Twee personen samenvoegen raakt doelpunten in elk seizoen en heeft een eigen issue (#1027).
  **Later:** sinds 10 november 2026 voegt de redactie twee personen samen in het beheer (#977); zie _De redactie voegt twee personen samen in het beheer_.
  Een speler met doelpunten hoort bij het seizoen: zijn vertrek uit de selectie leest de import.
- **Gevolg:** wat de import doet met een speler die de redactie toevoegde of aanpaste, regelt #1022; tot dan kan een run een aangepast veld van een speler uit Wikipedia overschrijven.
  De link vanuit een doelpunt en vanuit de werklijst naar dit formulier komt met #1021.
- **Later:** die link is er: zie _De weg naar een nieuwe speler begint bij de plek waar hij ontbreekt_ (9 november 2026) en _De link naar een nieuwe speler opent een nieuw tabblad_ (10 november 2026).
- **Alternatieven:** een `datalist` bij een tekstveld (schermlezers lezen de suggesties niet overal voor).
  Elke persoon in één lijst (duizenden keuzes).
  Bij het aanpassen een speler naar de persoon van een andere pagina verplaatsen (een stille samenvoeging).
  Elke speler zonder persoon bij het aanpassen een persoon geven (dezelfde oude speler zou in elk seizoen een eigen persoon krijgen).

## De weg naar een nieuwe speler begint bij de plek waar hij ontbreekt

- **Datum:** 9 november 2026
- **Besluit:** de kiezer van de speler in het doelpunt en de werklijst "doelpunten zonder speler" van de pagina Kwaliteit leiden naar het formulier van een speler (#1021).
  De redactie komt daarna terug bij de wedstrijd.
- **Waarom:** de redactie merkt een ontbrekende speler op in de wedstrijd of in de lijst, niet op een pagina met alle spelers.
- **Alternatieven:** een speler in het doelpunt zelf aanmaken (een formulier in een formulier, minder toegankelijk).

## De link naar een nieuwe speler opent een nieuw tabblad

- **Datum:** 10 november 2026
- **Besluit:** de link "De speler staat er niet in? Voeg hem toe aan de selectie van `<seizoen>`" in de kaart Doelpunten van een wedstrijd opent `/beheer/spelers/nieuw` in een nieuw tabblad, en de naam van de link zegt dat (#1021).
  - **De weg terug:** het adres heeft het nummer van de wedstrijd (`wedstrijd`).
    Na het opslaan, en met "Annuleren", komt de redactie in dat tabblad op het formulier van die wedstrijd, met een melding.
    Het nummer telt alleen als de wedstrijd bestaat en bij het seizoen van de speler hoort (`findReturnMatch` in `src/beheer/player-return.ts`); anders eindigt het formulier op de lijst van de spelers.
  - **Het eerste tabblad** houdt wat de redactie al invulde.
    Elke keer dat de redactie daar terugkomt, vraagt de pagina de selectie opnieuw aan de server (`router.refresh`).
    De nieuwe speler staat dan in de kiezer van elk doelpunt.
    Zonder JavaScript gebeurt dat niet: de redactie gaat dan verder in het nieuwe tabblad.
  - **De link staat één keer** in de kaart, onder de uitleg, en niet bij elk doelpunt.
  - **De werklijst** leidt naar de kaart Doelpunten van de wedstrijd (`#doelpunten`) en toont in een eigen kolom de naam waarmee elk doelpunt binnenkwam.
    Een seizoen zonder spelers krijgt een zin boven de rijen, met een link naar de spelers van dat seizoen.
- **Waarom:** een doelpunt van ons zonder speler kan het formulier niet opslaan, dus eerst opslaan en dan naar de speler gaan werkt juist niet in het geval waar het om gaat.
  Een nieuw tabblad laat het formulier staan zoals het is, ook zonder JavaScript.
  Een link die een tabblad opent zonder dat te zeggen, verrast wie een schermlezer gebruikt.
  Eén link is genoeg: de pagina gaat over één wedstrijd en één seizoen, en een link per doelpunt herhaalt hetzelfde adres.
- **Alternatieven:** het formulier eerst opslaan (weigert op het doelpunt zonder speler, en vraagt een reden voor een half ingevuld formulier).
  De invoer bewaren in `sessionStorage` en na terugkomst terugzetten (werkt alleen met JavaScript, en de invoer van een ander bezoek kan blijven hangen).
  De invoer bewaren op de server als concept (een tabel erbij voor iets wat minuten leeft).
  Een link bij elk doelpunt.

## De kaart Selectie heeft een eigen zin voor een lijst uit doelpunten en van de redactie

- **Datum:** 10 november 2026
- **Besluit:** is de beste bron van het seizoen `doelpunten` of `redactie`, dan zegt de zin onder de kop:
  "We kennen N spelers van dit seizoen: wie scoorde of door de redactie is toegevoegd.
  De selectie is niet compleet." (#1040).
  De zinnen voor de andere bronnen veranderen niet.
  Beheer rekent de rij van het seizoen opnieuw uit na het toevoegen, wijzigen en uit de selectie halen van een speler.
  Mislukt dat, dan blijft de wijziging van de speler staan en komt er een waarschuwing in het logboek.
- **Waarom:** de lezer ziet waar de lijst vandaan komt, zoals bij de verslagen.
  De zin van `weinig` ("vooral wie scoorde of overkwam") klopt niet voor spelers die de redactie toevoegde.
  De kaart leest alleen de rij (_De kaart Selectie toont de spelers uit de verslagen alleen als ze de beste bron zijn_): de fix zit in de beoordeling.
- **Alternatieven:** de bestaande zin van `weinig` houden; Beheer laten falen als de rij niet lukt (een speler die de redactie niet kan toevoegen om een reden die haar niet raakt).

## De kaart Selectie toont de positie en het land van het seizoen, en anders die van de persoon

- **Datum:** 10 november 2026
- **Besluit:** `listSeasonPlayers` geeft de positie van de rij van het seizoen, en anders de linie van de persoon (#1051).
  Het land werkt op dezelfde manier: `players.country`, en anders `persons.country`.
  Een speler zonder beide staat onder "Positie onbekend", zoals eerder, en een speler zonder land houdt een lege plek.
  Het besluit over de gegevens zelf staat in `importer.md`, onder _Een persoon heeft een linie en een land, en een seizoen kan afwijken_.
- **Waarom:** een speler zonder positie in een seizoen viel weg uit de lijst per positie, terwijl we zijn linie wel kenden.
- **Alternatieven:** de linie van de persoon naar elke rij van een seizoen kopiëren (dezelfde gegevens op tientallen plekken, en een verbetering komt niet overal aan).

## Het beheer zet de linie en het land van een persoon in het formulier van een speler

- **Datum:** 10 november 2026
- **Besluit:** het formulier van een speler heeft onder "Wie" de velden "Linie" en "Land", elk met de keuze "Onbekend" (#1051).
  Een waarde die afwijkt van wat de persoon heeft, krijgt de bron `manual`, en de importer vervangt hem nooit.
  Leegmaken haalt de waarde en de bron weg, zodat de importer hem bij de volgende run weer aanvult.
  Een waarde die de redacteur niet verandert, houdt zijn bron.
  De wijziging staat in het logboek van het beheer, in de regel van de speler (`player.edit` of `player.add`): "linie van de persoon: geen → verdediger".
  "Positie" onder "In dit seizoen" blijft het veld voor een seizoen dat afwijkt.
- **Eigen keuzes bij het bouwen:**
  - **Toevoegen:** het formulier dat een speler toevoegt, weet niet wat een persoon uit de lijst al heeft.
    "Onbekend" laat daar dus staan wat de persoon heeft, en alleen een gekozen waarde verandert iets.
  - **Geen persoon:** een speler zonder persoon heeft de twee velden niet.
    Krijgt hij in dezelfde keer een persoon, via een Wikipedia-pagina, dan houdt die persoon wat hij heeft.
  - **Het land** is een gewone keuzelijst op de Nederlandse naam, met de landcode erachter: "Nederland (NL)".
    De namen komen uit `Intl.DisplayNames` op de server, en de codes uit `@fansite/shared/countries`.
    Een keuzelijst van de browser werkt met toetsenbord en schermlezer, en wie de eerste letters typt, vindt het land.
  - **Samenvoegen:** voegt de importer twee personen samen, dan gaat een linie of land van de redactie voor op een van een andere bron.
- **Waarom:** de redactie verbetert zo één keer wat voor elk seizoen geldt, op de plek waar ze de speler al aanpast.
- **Alternatieven:** een eigen pagina per persoon (meer dan dit issue vraagt; de werklijst van #1053 komt daarvoor).
  Een zoekveld met suggesties voor het land (vraagt JavaScript en eigen toetsenbordgedrag, voor een lijst die de browser al goed bedient).
  Een bestand met Nederlandse landnamen in de repository (250 namen die de runtime al kent).

## Acceptatie is voorlopig de leidende omgeving voor wat de redactie invult

- **Datum:** 10 november 2026
- **Besluit:** wat het beheer op acceptatie invult, komt in productie doordat productie eenmalig start met de database van acceptatie.
  Er komt dus geen lijst in de repository voor wat de redactie invult, en geen uitvoer om over te nemen.
  Het besluit geldt voor #1051, #1052 en #1053; de overdracht zelf hoort bij de lancering (#33).
- **Waarom:** de redactie vult de linies en landen één keer in, op de omgeving die er nu is.
- **Alternatieven:** lijsten in de repository (`personLines` en een lijst voor landen) waar elke omgeving ze uit leest.
  Op productie opnieuw invullen.

## Een werklijst in het beheer vult de linie en het land van personen aan

- **Datum:** 10 november 2026
- **Besluit:** de redactie vult de gaten in op `/beheer/kwaliteit/personen`, een pagina van het beheer, en niet in een gesprek met een agent (#1053).
  De pagina heeft twee lijsten, de personen zonder linie en de personen zonder land, met bovenaan hoeveel er nog zijn.
  Een rij heeft vier knoppen voor de linie, of een keuzelijst van landen met een knop, en slaat op bij een tik.
  - **Opslaan bij de rij:** de lijst is een onderdeel in de browser, en elke rij heeft een eigen formulier.
    Een keuze slaat alleen die rij op, haalt haar uit de lijst en laat de andere rijen staan zoals de redactie ze achterliet.
    De pagina laadt daarbij niet opnieuw.
    Een regel boven de lijst zegt wat er is opgeslagen en hoeveel er nog zijn, ook voor een schermlezer, en de focus gaat naar de volgende persoon.
    Een fout staat bij de rij zelf en krijgt de focus.
    Zonder JavaScript is een keuze een gewone POST, waarna de pagina de lijst van dat moment toont.
  - **Alleen wat leeg is:** de lijst vult aan en verbetert niet.
    Heeft de persoon de linie of het land intussen al, van een import of van een andere beheerder, dan verandert er niets en zegt de rij dat.
    Verbeteren doet de redactie in het formulier van een speler.
  - **Overslaan:** "Sla over" zet de persoon onderaan het deel van de lijst dat op het scherm staat.
    Dat onthoudt alleen de browser: laadt de pagina opnieuw, dan staat de persoon weer op zijn plek.
  - **Het land:** een keuzelijst van de browser met twee groepen, eerst de landen die onze personen al hebben en dan de andere, elk op naam met de landcode erachter.
    Kiezen en opslaan zijn twee stappen: een lijst die bij elke keuze opslaat, slaat met het toetsenbord bij elke pijltjestoets op.
  - **Volgorde en delen:** de personen van de nieuwste seizoenen staan eerst, daarna op naam, en wie in geen selectie staat komt laatst.
    Een lijst van meer dan 50 personen staat in delen van 50, met een link naar het volgende deel.
  - **Grote knoppen:** het beheer is compact, met knoppen en velden van 36 pixels hoog.
    Deze lijst is voor een duim op een telefoon, dus de kaarten van de lijst zetten de hoogte terug op 44 pixels, met het token `--hf-size-control`.
  - **Het logboek:** een keuze schrijft de nieuwe actie `person.edit`, met de persoon in `item_id` en de naam en de waarde in `detail`.
    De migratie `0067_add_person_edit_action` voegt de actie toe.
    De keuze krijgt de bron `manual` (`setEditorsPersonFacts`), die geen import vervangt.
- **Waarom:** de lijst werkt op een telefoon, laat zien hoeveel er nog is, en het antwoord staat direct in de database, met een regel in het logboek.
  Opslaan bij de rij houdt het tempo erin: bij 79 personen zonder linie is elke keer een nieuwe pagina te traag.
- **Alternatieven:** een quiz in een chat (geen overzicht, en elk antwoord moet nog worden overgezet).
  Alleen het formulier van een speler (te veel stappen per persoon).
  Na elke keuze de pagina opnieuw laden (wist wat de redactie in een andere rij al koos).
  De actie `player.edit` van een speler van de persoon gebruiken (een persoon zonder speler heeft er geen, en het logboek zou een speler noemen die niet veranderde).
  Een zoekveld met suggesties voor het land (zie het besluit over het formulier van een speler hierboven).

## De redactie voegt twee personen samen in het beheer

- **Datum:** 10 november 2026
- **Besluit:** de redactie voegt twee personen van één speler samen vanuit het formulier van een speler, op een bevestigingspagina (#977).
  Een speler die van naam verandert, heeft twee personen: de ene met de oude naam, de andere met de nieuwe.
  Tot nu toe was een samenvoeging een regel in `personTitleAliases`, en dus een pull request.
  - **Twee wegen, één pagina:** de weigering "Deze pagina hoort bij een andere persoon" heeft een link naar het samenvoegen met die persoon.
    Daarnaast heeft het formulier het blok "Dezelfde persoon als", waarin de redactie de andere persoon zoekt en kiest.
    Beide leiden naar `/beheer/spelers/samenvoegen`.
  - **De code van de importer:** het beheer voegt samen met `mergePersonInto` en `mergePlayerInto` uit `@fansite/db/person-merge`.
    `mergeChosenPersons` doet dat in één transactie met de regel in het logboek, en `planPersonMerge` rekent vooraf uit wat er gebeurt.
  - **De redactie kiest wie blijft:** de standaard is de persoon met een artikel op de Nederlandse Wikipedia, anders de oudste, en een link wisselt de twee om.
    De titel van de persoon die verdwijnt staat daarna in `person_pages`, zodat de import hem bij dezelfde persoon vindt.
  - **Welke waarde blijft:** een waarde van de redactie gaat voor, dan die van de persoon die blijft, en een leeg veld wordt uit de andere persoon gevuld.
    Dat is de regel van `mergePersonInto` sinds #1051, nu in `mergedPersonValues`; de bevestigingspagina toont elk verschil vooraf.
    De regel geldt nu ook voor de Wikipedia-pagina: blijft een persoon zonder pagina, dan krijgt hij de pagina van de andere.
    De importer liet altijd de persoon met de titel blijven, dus daar verandert niets.
  - **Geen ongedaan maken:** de bevestigingspagina en één regel `person.merge` in het logboek zijn de bescherming.
    De regel noemt beide personen met nummer, naam en titel, de spelersrijen en titels die verhuisden, de aantallen en de waarden die verdwenen.
    De migratie `0068_add_person_merge_action` voegt de actie toe.
  - **De knop noemt beide personen:** op de knop staat "Voeg X samen met Y", niet alleen "Voeg samen".
    Twee personen met dezelfde naam krijgen hun nummer erachter.
  - **Een tabel van drie kolommen:** het gegeven, de persoon die blijft en de persoon die verdwijnt, met kopcellen.
    Wat er daarna geldt, staat in zinnen onder de tabel, zodat de tabel op een telefoon past.
- **Waarom:** een samenvoeging die een pull request vraagt, is bij elke naamswijziging werk voor een Builder.
  Twee manieren om samen te voegen kunnen elkaar tegenspreken, dus het beheer en de importer delen één functie.
  Een vaste regel voor wie blijft, faalt bij twee personen zonder artikel of met twee artikelen.
  Terugdraaien vraagt een kopie van de verdwenen persoon en van elke verhuisde rij, en dat is veel meer werk dan een samenvoeging die zelden voorkomt.
  Een knop met alleen "Voeg samen" heeft een toegankelijke naam nodig die anders is dan de tekst die je ziet; met de namen op de knop zijn die twee gelijk.
- **Alternatieven:** een aparte pagina "Personen samenvoegen", los van de rij waar de redactie het probleem ziet.
  Alleen de lijst in de code, de weg die we verlaten.
  Altijd de waarde van de persoon die blijft (een waarde die de redactie instelde, gaat dan verloren).
  Een kopie bewaren en een knop "Maak ongedaan".
  Een vierde kolom "Na het samenvoegen" in de tabel (te breed voor een telefoon).

## De lijsten van het verslagformulier volgen de opstelling en staan op volgorde

- **Datum:** 10 november 2026
- **Besluit:** de lijsten met spelers in het formulier van een wedstrijdverslag staan op rugnummer en dan naam, spelers zonder rugnummer achteraan.
  "Eruit" toont alleen wie op dat moment op het veld staat, en "Rol" toont Basis en aanvoerder niet meer zodra een andere speler van dat team hem heeft (#1061).
  Dit is een hulp met JavaScript: de server houdt zijn regels.
  - **Volgorde:** dat geldt voor Eruit, Erin, doelpunten, assists, kaarten, gemiste strafschoppen en de serie.
    De waarde van een keuze blijft het nummer van de rij van de speler; alleen de volgorde van de lijst verandert.
  - **Eruit:** de spelers met de rol Basis of Basis en aanvoerder, plus wie in een eerdere wissel erin kwam, min wie in een eerdere wissel eruit ging en min wie al een rode of geel-rode kaart had.
    Het moment is de minuut met de blessuretijd.
    Bij hetzelfde moment gaat een wissel voor een kaart, en daarna telt de volgorde van de rijen, zoals de regel in `packages/shared`.
    Is de minuut nog leeg, dan telt de rij als laatste, en een kaart zonder minuut laat niemand van het veld gaan.
    De speler die de rij nu heeft, blijft in de lijst met de toelichting "staat dan niet op het veld", zodat er niets stilletjes verdwijnt en de server de fout kan melden.
  - **Rol:** de speler die Basis en aanvoerder heeft houdt de keuze, en haalt hij hem weg, dan komt hij terug bij de anderen van dat team.
  - **Een nieuwe rij** van de opstelling heeft vanaf rij 12 de rol Bank, bij beide teams.
    Een rol die al gekozen of opgeslagen is, verandert niet.
    Een rij die niemand aanraakte, telt als leeg met de rol van zijn plaats (`isUntouchedRow` krijgt het nummer van de rij), en na het weghalen van een rij krijgt zo'n lege rij de rol van zijn nieuwe plaats.
  - **Zonder JavaScript** toont het formulier alle keuzes, op volgorde, en maakt de server de lijsten opnieuw na elke knop en elke opslag.
    De server weigert twee aanvoerders (`captain-twice`) en een wissel van een speler die niet op het veld staat (`substitution-out-not-on-pitch`), met de fout bij het veld.
    De regel in `packages/shared` kende de rode kaart al, dus de lijst Eruit en de regel zeggen hetzelfde; een test vergelijkt ze.
  - **Erin vóór Eruit:** in de tabel van de wissels staat Erin voor Eruit, in het formulier, in de volgorde van de fouten en in de teksten die de volgorde noemen.
  - **Hints:** bij Eruit en bij Rol staat een korte tekst boven de tabel die zegt wat de lijst toont, gekoppeld met `aria-describedby`.
    `Field` laat daarvoor een beschrijving staan die het veld zelf meebrengt, voor de hint en de fout van het veld.
    Een schermlezer hoort een lijst die verandert niet apart: de keuzes zijn de opties van het veld, en de bestaande regel met `role="status"` blijft alleen voor wat al werd gemeld.
- **Waarom:** de eigenaar vult het verslag in zoals de wedstrijd verliep, en een lijst met wie niet kan, kost tijd en geeft fouten pas na het opslaan.
  Op rugnummer zoeken sluit aan bij de selectie.
- **Alternatieven:** sorteren op alleen naam (past niet bij hoe de selectie bekend is); kaarten niet meetellen bij Eruit (kleiner, maar dan blijft een speler in de lijst die niet meer op het veld kan staan); de keuze verbergen zonder de server te laten weigeren (zonder JavaScript zou dan niets meer worden gecontroleerd).

## De invoer van het verslag staat in `localStorage`, met een knop om te herstellen

- **Datum:** 10 november 2026
- **Besluit:** het formulier van een wedstrijdverslag bewaart bij het verlaten van een veld alle waarden onder de sleutel `fansite-verslag-<id van de wedstrijd>` in `localStorage`, met het moment van bewaren (#1062).
  Dit is de eerste keer dat er invoer van een formulier in staat; tot nu toe stonden er alleen de themakeuze (`fansite-theme`) en het teken van het menu (`fansite-beheer`).
  - **Wat erin staat:** een JSON-tekst met `savedAt` (het moment, in milliseconden) en `values` (de velden van het formulier, zoals `readReportValues` ze leest), en niets meer: geen adres, geen naam van de redacteur en geen gegevens van bezoekers.
    Er gaat geen verzoek weg.
    De tekst wordt alleen geschreven als hij verschilt van wat er stond, en waarden die gelijk zijn aan wat de server heeft, zijn geen invoer: dan gaat de sleutel weg.
  - **Wanneer hij weggaat:** na een geslaagde opslag, bij uitloggen en na dertig dagen.
    Een geslaagde opslag gaat naar de pagina met `?gedaan=opgeslagen`, `nog-niet-klaar`, `klaar`, `ongewijzigd` of `weggehaald`, en daar haalt `ReportDraftNotice` de sleutel weg.
    Dat gebeurt één keer per opslag: de browser onthoudt onder `fansite-verslag-<id>-opgeslagen` het moment van de opslag (`report.savedAt` van de server), zodat een pagina die opnieuw opent op hetzelfde adres invoer die daarna is getypt niet weghaalt.
    Die tweede sleutel bevat alleen dat moment en gaat bij uitloggen met de andere weg.
    Bij uitloggen leidt `logOut` naar `/beheer/inloggen?uitgelogd=1`, en `AdminMarker` haalt daar alle sleutels met `fansite-verslag-` weg, op dezelfde plek en op dezelfde manier als het teken van het menu.
    Een sessie die verloopt, haalt de invoer niet weg: de inlogpagina zonder dat woord laat hem staan, want daar is hij voor.
    Na dertig dagen haalt het lezen hem weg.
  - **Bij het openen:** wijkt de bewaarde invoer af van wat de server heeft, dan staat boven het formulier een melding met `role="status"` en twee knoppen, Herstel en Weggooien.
    Niets wordt stilletjes overschreven.
    Herstel zet de waarden in het formulier, zoals de toestand van het formulier dat ook doet na een knop, en laat de sleutel staan tot de opslag.
    Weggooien haalt de sleutel weg.
    De melding steelt bij het openen de focus niet; na een keuze gaat de focus naar de melding, want de knop is dan weg.
  - **Kapot of geblokkeerd:** is `localStorage` niet beschikbaar of de tekst kapot, dan werkt het formulier gewoon, zonder foutmelding; een kapotte tekst wordt weggehaald.
  - **Zonder JavaScript** gebeurt er niets in de browser, en de server geeft de ingevulde waarden terug na een fout, zoals voorheen.
  - **Alleen dit scherm:** het snelle scherm voor het bijhouden en het scherm voor geplakte tekst bewaren niets.
  - **De privacyverklaring** noemt het bij het teken van het menu, en de README van de site beschrijft de sleutel.
- **Waarom:** de server geeft de invoer alleen terug als hij antwoordt.
  Een verbroken verbinding, een time-out of een verlopen sessie verliest hem.
  Een melding met een keuze overschrijft niets wat de server heeft.
  Het gaat om de eigen invoer van een beheerder, op zijn eigen apparaat, in het beheer, dus de belofte aan bezoekers verandert niet.
- **Alternatieven:** automatisch herstellen (kan stil verbergen wat de server heeft); bewaren op de server (een nieuwe tabel en een verzoek bij elke wijziging, meer dan nodig); bewaren bij elke toets (meer schrijven, zonder winst); de invoer ook bij een verlopen sessie weghalen, zoals het teken van het menu (dan is hij juist weg in het geval waarvoor hij er is).
- **Later:** zie _De vorige wedstrijd is de meest recente eerdere wedstrijd, over seizoenen heen, en de knop vult alleen een lege opstelling_ (10 november 2026): de browser vergelijkt met wat de pagina bij het openen van de server kreeg, en bewaart ook wat de server na een knop teruggeeft.

## De vorige wedstrijd is de meest recente eerdere wedstrijd, over seizoenen heen, en de knop vult alleen een lege opstelling

- **Datum:** 10 november 2026
- **Besluit:** een knop in het formulier van een wedstrijdverslag neemt de formatie en de rijen van onze opstelling over uit de meest recente eerdere wedstrijd met een opstelling, ook uit een ander seizoen, en alleen als onze opstelling nog leeg is (#1063).
  - **De vorige wedstrijd:** de meest recente wedstrijd van sc Heerenveen vóór deze, op de datum van de aftrap, in elk seizoen en elke competitie, met een verslag waarin spelers van ons staan (`findPreviousLineUp`).
    Op dezelfde dag telt een wedstrijd alleen met een eerdere aftrap.
    Een wedstrijd zonder verslag of zonder opstelling wordt overgeslagen; de eerste wedstrijd van de reeks heeft geen voorganger, en dan is er geen knop.
  - **Wat de knop overneemt:** de formatie van ons, en de rijen van onze spelers: de speler, het rugnummer zoals het in de rij staat en de rol (ook Bank en Basis en aanvoerder).
    Wissels, doelpunten, kaarten, strafschoppen en de serie niet, en ook niets van de tegenstander.
    Een speler die niet in de selectie van dit seizoen staat, komt terug als Andere speler met zijn naam.
    De lezing is die van het formulier zelf (`valuesOfReport`), dus wat de knop invult is wat het formulier ook zou tonen bij die wedstrijd.
  - **Een gewone knop van het formulier:** `knop=opstelling-vorige`, zoals Speler toevoegen.
    Met en zonder JavaScript antwoordt de server met het formulier, na `findPreviousLineUp` op de wedstrijd die de server zelf kent; het formulier zegt alleen dat de knop is ingedrukt.
  - **Schrijft nergens overheen:** de knop staat er alleen zolang geen rij van onze opstelling iets heeft en er geen formatie is (`isEmptyLineUp`, met de rol van de plaats als leeg, zie _De lijsten van het verslagformulier volgen de opstelling en staan op volgorde_).
    Met JavaScript verdwijnt hij zodra de redacteur iets invult, en de server vult niets als de opstelling toch niet leeg is.
  - **Na de knop:** de focus staat op de kop van de kaart Opstelling en bank van sc Heerenveen, en een regel met `role="status"` in die kaart zegt "Opstelling overgenomen van" de tegenstander en de datum.
    De regel is er leeg voordat de knop is gebruikt.
  - **De invoer in de browser:** wat de server na een knop teruggeeft, is invoer die nog niet is opgeslagen, dus de browser bewaart hem zoals getypte invoer (de beslissing over de invoer van het verslag in `localStorage`).
    De melding Herstel en Weggooien gaat over wat er lag toen de pagina openging en vergelijkt met wat de pagina bij het openen van de server kreeg (`baseline`), niet met het laatste antwoord van de server.
    Dat is een aanpassing van die beslissing: eerder vergeleek de browser met het laatste antwoord, en dan ging een bewaarde invoer na een knop of een geweigerde opslag weer weg.
- **Waarom:** sc Heerenveen speelt vaak met bijna dezelfde elf als de wedstrijd ervoor, en de eerste wedstrijd van een seizoen heeft anders geen voorganger.
  Een knop die niets overschrijft kan geen werk kosten.
- **Alternatieven:** alleen hetzelfde seizoen (de eerste wedstrijd blijft leeg); alles wat is ingevuld vervangen na een bevestiging (meer klikken en een kans op verlies); ook de wissels en kaarten overnemen (die verschillen elke wedstrijd).

## De tabel met spelers in het beheer volgt dezelfde regel voor de positie als de pagina van een seizoen

- **Datum:** 10 november 2026
- **Besluit:** de kolom Positie in de tabel van de pagina Spelers in het beheer toont de positie van het seizoen, en anders de linie van de persoon, met "(linie van de persoon)" erachter (#1070).
  Pas als beide ontbreken staat er "Positie onbekend".
  `listAdminPlayers` geeft daarvoor de linie van de persoon mee (`personLine`).
  Het formulier van een speler verandert niet.
- **Waarom:** de redactie leest de tabel om te zien wat nog ontbreekt, en "Positie onbekend" bij een persoon met een linie wijst een gat aan dat er niet is.
  De cel zegt waar de waarde vandaan komt, zodat een schermlezer en een lezer met een smal scherm het verschil horen.
- **Alternatieven:** de linie zonder toevoeging tonen (kort, maar verbergt dat het seizoen niets heeft); een aparte kolom Linie (neemt op een telefoon een kolom extra in).
- **Later:** vult aan op _De kaart Selectie toont de positie en het land van het seizoen, en anders die van de persoon_ (#1051), die alleen de pagina van een seizoen noemde.

## De pagina van een speler staat op `/spelers/<naam>`, en een oude naam leidt door

- **Datum:** 11 november 2026
- **Besluit:** het adres is de naam van de persoon in kleine letters, zonder accenten en met streepjes, zoals `/spelers/jan-de-vries` (#1079).
  Elke naam die een persoon ooit had, blijft bewaard en leidt door naar zijn adres van nu.
  Bij het samenvoegen van twee personen gaan de namen van de persoon die verdwijnt mee naar de persoon die blijft, zoals de titels in `person_pages`.
  Krijgen twee personen dezelfde naam, dan krijgt de tweede zijn geboortejaar erachter, of zonder geboortejaar zijn nummer.
- **Waarom:** een adres met alleen de naam is te lezen en te raden, net als de adressen van wedstrijden en clubs.
  Een speler kan van naam veranderen en twee personen kunnen in Beheer samengaan (#977); een link van elders moet dan blijven werken.
- **Alternatieven:** de naam met het vaste nummer van de persoon, zoals `/spelers/jan-de-vries-75` (eenvoudiger, maar minder mooi); alleen het nummer (niet te lezen).

## Alleen onze eigen spelers hebben een pagina

- **Datum:** 11 november 2026
- **Besluit:** een persoon heeft een pagina als hij in minstens één selectie van sc Heerenveen stond (#1079).
  Een speler van een tegenstander die alleen tegen ons scoorde, heeft geen pagina, en zijn naam blijft gewone tekst.
  Wie tegen ons scoorde en ook bij ons speelde, ziet die doelpunten in het blok Tegen ons op zijn eigen pagina.
- **Waarom:** de site gaat over onze club.
  Een pagina met alleen een paar doelpunten tegen ons zegt weinig, en het zijn er meer dan van onze eigen spelers (528 tegen 467 op acceptatie).
- **Alternatieven:** een pagina voor iedereen met een doelpunt in onze wedstrijden.

## De pagina toont het geboortejaar en de geboorteplaats, niet de geboortedatum

- **Datum:** 11 november 2026
- **Besluit:** onder de naam staat "geboren in 1974 in Emmen" (#1079).
  De volledige geboortedatum uit `persons.birth_date` blijft in de database en staat niet op de site, ook niet in de broncode of de metadata.
  Zonder jaar of plaats valt dat deel weg.
- **Waarom:** de geboortedatum van een levende speler is een persoonsgegeven (zie het commentaar bij `persons` in het schema).
  Het jaar is genoeg voor een supporter, en de volledige datum staat een klik verder op Wikipedia.
- **Alternatieven:** de volledige datum en plaats; geen van beide.

## Geen foto van een speler

- **Datum:** 11 november 2026
- **Besluit:** de pagina van een speler heeft geen foto en geen plek voor een foto (#1079).
- **Waarom:** we hebben van geen enkele bron toestemming voor foto's van spelers.
  Een foto van Wikimedia zou een verzoek naar een ander domein zijn, of een eigen kopie met een eigen licentie vragen.
- **Alternatieven:** een foto van Wikimedia Commons met de naam van de maker (een eigen issue als we dat ooit willen).

## De pagina van een speler noemt zijn bronnen in de zijkolom

- **Datum:** 11 november 2026
- **Besluit:** de zijkolom eindigt met `WikipediaCredit` in de volledige vorm, met een link naar het artikel van de speler en de zin dat onze spelersgegevens ook CC BY-SA 4.0 zijn (#1079).
  Komen gegevens van de speler uit het archief van de oude fansite, dan noemt de credit dat archief ook.
  Een speler zonder artikel op Wikipedia (een speler van de redactie) krijgt alleen de bronnen die hij heeft.
  Tot #1086 de zijkolom brengt, staat de credit onderaan de hoofdkolom.
- **Waarom:** principe 4 van de Redactie: altijd de bron vermelden.
  Naam, geboortejaar, plaats, land en linie komen van Wikipedia en Wikidata, de wedstrijden voor 2007 uit het archief.
- **Alternatieven:** een credit per blok (te veel herhaling).

## De getallen van een speler staan in de tabel Per seizoen, niet nog een keer in de loopbaan

- **Datum:** 11 november 2026
- **Besluit:** de loopbaan toont per seizoen het rugnummer, de competities waarin hij scoorde en één moment, maar niet de wedstrijden en doelpunten van dat seizoen (#785).
  Die staan in de tabel erboven.
- **Waarom:** het gekozen ontwerp combineert de cijfers van de ene variant met het verhaal van de andere, en twee keer hetzelfde getal maakt de pagina lang.
- **Alternatieven:** de getallen ook in de loopbaan.

## De namen in het adres van een speler staan in een eigen tabel, en één functie houdt ze bij

- **Datum:** 11 november 2026
- **Besluit:** `persons.slug` is de naam in het adres van nu, en `person_slugs` bewaart elke naam die een persoon ooit had, die van nu erbij (#1079).
  Eén functie, `updatePlayerAddresses` in `@fansite/db/person-slugs`, geeft elke persoon met een rij in `players` zijn naam in het adres.
  Ze draait als de site start, na elke import van elk uur en nadat de redactie in Beheer een speler toevoegt, wijzigt of twee personen samenvoegt.
  - **De naam:** `persons.name`, of zonder die naam de naam van zijn nieuwste rij in `players`.
  - **Stabiel:** een persoon houdt zijn naam van nu zolang die bij zijn naam past, ook als er later een persoon met dezelfde naam komt.
  - **Botsing:** het lagere nummer krijgt de naam; daarna de naam met het geboortejaar, en dan de naam met het nummer.
    Een naam die een andere persoon ooit had, krijgt niemand anders, zodat een oud adres nooit naar een andere speler leidt.
  - **Nooit:** `kies` en een naam die op een seizoen lijkt, zoals `2025-26`.
  - **Samenvoegen:** `mergePersonInto` zet de namen van de persoon die verdwijnt op de persoon die blijft, in dezelfde transactie.
    Had de persoon die blijft nog geen adres, dan krijgt hij dat van de ander tot de functie weer draait.
  - **Een oud adres** antwoordt met 308 en het adres van nu.
- **Waarom:** een naam in het adres hangt af van de andere personen, dus hij moet bewaard worden en kan niet bij elk verzoek worden uitgerekend.
  Eén functie die niets doet als alles klopt, is eenvoudiger dan elke plek die een naam of een speler verandert, apart te laten schrijven.
  Een import met de hand, zoals van een eerder seizoen, laat het over aan de import van het volgende uur.
- **Alternatieven:** alleen een tabel met een kolom "huidig" (de naam van nu is dan een zoekvraag in plaats van een kolom); de naam bij elk schrijven in het beheer en de importer bijwerken (veel plekken, en een vergeten plek maakt een speler zonder adres).

## De cijfers van een speler per seizoen komen uit één module, met de beste bron per seizoen

- **Datum:** 11 november 2026
- **Besluit:** `apps/site/src/player-seasons.ts` rekent voor een persoon per seizoen alle cijfers uit die de pagina van een speler toont (#1082), en elk blok van die pagina leest ze daar: de tabel Per seizoen, de kerngetallen, de loopbaan, de grafieken en de zijkolom.
  Geen blok heeft een eigen vraag aan de database voor een getal dat hier staat.
  - **De bron per seizoen** voor wedstrijden, basis, assists en kaarten, in deze volgorde: (1) de opstellingen, als elke gespeelde wedstrijd van het seizoen een verslag heeft dat `klaar` is; (2) anders de tabel van Wikipedia (`player_season_stats`), als die een rij heeft, met alleen de wedstrijden en assists van de competities van die tabel; (3) anders de opstellingen die er zijn, met de zin "Uit 8 van de 41 wedstrijden van dit seizoen hebben we een opstelling."; (4) anders niets.
    De module geeft de bron per seizoen mee (`source`), samen met het aantal gespeelde wedstrijden en het aantal met een verslag.
  - **Doelpunten** tellen altijd uit `match_goals`: `ours = 1`, `own_goal = 0`, en bij de persoon via `person_id`, `player_id` of `appearance_id`, in één vraag met `or`, zodat elk doelpunt één keer telt.
    Per competitie staan ze ook in `goalsByCompetition`.
    Een seizoen zonder bron en zonder doelpunt heeft er geen cijfer voor: we weten het niet, en het is geen nul.
  - **Assists** zijn de doelpunten (zonder eigen doelpunten) waarvan `assist_appearance_id` bij een opstelling van hem hoort; een geel-rode kaart telt als een gele en een rode.
  - **De nul en de tegendoelpunten** van een doelman tellen alleen wedstrijden waarin hij in de basis stond en niet werd gewisseld, en geen rode of geel-rode kaart kreeg, omdat hij dan niet van begin tot eind speelde.
    Een tegendoelpunt is een doelpunt van de eindstand van de wedstrijd, met verlenging.
  - **Een getal dat we niet hebben** is `undefined` in de module en een streepje in de tabel, nooit een nul.
    Het totaal telt alleen de seizoenen met een cijfer, en de zin onder de tabel zegt dat als het niet elk seizoen is.
- **Waarom:** vijf blokken tonen dezelfde getallen, en twee manieren om ze te tellen geven vroeg of laat twee uitkomsten.
  De bronnen verschillen per seizoen sterk (de opstellingen van 1992/93 tot en met 2005/06, daarna alleen verslagen, en de tabel van Wikipedia voor het huidige seizoen), dus de regel moet op één plek staan.
- **Alternatieven:** elk blok telt zelf uit de database (dubbel werk en verschillende uitkomsten); de tabel van Wikipedia eerst (het lijkt compleet, maar telt alleen twee competities en heeft geen basis en kaarten).

## De tabel Per seizoen heeft kolommen naar de linie van de speler

- **Datum:** 11 november 2026
- **Besluit:** een doelman heeft G gespeeld, N nul, T tegendoelpunten en Y geel; iedereen anders heeft G gespeeld, B basis, D doelpunten en A assists (#1082).
  Een kolom zonder één cijfer in welk seizoen dan ook valt weg.
  De rijen zijn de seizoenen, het nieuwste bovenaan, en onderaan staat Totaal.
  De eerste cel is het seizoen als link naar de pagina Spelers van dat seizoen, met het rugnummer erachter.
  Onder de tabel staan de letters met hun woorden en de zinnen over een streepje, de bron en het totaal.
  - **De nieuwe letters** komen in `tableColumns`: `N` voor nul (`cleanSheets`) en `T` voor tegendoelpunten (`conceded`).
    Ze waren vrij: `G`, `D`, `A`, `B`, `I`, `M`, `P`, `R`, `V`, `W` en `Y` zijn al vergeven.
  - **De kaart** is een gewone witte kaart met `DataTable`: de rijkop is de link, het rugnummer staat erachter op dezelfde regel (`aside`) en de rij Totaal is vet op de markeringskleur met een zwaardere lijn erboven (`total`).
    Beide zijn nieuw in `DataTable`; er is geen nieuw component.
- **Waarom:** een doelman wordt niet beoordeeld op doelpunten en assists, en een veldspeler niet op de nul.
  Zes kolommen op 320 pixels maken de tabel te breed, dus vier per linie.
- **Alternatieven:** één tabel met alle kolommen (te breed op een telefoon); de kolommen van de tabel Alle spelers (die hebben minuten, en die hebben we niet).

## De naam van een speler van ons linkt naar zijn pagina, op de plekken waar hij als naam staat

- **Datum:** 11 november 2026
- **Besluit:** de naam van een speler van ons met een pagina is een link naar `/spelers/<naam>` op de kaart Selectie, in de lijsten met doelpuntenmakers en de bijzondere doelpunten op Spelers, in de kaart Doelpuntenmakers op de pagina van een club, en op de pagina van een wedstrijd (de kop, het verloop, de strafschoppenserie, de lijst onder het veld en de wissels) (#1087).
  Een speler van de tegenstander en een naam zonder persoon of zonder pagina blijft gewone tekst.
  - **Eén functie:** het adres komt uit `playerAddress` in `src/player-address.ts`, van `persons.slug`; `playerHref` geeft niets bij een persoon zonder naam in het adres.
    Een doelpunt van de tegenstander krijgt nooit een adres (`goalHref`), ook niet van een speler die ooit bij ons speelde.
  - **De hele naam is één link,** met de vlag erin als versiering (`alt=""`) en het rugnummer ernaast.
    Zo heet de link de naam en niet "Nederland Jan Jansen".
    `PlayerName` heeft daarvoor `href`.
  - **Het veld zelf heeft geen links:** de schijven op het veld zijn een tekening die voor een schermlezer verborgen is, op een gekleurde ondergrond.
    De lijst onder het veld noemt dezelfde spelers met een link.
  - **De wissels** zijn één link om de hele regel, omdat de tekening verborgen is voor een schermlezer en een link in verborgen tekst niet kan: de link heet de zin die een schermlezer anders hoort.
    Alleen de naam heeft de kleur en de streep van een link.
  - **De kop van een wedstrijd** heeft de naam als link, en de minuut en het merkje erachter buiten de link.
    Een schermlezer hoort de naam één keer.
- **Waarom:** een pagina die je niet kunt vinden, helpt niemand.
  Alleen onze spelers hebben een pagina (zie _Alleen onze eigen spelers hebben een pagina_).
- **Alternatieven:** de vlag buiten de link (de vlag is dan een apart doel dat nergens heen gaat); de schijf op het veld als link (de kleur van een link haalt het contrast op het gras niet); een link in elke regel van de wissels (een link in verborgen tekst).

## De pagina van een speler begint met een link terug naar Spelers en met zijn kerngetallen

- **Datum:** 11 november 2026
- **Besluit:** de kop van de pagina van een speler volgt het ontwerp (#1083).
  De naam staat links en de regel met linie, land en geboortejaar rechts ervan; op een telefoon staat die regel onder de naam, links.
  Boven de naam staat de link "← Spelers" naar `/spelers`, in plaats van een kruimelpad.
  Onder de kop staan drie of vier kerngetallen (`KeyFigures`) naar de linie van de speler, met de getallen uit `apps/site/src/player-seasons.ts`.
  - **De volgorde per linie:** aanvaller: doelpunten, seizoenen, wedstrijden, assists; middenvelder: wedstrijden, doelpunten, assists, seizoenen; verdediger: wedstrijden, keer de nul met hem in de basis, doelpunten, seizoenen; doelman: wedstrijden, keer de nul, tegendoelpunten per wedstrijd, seizoenen; zonder linie: seizoenen, doelpunten, wedstrijden.
  - **Een getal dat we van geen enkel seizoen hebben** valt weg, en de rij verschijnt alleen met minstens twee getallen.
    De regel onder een getal zegt wat het telt: "in alle competities", "in 2 van de 6 seizoenen", "tussen 2002 en 2012" of dat de tabel van Wikipedia niet alle competities telt.
  - **De geboorte** blijft het jaar en de plaats, nooit de volledige datum, ook al toont het ontwerp een datum.
  - **`Page.Title` kreeg `wrapped="start"`:** wat naast de kop staat, komt dan onder de kop aan de linkerkant, zoals een regel tekst die bij de naam hoort.
- **Waarom:** een kruimelpad is technisch, neemt ruimte in en gaat uit van een lineaire route door de site, terwijl de site van inhoud naar inhoud leest.
  Een link terug is genoeg, en een latere overzichtspagina van alle spelers kan het doel van die link worden.
  Een supporter wil in één blik zien wat een speler voor de club betekende: een aanvaller meet je aan zijn doelpunten, een doelman aan zijn wedstrijden en de nul.
- **Alternatieven:** het kruimelpad houden (#1079); de regel altijd rechts laten staan, ook onder de naam (het ontwerp zet hem links); een datum van geboorte tonen (te persoonlijk, en we hebben vaak alleen het jaar).

## De loopbaan van een speler heeft periodes, gaten en één moment per seizoen

- **Datum:** 11 november 2026
- **Besluit:** onder de tabel Per seizoen staat de kaart "Loopbaan bij sc Heerenveen" met `CareerTimeline` (#1084).
  Seizoenen die op elkaar volgen zijn een periode met de jaren als kop ("2007–2010", of "2024–nu" met het lopende seizoen), en de seizoenen ertussen zijn een regel "2004/05 tot en met 2006/07: niet in de selectie".
  Een seizoen heeft zijn rugnummer, "Dit seizoen" als het loopt, de competities waarin hij scoorde met het aantal en hoogstens één moment.
  De getallen van een seizoen staan in de tabel en worden in de loopbaan niet herhaald.
  Boven de lijst zegt een zin van hoeveel seizoenen we de opstellingen hebben.
  - **Opstellingen:** een seizoen heeft ze als elke gespeelde wedstrijd van dat seizoen een rapport heeft (`source` is `lineups`).
    Een seizoen zonder enig rapport zegt "Geen opstellingen van dit seizoen."; een seizoen met een deel zegt dat nog niet alle wedstrijden op de site staan.
  - **Het moment** is het eerste dat bestaat van: zijn eerste wedstrijd, zijn eerste doelpunt, een wedstrijd met drie of meer doelpunten van hem (de meeste, bij gelijk de eerste), een wedstrijd met twee, zijn laatste doelpunt, zijn laatste wedstrijd.
    De eerste en de laatste wedstrijd tellen alleen als we de opstellingen hebben van dat seizoen en van elk seizoen ervoor (de eerste) of erna (de laatste), want anders weten we niet of het de eerste of de laatste was.
    De eerste en de laatste staan voor zijn hele loopbaan en horen dus bij één seizoen.
    De seizoenen worden van het oudste af gedaan, en een wedstrijd is het moment van hoogstens één seizoen.
  - **De link** gaat naar de pagina van de wedstrijd als die er is (`getReportAddresses`).
    Zonder pagina is het moment gewone tekst met de wedstrijd en de uitslag.
    `CareerMoment.href` is daarom optioneel.
  - **De regel** noemt de minuten die we hebben ("hattrick: 25′, 30′ en 32′"); een minuut die we niet weten valt weg.
  - **De gegevens** komen uit `loadPlayerSeasons`: `PlayerSeason` heeft er `goalMoments` en `lineupMatches` bij, uit dezelfde leesronde.
    `apps/site/src/player-career.ts` kiest de momenten en maakt de periodes.
  - **De zin "Bij sc Heerenveen in …"** uit #1079 is weg: de loopbaan zegt hetzelfde.
- **Waarom:** de tabel geeft de getallen, de loopbaan het verhaal.
  Een supporter ziet zo wanneer een speler er was, met welk nummer en wat hij meemaakte, en we beweren niets over een eerste of laatste wedstrijd waarvan we de opstellingen niet hebben.
- **Alternatieven:** het aantal wedstrijden en doelpunten per seizoen in de loopbaan herhalen (staat in de tabel); een moment voor elke wedstrijd waarin hij scoorde, en mijlpalen als zijn 100e wedstrijd (niet in dit issue).

## De pagina van een speler heeft tot drie kleine grafieken, en een grafiek met te weinig te zeggen ontbreekt

- **Datum:** 11 november 2026
- **Besluit:** onder de loopbaan staan tot drie kaarten (#1085): een balk per seizoen, zijn doelpunten per kwartier en de uitslagen met hem in het veld.
  - **Per seizoen:** een aanvaller, een middenvelder en een speler zonder linie krijgen "Doelpunten per seizoen", alleen met minstens 5 doelpunten.
    Een verdediger krijgt "Wedstrijden per seizoen" en een doelman "De nul per seizoen", alleen met getallen uit minstens twee seizoenen.
    Een seizoen zonder getal staat er niet in; het oudste staat bovenaan.
    De wedstrijden zijn die van de tabel Per seizoen, dus een plek op de bank telt mee.
  - **Per kwartier:** minstens 5 doelpunten met een minuut.
    Een doelpunt in de blessuretijd heeft als minuut de laatste van de helft en telt bij het kwartier ervoor; een doelpunt na de 90e minuut (verlenging) valt weg.
    Een zin zegt van hoeveel doelpunten we de minuut niet kennen.
  - **Uitslagen:** de wedstrijden uit de opstellingen, dezelfde als `lineupMatches`, geteld met `resultOf`, dus een winst op strafschoppen is een winst.
    `CareerMatch` heeft daarvoor de serie (`penaltiesFor`, `penaltiesAgainst`), uit dezelfde leesronde.
  - **De tekst:** een balk is versiering en verborgen voor een schermlezer.
    De getallen staan als tekst: in de lijst per seizoen, als regel onder de kwartieren en als zin bij de uitslagen.
  - **Onderdelen:** `BarList` (liggende balken met naam en getal) en `OutcomeBar` (drie delen) zijn nieuw in het designsysteem; de kwartieren zijn een `BarChart`.
    De balken hebben de toon van de andere balken, het groen van een winst op 70%, dat 3:1 haalt in licht en donker.
- **Waarom:** een grafiek laat in één blik zien wanneer een speler op zijn best was en wanneer hij scoort, maar een grafiek van drie getallen vertelt niets.
- **Alternatieven:** altijd alle drie de kaarten tonen; de kwartieren als tabel; een eigen kleur voor de balken (een tweede kleur die niets betekent).
