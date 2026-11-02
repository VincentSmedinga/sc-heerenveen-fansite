# Project

## Prototype blijft lokaal

- **Datum:** 20 oktober 2026
- **Besluit:** het prototype uit de community publiceren we niet op GitHub.
  Het blijft lokaal, in een eigen worktree naast deze repository (`sc-heerenveen-fansite-prototype`), op de branch `reference/prototype-import`.
- **Waarom:** het is niet nodig.
  De herbouw werkt met de lokale kopie, en publiceren zou toestemming van de maker en een licentie vragen.
- **Gevolg:** issues en documentatie beschrijven in eigen woorden wat ze uit het prototype overnemen, zonder ernaar te linken.
- **Alternatieven:** het prototype publiceren, met toestemming van de maker en een licentie.

## TypeScript, Next.js en Drizzle

- **Datum:** 19 oktober 2026
- **Besluit:** we bouwen de site en de importer opnieuw, in TypeScript, in één pnpm-werkruimte op Node 24:
  - de site in Next.js 16 met React 19, in `apps/site`, met het beheer erbij;
  - de importer als gewone opdrachten in Node, in `apps/importer`, die cron start (zie _Importtaken via cron_);
  - Drizzle voor het schema, de queries en de migraties, in `packages/db` (zie _MariaDB in plaats van Postgres_);
  - Zod om invoer van buiten te controleren, zoals omgevingsvariabelen en feeds;
  - puur CSS uit het designsysteem, zonder Sass, CSS-in-JS of Tailwind;
  - Vitest voor tests, en Playwright voor de pagina's en de controles met axe (#25).
- **Waarom:** één taal voor de site, de importer en de database, met types die fouten vroeg vangen.
  De projecteigenaar en de agents werken ook in andere projecten met TypeScript en React.
  Next.js maakt de pagina's op de server en kan ze cachen, dus bezoekers krijgen snel een complete pagina, ook zonder veel JavaScript.
  Het beheer en later het voorspellingsspel passen in dezelfde app.
  En Next.js draait op de hosting als standalone build.
  Drizzle blijft dicht bij SQL, legt het schema vast in TypeScript en zet migraties in de repository.
  Het werkt met MariaDB en met Postgres, dus een overstap naar een VPS blijft klein.
- **Alternatieven:** verder bouwen op het prototype, in JavaScript met Prisma; maar daar liep het schema uit de pas met de migraties.
  Een statische site, bijvoorbeeld met Astro; die is lichter, maar inloggen, het beheer en het voorspellingsspel vragen toch om een server.
  Of PHP, zoals het forum; dat draait overal, maar de projecteigenaar en de agents werken in TypeScript.

## Standaard alleen kop, link en bronnaam

- **Datum:** 19 oktober 2026
- **Besluit:** van elk item uit een bron tonen we standaard de kop, de link naar de bron en de bronnaam.
  Een intro of een foto tonen we alleen met schriftelijke toestemming van de bron.
  Het bronnenregister legt dat per bron vast (#9), en de importer slaat niets op wat we niet mogen tonen.
- **Waarom:** we willen lezers naar de journalistiek zelf sturen, niet die vervangen.
  Het werk blijft van de journalisten en de uitgevers.
  Wat we niet opslaan, kunnen we ook niet per ongeluk tonen.
- **Alternatieven:** intro's en foto's standaard tonen en op verzoek weghalen; maar dan gebruiken we werk zonder dat iemand ons dat heeft toegestaan.

## Nederlands voor bezoekers, Brits Engels voor code

- **Datum:** 19 oktober 2026
- **Besluit:** alles wat openbaar is, is Nederlands: de site, Storybook, de documentatie zoals dit log, issues, mijlpalen, labels, het bord, en de beschrijvingen en reviews van pull requests.
  Code, namen, commentaar, commitberichten en titels van pull requests zijn Brits Engels, zoals `colour` en `initialise` (zie _Conventional Commits in het Engels_).
  Het gereedschap voor agents, `AGENTS.md` en `.claude/`, is ook Engels.
- **Uitzondering:** het label `good first issue` blijft Engels, omdat GitHub nieuwkomers naar precies dat label verwijst.
- **Waarom:** de supporters, de bronnen en de vrijwilligers zijn Nederlands, dus wat zij lezen, is Nederlands.
  Code en gereedschap volgen de taal van de bibliotheken en de tools.
  Eén vaste spelling voorkomt een mengsel van `color` en `colour`.
- **Alternatieven:** alles in het Engels, zodat ook wie geen Nederlands spreekt kan meedoen; maar de site en de mensen eromheen zijn Nederlands.
  Of alles in het Nederlands, ook de code; dan ontstaat een mengsel met de Engelse namen uit de bibliotheken.

## Licentie: EUPL-1.2 voor de code en onze eigen teksten

- **Datum:** 21 oktober 2026
- **Besluit:** de code en onze eigen teksten (documentatie, Storybook) vallen onder de EUPL-1.2.
  Dat vervangt de MIT-licentie waarmee de repository begon.
  Niet onder de licentie vallen de lettertypes (OFL), de tekst van de gedragscode (Contributor Covenant), het clubwapen en ander materiaal van derden.
  De wedstrijdgegevens vallen onder CC BY-SA 4.0 (zie _Onze wedstrijdgegevens zijn CC BY-SA 4.0_).
- **Waarom:** de EUPL is een copyleft-licentie met een bepaling voor gebruik via het netwerk.
  Wie de code aanpast en als site laat draaien, moet de aangepaste broncode delen.
  Dat past bij een project zonder winst dat niemand wil zien verdwijnen in een gesloten kopie.
  De EUPL heeft een officiële Nederlandse tekst, en dependencies onder MIT, Apache-2.0 of BSD passen erin.
  Er waren nog geen andere bijdragers, dus we hoefden niemand om toestemming te vragen.
  Wie de code al onder MIT heeft ontvangen, houdt die rechten voor die versies.
- **Alternatieven:** MIT houden; dat staat ook gesloten kopieën toe.
  Een andere copyleft-licentie, zoals de AGPL-3.0; die is vergelijkbaar, maar heeft geen officiële Nederlandse tekst.
  Voor de teksten CC BY-SA 4.0; dat zijn twee licenties in plaats van één.

## De toegankelijkheidsverklaring is vrijwillig

- **Datum:** 24 oktober 2026
- **Besluit:** we publiceren een toegankelijkheidsverklaring op `/toegankelijkheid`.
  Ze is vrijwillig.
  De pagina zegt dat niet, omdat de projecteigenaar de zin overbodig vond; ze belooft alleen "we streven naar".
- **Waarom:** voor overheden is ze verplicht.
  Voor bedrijven geldt de Europese toegankelijkheidswet (EAA, sinds 28 juni 2025) alleen voor bepaalde diensten aan consumenten, en een microbedrijf is voor diensten uitgezonderd.
  Wij zijn een vrijwilligersproject zonder winst, zonder verkoop en zonder een van die diensten, dus nemen we aan dat ze voor ons niet verplicht is.
  Een jurist heeft dat niet getoetst; het is onze inschatting van 24 oktober 2026.
  De verklaring laat bezoekers zien wat we doen voor toegankelijkheid en hoe ze ons een probleem melden, en past bij hoe we met hen omgaan.
- **Alternatieven:** het laten toetsen door een jurist voordat de pagina live gaat; dat is zekerder, maar voegt een stap toe aan de poort voor de lancering (#34).
  Of geen verklaring, zoals #25 nog zei; dan weet een bezoeker niet wat hij kan verwachten of bij wie hij terecht kan.

## We beloven alleen wat we hebben nagekeken: "we streven naar"

- **Datum:** 24 oktober 2026
- **Besluit:** de verklaring zegt dat we streven naar WCAG 2.2, niveau AA, en noemt positief wat we al doen.
  Ze zegt niet dat de site voldoet.
  Pas na de ronde van een mens (#25) zeggen we meer, met de datum en wat is nagekeken.
- **Waarom:** de automatische controle van axe vindt een deel van de problemen, en de checklist loopt per wijziging langs wat we zelf kunnen zien.
  De ronde van een mens (#25) is nog niet gedaan, dus de pagina zegt niet dat een mens de site heeft nagekeken.
  Een lijst met wat nog niet is nagekeken, zoals het eerste ontwerp had, vond de projecteigenaar te negatief voor wat er al is.
  Zeggen dat de site voldoet, terwijl dat niemand nakeek, is een belofte die we niet kunnen waarmaken.
- **Alternatieven:** "de site voldoet" vanaf de lancering; dan moet #187 op #25 wachten en kan het niet nu.
  Of een belofte van volledige naleving met een plan van aanpak, zoals het model van de overheid; dat vraagt een volledig onderzoek, en dat doen we niet voor een vrijwillige verklaring.

## Een korte pagina met vier delen, een eigen pagina en een reactie "zo snel mogelijk"

- **Datum:** 24 oktober 2026
- **Besluit:** de verklaring is een eigen pagina van hoogstens 200 woorden, met vier delen: wat we beloven, wat we al doen, hoe je ons bereikt en wanneer we het nakeken.
  De footer linkt ernaar.
  Een melding pakken we zo snel mogelijk op, naar hetzelfde mailadres als een verwijderverzoek (#24), zonder instantie voor klachten.
- **Waarom:** een lange verklaring leest niemand, en juist voor wie hulpmiddelen gebruikt, is een korte tekst met koppen het prettigst.
  Een eigen pagina met een link in de footer is overal te vinden en past bij wat we met Over ons en privacy doen.
  "Zo snel mogelijk" is een belofte die vrijwilligers kunnen houden; een termijn in dagen niet zonder redacteuren (#40).
- **Alternatieven:** een onderdeel van Over ons, met een vast anker zoals privacy; dat maakt die pagina langer.
  Of een reactie binnen twee weken; dat is duidelijker voor de bezoeker, maar iemand moet het waarmaken.
