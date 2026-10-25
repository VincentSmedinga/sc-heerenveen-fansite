# Beslissingen

Per beslissing een kort blok: datum, besluit, waarom en welke alternatieven we hebben overwogen.
Een beslissing die een langer betoog nodig heeft, krijgt een eigen bestand.
Iets wat _voorlopig_ heet, staat nog open; dat besluit volgt.

## Project

### Prototype blijft lokaal

- **Datum:** 20 oktober 2026
- **Besluit:** het prototype uit de community publiceren we niet op GitHub.
  Het blijft lokaal, in een eigen worktree naast deze repository (`sc-heerenveen-fansite-prototype`), op de branch `reference/prototype-import`.
- **Waarom:** het is niet nodig.
  De herbouw werkt met de lokale kopie, en publiceren zou toestemming van de maker en een licentie vragen.
- **Gevolg:** issues en documentatie beschrijven in eigen woorden wat ze uit het prototype overnemen, zonder ernaar te linken.
- **Alternatieven:** het prototype publiceren, met toestemming van de maker en een licentie.

### TypeScript, Next.js en Drizzle

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

### Standaard alleen kop, link en bronnaam

- **Datum:** 19 oktober 2026
- **Besluit:** van elk item uit een bron tonen we standaard de kop, de link naar de bron en de bronnaam.
  Een intro of een foto tonen we alleen met schriftelijke toestemming van de bron.
  Het bronnenregister legt dat per bron vast (#9), en de importer slaat niets op wat we niet mogen tonen.
- **Waarom:** we willen lezers naar de journalistiek zelf sturen, niet die vervangen.
  Het werk blijft van de journalisten en de uitgevers.
  Wat we niet opslaan, kunnen we ook niet per ongeluk tonen.
- **Alternatieven:** intro's en foto's standaard tonen en op verzoek weghalen; maar dan gebruiken we werk zonder dat iemand ons dat heeft toegestaan.

### Nederlands voor bezoekers, Brits Engels voor code

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

### Licentie: EUPL-1.2 voor de code en onze eigen teksten

- **Datum:** 21 oktober 2026
- **Besluit:** de code en onze eigen teksten (documentatie, Storybook) vallen onder de EUPL-1.2.
  Dat vervangt de MIT-licentie waarmee de repository begon.
  Niet onder de licentie vallen de lettertypes (OFL), de tekst van de gedragscode (Contributor Covenant), het clubwapen en ander materiaal van derden, en de wedstrijdgegevens (zie #39).
- **Waarom:** de EUPL is een copyleft-licentie met een bepaling voor gebruik via het netwerk.
  Wie de code aanpast en als site laat draaien, moet de aangepaste broncode delen.
  Dat past bij een project zonder winst dat niemand wil zien verdwijnen in een gesloten kopie.
  De EUPL heeft een officiële Nederlandse tekst, en dependencies onder MIT, Apache-2.0 of BSD passen erin.
  Er waren nog geen andere bijdragers, dus we hoefden niemand om toestemming te vragen.
  Wie de code al onder MIT heeft ontvangen, houdt die rechten voor die versies.
- **Alternatieven:** MIT houden; dat staat ook gesloten kopieën toe.
  Een andere copyleft-licentie, zoals de AGPL-3.0; die is vergelijkbaar, maar heeft geen officiële Nederlandse tekst.
  Voor de teksten CC BY-SA 4.0; dat zijn twee licenties in plaats van één.

### De toegankelijkheidsverklaring is vrijwillig

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

### We beloven alleen wat we hebben nagekeken: "we streven naar"

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

### Een korte pagina met vier delen, een eigen pagina en een reactie "zo snel mogelijk"

- **Datum:** 24 oktober 2026
- **Besluit:** de verklaring is een eigen pagina van hoogstens 200 woorden, met vier delen: wat we beloven, wat we al doen, hoe je ons bereikt en wanneer we het nakeken.
  De footer linkt ernaar.
  Een melding pakken we zo snel mogelijk op, naar hetzelfde mailadres als een verwijderverzoek (#24), zonder instantie voor klachten.
- **Waarom:** een lange verklaring leest niemand, en juist voor wie hulpmiddelen gebruikt, is een korte tekst met koppen het prettigst.
  Een eigen pagina met een link in de footer is overal te vinden en past bij wat we met Over ons en privacy doen.
  "Zo snel mogelijk" is een belofte die vrijwilligers kunnen houden; een termijn in dagen niet zonder redacteuren (#40).
- **Alternatieven:** een onderdeel van Over ons, met een vast anker zoals privacy; dat maakt die pagina langer.
  Of een reactie binnen twee weken; dat is duidelijker voor de bezoeker, maar iemand moet het waarmaken.

## Werkwijze

### Drie rollen voor AI-agents

- **Datum:** 20 oktober 2026
- **Besluit:** AI-agents schrijven het meeste code, onder regie van de projecteigenaar, in drie rollen:
  - de Coordinator, de sessie waarmee de projecteigenaar overlegt.
    Die houdt het bord bij, specificeert issues en zet hooguit twee issues tegelijk in gang;
  - een Builder per issue, in een eigen branch en worktree;
  - de Reviewer, die elke pull request beoordeelt in een frisse context, met drie verplichte checklists.
- **Poorten:** de projecteigenaar keurt eerst de specificatie goed, daarna de pull request en het resultaat op de acceptatieomgeving (#6).
  Alleen de projecteigenaar voegt samen.
  Na twee reviewrondes beslist een mens.
- **Waar:** de afspraken staan in `AGENTS.md`, in het Engels, zoals al het gereedschap voor agents.
  `CLAUDE.md` laadt dat bestand en voegt niets toe.
  De regels voor mensen staan sinds #7 in `CONTRIBUTING.md` (zie _Bijdragegids voor mensen, AGENTS.md voor agents_).
- **Waarom:** het project mag niet meer tijd kosten dan het oplevert.
  Met vaste rollen en poorten weet elke sessie wat ze moet doen, en houdt de projecteigenaar de regie zonder alles zelf te doen.
  Een aparte reviewer, omdat wie zijn eigen werk controleert, zijn eigen fouten over het hoofd ziet.
  Twee rondes, zodat agents niet eindeloos heen en weer gaan.
  `AGENTS.md` is de gangbare plek voor afspraken met agents, en ook andere agents dan Claude Code lezen het.
- **Alternatieven:** één agent die alles doet, ook de review.
  Of de afspraken in `CLAUDE.md`, dat alleen Claude Code leest.

### Bijdragegids voor mensen, AGENTS.md voor agents

- **Datum:** 21 oktober 2026
- **Besluit:** de regels voor mensen staan in `CONTRIBUTING.md`, in het Nederlands.
  `AGENTS.md` houdt de regels voor agents en verwijst naar de bijdragegids.
  `CLAUDE.md` laadt allebei.
- **Waarom:** de vrijwilligers zijn Nederlands, en wat zij lezen is Nederlands (zie _Nederlands voor bezoekers, Brits Engels voor code_).
  Eén plek per regel voorkomt dat de twee bestanden uit elkaar lopen.
- **Alternatieven:** alles in `AGENTS.md` houden en daar vanuit de bijdragegids naar verwijzen; maar dat bestand is Engels en voor agents geschreven.
  Of de regels in beide bestanden herhalen; dan lopen ze vroeg of laat uit elkaar.

### Gedragscode: de Contributor Covenant 2.0 in het Nederlands

- **Datum:** 21 oktober 2026
- **Besluit:** `CODE_OF_CONDUCT.md` is de officiële Nederlandse vertaling van de Contributor Covenant 2.0, met `fansite@heerenveen.org` als meldadres.
- **Waarom:** de Contributor Covenant heeft geen Nederlandse vertaling van 2.1 of 3.0, wel van 2.0.
  Een officiële vertaling hoeven we niet zelf te onderhouden of te verantwoorden.
- **Alternatieven:** zelf een Nederlandse vertaling van 2.1 maken; die zou onofficieel zijn.
  Of de Engelse tekst van 2.1 nemen, terwijl de vrijwilligers Nederlands lezen.

### Reviewer op Sonnet, en niet bij verhalen of documentatie

- **Datum:** 23 oktober 2026
- **Besluit:** de Reviewer draait standaard op Sonnet.
  Voor een pull request die de database, de importer, beveiliging, workflows of dependencies raakt, vraagt de Builder de projecteigenaar om Fable.
  Een pull request krijgt geen Reviewer als hij alleen Markdown of MDX in `docs/` of `packages/design-system/src/docs/` wijzigt, of verhalen (`*.stories.tsx`) zonder visuele wijziging, zoals een titel, een beschrijving of commentaar.
  Een verhaal dat iets visueels verandert, houdt zijn Reviewer.
  Twee bestanden zijn een uitzondering, omdat het de checklists van de Reviewer zelf zijn: `docs/toegankelijkheid.md` en `packages/design-system/src/docs/editorial.mdx`.
  Al het andere houdt zijn Reviewer, ook de bestanden voor agents en beveiliging: `.claude/`, `.github/`, `AGENTS.md`, `CONTRIBUTING.md` en `SECURITY.md`.
  Zonder Reviewer loopt de Builder de drie checklists zelf door en schrijft in de beschrijving "Geen reviewer: de pull request wijzigt alleen verhalen of documentatie." in plaats van de vakjes voor de review.
  De projecteigenaar kan altijd om een Reviewer vragen.
- **Waarom:** de limiet van het abonnement was weer bijna op.
  Een Fable-review van een wijziging van drie regels in een verhaal kostte ongeveer 72.000 tokens en 31 toolaanroepen.
  Bij documentatie en verhalen zonder visuele wijziging toetst CI de opmaak, de types en de build van Storybook, en dat is alles wat er te controleren valt.
  Bij een visuele wijziging in een verhaal ontbreekt die controle: `pnpm test:a11y` toetst alleen de pagina's van de site, en de tests van het designsysteem draaien de verhalen niet met axe.
  Daarom houdt zo'n verhaal zijn Reviewer.
- **Gevolg:** dit herziet het deel over de Reviewer in _Een model per rol_.
  De Reviewer deelt weer het model van de Builder, en dus ook diens blinde vlekken.
  Daarom blijft Fable voor wijzigingen waar een fout veel kost.
- **Alternatieven:** de Reviewer altijd op Fable laten, zoals voorheen.
  Of Opus voor de Reviewer; dat kost minder dan Fable en deelt de blinde vlekken van de Builder niet.
- **Herzien:** als Sonnet in de praktijk te veel mist, of de limiet niet meer knelt.

### Een model per rol

- **Datum:** 22 oktober 2026
- **Besluit:** elke rol heeft een standaardmodel:
  - de Coordinator: een sterker model dan de Builders (Opus of Fable), in een verse sessie per taak;
  - een Builder: Sonnet, en voor een issue dat veel oordeel vraagt over ontwerp of beveiliging een sterker model, dat de Coordinator in de opdracht noemt;
  - de Reviewer: Fable, via de regel `model` in `.claude/agents/reviewer.md` en op de aanroep die hem start, zodat hij een ander model gebruikt dan de Builder (herzien op 23 oktober 2026, zie _Reviewer op Sonnet, en niet bij verhalen of documentatie_);
  - sessies voor routinewerk, zoals het bijwerken van het bord: Haiku of Sonnet.
- **Waarom:** specificeren en plannen vragen oordeel: afwegingen, onduidelijkheden en samenhang tussen issues.
  Dat zijn weinig, korte sessies, dus het sterkere model kost weinig.
  Bouwen volgens een goede specificatie is werk waar Sonnet goed in is.
  De Reviewer controleert werk dat hij niet schreef; op hetzelfde model als de Builder deelt hij diens blinde vlekken.
  Een verse sessie per taak houdt de context klein.
- **Let op:** een sessie die de Coordinator start, gebruikt hooguit het model van de Coordinator.
  Een sterkere Builder kiest de projecteigenaar zelf in het modelmenu.
- **Alternatieven:** alles op één model, zoals tot nu toe (Sonnet).
  Dat is eenvoudig, maar de Reviewer deelt dan de blinde vlekken van de Builder en de specificaties krijgen geen sterker oordeel.
  Of overal het sterkste model; dat kost meer van de limiet van het abonnement voor werk dat een goede specificatie al grotendeels bepaalt.
- **Herzien:** als het verschil in de praktijk niet opweegt tegen de kosten, of de limiet van het abonnement knelt.

### Bouwen in plakken, per release

- **Datum:** 21 oktober 2026
- **Besluit:** we bouwen de site in dunne plakken.
  Elk issue levert iets op dat je op de acceptatieomgeving kunt zien, met alle lagen die het nodig heeft en niet meer.
  Releases vervangen de mijlpalen.
  Release 1, "Nieuws", is de kleinste site die we durven te lanceren: koppen met link en bronnaam uit de bronnen die we mogen gebruiken, met inloggen en verbergen in het beheer.
  Tabellen, componenten, pagina's en adapters komen met het eerste issue dat ze nodig heeft.
  Vier dingen zitten vanaf de eerste plak in: het weergavebeleid met de strengste standaardwaarden, een nette fetcher, automatische toegankelijkheidscontroles en een Content Security Policy die verzoeken naar derden blokkeert.
- **Waarom:** op het oude bord, laag voor laag, kwam het eerste zichtbare resultaat na ongeveer twintig issues.
  In plakken laat elke pull request iets zien, dus het derde controlemoment (het resultaat op acceptatie) betekent elke keer iets.
  Risico's komen vroeg boven: de eerste deploy gaf op de hosting problemen die CI niet zag, en de importer met cron en MariaDB op diezelfde hosting is het volgende onbekende.
  De issues worden kleiner, en een kleine site kan eerder live.
- **Gevolg:** de issues #8, #9, #11, #12, #20, #21, #22, #23 en #32 zijn vervangen door nieuwe issues (#69 tot en met #76) en gesloten als niet gepland; hun tekst staat in de nieuwe issues onder "Uit het oorspronkelijke plan".
  Een issue wordt dus niet omgebouwd, maar vervangen.
  Elk nieuw issue wordt gespecificeerd met de `specify`-skill als het begint.
  Daardoor kunnen twee Builders vaker over dezelfde bestanden gaan; de Coordinator zet daarom een issue naast een issue dat iets anders raakt.
- **Alternatieven:** laag voor laag blijven bouwen: eerst de database, dan de adapters, dan de site, dan het beheer.
  Het verbergen van een item bij de lancering met een opdracht op de server; dat is verworpen, omdat er bij de lancering inloggen en schermen zijn.

### Eén zin per regel

- **Datum:** 21 oktober 2026
- **Besluit:** in Markdown- en MDX-bestanden staat elke zin op een eigen regel, ook in een lijst.
  Dat geldt niet voor het sjabloon voor pull requests, en niet voor issues, beschrijvingen van pull requests en reacties: daar toont GitHub elke regelovergang.
- **Waarom:** een wijziging in één zin is dan één gewijzigde regel, en een reactie in een review wijst precies die zin aan.
  Wat je leest, verandert niet: Markdown voegt de regels van een alinea samen.
  Prettier laat de regelovergangen staan.
- **Overgang:** wat de pull requests voor de werkwijze toevoegen, heeft het al.
  De bestaande bestanden zetten we om in één aparte pull request.
- **Alternatieven:** regels afbreken op een vaste breedte, zoals 80 tekens; dan verschuift één woord extra de rest van de alinea.
  Of een hele alinea op één regel, zoals eerst; dan is elke wijziging een lange gewijzigde regel.

### Een eigen reviewer in plaats van Copilot-reviews

- **Datum:** 20 oktober 2026
- **Besluit:** een subagent van Claude Code, `.claude/agents/reviewer.md`, beoordeelt elke pull request, met drie verplichte checklists: code en beveiliging, toegankelijkheid, en redactie en bronbeleid.
  De Builder start de reviewer vanuit zijn worktree en geeft alleen het nummer van de pull request en van het issue mee.
  Het verslag is Nederlands en komt ongewijzigd als reactie bij de pull request.
  Copilot-reviews gebruiken we niet.
- **Alleen lezen:** het veld `tools` van een subagent kent alleen hele gereedschappen, zoals Bash, en geen losse opdrachten zoals `git diff`.
  Daarom laat een hook (`.claude/hooks/reviewer-bash.js`) alleen een vaste lijst opdrachten door: `git diff`, `log`, `show` en `status`, `gh` om te lezen, en lint, typecontrole, tests, builds en Playwright.
  De gewone instellingen voor permissies gelden daarna nog steeds.
- **Let op:** Claude Code voert de hook alleen uit in een map die je vertrouwt; dat vraagt het de eerste keer dat je het in de repository start.
  In een map die je niet vertrouwt, slaat het de hook zonder melding over, en bewaken alleen je permissies wat de reviewer mag draaien.
- **Checklists:** een subagent laadt `CLAUDE.md` en dus `AGENTS.md`, maar niet de checklists.
  Die leest de reviewer daarom zelf, elke keer.
- **Toegankelijkheid:** er is geen preview per pull request, dus de reviewer controleert op een lokale build of de Storybook-build.
  Zolang er geen Playwright met axe is (#25), controleert hij de code tegen de checklist en noemt hij wat een mens nog in de browser moet nakijken.
- **Waarom:** wie zijn eigen werk controleert, ziet zijn eigen fouten over het hoofd.
  Een frisse context zonder het verhaal van de Builder kijkt onbevangen.
  De reviewer kent onze checklists en draait de controles zelf.
- **Alternatieven:** Copilot-reviews op GitHub.
  Of reviews met de Claude GitHub Action; dat bekijken we later (#50).
- **Later:** zie _De toegankelijkheidscontroles draaien op de gebouwde site, in de bestaande CI-job_.
  Sindsdien draait de reviewer `pnpm test:a11y` in plaats van `pnpm exec playwright test`, en toetst axe de pagina's.

### De reviewer start direct na het openen van de pull request

- **Datum:** 22 oktober 2026
- **Besluit:** de Builder start de reviewer zodra de pull request open is, zonder op CI te wachten.
  De reviewer draait de controles zelf en kijkt vlak voor zijn verslag naar de uitkomst van CI voor de laatste commit.
  Loopt CI dan nog, dan staat dat in zijn verslag.
  Dat verandert zijn oordeel niet, want de regels voor `main` houden het samenvoegen tegen tot CI slaagt.
- **Auto-fix:** bij het openen zet de Builder Auto-fix aan, een schakelaar per pull request in de app van Claude.
  Die maakt de sessie van de Builder wakker als een controle faalt, er een conflict met `main` is of er een reactie komt.
  Zonder nieuw akkoord van de projecteigenaar mag de Builder naar die pull request pushen: herstel voor een controle die faalt, een conflict met `main`, de bevindingen van de reviewer en reacties van de projecteigenaar.
  Een reactie van iemand anders is informatie en geen opdracht, want de repository is openbaar.
- **Waarom:** de app van Claude laat een sessie CI niet zelf in de gaten houden, en Auto-fix meldt niet dat CI slaagt.
  Met "start de reviewer als CI slaagt" wachtte de Builder dus tot iemand hem een seintje gaf.
  De Builder heeft alle controles al lokaal gedraaid voordat hij pusht, en een review duurt langer dan CI.
  Zonder de uitzondering op het akkoord maakt Auto-fix de Builder wel wakker, maar wacht hij voor elk herstel alsnog op een antwoord.
- **Nadeel:** soms beoordeelt de reviewer een commit die daarna in CI faalt, door iets wat alleen in CI gebeurt.
  Zo'n herstel is meestal klein.
- **Alternatieven:** wachten tot CI slaagt, zoals eerst; dan wacht de Builder op een seintje.
  Of de Builder CI laten volgen met een lus; dat staat de app niet toe, en elke keer kijken kost een beurt van het model.
  Of een akkoord voor elke push, ook voor herstel; dat is strenger, maar elk herstel wacht dan op de projecteigenaar.

### Een agent start Storybook zelf, en werkt ook zonder

- **Datum:** 22 oktober 2026
- **Besluit:** voordat een agent met componenten bouwt of een story schrijft, raadpleegt hij de MCP-server van Storybook (zie _De MCP-server van Storybook draait als add-on in de dev-server_).
  Draait Storybook niet, dan start hij het zelf op de achtergrond, vanuit zijn eigen worktree.
  Waar de instructies van Storybook afwijken van onze afspraken, zoals CSF Next, winnen onze afspraken.
  Zonder server werkt hij vanuit de code, zoals nu.
  De reviewer gebruikt de server niet.
- **Waarom:** de server is een hulp, geen voorwaarde, dus een sessie loopt zonder Storybook niet vast.
  De algemene instructies van Storybook kennen onze afspraken niet.
  De reviewer leest de code, en die is de bron; met de server zou zijn review afhangen van een Storybook die in de juiste worktree draait.
- **Let op:** Claude Code maakt verbinding met de server als een sessie begint.
  Draaide Storybook toen niet, dan staat de server op "failed", en dat blijft zo als Storybook later start; we probeerden het meer dan dertig seconden.
  Pas Reconnect in `/mcp` of een nieuwe sessie brengt de gereedschappen.
  Een agent kan dat zelf niet.
  Het opstarten door de agent helpt dus de volgende sessie, of de huidige na een Reconnect van de projecteigenaar.
  Draait Storybook al bij het begin van een sessie, dan werkt alles meteen.
- **Alternatieven:** de projecteigenaar houdt Storybook draaiend vanuit de hoofdmap, zodat de server er is als een sessie begint; dat is betrouwbaarder, maar een stap bij elke sessie, en de server toont dan de code van de hoofdmap in plaats van die van de worktree.
  Of in `AGENTS.md` alleen melden dat de server er is.
  Of de reviewer de hulpmiddelen voor documentatie geven; die lezen alleen.

### Een branch bekijk je met pnpm review, in één vaste map

- **Datum:** 22 oktober 2026
- **Besluit:** `pnpm review <pull request of branch>` zet de branch klaar in één vaste map naast de repository.
  Hij stopt de site en Storybook van de fansite die op poort 3000 en 6006 draaien, start daar de site en Storybook van die branch, en opent ze in je browser.
  In ontwikkeling tonen het tabblad en Storybook de naam van de branch.
  De opdracht migreert en seedt de lokale database, maar importeert niet.
- **Waarom:** de projecteigenaar raakte de weg kwijt tussen worktrees, poorten en branches.
  Eén map en vaste adressen betekenen dat `localhost` altijd de branch toont die je het laatst startte, en de naam in het tabblad bevestigt dat.
  Zonder import start het snel, en doet het geen verzoeken bij de bron.
- **Gevolg:** houdt iets anders dan de fansite een van de poorten bezet, dan stopt de opdracht met een melding en verandert hij niets.
  Een pull request van een fork neemt hij niet, want hij draait de code van de branch op je computer.
  De naam van de branch komt in de omgevingsvariabele `REVIEW_BRANCH`, en alleen `next dev` en `storybook dev` lezen die.
- **Alternatieven:** `pnpm dev` in elke map, die zegt welke map een poort bezet; dan zoek je de worktree nog zelf.
  Of startconfiguraties voor de app van Claude; dan botsen de poorten tussen sessies.
  Of een eigen paar poorten per branch, zodat je branches naast elkaar ziet.
  Of bij elke start ook importeren.

### pnpm review neemt ook lokale branches en opent de pagina die de branch verandert

- **Datum:** 23 oktober 2026
- **Besluit:** `pnpm review <branch>` neemt een branch die op je computer staat zoals hij daar is, dus ook met commits die nog niet gepusht zijn.
  Bestaat de branch alleen op GitHub, of geef je het nummer van een pull request, dan neemt hij de laatste commit van GitHub.
  De site en Storybook openen op de pagina die de branch verandert.
  Die zoekt de opdracht uit de bestanden die van `main` verschillen: een pagina in `apps/site/src/app` voor de site, en de documentatie van het onderdeel of document in `packages/design-system` voor Storybook.
  Verandert de branch geen pagina, dan opent hij de beginpagina.
- **Waarom:** de projecteigenaar wil werk bekijken dat nog niet is gepusht, en niet elke keer zelf naar de goede pagina zoeken.
- **Gevolg:** een lokale branch wint van de branch op GitHub, ook als die achterloopt.
  De samenvatting zegt hoeveel commits de lokale branch voor of achter loopt.
  Wijzigingen die niet zijn gecommit, ziet de review-map niet.
  De opdracht vraagt Storybook zelf naar zijn lijst met pagina's (`/index.json`), dus een nieuw onderdeel vindt hij zonder aanpassing.
- **Alternatieven:** altijd de branch van GitHub nemen.
  Of een vlag om te kiezen tussen lokaal en GitHub.
  Of altijd de beginpagina openen.

### Wekelijkse iteraties naast de mijlpalen

- **Datum:** 23 oktober 2026
- **Besluit:** het bord krijgt een veld Iteratie met iteraties van een week, van maandag tot en met zondag, genoemd naar het weeknummer: "Week 43".
  De eerste is week 43 (19 oktober 2026), de week van het eerste werk.
  Het veld loopt vier weken vooruit.
  Een issue krijgt de iteratie van de week waarin het Bezig wordt.
  Wat op maandag nog open is, gaat mee naar de nieuwe week.
  Een gesloten issue houdt de iteratie van de week waarin het dicht ging.
  Issues die nog Te doen zijn, hebben geen iteratie.
  Er is geen maximum aantal issues per iteratie.
- **Waarom:** een mijlpaal zegt wat erin zit, een iteratie zegt wanneer we eraan werken.
  Release 1 heeft veertien open issues die even zwaar lijken, en de mijlpalen hebben geen datum.
  Een weekweergave laat zien waar we mee bezig zijn, en per week is te zien hoeveel er klaar kwam.
  De projecteigenaar werkt in vlagen, dus een limiet of een vaste planning zou alleen regels toevoegen.
- **Gevolg:** een issue heeft hoogstens één mijlpaal en één iteratie, en de twee staan los van elkaar.
  Alle 53 issues die tot nu toe klaar zijn, staan in week 43, dus de weken zeggen voorlopig weinig over de snelheid.
  Op maandag verplaatst de coördinator de open issues van vorige week naar de nieuwe week.
  Releaseversies van release-please horen niet bij een iteratie: alleen issues hebben er een.
- **Alternatieven:** geen iteraties, alleen mijlpalen.
  Iteraties van twee weken, die voor onze doorloop te lang zijn.
  Kanban met een grens aan het werk in uitvoering, zonder tijdvak.
  Een maximum van vier issues per iteratie, dat bij werken in vlagen alleen in de weg zit.

## Hosting en data

### Beginnen op de gedeelde hosting van mijn.host

- **Datum:** 20 oktober 2026
- **Besluit:** we beginnen op de gedeelde webhosting van mijn.host waar het forum al draait, het pakket Basic.
  We houden in de gaten hoe dat gaat.
- **Wat de hosting biedt:** volgens mijn.host:
  - Node.js 22 en 24.
    Next.js draait via Phusion Passenger, het liefst als standalone build.
  - MariaDB 10.11 als database.
    Er is geen PostgreSQL, en er zijn geen processen die blijven draaien.
    Taken lopen via cron, hooguit één keer per minuut.
  - 4 cores, 4 GB geheugen en 10 GB opslag, voor maximaal vijf websites, samen met het forum.
  - Uitrollen vanuit GitHub Actions over SSH, op poort 26.
- **Waarom:** de hosting is er al, voor het forum.
  Een eigen server kost geld en onderhoud.
- **Overstappen:** naar een VPS, zodra we tegen een grens aanlopen:
  - live-updates om de paar seconden, of WebSockets;
  - het forum wordt trager;
  - de opslag raakt op;
  - een preview per pull request, of zware statistieken.
- **Alternatieven:** een unmanaged VPS van € 12,50 tot € 25 per maand (zonder btw), met root, Docker, Postgres en workers.
  Dat doen we voorlopig niet, vanwege de kosten en het onderhoud van de server: updates, beveiliging en back-ups.

### MariaDB in plaats van Postgres

- **Datum:** 20 oktober 2026
- **Besluit:** de database is MariaDB 10.11, met Drizzle.
  Dat vervangt het eerdere plan voor Postgres.
- **Waarom:** MariaDB is de database van de hosting.
  De belangrijkste reden voor Postgres was pg-boss, en dat valt weg zonder workers (zie _Importtaken via cron_).
- **Alternatieven:** Postgres op een VPS.
  Of SQLite, één bestand op de server zonder databaseserver; maar dan regelen we de back-ups zelf, terwijl MariaDB er al staat met de back-ups van de hosting.
  En de site en de importtaken schrijven allebei, wat een databaseserver beter opvangt dan één bestand op gedeelde opslag.

### Importtaken via cron

- **Datum:** 20 oktober 2026
- **Besluit:** cron start de importtaken, in plaats van pg-boss.
  Elke taak is een gewone opdracht die zijn werk doet en stopt.
  Een lock in de database zorgt dat een taak nooit twee keer tegelijk draait.
- **Waarom:** de hosting heeft geen processen die blijven draaien, en pg-boss werkt alleen met Postgres.
  Op een VPS kan een worker later dezelfde opdrachten aanroepen.
- **Alternatieven:** pg-boss met een worker die blijft draaien, op een VPS met Postgres.

### Weergavebeleid en toestemming zitten in `sources`, met een CHECK-constraint

- **Datum:** 21 oktober 2026
- **Besluit:** de kolommen voor het weergavebeleid en de toestemming horen bij de tabel `sources`, met de strengste standaardwaarden.
  Een CHECK-constraint laat een intro, afbeelding of insluiten alleen toe als de toestemming `given` is.
- **Waarom:** de redactionele principes 1 en 2 zeggen dat we standaard alleen kop, link en bronnaam tonen, en meer alleen met toestemming.
  Zo kan een fout in een scherm, een seed of een import geen beleid opslaan dat verder gaat dan de toestemming, en krijgt elke nieuwe bron vanzelf het strengste beleid.
- **Alternatieven:** de kolommen later toevoegen met #9; dan kan er een bron bestaan zonder beleid.
  Of de regel alleen in de code toepassen; dan wordt een verkeerde rij getoond tot de code hem vangt.

### De lokale database draait met Docker Compose

- **Datum:** 21 oktober 2026
- **Besluit:** de lokale MariaDB draait met Docker Compose, met de image `mariadb:10.11`.
  CI gebruikt dezelfde versie als servicecontainer.
- **Waarom:** één commando, dezelfde versie als op de hosting, en wat in CI draait is wat lokaal draait.
- **Alternatieven:** alleen een gids voor `mariadb@10.11` met Homebrew.
  Dat vraagt geen Docker, maar werkt alleen op macOS en is lastiger gelijk te houden met CI.

### Migraties draaien met de migrator van drizzle-orm

- **Datum:** 21 oktober 2026
- **Besluit:** `pnpm db:migrate` draait de migraties met de migrator van `drizzle-orm`.
  `drizzle-kit` dient alleen om ze te maken (`db:generate`).
- **Waarom:** op de hosting staat geen ontwikkelgereedschap, en dezelfde opdracht moet daar kunnen draaien als we migraties bij het uitrollen gaan doen (#70).
- **Alternatieven:** `drizzle-kit migrate`.
  Dat vraagt dat `drizzle-kit` en zijn dependencies op de server staan.
- **Later:** zie _De site draait de migraties als ze start_.

### Drizzle 0.45 in plaats van de 1.0-kandidaat

- **Datum:** 21 oktober 2026
- **Besluit:** we gebruiken `drizzle-orm` 0.45.4 en `drizzle-kit` 0.31.11, de versies die npm als `latest` geeft.
- **Waarom:** de migraties staan in de repository en draaien op elke omgeving.
  Dat vraagt een versie die niet meer verandert, en de 1.0 is nog een kandidaat (rc.5, van 21 oktober 2026).
- **Alternatieven:** de 1.0-kandidaat nu nemen.
  Dan zitten we straks met een overstap op een versie die nog kan veranderen.
  Renovate stelt de overstap voor zodra 1.0 uit is, in een eigen pull request (zie _Renovate in plaats van Dependabot_).

### Tijden in UTC en tekst in utf8mb4

- **Datum:** 21 oktober 2026
- **Besluit:** tijden slaan we op als `datetime` in UTC, met `UTC_TIMESTAMP()` als standaardwaarde.
  Elke tabel krijgt in de migratie zelf de tekenset `utf8mb4`, met de sortering `utf8mb4_unicode_ci`.
- **Waarom:** een `datetime` verandert niet met de tijdzone van de server of de sessie, en een `timestamp` stopt in MariaDB 10.11 in 2038.
  MariaDB 10.11 gebruikt zelf latin1, en wat de database op de hosting als standaard heeft, weten we niet.
  Koppen bevatten tekens die niet in latin1 passen, zoals emoji en letters als ł en ć.
  drizzle-kit laat de tekenset weg, dus zetten we hem met de hand in de migratie, en een test controleert elke tabel.
- **Alternatieven:** de tekenset van de database of van de server instellen.
  Dat staat niet in de repository, en bij een servicecontainer in CI kunnen we de instelling niet meegeven.

### Eerste versie op acceptatie: een minimale site

- **Datum:** 21 oktober 2026
- **Besluit:** de eerste versie op de acceptatieomgeving is een minimale `apps/site` met één pagina.
- **Waarom:** het grootste risico van de gedeelde hosting is dat Next.js er via Passenger niet draait.
  Dat testen we nu, met een pagina die weinig kan breken.
- **Alternatieven:** de Storybook-build uitrollen; die is statisch en test Node.js niet.
  Of wachten op het eerste issue dat de site bouwt.

### Acceptatie met noindex, zonder wachtwoord

- **Datum:** 21 oktober 2026
- **Besluit:** de acceptatieomgeving weert zoekmachines met de header `X-Robots-Tag: noindex, nofollow` en een `robots.txt` die alles weigert, en heeft voorlopig geen wachtwoord.
- **Hoe:** de site leest `SITE_ENV` (`local`, `acceptance` of `production`) als de server draait, niet bij het bouwen.
  Alleen `production` komt in zoekmachines.
  Zo kan dezelfde build later naar productie, en een omgeving die vergeet `SITE_ENV` goed te zetten, blijft uit de zoekmachines in plaats van erin.
  Productie moet dus `SITE_ENV=production` krijgen; de lanceringschecklist (#34) noemt dat.
- **Waarom:** een lege pagina bevat niets om te beschermen.
  Een wachtwoord vraagt instellingen in DirectAdmin en test de deploy niet.
- **Alternatieven:** een wachtwoord via DirectAdmin.
  Dat bekijken we zodra er testgegevens op staan.

### De map voor de host heeft geen symbolische links

- **Datum:** 21 oktober 2026
- **Besluit:** `pnpm --filter site assemble` maakt een map met één platte `node_modules` van echte mappen, zonder symbolische links.
  Het script stopt met een foutmelding als er toch een link overblijft.
- **Waarom:** de eerste deploy gaf op acceptatie een 500.
  Node laadt op de host één bestand van Next.js via het pad van de link, en zoekt de pakketten naast Next.js, zoals `@swc/helpers`, dan op de verkeerde plek.
  Lokaal en in CI gebeurt dat niet, dus de rooktest zag het niet.
  Waarom Node dat op de host doet, hebben we niet uitgezocht.
  Zonder links is er niets om verkeerd te volgen.
- **Alternatieven:** `node-linker=hoisted` in pnpm voor de hele werkruimte.
  Dat verandert de installatie van alle packages voor een probleem van één map.
  Of een startbestand dat Node de paden voorbereidt; dat hangt af van interne details van Next.js en Node.

### Adressen: sc.heerenveen.org voor productie, acc.sc.heerenveen.org voor acceptatie

- **Datum:** 21 oktober 2026
- **Besluit:** de site komt op `sc.heerenveen.org`, de acceptatieomgeving op `acc.sc.heerenveen.org`.
  Het forum blijft op `forum.heerenveen.org`.
- **Waarom:** `sc.heerenveen.org` was het adres van de fansite van 1999 tot 2006, dus oude links en lezers vinden de nieuwe site terug.
  Acceptatie krijgt het adres van productie met `acc.` ervoor, zodat je ziet bij welke omgeving het hoort.
- **Alternatieven:** `acceptatie.heerenveen.org`, los van het adres van productie.
  Of de site op `heerenveen.org` zelf; daar staat de doorverwijzing naar het forum.

### Eén tak: main is acceptatie, productie krijgt een release-tag

- **Datum:** 21 oktober 2026
- **Besluit:** er is één langlevende tak, `main`.
  Elke merge naar `main` gaat naar de acceptatieomgeving.
  Productie krijgt een versie na goedkeuring op acceptatie: de tag die release-please maakt als de eigenaar de release-pull request samenvoegt (zie #33).
  Elke deploy staat met zijn commit in de lijst Deployments van GitHub.
- **Waarom:** we voegen samen met squash en houden de geschiedenis lineair.
  Een tak `develop` zou bij elke release uit de pas lopen met `main`.
  Samenvoegen met een squash geeft release-please bovendien één regel in de changelog in plaats van één per wijziging.
  Een tag verandert niet meer, een tak wel.
- **Alternatieven:** `develop` voor acceptatie en `main` voor productie.
  Dat past bij samenvoegen zonder squash, en dat doen we niet.

### De site draait de migraties als ze start

- **Datum:** 22 oktober 2026
- **Besluit:** de server van de site draait de migraties die de database nog niet had als de host hem start, voordat hij verzoeken beantwoordt.
  Een slot in de database (`GET_LOCK`) voorkomt dat twee processen tegelijk migreren.
  Lukt het niet, dan schrijft de server een melding in het logboek en blijft hij draaien.
  De workflow Acceptance vraagt na het uitrollen `/bronnen` op, zodat een mislukte migratie een rode run geeft.
- **Hoe:** `register()` in `apps/site/src/instrumentation.ts` roept `prepareDatabase` aan uit `@fansite/db/prepare`, en Next.js beantwoordt geen verzoek voordat die klaar is.
  `assemble` zet de migraties in `packages/db/drizzle` van de map, want Next.js volgt alleen wat de code importeert en laat de SQL-bestanden weg.
  De rooktest maakt voor elke run een lege database aan op de server uit `DATABASE_URL`, en laat de site daar zijn tabellen maken.
  Zo bewijst hij ook dat de migraties in de map zitten.
- **Waarom:** `DATABASE_URL` staat alleen in de Node.js-app in DirectAdmin.
  Zo blijft het wachtwoord op één plek: niet in GitHub en niet in een tweede bestand op de host.
  Elke versie die start, heeft het schema dat ze nodig heeft, en productie (#33) werkt straks net zo.
- **Let op:** MariaDB kan `CREATE TABLE` en `ALTER TABLE` niet terugdraaien.
  Een migratie die halverwege mislukt, kan een half veranderd schema achterlaten.
  Productie krijgt daarom een back-up vóór een migratie (#33).
- **Alternatieven:** na het kopiëren een opdracht op de host draaien via SSH.
  Een SSH-sessie krijgt de variabelen van de app niet, dus `DATABASE_URL` moet dan ook in een bestand op de host, en we moeten Node daar zelf vinden.
  Of vanuit GitHub migreren door een SSH-tunnel; dan komt `DATABASE_URL` in de geheimen van GitHub.
  Of de server laten stoppen als het niet lukt; dan toont de host zijn eigen foutpagina, zonder uitleg en buiten onze huisstijl.

### De testbronnen staan alleen op acceptatie

- **Datum:** 21 oktober 2026
- **Besluit:** de site zet de testbronnen alleen met `SITE_ENV` `acceptance`, bij elke start.
  De seed werkt bestaande testbronnen bij op hun domein, dus er komen geen dubbele.
  `pnpm db:seed` weigert als `SITE_ENV` `production` is.
- **Waarom:** de groep moet op acceptatie een gevulde pagina kunnen nakijken, en op productie mogen nooit testbronnen komen.
- **Alternatieven:** acceptatie leeg laten en de bronnen met de hand invoeren.
  Dat kan pas met het beheer (#30), en dan vervangen de echte bronnen de testbronnen.

### De importer gaat als één bestand mee in de map van de site

- **Datum:** 22 oktober 2026
- **Besluit:** `esbuild` bundelt de importer met alles wat hij nodig heeft tot één JavaScript-bestand.
  `assemble` zet het in de map voor de host, dus dezelfde deploy kopieert de site en de importer.
- **Hoe:** het bestand is `apps/importer/import.mjs`.
  De map heeft geen `package.json` die zegt dat `.js` een ES-module is, dus de extensie zegt het.
- **Waarom:** op de server bouwen we niets.
  Node haalt geen typen weg uit bestanden in `node_modules`, dus `@fansite/db`, dat als TypeScript wordt geleverd, werkt daar niet zonder bouwstap.
  Eén bestand heeft geen `node_modules` en geen symbolische links nodig.
  Samen uitrollen houdt de importer gelijk met het schema, dat de site bij het starten bijwerkt.
- **Alternatieven:** een eigen map met een eigen `node_modules` via `pnpm deploy`, plat gemaakt zoals bij de site; dan moet `@fansite/db` alsnog gebouwd worden.
  Of een eigen map met een eigen stap in de workflow; dan kunnen de importer en het schema uit de pas lopen.

### Cron krijgt DATABASE_URL uit een eigen bestand op de host

- **Datum:** 22 oktober 2026
- **Besluit:** de cronjob start de importer met `node --env-file` en een bestand in de thuismap, buiten de map van de app en buiten `public_html`, dat alleen het account mag lezen.
- **Waarom:** een cronjob krijgt de variabelen van de Node.js-app in DirectAdmin niet.
  Het bestand blijft op de host en komt niet in GitHub.
- **Let op:** het wachtwoord van de database staat nu op twee plekken op de host: bij de app en in dit bestand.
  Wie het verandert, past beide aan.
  Dat wijkt af van _De site draait de migraties als ze start_, waar het op één plek bleef.
- **Alternatieven:** cron vraagt een adres van de site op, met een token, en de site draait de import met haar eigen `DATABASE_URL`.
  Dan staat het wachtwoord op één plek, maar draait de import in het webproces, en heeft de site een nieuw adres en een nieuw geheim nodig.
  Of `DATABASE_URL` in de opdracht van de cronjob; dan staat het wachtwoord leesbaar in DirectAdmin.

### Tot de jobplanner draait de import elke 15 minuten, zonder lock

- **Datum:** 22 oktober 2026
- **Besluit:** cron start de importer op acceptatie elke 15 minuten, niet op het hele kwartier.
  De lock in de database komt met de jobplanner (#13).
- **Waarom:** zo staat nieuws binnen een kwartier op de site, en de homepage bewaart de koppen vijf minuten.
  Eén feed kost een paar seconden, en de fetcher stopt na 15 seconden per verzoek, dus twee runs halen elkaar niet in.
  Op het hele kwartier starten veel cronjobs tegelijk.
- **Alternatieven:** elke 30 minuten; de Leeuwarder Courant stuurt geen `ETag`, dus elke run haalt de hele feed, maar het nieuws komt dan tot een half uur later.
  Of nu al een lock met `GET_LOCK`, zoals bij de migraties.

## Werkruimte

### Packages komen met het issue dat ze nodig heeft

- **Datum:** 20 oktober 2026
- **Besluit:** `apps/site`, `apps/importer` en `packages/db` komen er pas met het eerste issue dat er code in zet.
  `packages/shared` kwam met #2, voor de controle van omgevingsvariabelen.
  `apps/site` kwam met #6.
  `packages/db` kwam met #69.
  `apps/importer` kwam met #71, voor de fetcher.
  De site heet `apps/site` en niet `apps/web` of `apps/front-end`: het is de hele site, met de server en het beheer erbij, en "site" is het woord dat we overal gebruiken (besloten op 20 oktober 2026).
- **Waarom:** een leeg skelet moeten we bijhouden zonder dat het iets doet, en het legt een opzet vast voordat we weten wat het package nodig heeft.
- **Alternatieven:** alle packages nu als leeg skelet.

### TypeScript met project references

- **Datum:** 20 oktober 2026
- **Besluit:** de strikte opties staan in één `tsconfig.base.json`.
  De `tsconfig.json` in de root noemt elk package als project reference, en een package dat een ander importeert, verwijst ernaar.
  `pnpm typecheck` is `tsc -b`.
  Daarnaast staat `erasableSyntaxOnly` aan: geen enums, namespaces of parameter properties.
- **Waarom:** `tsc -b` controleert de packages in de goede volgorde en alleen wat veranderd is, en een package krijgt de types van een ander zonder aparte build.
  Met `erasableSyntaxOnly` kan Node 24 elk bestand zelf draaien, wat de importer kan gebruiken.
- **Let op:** TypeScript laat alleen naar een project verwijzen dat uitvoer schrijft.
  Daarom schrijven de packages alleen declaraties, in `node_modules/.cache/tsc`.
  Alleen `tsc -b` leest die bestanden; apps en bundlers lezen de TypeScript-bron.
- **Alternatieven:** `tsc --noEmit` per package, zoals eerst.
  Dat controleert elk package los en elke keer helemaal.
  Of een echte build per package naar `dist`, die we niet nodig hebben zolang niets gepubliceerd wordt.

### Het designsysteem levert de componenten als TypeScript-bronbestanden

- **Datum:** 22 oktober 2026
- **Besluit:** het package geeft de componenten als TypeScript-bronbestanden, zonder eigen bouwstap, zoals `@fansite/shared` dat al doet.
  De site compileert ze mee.
- **Waarom:** één manier van werken in de hele werkruimte, en geen aparte bouwstap die kan achterlopen op de bron.
- **Alternatieven:** het package naar JavaScript en typebestanden bouwen.
  Dat vraagt een bouwstap en een publicatiepijplijn die we niet nodig hebben, zolang alleen onze eigen site het gebruikt.

### Controles: snel bij de commit, volledig in CI

- **Datum:** 20 oktober 2026
- **Besluit:** husky installeert bij `pnpm install` twee git hooks.
  Voor een commit herstelt lint-staged met ESLint, Stylelint en Prettier wat het kan, alleen in de gestagede bestanden. commitlint controleert of het commitbericht Conventional Commits volgt.
  De workflow CI doet bij elke pull request en op `main` de rest: lint, typecontrole, tests en build.
- **Waarom:** een commit moet snel blijven; de typecontrole van de hele werkruimte past daar niet bij, en CI vangt die toch.
- **Alternatieven:** ook de typecontrole in de pre-commit-hook.
  Grondiger, maar elke commit wordt trager.

### De toegankelijkheidscontroles draaien op de gebouwde site, in de bestaande CI-job

- **Datum:** 22 oktober 2026
- **Besluit:** Playwright met axe draait in Chromium tegen de standalone build die ook de rooktest gebruikt, met een database met de seed.
  Het is een stap in de job "Lint, typecheck, test and build", na de rooktest.
  Elke pagina staat als één regel in de lijst in `apps/site/e2e/pages.spec.ts`, met het antwoord dat hij moet geven: 200, of 404 voor de pagina 'niet gevonden'.
  Een tikfout in een adres laat de test dus falen in plaats van stil de pagina 'niet gevonden' te toetsen.
- **Zo draait het:** CI geeft de map van de rooktest mee in `SITE_FOLDER`.
  Zonder die variabele zet `pnpm test:a11y` de laatste build zelf klaar in `.next/a11y`, zodat `pnpm build` en de database met de seed genoeg zijn.
  De reviewer kan `assemble` en de seed niet zelf draaien, maar `pnpm test:a11y` staat op zijn lijst.
  Zijn losse regel voor `pnpm exec playwright test` is daarom weggehaald: vanuit de root bestaat die opdracht niet.
- **Waarom:** we toetsen dezelfde pagina's die de host serveert.
  De build en de database zijn er in die job al.
  En de verplichte controle op `main` blijft dezelfde, dus de regels voor `main` veranderen niet.
- **Alternatieven:** een eigen job.
  Die staat apart in de lijst met controles, maar moet opnieuw bouwen of de build doorgeven, en moet als verplichte controle in de regels voor `main`.
  Of toetsen tegen `next dev`; dat is sneller, maar bezoekers krijgen een andere pagina.
  Of ook Firefox en WebKit; die kosten tijd, en axe vindt daar zelden iets anders.

### CI gebruikt de Chrome van de runner

- **Datum:** 23 oktober 2026
- **Besluit:** in CI draait Playwright op de Google Chrome die op de runner `ubuntu-latest` staat (`channel: 'chrome'`, als `CI` gezet is).
  De stap `playwright install --with-deps chromium` is weg.
  Lokaal blijft het de Chromium van Playwright, zoals in de README van de site staat.
- **Waarom:** die stap haalde pakketten via `apt` van een Ubuntu-spiegelserver.
  Die was in 14 van de laatste 40 runs zo traag (tot 49,7 kB/s) dat de stap tussen de 1,5 en 10,5 minuut duurde, tegen 16 tot 27 seconden als het goed gaat.
  De tests zelf duren 15 tot 20 seconden.
  Chrome van de runner komt met zijn eigen bibliotheken, dus er hoeft niets gedownload te worden.
- **Gevolg:** CI toetst met de Chrome-versie van de runner, die de beheerders van de image bijwerken, en niet met de Chromium-versie die bij Playwright hoort.
  Het blijft dezelfde engine.
  Faalt er ooit een test alleen in CI, kijk dan eerst naar het verschil in versie.
- **Alternatieven:** de browser cachen; dan draait `apt` nog steeds bij een lege cache.
  Of alleen de bibliotheken installeren die Chromium nodig heeft, zonder de lettertypes; dat is een lijst die we zelf moeten bijhouden.
  Of een container van Playwright voor de job; dat past slecht bij de MariaDB-service.

### axe toetst de pagina's, niet de stories

- **Datum:** 22 oktober 2026
- **Besluit:** de controle met axe in CI toetst de pagina's van de site.
  De stories in Storybook toetst axe alleen in het paneel Toegankelijkheid.
- **Waarom:** een component wordt getoetst op de pagina's die het gebruiken.
  Een browsertest voor alle stories hebben we op 22 oktober al laten liggen (zie _Componenten testen we met Vitest en Testing Library_): hij is zwaarder en overlapt met deze controle.
- **Alternatieven:** de Vitest-addon van Storybook, die elke story met axe toetst in een echte browser.
  Die vangt ook hover en focus per component, maar vraagt een tweede testopzet en maakt CI langer.
  We kijken opnieuw als een component op geen enkele pagina staat.

### Naast axe drie eigen controles

- **Datum:** 22 oktober 2026
- **Besluit:** de test controleert per pagina ook precies één `h1`, `lang="nl"` en geen horizontaal scrollen bij 320 pixels breed.
  Een test met pagina's die een fout hebben, zoals een link zonder naam, laat zien dat de controle die fout vangt.
- **Waarom:** axe ziet die punten niet of maar half.
  Het ziet of er een `lang` is, niet of die `nl` is, en het meet niet of de pagina bij 400% zoom past.
  Elke controle is een paar regels.
- **Alternatieven:** alleen axe, en de rest aan de checklist laten.
  Of ook de bediening met het toetsenbord en de volgorde van de focus; die zijn lastig betrouwbaar te automatiseren en blijven bij #25.

### E2e-tests alleen voor wat anders ongemerkt kapotgaat

- **Datum:** 22 oktober 2026
- **Besluit:** Playwright test in een echte browser alleen wat axe en de unit-tests niet zien en wat zonder test ongemerkt kapotgaat: axe met onze eigen controles op elke pagina, geen verzoeken naar een ander domein, en de foutpagina zonder database en zonder JavaScript.
  Maten, breedtes en uitlijning krijgen geen e2e-test; die kijk je na in Storybook en in de review.
  Stylelint weigert `100vw` als breedte.
- **Waarom:** een test met een maat moet mee veranderen bij elke keuze in het ontwerp, zoals bij #117, en legt dus het ontwerp vast in plaats van gedrag.
  `home.spec.ts` herhaalde de unit-tests van de homepage.
  Een lintregel vangt `100vw` eerder en goedkoper dan een browser.
  Minder tests in de browser maken CI sneller en een pull request kleiner.
- **Alternatieven:** alle tests laten staan.
  Of de maten in de tests uit de tokens lezen, zodat ze meebewegen; dan testen ze nog steeds het ontwerp.
  Of visuele regressietests met schermafbeeldingen; dat is een nieuw hulpmiddel, en de referentiebeelden vragen onderhoud.

### Alleen Baseline 'widely available', bewaakt door linters

- **Datum:** 21 oktober 2026
- **Besluit:** in CSS en in JavaScript voor de browser gebruiken we alleen functies die Baseline 'widely available' zijn.
  Linters bewaken dat, en `pnpm lint` faalt erop.
  Stylelint controleert alle CSS.
  ESLint controleert de TypeScript van het designsysteem en van de site, behalve bestanden die alleen op de server of tijdens de bouw draaien.
- **Waarom:** zo'n functie werkt al minstens dertig maanden in alle grote browsers.
  Dan zijn er geen voorvoegsels of polyfills nodig, en werkt de site voor iedereen, ook met een oudere browser of een ouder apparaat.
  Een regel in de linter blijft gelden als niemand eraan denkt.
- **Gereedschap:** `stylelint-plugin-use-baseline` voor CSS en `eslint-plugin-baseline-js` voor JavaScript en TypeScript.
  Beide zijn MIT, hebben geen installatiescript en brengen de Baseline-gegevens zelf mee, dus ze doen geen verzoeken naar buiten.
  Een nieuwe versie van het package kan een functie 'widely available' maken; Renovate stelt die voor.
  De ESLint-regel draait met de typen van het project, zodat ook methoden zoals `screen.orientation.lock()` opvallen.
- **Alternatieven:** een lijst van doelbrowsers (browserslist), die een versie per browser vastlegt in plaats van per functie.
  Of ook functies toestaan die 'newly available' zijn; dat geeft nieuwere mogelijkheden, maar sluit bezoekers met oudere browsers uit.
  Voor CSS kan ook `css/use-baseline` van `@eslint/css`, maar dat is een tweede CSS-linter naast Stylelint voor één regel.

### Functies die nog niet zover zijn: `@supports`, of een tijdelijke uitzondering

- **Datum:** 21 oktober 2026
- **Besluit:** een verbetering die niet overal werkt, zoals `accent-color`, `resize`, `::marker` en `text-wrap: balance`, staat binnen `@supports`, zodat andere browsers de standaardopmaak krijgen.
  `light-dark()` in de kleurtokens krijgt één tijdelijke uitzondering: een `stylelint-disable` met de reden en de datum.
  Stylelint meldt die als fout zodra ze overbodig is (`reportNeedlessDisables`).
  Dezelfde regel meldt een `@supports` als overbodig zodra de functie erin 'widely available' is.
  In JavaScript is er geen `@supports`.
  Daar is de tijdelijke uitzondering een `eslint-disable-next-line` met reden en datum, en ESLint meldt een overbodige als fout.
  Er is er nu één: de hint `willReadFrequently` in de contrastmeter van de documentatie, die tot 16 maart 2027 een waarschuwing in de console van Chrome voorkomt.
- **Waarom:** `light-dark()` is bijna zover.
  Volgens de gegevens van de regel wordt ze 'widely available' op 13 november 2026, dertig maanden nadat Safari 17.5 haar kreeg.
  De dertig regels herschrijven met `prefers-color-scheme` zouden we binnen weken weer terugdraaien.
  Een uitzondering die vanzelf faalt als ze niet meer nodig is, blijft niet hangen.
- **Let op:** `text-wrap: balance` wordt op dezelfde dag 'widely available'.
  Zodra de gegevens van de regel dat zeggen, falen de uitzondering en haar `@supports`, en haal je ze weg.
  Kijk dan ook of het `@supports not`-blok met de lichte waarden in `colour.css` nog nodig is (zie _Licht en donker met light-dark()_).
- **Alternatieven:** `light-dark()` nu vervangen door mediaquery's met `prefers-color-scheme`; dat draait het besluit 'Licht en donker met light-dark()' terug.
  Of de regel pas aanzetten als `light-dark()` doorkomt; dan beschermt hij tot die tijd niets.

### GitHub Actions vastgezet op een commit

- **Datum:** 20 oktober 2026
- **Besluit:** een workflow noemt elke action met de volledige SHA van een commit, met de versie als commentaar erachter, zoals `actions/checkout@3d3c42e… # v7.0.1`.
  GitHub dwingt dat af: een workflow met een action die niet zo vastligt, faalt.
  Renovate werkt de SHA en het commentaar samen bij.
- **Waarom:** de eigenaar van een action, of iemand die zijn account overneemt, kan een tag als `v7` naar andere code laten wijzen.
  Een SHA ligt vast.
  Dat telt extra in een openbare repository, en in workflows met schrijfrechten, zoals die voor releases en Storybook.
- **Alternatieven:** vastzetten op de hoofdversie (`@v7`), zoals eerst.
  Nieuwe versies komen dan vanzelf binnen, maar ook zonder dat iemand ze heeft gezien.

### Omgevingsvariabelen

- **Datum:** 20 oktober 2026
- **Besluit:** `.env.example` noemt en beschrijft elke variabele; `.env` zelf staat in `.gitignore`.
  Elke app controleert bij het opstarten zijn variabelen met `parseEnv` uit `@fansite/shared/env`, met een Zod-schema.
  Eén foutmelding noemt alle ontbrekende en ongeldige variabelen.
  Een lege waarde telt als ontbrekend, en de melding herhaalt nooit een waarde, omdat het een geheim kan zijn.
  Secret scanning en push protection van GitHub staan aan.
- **Eén `.env`:** in de root, voor alle apps.
  Next.js leest alleen een `.env` in zijn eigen map, dus `apps/site/next.config.ts` laadt de `.env` uit de root zelf, met `loadEnvConfig` uit `@next/env`.
- **Waarom:** het prototype werd gedeeld met het echte `.env`-bestand erin.
  Een verse clone moet draaien met alleen een ingevulde kopie van `.env.example`, en anders meteen zeggen wat er ontbreekt.
- **Alternatieven:** t3-env (`@t3-oss/env-nextjs`), dat ook client- en servervariabelen scheidt, maar voor de importer niets toevoegt.
  Of zonder controle, met de fout pas als een variabele gebruikt wordt.

### Renovate in plaats van Dependabot

- **Datum:** 20 oktober 2026
- **Besluit:** Renovate houdt de dependencies, pnpm, Node en de GitHub Actions bij, via de GitHub-app van Mend.
  Eén keer per week, met alle kleine updates (minor en patch) in één pull request en een eigen pull request per major-update.
  Een nieuwe versie wacht drie dagen.
  Beveiligingsupdates komen uit de OSV-database en wachten niet op het schema.
  TypeScript blijft onder 7.
- **Waarom:** Dependabot ondersteunt pnpm 12 nog niet officieel.
  Het lockfile van pnpm 12 bestaat uit twee YAML-documenten, en de dependency graph van GitHub leest alleen het eerste.
  Hij ziet dus geen enkele dependency, en geeft ook geen beveiligingsmeldingen ([dependabot-core#15904](https://github.com/dependabot/dependabot-core/issues/15904)).
  Renovate leest dat lockfile sinds juni 2026 wel.
  Het houdt ook monorepo's als Storybook en typescript-eslint vanzelf bij elkaar, en werkt `packageManager` en `.nvmrc` bij.
- **Nadeel:** een app van een andere partij krijgt schrijfrechten op de repository.
- **Commitberichten:** Renovate geeft een update van een dependency die in productie draait de titel `fix(deps)`, en alle andere updates `chore(deps)`, zoals die van de Actions en de dev-dependencies.
  We laten dat zo (besloten op 20 oktober 2026).
  Voor release-please maakt een `fix` een patch-release en een `chore` geen release (zie _Eén versie voor de hele site, met release-please_).
  Een update van een dependency in productie verandert wat bezoekers krijgen, bijvoorbeeld bij een beveiligingsfix, dus die hoort in de changelog.
- **Alternatieven:** Dependabot, ingebouwd en zonder extra app.
  Dat bekijken we opnieuw zodra het pnpm 12 ondersteunt.
  Of Renovate zelf draaien als GitHub Action: geen app van een ander, maar wel een token en onderhoud.
  Of elke update `chore(deps)` noemen, zodat een update nooit een release maakt; maar dan blijft een beveiligingsfix liggen tot een andere wijziging een release maakt.

### Conventional Commits in het Engels, ook in de titel van een pull request

- **Datum:** 20 oktober 2026
- **Besluit:** commits volgen Conventional Commits, in Brits Engels, zoals de code.
  We voegen samen met squash, en dan wordt de titel van de pull request de commit op `main`.
  Die titel volgt daarom ook Conventional Commits in het Engels, bijvoorbeeld `feat(site): add the news archive`.
  Een workflow controleert de titel met commitlint.
  De beschrijving van een pull request blijft Nederlands.
- **Wat is er nieuw:** dit beantwoordt de open vraag uit #29.
  De changelog van release-please blijft Engels en technisch.
  De tekst voor de pagina 'Wat is er nieuw' schrijven we per release met de hand, in gewone taal.
  Dat gebeurt in een gewone pull request voordat de release-pull request wordt samengevoegd, want release-please schrijft zijn eigen branch bij elke run opnieuw.
  Hoe de pagina die teksten leest, bepaalt #29.
- **Waarom:** release-please maakt versienummers en changelog uit de commits op `main`.
  De geschiedenis van git blijft zo in één taal.
  En een commitbericht is geen tekst voor bezoekers: ook een Nederlands bericht zou voor 'Wat is er nieuw' herschreven moeten worden.
- **Instelling:** een squash-commit krijgt altijd de titel van de pull request, ook bij een pull request met één commit.
  Anders zou GitHub de titel van die commit nemen.
- **Alternatieven:** een Nederlandse onderwerpregel met een Engels type, zoals `feat(site): nieuwsarchief toevoegen`.
  Dan wordt de changelog Nederlands, en kan #29 met de regels daaruit beginnen.
  Maar de commits op een branch zijn Engels, en de titels op `main` dan niet.
- **Later:** de pagina heet nu Updates en staat op `/updates`; zie _De pagina Wat is er nieuw heet Updates, op `/updates`_.

### Eén versie voor de hele site, met release-please

- **Datum:** 20 oktober 2026
- **Besluit:** de hele repository heeft één versie, in `package.json` in de root.
  De eerste release is 0.1.0, met de tag `v0.1.0`.
  De eigenaar start release-please met `pnpm release` (een handmatige run van de workflow Release); die opent of werkt de release-pull request bij.
  Samenvoegen verhoogt de versie en vult `CHANGELOG.md` aan.
  De samenvoeging wijzigt `.release-please-manifest.json`, en die push start de workflow weer, nu alleen om te taggen en een release op GitHub te maken.
  Tot 1.0.0, dat we voor de lancering bewaren, verhogen een feature en een breaking change het middelste cijfer.
- **Waarom:** de site en de importer gaan samen live, en we publiceren geen packages.
  De release-pull request komt er pas als de eigenaar erom vraagt (besloten op 21 oktober 2026).
  Anders staat er bij elke `feat` of `fix` op `main` een openstaande pull request, en herschrijft release-please zijn branch bij elke merge.
- **Let op:** release-please maakt zijn pull request met het token van GitHub Actions.
  Daarvoor mag GitHub Actions in deze repository pull requests maken.
  Een pull request van een workflow start geen andere workflows, dus de controles ontbreken.
  Sluit de release-pull request en open hem weer; dan starten ze wel.
  Dat staat ook onderaan die pull request.
- **Alternatieven:** een versie per package.
  Of release-please met het token van een eigen GitHub App, zodat de controles vanzelf starten.
  Dat is een geheim meer om te beheren; als het sluiten en openen gaat tegenstaan, stappen we over.

### Regels voor main

- **Datum:** 20 oktober 2026
- **Besluit:** de ruleset 'main' geldt alleen voor `main`.
  Een wijziging komt er alleen via een pull request, samengevoegd met squash, en alleen als drie controles slagen: _Lint, typecheck, test and build_ (CI), _Build Storybook_ en _Conventional Commits title_.
  Niemand mag de regels omzeilen.
  `main` verwijderen of force-pushen kan niet.
  Op andere branches gelden geen regels, zodat je ze kunt rebasen en na het samenvoegen kunt verwijderen.
- **Waarom:** zo kan een pull request met een typefout echt niet samengevoegd worden.
  De vorige ruleset, 'All branches', gold voor elke branch, met de regels _creation_ en _update_.
  Daardoor kon alleen wie de regels mocht omzeilen een branch maken of bijwerken, vroeg elke merge naar `main` om dat vinkje, en konden release-please en Renovate hun eigen branches niet maken.
- **Let op:** de ruleset kent de controles aan hun naam, van de app GitHub Actions.
  Wie een job hernoemt, past de ruleset mee aan.
  In een noodgeval kan een beheerder de ruleset tijdelijk aanpassen.
- **Alternatieven:** de oude ruleset houden en het vinkje blijven zetten.
  Of wie schrijfrechten heeft de regels laten omzeilen; dan kan ook een pull request met een fout erdoor.

## Designsysteem

### Werkruimte met één package

- **Datum:** 20 oktober 2026
- **Besluit:** een pnpm 12-werkruimte op Node 24, met voorlopig één package: `packages/design-system`, met de naam `@fansite/design-system`.
  De naam is voorlopig.
- **Waarom:** het designsysteem kan nu al beginnen, los van de site en de import.
  De andere packages komen erbij als de monorepo verder wordt opgezet.
- **Alternatieven:** meteen de hele monorepo opzetten.
  Dat is meer werk voordat er iets te zien is.
- **Later:** zie _Packages komen met het issue dat ze nodig heeft_.

### TypeScript 6 in plaats van 7

- **Datum:** 20 oktober 2026
- **Besluit:** we gebruiken TypeScript 6.0, niet de nieuwe TypeScript 7.
- **Waarom:** TypeScript 7 is een nieuwe compiler, geschreven in Go, en heeft nog geen JavaScript-API. typescript-eslint (tot en met 6.0) en de documentatie-generator van Storybook hebben die API nodig.
  We stappen over zodra die tools TypeScript 7 ondersteunen.
- **Alternatieven:** TypeScript 7 alleen voor de typecontrole en TypeScript 6 voor de tools.
  Dat zijn twee compilers naast elkaar, voor weinig winst.

### Lettertypes uit de @fontsource-variable-packages

- **Datum:** 20 oktober 2026
- **Besluit:** Truculenta en Atkinson Hyperlegible Next komen uit `@fontsource-variable/truculenta` en `@fontsource-variable/atkinson-hyperlegible-next`.
  De `@font-face`-regels schrijven we zelf, met alleen de subsets latin en latin-ext.
- **Waarom:** de packages hebben alle assen die we nodig hebben (Truculenta: gewicht, breedte en optische grootte; Atkinson: gewicht en cursief), met de OFL-licentie erbij, en ze zijn bij te werken met pnpm.
  Met eigen regels heten de lettertypes gewoon Truculenta en Atkinson Hyperlegible Next, en laten we de Vietnamese subset weg.
  Latin dekt het Nederlands en het Fries; latin-ext (met onder meer Ĳ en ĳ) laadt de browser alleen als een pagina zo'n teken bevat.
  Er gaat geen verzoek naar een ander domein.
- **Alternatieven:** de CSS van fontsource zelf gebruiken (met de Vietnamese subset en namen als 'Truculenta Variable'), of de woff2-bestanden zelf in de repository zetten (bijwerken met de hand).
- **Let op:** de `url()` in `fonts.css` verwijst naar een pad in het package, zoals `@fontsource-variable/truculenta/files/…`.
  Vite lost dat op; bij de Next.js-app moeten we controleren of dat daar ook werkt.

### Licht en donker met light-dark()

- **Datum:** 20 oktober 2026
- **Besluit:** elk semantisch kleurtoken heeft één regel met beide waarden: `light-dark(licht, donker)`.
  Zonder keuze volgt de site de systeeminstelling.
  `data-theme="light"` of `data-theme="dark"` op het `html`-element kiest een thema, en werkt ook op een los element.
- **Waarom:** geen dubbele lijst van donkere waarden (één keer in een mediaquery en één keer voor `data-theme`).
  De documentatie kan licht en donker naast elkaar tonen.
  `light-dark()` werkt in alle gangbare browsers sinds 2024 (Chrome 123, Firefox 120, Safari 17.5).
- **Oudere browsers:** die krijgen via een `@supports`-blok alleen het lichte thema.
  De lichte waarden staan daardoor twee keer in `colour.css` en moeten gelijk blijven.
  Randen en focusranden nemen alleen hun kleur uit een token, zodat ze ook zonder token zichtbaar blijven, in de tekstkleur.
- **Alternatieven:** een apart blok met donkere waarden, twee keer herhaald.
  Werkt ook in oudere browsers, maar raakt makkelijk uit de pas.

### Voorvoegsel hf-

- **Datum:** 20 oktober 2026
- **Besluit:** klassen en custom properties beginnen met `hf-`, van Heerenveen Fansite: `.hf-heading-3`, `--hf-colour-text-default`.
  Cascade layers heten `hf.tokens`, `hf.base`, `hf.typography` en `hf.components`.
  Klassen die alleen in Storybook bestaan, beginnen met `_hf-docs-`.
  Stylelint controleert dit.
- **Waarom:** kort, herkenbaar als Heerenveen Fansite, en het botst niet met klassen van anderen.
- **Alternatieven:** `fs-` (fansite), dat we eerst voorlopig gebruikten, `shf-` (sc Heerenveen Fansite) en `hv-` (Heerenveen).
- **Later:** er is een vijfde laag, `hf.utilities`; zie _Hulpklassen zitten in de sterkste laag_.

### Lagen in de CSS

- **Datum:** 20 oktober 2026
- **Besluit:** alle CSS van het designsysteem zit in cascade layers, van zwak naar sterk: tokens, base (HTML-elementen), typography (typestijlen), components.
- **Waarom:** de volgorde bepaalt wat wint, niet de specificiteit.
  CSS van de site zelf, buiten een laag, wint altijd van het designsysteem.
- **Alternatieven:** geen lagen, en dan specificiteit en volgorde bewaken.
  Dat wordt lastiger naarmate er meer componenten zijn.
- **Later:** er is een vijfde laag, `hf.utilities`, na `hf.components`; zie _Hulpklassen zitten in de sterkste laag_.
- **Later:** de volgorde van de lagen staat in een eigen bestand; zie _De volgorde van de lagen staat in een eigen bestand_.

### Typestijl los van het HTML-niveau

- **Datum:** 20 oktober 2026
- **Besluit:** elke typestijl is een klasse (`.hf-heading-3`, `.hf-headline`, `.hf-meta`).
  Zonder klasse krijgen `h1` tot en met `h4` de stijl met hetzelfde nummer.
  `h5` krijgt voorlopig de nieuwskop en `h6` het label.
- **Waarom:** de kopstructuur volgt de inhoud, de stijl volgt het ontwerp.
  Een kaarttitel is een `h2` die eruitziet als kop 3.
- **Alternatieven:** `h5` en `h6` dezelfde stijl als `h4` geven.
  Dan zijn de niveaus niet van elkaar te onderscheiden.

### Mobiele lettergroottes

- **Datum:** 20 oktober 2026
- **Besluit:** kop 1 en kop 2 schalen mee met `clamp()`, van 360 tot 1280 pixels breed.
  Woordmerk, kop 3, kop 4 en nieuwskop springen één keer naar hun mobiele maat, onder 40 em (640 pixels).
  Dat breekpunt is voorlopig.
- **Waarom:** bij de grote koppen is het verschil groot genoeg om geleidelijk te schalen; bij de kleine is het 1 pixel.
- **Alternatieven:** alles met `clamp()`.
- **Later:** zie _Elke tekststijl een stap groter_ en _Kleinere koppen en vaste tekstmaten_.
  De maten zijn een stap groter; de nieuwskop springt op een smal scherm nu naar 19 pixels.

### Voorlopige kleurtokens

- **Datum:** 20 oktober 2026
- **Besluit:** deze waarden stonden niet in het afgesproken palet.
  Ze zijn voorlopig ingevuld en wachten op een besluit:
  - knoppen in donker: blauw-300 met tekst in blauw-950, net als de links in donker;
  - knop onder de muis: blauw-900 (licht) en blauw-200 (donker);
  - hover en zebrarijen in donker: blauw-950, de pagina, want tussen kaart (blauw-900) en pagina ligt geen stap meer;
  - link onder de muis in donker: blauw-200 (in licht blauw-800, zoals in het canvas);
  - bezochte link: grijs-600 (licht) en grijs-400 (donker), zodat je ziet wat je al hebt gelezen.
    Browsers staan voor bezochte links alleen een andere kleur toe, dus het verschil zit in kleur én helderheid;
  - rand van invoervelden: grijs-500 (licht) en blauw-400 (donker), omdat de gewone randkleuren de vereiste 3:1 voor velden niet halen.
- **Waarom:** de HTML-elementen hebben deze kleuren nodig.
  Alle tekst haalt ermee AA, lopende tekst AAA.
- **Uit het canvas overgenomen:** tekst in de header blauw-50 en het menu blauw-200, tekst op de wedstrijdband blauw-100, en de gemarkeerde rij in blauw-100 met blauw-800 (licht) en blauw-800 met blauw-50 (donker).
- **Later:** zie _Alleen koppen laten zien dat je ze al hebt geopend_ (24 oktober 2026): de kleur voor bezocht staat hier voor elke link; nu geldt hij alleen voor de koppen.

### Staal voor markeringen

- **Datum:** 20 oktober 2026
- **Besluit:** wat nummert, scheidt of aanwijst, krijgt staal: een gedempt blauw dat rustiger is dan de tekst.
  Nu zijn dat opsommingstekens en nummers van lijsten, de positie in een stand, de lijn bij een citaat en de stippellijn onder een afkorting; later ook stap- en paginanummers, scheidingstekens, kleine pictogrammen en balkjes in grafiekjes.
  Daarvoor komen er drie kleuren bij het palet: staal 400, 500 en 600 (tint 255°, chroma 0,075), even licht als grijs-400, -500 en -600.
  Nummers en posities (tekst) zijn in licht staal 600 en in donker blauw-200; tekens, lijnen en pictogrammen (grafisch) zijn staal 500 en staal 400.
- **Waarom:** ton-sur-ton bij de rest van de site, rustiger dan de tekst, en niet te verwarren met links (helder blauw) of datums (rood).
  Secundaire tekst, kaartranden en lijnen tussen rijen blijven grijs; staal 400 tot en met 600 is alleen voor markeringen.
  Tekst haalt minstens 4,5:1 en grafische markeringen minstens 3:1 op pagina, kaart en tonaal vlak.
- **Alternatieven:** grijs, helder blauw uit het palet en rood.
  Als naam: lei, duif en mar (Fries voor meer).

### Zand voor de grijzen

- **Datum:** 20 oktober 2026
- **Besluit:** de grijsreeks krijgt tint 85° (zand) in plaats van 255° (blauw), met een chroma van 0,006 tot 0,017.
  De lichtheid per stap blijft gelijk, en daarmee ook het contrast: geen enkel paar verschuift meer dan 0,15.
- **Waarom:** met blauwgetinte grijzen was bijna alles blauw en voelde de site koel.
  Zand geeft een rustige, vriendelijke basis met karakter, en blauw en rood springen er meer uit.
- **Alternatieven:** klei (tint 62°, met meer rood; dat leidde af van de rode datums), kiezel (tint 75°, bijna neutraal, maar nog wat koel) en de blauwgetinte grijzen.
- **Let op:** op goedkope schermen en met een nachtstand kan de pagina iets geler ogen.

### Drie tonale vlakken, elk met een eigen rand

- **Datum:** 20 oktober 2026
- **Besluit:** naast het tonale vlak in blauw-100 zijn er twee: een zacht vlak in blauw-50 en een warm vlak in zand (#F3E8D3, even licht en verzadigd als blauw-100).
  De tokens heten `background-surface-tonal`, `background-surface-soft` en `background-surface-warm`.
- **Rand:** elk tonaal vlak krijgt een rand van 1 pixel, net als een kaart.
  De randkleur komt uit de reeks van het vlak; zie _Kleuren, reeksen en rollen_.
  In licht is dat staal-300 (tonaal vlak), staal-200 (zacht vlak) en zand-300 (warm vlak).
  In donker is het dezelfde stap als van kaart naar rand (blauw-900 naar blauw-700); voor het tonale vlak (blauw-800) is dat blauw-600.
- **Donker:** het zachte vlak is in donker gelijk aan het vlak (blauw-900 met rand blauw-700).
  Het warme vlak is gelijk aan het tonale vlak (blauw-800 met rand blauw-600); zand is er alleen in licht.
- **Code:** codeblokken (`pre`) krijgen de rand van het tonale vlak; code in een zin niet.
- **Waarom:** met meer tonale vlakken kan elke soort inhoud een eigen vlak krijgen, en sturen we de aandacht van de lezer.
  Het maakt de pagina ook levendiger; er was te veel blauw.
  De rand maakt tonale vlakken even duidelijk afgebakend als kaarten.
- **Later:** zie _Een kaart is een eigen component, en de koppen staan op een wit vlak_.
  Het tonale vlak heet nu het sterke vlak, met de tokens `background-surface-strong` en `border-surface-strong`.

### Kleuren, reeksen en rollen

- **Datum:** 20 oktober 2026
- **Besluit:** het palet heeft drie lagen.
  Kleuren: blauw (255°), rood (27°) en zand (85°).
  Reeksen: een kleur in één sterkte, met genummerde stappen van licht naar donker: blauw en rood (helder), staal en zand (gedempt), grijs (neutraal zand).
  Rollen: waarvoor een kleur dient, zoals pagina, vlak, rand en tekst.
  Alleen reeksen hebben nummers; rollen hebben een naam.
- **Randen:** de rand van een vlak komt uit de gedempte of neutrale reeks van zijn kleur.
  Lichte vlakken krijgen stap 200 (vlak grijs-200, zacht vlak staal-200), tonale vlakken stap 300 (tonaal vlak staal-300, warm vlak zand-300).
  Zo zijn er geen losse randkleuren.
- **Waarom:** de kleuren moeten makkelijk te begrijpen en uit te leggen zijn.
  Staal en grijs leken aparte kleuren, maar zijn blauw en zand in een andere sterkte.
- **Alternatieven:** losse randkleuren per vlak, op een vaste afstand van het vlak (eerst #b8cce6, #cbd7e7 en #d7c9ac).

### Vier vlakken; een kaart is een vlak met een rand

- **Datum:** 20 oktober 2026
- **Besluit:** in de kleuren zijn kaart en vlak één begrip.
  Er zijn vier vlakken, elk met een achtergrond en een rand: vlak (wit), tonaal vlak, zacht vlak en warm vlak.
  Een kaart is het onderdeel: een vlak met een rand, ronde hoeken en binnenruimte.
  Code, invoervelden en de gemarkeerde rij gebruiken de kleur van een vlak zonder kaart te zijn.
  De tokens heten `background-surface` (met `-tonal`, `-soft` en `-warm`) en `border-surface` (idem).
  `border-default` blijft voor lijnen tussen rijen.
- **Waarom:** sinds tonale vlakken een rand hebben, verschillen kaart en vlak alleen in kleur, en in donker is het zachte vlak al gelijk aan het vlak.
  Eén begrip is makkelijker uit te leggen: een kaart is een vlak met een rand, en er zijn vier vlakken.
- **Alternatieven:** kaart en tonaal vlak als twee aparte rollen, zoals eerst.
- **Later:** zie _Een kaart is een eigen component, en de koppen staan op een wit vlak_.
  Het tonale vlak heet nu het sterke vlak, met de tokens `-strong` in plaats van `-tonal`.

### Eigen focusrand op de donkere blauwe vlakken

- **Datum:** 22 oktober 2026
- **Besluit:** de header en de wedstrijdband krijgen een eigen kleur voor de focusrand: `--hf-colour-focus-on-header` en `--hf-colour-focus-on-band`, allebei blauw-300, in licht en donker.
  Dat beantwoordt de open vraag van 20 oktober 2026.
- **Waarom:** in het lichte thema haalde de focusrand (blauw-500) op de wedstrijdband (blauw-800) maar 2,65:1, en nodig is 3:1.
  Blauw-300 haalt 7,90:1 op de header en 6,22:1 op de band in licht, en 6,22:1 en 7,90:1 in donker.
  Het palet verandert niet.
  Elk vlak heeft een eigen token, zoals bij de tekstkleuren, zodat het ene vlak kan veranderen zonder het andere.
- **Hoe:** de `Page.Header` zet de rollen voor tekst, links en focus opnieuw voor alles wat erin staat.
  Een component in de header hoeft daar niets voor te doen.
  Het contrast staat bij Tokens › Kleur in Storybook, en een story van de `Page.Header` laat de focusrand zien.
- **Alternatieven:** een focusrand in twee kleuren (bijvoorbeeld blauw-500 met een witte binnenrand) die op elke achtergrond werkt.
  Dat vraagt meer CSS en geeft een andere rand dan op de rest van de site.
  Of blauw-500 in licht donkerder maken; dat verandert de focusrand op alle lichte vlakken.

### Storybook

- **Datum:** 20 oktober 2026
- **Besluit:** Storybook 10 met React en Vite, met verhalen in CSF Next (`preview.meta()` en `meta.story()`).
  Add-ons: docs, a11y (axe) en Pseudo States, om hover, focus en bezocht te tonen.
  Telemetrie, de versiecontrole, de melding van het nieuwsoverzicht en de Engelse onboarding staan uit.
  De dev-server haalt het nieuwsoverzicht van storybook.js.org nog wel op; dat valt in Storybook 10.6 niet uit te zetten.
  De pagina's zelf praten alleen met de lokale server.
  De a11y-controle staat op `error`, zodat een overtreding een test laat falen zodra de tests in Storybook draaien.
- **Waarom:** CSF Next is de nieuwe manier van schrijven, met betere typen; nu beginnen voorkomt een omzetting later.
  Storybook zelf is Engels, maar alles wat wij schrijven is Nederlands: hoofdstukken, verhalen, documentatie en de themaknop.
- **Alternatieven:** CSF 3, de huidige standaard.

### De namen van de paginacomponenten volgen NL Design System

- **Datum:** 22 oktober 2026
- **Besluit:** de componenten heten `Root` (de `html`), `Body` (de `body`), `Page`, `PageHeader`, `PageBody` en `PageFooter`.
  Dat zijn de namen en de rolverdeling uit de discussies van NL Design System.
  Root is de `html`, Body de `body` en Page Body het deel tussen header en footer.
- **Waarom:** we delen zo de woorden met de ontwerpsystemen van de Nederlandse overheid.
  Een `Body` die de `body` is, botst niet met een `PageBody` die de `main` bevat.
  Het is ook de plek waar de `head` apart blijft: Next.js beheert die, en een eventuele `Head` komt als eigen component naast `Body`.
- **Alternatieven:** eigen namen, zoals `Document`, `Header`, `Body` en `Footer`.
  Dat zijn minder componenten, maar `Document` moet dan zowel `html` als `body` maken, en `Body` zou dan iets anders betekenen dan de `body`.
- **Later:** zie _De onderdelen van een pagina hebben een punt: `Page.Header`, `Page.Body` en `Page.Footer`_.
  De rollen blijven die van NL Design System; alleen de schrijfwijze is veranderd.

### Componenten testen we met Vitest en Testing Library

- **Datum:** 22 oktober 2026
- **Besluit:** de componenten van het designsysteem hebben tests met Vitest en Testing Library, die de rol, de naam en de structuur controleren, zonder browser.
  De tests draaien in jsdom.
- **Waarom:** Vitest gebruiken we al.
  Zulke tests draaien in milliseconden, en ze vangen de fouten die bij een component horen: een ontbrekende naam, een verkeerd niveau, een kapotte structuur.
  De controle met axe in een echte browser komt apart (#79).
- **Alternatieven:** de Vitest-addon van Storybook, die de stories zelf in een echte browser draait.
  Dat is sterker, maar zwaarder, het vraagt een browser in CI en het overlapt met #79.
  Of alleen stories; dat voldoet niet aan de regel dat nieuw gedrag tests heeft.

### Het logo is een schild met echte tekst

- **Datum:** 22 oktober 2026
- **Besluit:** het component `Logo` tekent het schild als SVG in de pagina en zet het woordmerk en "sinds 1997" als tekst ernaast, in de typestijl van het woordmerk.
  De SVG-bestanden in `src/assets` blijven bestaan voor plekken buiten de site, zoals een social-afbeelding.
- **Vaste kleuren:** het schild houdt in elk thema dezelfde kleuren (blauw-500, blauw-700, rood-600 en wit), zoals de SVG-bestanden.
  Dat is de uitzondering op de regel om geen primitieve kleuren in componenten te gebruiken: een beeldmerk verandert niet met het thema.
- **Waarom:** de tekst volgt de kleuren van het thema en van de header, dus één component dekt licht, donker en de header.
  De tekstkleuren van de SVG-bestanden voor licht en donker zijn al die van de rollen voor koppen en secundaire tekst.
  Het is ook veel kleiner: ongeveer 2 kB in plaats van 24 kB, omdat de letters in de bestanden omtrekken zijn.
  En een schermlezer en wie kopieert krijgen echte tekst, zoals het besluit over "sc Heerenveen met kleine letters" al veronderstelt.
  Een SVG-bestand importeren werkt bovendien in Vite en in Next.js niet op dezelfde manier.
- **Nadeel:** het woordmerk hangt af van het lettertype.
  Tot dat geladen is, toont de browser een vervangend lettertype (`font-display: swap`).
- **Alternatieven:** de SVG-bestanden als plaatje gebruiken, met een variant per thema en de andere met CSS verbergen.
  Of de bestanden in de pagina zetten, wat 24 kB per pagina kost.

### Geen disclaimer, wel "Voor supporters, door supporters"

- **Datum:** 22 oktober 2026
- **Besluit:** de header en de footer dragen "sinds 1997" en "Voor supporters, door supporters."
  Er komt geen zin in die zegt dat we geen onderdeel van sc Heerenveen zijn.
  Het clubwapen gebruiken we nog steeds niet: ons eigen logo en die zin maken duidelijk van wie de site is.
- **Waarom:** een aparte disclaimer klinkt als een excuus, terwijl "Voor supporters, door supporters" zegt wat we zijn.
  Wie het logo en die zin ziet, begrijpt dat dit een site van supporters is en geen kanaal van de club.
- **Alternatieven:** een uitdrukkelijke zin in de footer houden, zoals "De sc Heerenveen Fansite is geen officieel onderdeel van sc Heerenveen".
  Dat is duidelijk, maar defensief.
- **Later:** zie _De footer zegt wat je op de site vindt_.
  "sinds 1997" staat sindsdien alleen nog in het logo.

### Storybook toont de code van het voorbeeld

- **Datum:** 22 oktober 2026
- **Besluit:** onder elk voorbeeld in Storybook toont "Show code" de JSX die het voorbeeld rendert, en niet de aanroep `meta.story({ ... })` eromheen.
  Daarvoor staat `parameters.docs.source` op `dynamic`, zonder de decorators.
  De stories die een hulpcomponent uit `ExamplePage.tsx` renderen, tonen dat bestand zelf, via `src/docs/exampleSource.ts`, dat het met `?raw` inleest.
- **Waarom:** wie een component wil gebruiken, wil zien hoe dat moet, en zo bedient één `render` de lichte en de donkere story.
  Een hulpcomponent zoals `ExampleHeader` zou anders alleen `<ExampleHeader />` laten zien, en de story van `Page` draait in een eigen venster, waar de gegenereerde code niets zegt.
  De themawrapper is een decorator en hoort niet in het voorbeeld.
- **Alternatieven:** per story met de hand `source.code` schrijven; dat is dubbele code die achterloopt op het voorbeeld.
  Of de standaard laten staan, die de aanroep van `meta.story` toont.

### Elk component heeft zijn eigen CSS

- **Datum:** 22 oktober 2026
- **Besluit:** elke map in `src/components` heeft een eigen CSS-bestand met de stijlen van dat component, zoals `navigation/navigation.css`.
  De stijlen van `Heading`, `Text`, `Link`, `List`, `Body` en `Root` zijn daarheen verhuisd, uit `typography/styles.css` en `base/`.
  `base/` houdt de elementen zonder component: de focusrand, tabel, formulier, code, citaat, figuur, scheidingslijn en afbeelding.
  Een CSS-bestand mag regels in meer dan één laag hebben, zoals `heading.css` in `hf.base` en `hf.typography`.
  Elke regel houdt zijn laag, en de volgorde van de imports in `index.css` houdt regels die elkaar kunnen overschrijven in dezelfde volgorde.
  De cascade verandert dus niet.
- **Waarom:** de stijlen van een component staan naast zijn code, stories en tests.
  Een component verplaatsen of weghalen is dan een wijziging in één map.
- **Alternatieven:** de stijlen gegroepeerd houden naar soort: `base`, `typography` en `components`.
  Dat sluit aan op de lagen, maar verspreidt één component over drie bestanden.

### Onderdelen met een punt: `List.Item`

- **Datum:** 22 oktober 2026
- **Besluit:** een onderdeel dat alleen binnen zijn ouder werkt, is een eigenschap van die ouder.
  Je schrijft het met een punt: `List.Item` is het `li` in een `List`.
  Het package geeft het niet als los component.
- **Waarom:** de naam zegt waar het onderdeel hoort, en je importeert alleen de ouder.
  Een `li` buiten een `ul` of `ol` is geen geldige HTML.
- **Let op:** een servercomponent kan geen onderdeel met een punt gebruiken van een component met `'use client'`.
  De componenten van het designsysteem hebben geen `'use client'`, dus bij hen werkt het.
- **Alternatieven:** een los component `ListItem`, zoals de andere componenten.
  Dat is een export meer, en de naam zegt niet dat het alleen in een `List` werkt.
- **Later:** zie _De onderdelen van een pagina hebben een punt: `Page.Header`, `Page.Body` en `Page.Footer`_.
  De regel is sindsdien breder: een onderdeel dat bij één oudercomponent hoort, krijgt een punt, ook als het element buiten die ouder wel geldig is.

### De onderdelen van een pagina hebben een punt: `Page.Header`, `Page.Body` en `Page.Footer`

- **Datum:** 22 oktober 2026
- **Besluit:** de header, de inhoud en de footer van een pagina zijn eigenschappen van `Page`, met een punt in de naam, net als `List.Item`.
  De regel voor een punt wordt breder: een onderdeel dat bij één oudercomponent hoort, krijgt een punt, ook als het element buiten die ouder wel geldig is.
  De rollen blijven die van NL Design System; alleen de schrijfwijze verandert.
  Het package geeft `PageHeader`, `PageBody` en `PageFooter` niet meer als losse componenten.
- **Waarom:** één schrijfwijze voor de onderdelen van een component.
  Je importeert alleen `Page`, en de naam zegt waar het onderdeel hoort.
- **Alternatieven:** de losse namen van NL Design System houden, zoals de beslissing _De namen van de paginacomponenten volgen NL Design System_ koos.
  Die delen de woorden met de ontwerpsystemen van de overheid, en een `header`, `main` of `footer` is ook buiten een pagina geldige HTML.
- **Later:** zie _Page.Body is het raster, met een hoofdkolom en een zijbalk_.
  `Page.Body` is nu altijd een `div` met de onderdelen `Page.Main`, `Page.Sidebar` en `Page.Cell`; de `main` is `Page.Main`.

### Een ruime lijst vraag je aan

- **Datum:** 22 oktober 2026
- **Besluit:** `List` heeft de eigenschap `loose` voor een ruime lijst, zoals Markdown die kent.
  Elk item krijgt dan 1rem ruimte onder zich, en de laatste alinea in een item heeft zelf geen ruimte onder zich.
  Het laatste item heeft geen eigen ruimte, dus onder een ruime lijst staat evenveel ruimte als onder een gewone lijst.
  Een pagina kiest daar zelf voor; een gewone lijst blijft compact.
  `/bronnen` gebruikt het voor de lijst van elke soort.
- **Waarom:** de ruimte hoort bij het item, niet bij de alinea erin, zodat een item zonder alinea dezelfde ruimte krijgt.
  Een eigenschap is voorspelbaar: de pagina krijgt wat ze vraagt, los van wat er in de items staat.
- **Alternatieven:** de ruimte automatisch geven zodra een item in de lijst een alinea bevat, met `:has()`.
  Dan hoeft een pagina niets te kiezen, maar de inhoud van één item verandert dan de hele lijst.

### De header loopt over de hele breedte van het venster

- **Datum:** 22 oktober 2026
- **Besluit:** de achtergrond van de header loopt op elke breedte van rand tot rand.
  Het logo en de navigatie blijven in de kolom van de pagina, in lijn met de inhoud eronder.
  De footer blijft in de kolom.
- **Hoe:** de `Page` is zo breed als het venster.
  De header, de body en de footer zetten zelf de ruimte aan de zijkanten, uit het token `--hf-page-inset`: de helft van wat het venster breder is dan `--hf-page-max-width`, en nooit minder dan de marge.
  De kolom blijft zo 75 rem breed, zoals voorheen.
  De header gebruikt het als `padding-inline`, de body en de footer als `margin-inline`.
  Een percentage verwijst naar de breedte van de ouder, en die telt de scrollbalk niet mee.
  De header heeft de eigen zijruimte van 1,5 rem (op een smal scherm 1 rem) niet meer, zodat het logo op dezelfde plek staat als de inhoud.
- **Waarom:** een band van rand tot rand is duidelijk de bovenkant van de site.
  Op een telefoon stond de blauwe balk met een smalle rand aan beide kanten los.
  Omdat de inhoud in de kolom blijft, staat het logo in lijn met de rest van de pagina.
- **Alternatieven:** alleen op een smal scherm van rand tot rand, onder 40em of onder 75rem; op een breder scherm staat de balk dan nog in de kolom.
  Of de header in de kolom laten, zoals voorheen.
  Of de header `100vw` breed maken, met een negatieve marge: `100vw` telt de scrollbalk mee, dus op Windows scrolt de pagina dan opzij.
  Of een omhulsel in de header voor de kolom; dat is een element meer, en de inhoud van de header zou dan altijd in dat omhulsel moeten.

### De footer zegt wat je op de site vindt

- **Datum:** 22 oktober 2026
- **Besluit:** de footer zegt "Alle koppen en links op één plek. Voor supporters, door supporters."
  "sinds 1997" staat alleen nog in het logo in de header.
  Dit past de beslissing _Geen disclaimer, wel "Voor supporters, door supporters"_ aan, die "sinds 1997" ook in de footer zette.
- **Waarom:** de footer zegt nu wat een bezoeker hier vindt.
  "sinds 1997" staat al in het logo, vlak boven de pagina.
- **Alternatieven:** "sc Heerenveen Fansite, sinds 1997.", zoals eerst.
  Of "Je startpagina voor nieuws over sc Heerenveen."
  Of "Koppen over sc Heerenveen uit de media, met een link naar het hele verhaal."

### De MCP-server van Storybook draait als add-on in de dev-server

- **Datum:** 22 oktober 2026
- **Besluit:** agents vragen het designsysteem op bij `@storybook/addon-mcp`, in de dev-server van Storybook, op `http://localhost:6006/mcp`.
  De hulpmiddelen voor documentatie en voor ontwikkelen staan aan, die voor tests uit.
  Een `.mcp.json` in de hoofdmap maakt de server bekend bij elke sessie van Claude Code.
  Storybook staat daarmee op 10.6.3, met al zijn packages.
- **Waarom:** de add-on draait in de server die we al hebben, en geeft naast de documentatie ook instructies voor stories.
  De losse `@storybook/mcp` is een bibliotheek: we zouden er een eigen server omheen moeten schrijven en draaien, en hij geeft alleen de documentatie.
  De hulpmiddelen voor tests vragen `@storybook/addon-vitest`, die we niet gebruiken (zie _Componenten testen we met Vitest en Testing Library_).
- **Let op:** de add-on stuurt zelf geen telemetrie, maar roept die van Storybook aan.
  Die staat uit met `core.disableTelemetry`.
  Zet je dat aan, dan gaan er gebeurtenissen van de add-on naar storybook.js.org, met de naam van de client die de server gebruikt.
- **Alternatieven:** de losse server `@storybook/mcp`, die de gegevens uit een gebouwde Storybook leest.
  Of geen MCP-server; dan zoeken agents alles zelf in de code, zoals nu.

### Storybook haalt de props uit react-component-meta

- **Datum:** 22 oktober 2026
- **Besluit:** `features.experimentalReactComponentMeta` staat aan.
  De props die de MCP-server van een component geeft, komen dan van de TypeScript-compiler.
- **Waarom:** de standaard, react-docgen, laat een type als `(typeof headingLevels)[number]` staan.
  Een agent ziet dan niet welke waarden mogen.
  react-docgen-typescript lost dat op, maar laat de props van `List` (`as` en `loose`) en `Link` (`href`) weg.
  react-component-meta geeft alle props, met de waarden van een type als `1 | 2 | 3 | 4`.
- **Let op:** Storybook noemt dit experimenteel.
  De versie staat vast, dus het verandert pas met een update.
  Geeft het daarna slechte props, dan is `typescript.reactDocgen: 'react-docgen-typescript'` de terugval.
- **Alternatieven:** react-docgen, de standaard, of react-docgen-typescript.

### De inhoud staat in een smallere kolom, met plaats voor een zijbalk

- **Datum:** 22 oktober 2026
- **Besluit:** op een breed scherm staat de inhoud van een pagina in een kolom waarin een regel hoogstens 80 tekens telt, in lijn met het logo.
  De rest van de kolom van 75 rem blijft leeg: daar komt later een zijbalk.
  Op een smal scherm gebruikt de inhoud de hele breedte.
  De header en de footer blijven over de hele kolom lopen.
- **Hoe:** het token `--hf-content-max-width` is 36 rem (576 pixels), en `Page.Body` zet het als `max-inline-size` op de `main`.
  Is de `Page.Body` zelf de `main`, dan staat het op de `Page.Body`; is het een `div` voor een pagina met een zijbalk, dan op de `main` erin.
  De zijruimte blijft die van `--hf-page-inset`, dus de kolom begint in lijn met het logo, en de marge aan het einde geeft mee.
  Het geldt voor elke pagina, ook voor `/bronnen`, de pagina voor een onbekend adres en de foutpagina.
  Er is geen breakpoint: onder de 36 rem plus de marges is de kolom zo breed als het scherm.
- **Gemeten:** in Atkinson Hyperlegible Next op 17 pixels (Tekst) telde in 36 rem geen van 28 regels Nederlandse nieuwstekst meer dan 80 tekens, en het gemiddelde was 72.
  In 37 rem ging de eerste regel erover (81).
  Een kop van een bericht (Nieuwskop, 18 pixels, halfvet) heeft in 36 rem gemiddeld 64 tekens en hoogstens 72.
  Een Playwright-test telde de tekens van elke regel op `/`, `/bronnen`, de pagina voor een onbekend adres en de foutpagina; die test is weg (zie _E2e-tests alleen voor wat anders ongemerkt kapotgaat_).
- **Waarom:** in de kolom van 75 rem telt een regel zo'n 130 tekens, en zulke regels lezen moeilijk; WCAG raadt hoogstens 80 tekens aan (1.4.8).
  Houden we de plek voor een zijbalk nu al vrij, dan verschuift de inhoud niet als die komt, bijvoorbeeld met de volgende wedstrijd en de stand (#27).
- **Alternatieven:** een smalle kolom in het midden; dan verandert de opbouw opnieuw als de zijbalk komt.
  Of alleen een maximale breedte voor alinea's; dan blijven koppen en lijsten breed, en moet elk component het zelf regelen.
  Of nu al een zijbalk met inhoud; daar is nog niets voor.
  Of de smalle kolom pas vanaf een breakpoint; dan krijgt een tablet regels van ruim 90 tekens.
- **Later:** zie _Page.Body is het raster, met een hoofdkolom en een zijbalk_.
  De hoofdkolom is nu 48 rem, en de grens van 80 tekens per regel is vervallen.
  Het token `--hf-content-max-width` zet nu de breedte van het eerste spoor in het raster van `Page.Body`, en niet meer een `max-inline-size` op de `main`; de zijbalk is er, 24 rem breed.
- **Later:** zie _Een pagina van 64 rem, met kolommen van 36, 4 en 24 rem_.
  De hoofdkolom is weer 36 rem, en de kolom van de pagina 64 rem.

### Page.Body is het raster, met een hoofdkolom en een zijbalk

- **Datum:** 22 oktober 2026
- **Besluit:** `Page.Body` is het raster van een pagina, met twee kolommen: `Page.Main`, hoogstens 48 rem, en `Page.Sidebar`, 24 rem.
  Samen met de 3 rem ertussen zijn ze de hele kolom van de pagina van 75 rem, en ze beginnen in lijn met het logo.
  Heeft een pagina geen zijbalk, dan blijft de rest van de kolom leeg.
  `Page.Main` is altijd de `main`, `Page.Sidebar` een `aside`, en `Page.Body` altijd een `div`.
  Elk kind van een kolom is een cel; `Page.Cell` zet meer dingen in één cel.
  Elke kolom stapelt haar eigen cellen, en `Page.Body` regelt alle witruimte.
  Op een smal scherm staan de kolommen onder elkaar, de hoofdkolom eerst.
  De grens van 80 tekens per regel, die _De inhoud staat in een smallere kolom, met plaats voor een zijbalk_ stelde, vervalt.
- **Hoe:** `Page.Body` is een raster met één spoor van 48 rem, dat krimpt als het scherm smaller is.
  Vanaf 77 rem (48 rem, 3 rem ertussen en 24 rem, met een marge van 1 rem aan beide kanten) komt er een tweede spoor van 24 rem bij.
  De breedte staat in de media query zelf, want een custom property kan daar niet in.
  Elke kolom is een gewoon raster van één spoor, met de witruimte tussen de cellen als `gap`, uit een custom property op `Page.Body`.
  Er zijn twee maten witruimte, tot tokens voor ruimte komen (#19): 3 rem tussen de kolommen, naast elkaar en onder elkaar, en onder de kolommen, en 2 rem tussen de cellen en boven de kolommen.
  Een kind van een kolom heeft `margin: 0`, en in een `Page.Cell` hebben het eerste en het laatste kind geen marge naar buiten.
  De zijbalk staat in de bron na de hoofdkolom, en er is geen `order`, dus de leesvolgorde en de tabvolgorde zijn op elke breedte die van de bron.
- **Waarom:** met twee vaste kolommen bestaat het raster alleen direct in `Page.Body`; een los `Grid` zou daar altijd in staan en dezelfde taak hebben.
  Zo is er één plek voor de opbouw van een pagina en de ruimte tussen de blokken, en hoeft een pagina of een kaart dat niet zelf te regelen.
  Elke pagina heeft dezelfde landmarks, en de layout van de site blijft `Page.Body` maken.
  In een gewoon raster delen cellen in dezelfde rij hun hoogte; met een eigen raster per kolom stapelt elke kolom haar eigen cellen, zoals op de artboards.
  Een subgrid helpt hier niet: een kolom beslaat één spoor van `Page.Body`, dus hij erft er niets bruikbaars van, en met subgrid-rijen zouden de cellen van beide kolommen dezelfde rijen delen, wat we niet willen.
  De projecteigenaar koos na de review van de eerste versie voor kolommen van 48 en 24 rem en voor 3 rem tussen de kolommen en onder de inhoud.
  Een regel lopende tekst telt in 48 rem nu zo'n 96 tekens, meer dan de 80 van WCAG 1.4.8 (niveau AAA).
  De projecteigenaar liet de grens vallen.
  Het lettertype wordt binnenkort groter, en dan telt een regel minder tekens.
- **Alternatieven:** een los component `Grid` in `Page.Body`, dat de kolommen en de witruimte regelt, terwijl `Page.Body` alleen het kader is.
  Of een raster van 12 kolommen met `start` en `span`; flexibeler, maar meer API.
  Of rijen over beide kolommen met cellen die even hoog worden; dan stapelen de kolommen niet los.
  Of meer kaarten in één cel, met de ruimte in de kaart.
  Of de kolom in `Page.Body` laten zoals #73 deed, zonder plek voor een zijbalk.
  Of de tekst in de kolom van 48 rem toch beperken tot 36 rem, zodat de grens van 80 tekens blijft; dat is niet gekozen.
- **Later:** de zijbalk staat tussen 40 rem en 77 rem onder de hoofdkolom, met haar cellen in twee gelijke kolommen (#137).
  Onder 40 rem staan de cellen onder elkaar, en vanaf 77 rem staat de zijbalk naast de hoofdkolom.
  Dat is een tweede raster op `Page.Sidebar` in `page.css`; de volgorde in de bron blijft gelijk en er is geen `order`.
  Een cel die de volle breedte neemt, is er nog niet; of dat nodig is, beslissen we na de proef op Onze bronnen.
- **Later:** zie _Een pagina van 64 rem, met kolommen van 36, 4 en 24 rem_.
  De hoofdkolom is nu 36 rem, met 4 rem ertussen, en de kolommen staan naast elkaar vanaf 56 rem; de zijbalk staat tussen 40 rem en 56 rem onder de hoofdkolom.
  De ruimte tussen de kolommen en onder de kolommen is nu 4 rem, ook onder elkaar, en de 3 rem is vervallen.
- **Later:** zie _De zijbalk kan onder een inleiding beginnen, met benoemde gebieden en een subgrid_.
  `Page.Main` heeft nu de eigenschap `intro`, en met een inleiding is `Page.Main` een subgrid in de rijen van `Page.Body`.
  Een kolom zonder inleiding blijft een eigen raster, zoals hierboven staat.

### Een regel met padding of een rand zet zelf `box-sizing: border-box`

- **Datum:** 22 oktober 2026
- **Besluit:** elke regel in het designsysteem die padding of een rand zet op een element met een maat, zet daar `box-sizing: border-box` bij.
  Zo tellen padding en rand mee in de breedte en de hoogte, en doet een maat van 24 rem wat ze zegt.
  Er is geen globale regel op `*`.
  Dit staat op de delen van `Page` (`Page.Header`, `Page.Body` en `Page.Footer`), op `blockquote`, `pre`, `hr`, `fieldset`, de knoppen, `textarea` en de voorbeelden in de documentatie met een maat en een rand.
- **Waarom:** padding en rand veranderen de maat dan niet, en een element met een maat houdt die maat als er padding bij komt.
  Een regel zonder padding of rand heeft de instelling niet nodig, dus er staat niets wat niets doet.
- **Let op:** een nieuwe regel met padding of een rand moet de instelling zelf zetten.
  Stylelint controleert dat niet.
- **Alternatieven:** `box-sizing: border-box` op `*`, `*::before` en `*::after`, zoals de meeste resets doen; dat raakt ook elementen van derden en elke regel die er niet om vraagt.
  Of `html { box-sizing: border-box }` met `inherit` op alle elementen; dat is ook een regel op `*`.

### Een kaart is een eigen component, en de koppen staan op een wit vlak

- **Datum:** 22 oktober 2026
- **Besluit:** `Card` maakt een kaart op een van de vier vlakken: `default`, `strong`, `soft` of `warm`.
  Hij heeft een rand van 1 pixel, ronde hoeken van 0,5 rem en binnenruimte, maar geen marge, en is standaard een `section`.
  In een kolom is elke kaart een eigen cel.
  Op de homepage en op Onze bronnen staan de blokken op het witte vlak.
- **Hoe:** `surface` kiest het vlak uit een vaste lijst, en `as` het element: `section`, `div`, `article` of `aside`.
  De achtergrond en de rand komen uit de tokens van het vlak, dus ze volgen het thema.
  Het tonale vlak heet daarbij voortaan het sterke vlak, `strong`; zie hieronder.
  De binnenruimte is 1,5 rem boven en onder en 1,75 rem opzij, zoals op de artboards (24 en 28 pixels), en 1 rem en 1,25 rem op een scherm smaller dan 40 rem.
  Het eerste en het laatste kind in een kaart hebben geen marge naar buiten, zoals in een `Page.Cell`.
  Een `section` krijgt de naam van haar kop met `aria-labelledby`: de pagina geeft de kaart die verwijzing en de kop een `id`.
  Het component doet dat niet zelf, want de kop is een kind dat het component niet kent.
- **De naam `strong`:** de tokens `background-surface-tonal` en `border-surface-tonal` heten nu `background-surface-strong` en `border-surface-strong`.
  `tonal` komt uit Material Design en zegt niets over hoe het vlak eruitziet.
  `strong` hoort bij `soft`: het duidelijke blauw naast het zachte blauw, in licht en in donker.
  In het Nederlands is het het sterke vlak.
  De projecteigenaar koos de naam.
- **Waarom:** op de artboards staat elk blok als kaart op het zandgrijze vlak van de pagina, en dat geeft de pagina rust en richting.
  Het witte vlak laat de koppen het best uitkomen; het sterke vlak houden we voor het officiële clubnieuws (#16).
  Omdat `Page.Body` de ruimte tussen de cellen regelt, heeft een kaart geen marge, en past ze overal.
  In de hoofdkolom van 48 rem maakt de binnenruimte de regels in een kaart wat korter.
- **Alternatieven:** een cel met een uiterlijk als kaart; dan is elke kaart een cel, en kan een kaart nergens anders staan.
  Of meer kaarten in één cel, met de ruimte in de kaart.
  Of het sterke vlak voor het blok op de homepage.
  Of nu al tokens voor ruimte (#19).
  Of een andere naam dan `strong` voor het tonale vlak: `blue` lijkt te veel op `soft`, `tinted` is ook waar voor `soft` en `warm`, `accent` is al de rode tekstkleur en `highlight` is al een achtergrond met dezelfde waarden.

### Hulpklassen zitten in de sterkste laag

- **Datum:** 23 oktober 2026
- **Besluit:** het designsysteem heeft hulpklassen: een klasse die één ding doet, op elk element.
  De eerste is `hf-visually-hidden`: wat die klasse heeft, zie je niet, maar een schermlezer leest het wel voor.
  Hulpklassen staan in `src/utilities`, met een story en een test, en zitten in een vijfde laag, `hf.utilities`, na `hf.components`.
- **Hoe:** `hf-visually-hidden` haalt het element uit de stroom, maakt het één pixel groot en knipt het weg met `clip-path: inset(50%)`.
  Zonder marge, padding en rand neemt het geen ruimte in en maakt het de pagina niet breder.
  De tekst blijft op één regel, want sommige schermlezers lezen afgebroken tekst in zo'n smal vak als één lang woord.
  Het element blijft in de toegankelijkheidsboom, anders dan met `display: none` of het attribuut `hidden`.
- **Waarom:** een hulpklasse moet winnen van het component of de typestijl op hetzelfde element.
  Een `Card` zet bijvoorbeeld padding en een rand; die mogen een kaart met `hf-visually-hidden` niet groter maken dan één pixel.
  In de sterkste laag wint de hulpklasse altijd, hoe specifiek de regel van het component ook is.
  CSS van de site zelf, buiten een laag, wint nog steeds.
- **Alternatieven:** de klasse in `hf.components`, als laatste import; dan wint een specifiekere regel van een component, en moeten we specificiteit en volgorde weer bewaken.
  Of `!important` op elke eigenschap, zoals veel CSS-bibliotheken doen; dan wint de klasse ook van de CSS van de site, en die moet altijd kunnen winnen.

### Kleinere koppen en vaste tekstmaten

- **Datum:** 23 oktober 2026
- **Besluit:** alle koppen, `h1` tot en met `h6`, staan in het lettertype van de koppen.
  Kop 1 is 24 tot 28 pixels, Kop 2 21 tot 23,25 en Kop 3 18,25 tot 19,25, allemaal met `clamp()` tussen 360 en 1280 pixels breed.
  Kop 4 is 16 pixels en schaalt niet mee.
  Kop 5 en Kop 6 zijn dezelfde 16 pixels, als reserve, en verschillen van Kop 4 in gewicht en kleur.
  Kop 1 en Kop 2 krijgen gewicht 800 in plaats van 900.
  Tekst is 16 pixels, Nieuwskop 18, Meta 14 en Label 14, op elke breedte.
  Het woordmerk blijft gelijk.
- **Waarom:** koppen in kapitalen op breedte 125 en gewicht 900 vallen op, ook als ze kleiner zijn; op 52 pixels schreeuwen ze en nemen ze de aandacht van het woordmerk en het nieuws.
  Het woordmerk is de grootste letter van de site; de koppen komen daaronder.
  Een kleine kop in kapitalen en een zwaarder gewicht oogt groter dan tekst van dezelfde maat, dus Kop 4 mag even groot zijn als de tekst.
  Eén schaal tussen Kop 4 en Kop 1 geeft vaste verhoudingen tussen de koppen.
  Tekst van 18 pixels was in de middelste breedte te groot, en met één vaste maat per stijl is er geen schaling meer om te controleren.
- **Alternatieven:** Kop 1 op de maat van het woordmerk (36 pixels), of de maten laten staan en alleen het gewicht verlagen; beide blijven te zwaar.
  Kop 4 in Atkinson laten; dan staat één kop in een ander lettertype dan de rest.
  Tekst laten meeschalen van 16 naar 18 pixels; dat maakt de tekst op een brede pagina te groot.
  Tekst op 17 of 18 pixels laten staan; de projecteigenaar vond 18 pixels te groot voor een gewone alinea.

### Een inleidende alinea heeft een eigen typestijl, met een `b` erin

- **Datum:** 24 oktober 2026
- **Besluit:** het designsysteem heeft een typestijl Inleiding voor de eerste alinea onder de `h1` van een pagina: 20 pixels, op elke breedte, met regelhoogte 1,4 en het gewicht van Tekst.
  `Text` krijgt daarvoor `appearance="intro"`, alleen voor een `p`, en zet de inhoud in één `b`: `<p class="hf-intro"><b>…</b></p>`.
  Met CSS heeft de `b` het gewicht van gewone tekst; een `b` of `strong` elders blijft vet.
  De eerste alinea na de `h1` gebruikt de stijl op Onze bronnen, Over ons, Privacy, Wat is er nieuw, de foutpagina en Pagina niet gevonden.
  Op Over ons staat de `h2` "Wie we zijn" tussen de `h1` en die alinea.
  De homepage heeft onder zijn verborgen `h1` geen alinea en verandert niet.
- **Waarom:** een inleiding vertelt in een paar zinnen waar de pagina over gaat, en mag opvallen.
  Met CSS valt hij op door de grootte, want vet op grote lopende tekst leest zwaarder.
  Zonder CSS toont de browser de `b` vet, dus de inleiding valt ook dan op, zonder dat we iets hoeven te doen.
  Een `b` zegt niets over betekenis, anders dan `strong`, dus een schermlezer leest hem niet met nadruk.
  20 pixels is groter dan Tekst (16) en Nieuwskop (18), en kleiner dan de kleinste Kop 2 (21); de regelhoogte van 1,4 ligt tussen die van de Nieuwskop (1,35) en die van Tekst (1,5), omdat grotere letters minder ruimte tussen de regels nodig hebben.
- **Alternatieven:** alleen een klasse op de `p`; dan is de inleiding zonder CSS niet te onderscheiden.
  Of een `strong`; dat zegt dat de tekst belangrijk is, en een schermlezer kan er nadruk aan geven.
  Of een eigen component naast `Text`; dat is meer, voor een stijl van lopende tekst.
  Of een maat die met de breedte meeschaalt, zoals de koppen; één maat past bij de andere stijlen van lopende tekst.
- **Later:** de pagina heet nu Updates en staat op `/updates`; zie _De pagina Wat is er nieuw heet Updates, op `/updates`_.

### Een pagina van 64 rem, met kolommen van 36, 4 en 24 rem

- **Datum:** 23 oktober 2026
- **Besluit:** de kolom van de pagina is 64 rem: de hoofdkolom 36 rem, 4 rem ertussen en de zijbalk 24 rem.
  De kolommen staan naast elkaar vanaf 56 rem.
  Op een breed scherm (vanaf zo'n 74 rem) hangt het schild van het logo in de marge, zodat de tekst in lijn staat met het woordmerk.
  Op een smaller scherm staat alles in lijn met het schild, zoals voorheen.
- **Waarom:** de maten komen uit de leeslengte van een regel: in 36 rem telt een regel Tekst van 16 pixels zo'n 70 tot 80 tekens, de maat die we al eerder kozen, toen met 17 pixels.
  Een zijbalk van 24 rem is 37,5% van de pagina, dus breed genoeg om iets in te zetten.
  64 is een macht van 2, zoals de maten van het logo (192 is 128 + 64), en 36, 4 en 24 zijn sommen van twee machten (32 + 4, en 16 + 8).
  In lijn met het woordmerk heeft de tekst één linkerkant, en het schild is een versiering in de marge.
- **Hoe:** `--hf-page-max-width` is 64 rem en `--hf-content-max-width` 36 rem.
  Vanaf 56 rem heeft `Page.Body` twee sporen, `minmax(24rem, 36rem)` en `minmax(16rem, 24rem)`.
  Tot 66 rem (64 rem plus een marge van 1 rem aan beide kanten) krimpen ze mee met het venster.
  De ruimte tussen de kolommen is 4 rem, naast elkaar en onder elkaar, en ook onder de kolommen; tussen de cellen en boven de kolommen is het 2 rem.
  Dat zijn twee maten, in de custom properties `--hf-page-body-column-gap` en `--hf-page-body-cell-gap` op `Page.Body`: 3 rem is vervallen.
  2 en 4 zijn machten van 2, en een eerste aanzet voor de tokens voor ruimte (#19).
  Onder 56 rem staat de zijbalk onder de hoofdkolom, met de cellen in twee kolommen vanaf 40 rem.
  De zijbalk staat nog steeds na de hoofdkolom in de bron, zonder `order`.
  De hang van het schild is `--hf-logo-hang` in `layout.css`: de maat van het schild (`--hf-logo-mark-size`, 1,55 keer de lettergrootte van het woordmerk) plus de ruimte ernaast (`--hf-logo-gap`, 0,75 rem).
  Die twee komen nu uit de tokens van het logo, in plaats van uit `logo.css`.
  Vanaf 74,5 rem breed krijgt het logo in `Page.Header` een negatieve marge van die maat: 64 rem voor de kolom, twee keer 4,2375 rem voor de hang en twee keer 1 rem tot de rand van het venster is 74,475 rem, naar boven afgerond.
  De navigatie blijft in lijn met de rechterkant van de kolom en de footer met de linkerkant, want de header en de footer houden hun `padding-inline` uit `--hf-page-inset`.
  Een media query kan geen custom property gebruiken, dus de maten staan erin zelf.
- **Gemeten:** in Atkinson Hyperlegible Next op 16 pixels telt een regel Tekst op Over ons, in de hoofdkolom op een scherm van 1440 pixels, hoogstens 81 tekens en gemiddeld 76,4 (alleen de volle regels, zonder de laatste regel van een alinea) of 65,0 (alle regels).
  In de kolom van 48 rem was dat hoogstens 109 en gemiddeld 102,8 of 79,6.
  De homepage heeft één regel Tekst, "Welke media we volgen, lees je bij Onze bronnen.", van 48 tekens; de koppen van de berichten zijn Nieuwskop en tellen niet mee.
- **Alternatieven:** 40 + 4 + 20 rem; de zijbalk is dan een derde van de twee kolommen, maar een regel telt tot 85 tekens.
  Een pagina van 56 rem met 32 + 4 + 20; regels van hoogstens 68 tekens, maar een smalle pagina met veel lege ruimte op een groot scherm.
  De pagina van 75 rem laten, met 48 + 3 + 24; regels van zo'n 108 tekens.
  Het schild altijd laten hangen of de tekst altijd inspringen; op een telefoon kost dat zo'n 4 rem breedte.
- **Later:** de projecteigenaar beslist na de screenshots in de pull request of de hang blijft; zo niet, dan haalt de review die eruit.
- **Daarna:** onder 56 rem, waar de zijbalk onder de hoofdkolom staat, staan beide gecentreerd, hoogstens 36 rem breed.
  De ruimte tussen de hoofdkolom en de zijbalk is dan 2 rem, net als tussen de cellen; de 4 rem blijft tussen de kolommen naast elkaar en onder de kolommen.
  De cellen van de zijbalk staan naast elkaar zodra er twee van 16 rem met 2 rem ertussen passen (`repeat(auto-fit, minmax(min(16rem, 100%), 1fr))`), en anders onder elkaar.
  Daarmee vervalt de grens van 40 rem voor de zijbalk; alleen de grens van 56 rem blijft.

### Een smalle nieuwsregel zet de dag en de tijd boven de kop, met een container query

- **Datum:** 23 oktober 2026
- **Besluit:** is de nieuwsregel smaller dan 24 rem, dan staan de dag en de tijd boven de kop.
  Het component bepaalt dat met een container query op zijn eigen breedte.
- **Waarom:** bij 24 rem heeft de kop naast de kolom van 5,75 rem nog zo'n 18 rem, ongeveer dertig tekens van de Nieuwskop per regel; smaller wordt de kop een toren van korte regels.
  Op een telefoon is de regel smaller dan 24 rem, op een tablet en groter breder.
  Een container query kijkt naar de ruimte die de regel echt heeft, ook in een kaart met binnenruimte of in de zijbalk; een media query kent alleen het venster.
  Container queries zijn Baseline 'widely available'.
- **Hoe:** een element kan niet naar zijn eigen breedte vragen, dus de `NewsItem` heeft twee elementen.
  Het buitenste, `hf-news-item`, is de container (`container-name: hf-news-item`, `container-type: inline-size`) en houdt de binnenruimte boven en onder en de lijn ervoor.
  Het heeft geen binnenruimte of rand links en rechts, dus zijn breedte is de breedte van de regel.
  Daarbinnen staat `hf-news-item-layout`, het raster.
  Zo werkt het ook voor een `NewsItem` buiten een `List`.
  Onder de 24 rem krijgt het raster één kolom, met 0,125 rem tussen de dag en de tijd en de kop: dezelfde ruimte als tussen de kop en de bron, en veel minder dan de 1,5 rem tussen twee regels.
  Er is geen `order`, dus de volgorde in de HTML en voor een schermlezer is dezelfde.
- **Alternatieven:** een media query, bijvoorbeeld op 40 rem zoals de binnenruimte van de kaart; dan klopt het niet in de zijbalk.
  Of de dag en de tijd altijd boven de kop; dan lijnen de koppen op een breed scherm niet meer uit en wordt de lijst langer.
  Of de kolom smaller maken; "wo 14:05" past niet in minder ruimte.
  Of het `li` als container nemen, zonder extra element; dan klopt het niet voor een `NewsItem` buiten een `List`.

### Koppen in een nieuwsregel zijn pas onderstreept bij hover en focus

- **Datum:** 23 oktober 2026
- **Besluit:** de kop van een nieuwsregel is niet onderstreept.
  Onder de muis en met de focus van het toetsenbord krijgt hij de onderstreping.
  Andere links blijven altijd onderstreept.
- **Waarom:** een lijst met veel onderstreepte koppen is druk, en een kop staat op een eigen regel, zwaarder dan gewone tekst en in de kleur voor links, dus je herkent hem ook zonder streep.
  WCAG vraagt een onderstreping vooral voor een link in een zin (1.4.1).
  Met de onderstreping bij de focus krijgt wie het toetsenbord gebruikt hetzelfde teken als wie de muis gebruikt.
- **Hoe:** alleen de CSS van de nieuwsregel verandert (`news-item.css`), niet de basisstijl van links.
  De kop krijgt `text-decoration-line: none`, en bij `:hover` en `:focus-visible` weer `underline`, zoals het hoofdmenu in de header dat al doet.
  De lijn is 1,5 pixel dik (`1.5px`), onder de muis en bij de focus: dikker dan de lijn van een link die niet onder de muis staat (`0.0625em`, 1 pixel) en dunner dan die van `link.css` bij hover (`0.125em`, 2 pixels).
  Bij de focus staan de dikte en de afstand er ook, zodat die dezelfde lijn krijgt als hover.
  Een dikkere lijn dan de gewone past bij het gewicht van de kop.
  De lijn staat `0.1em` onder de tekst, dichter erbij dan bij andere links (`0.15em`).
  De lijn slaat de staarten van letters over, zoals de g en de p (`text-decoration-skip-ink: auto`).
  Safari doet dat alleen als in `fonts.css` de subset latin-ext vóór latin staat.
  Met eerst latin en dan latin-ext tekende Safari de lijn door de g en de p, ook met `text-decoration-skip-ink: auto`; Chrome en Firefox deden het wel goed.
  Daarom staat latin-ext nu voor latin, bij alle drie de paren (Truculenta, Atkinson en Atkinson cursief), zoals Fontsource ze ook ordent.
  Van twee lettertypebestanden die hetzelfde teken hebben, wint het laatste, en dat hoort latin te zijn.
  De kleuren veranderen niet: een bezochte kop houdt de kleur voor bezocht, en onder de muis krijgt hij de kleur voor hover.
  Bij de focus blijft de kleur zoals hij is.
  De focusrand blijft zichtbaar (2.4.7).
  Storybook toont hover, focus en bezocht met de add-on Pseudo States, in licht en donker.
- **Alternatieven:** alle koppen onderstreept laten, zoals nu.
  Of alleen bij hover, zonder de focus.
  Of alle links pas bij hover onderstrepen; dan is een link in een zin alleen aan de kleur te herkennen.
  Of een dunne lijn, zoals bij een link die niet onder de muis staat (`0.0625em`); dat was een tijd de opzet, maar het paste niet bij het gewicht van de kop.
  Of de lijn net zo dik als bij hover (`0.125em`, 2 pixels) en op de gewone afstand; dat was de opzet daarna, tot de proef met 1,5 pixel.
  Voor Safari: latin-ext weglaten; dan vallen de ligaturen Ĳ en ĳ en andere tekens terug op een ander lettertype.
  Of de lijn zo ver van de tekst zetten dat hij onder de staarten blijft; dan staat hij ver van de kop.

### Voorlopig heeft de kop van een nieuwsregel de maat van gewone tekst en gewicht 500

- **Datum:** 23 oktober 2026
- **Besluit:** voorlopig heeft de kop van een nieuwsregel de maat van Tekst, 16 pixels, in plaats van die van de Nieuwskop, 18 pixels.
  Het gewicht is 500 (Medium) in plaats van 600 (Halfvet).
  De kop blijft in de kleur voor links, met de regelafstand van de Nieuwskop.
- **Waarom:** de projecteigenaar wil zien hoe de lijst leest met koppen in de gewone maat en een lichter gewicht.
  Zonder onderstreping is een kop als link nog te herkennen aan de kleur voor links en zijn eigen regel.
  Het gewicht onderscheidt hem met 500 minder van gewone tekst (400) dan met 600; de reviewer let daar bij toegankelijkheid op (1.4.1).
  Of het blijft, volgt als we het gezien hebben.
- **Hoe:** alleen de CSS van de nieuwsregel verandert: `.hf-news-item-headline` krijgt `font-size: var(--hf-body-font-size)` en `font-weight: 500`.
  De klasse `hf-headline` blijft, voor de regelafstand en het lettertype.
  De regel staat in de laag `hf.components`, bij de rest van de kop, en wint daar van `.hf-headline` in `hf.typography`.
  Eerst stond hij in `hf.typography`, achter `.hf-headline`: in de gebouwde site kwamen de lagen toen in een andere volgorde dan `index.css` ze geeft, met typografie boven componenten.
  Eén regel van de kop is nu zo'n 22 pixels hoog, dus de minimale hoogte van 24 pixels voor het doel (WCAG 2.5.8) komt nu van `min-block-size`.
- **Alternatieven:** de Nieuwskop van 18 pixels en gewicht 600 houden, zoals voor dit besluit.
  Of de maat en het gewicht van de Nieuwskop zelf veranderen, in `--hf-headline-font-size` en `--hf-headline-font-weight`; alleen de nieuwsregel gebruikt ze, maar dan verandert ook wat Storybook bij Typografie over de Nieuwskop zegt.
- **Later:** de grens van 24 rem in _Een smalle nieuwsregel zet de dag en de tijd boven de kop, met een container query_ ging uit van de Nieuwskop.
  Met een kop van 16 pixels past er bij 24 rem iets meer dan dertig tekens op een regel, zo'n vierendertig, en de grens blijft staan.
- **Later:** de regel staat weer in `hf.components`, nu de lagen op de site in de goede volgorde staan; zie _De volgorde van de lagen staat in een eigen bestand_.

### De kolom met dag en tijd in een nieuwsregel is zo breed als de breedste tijd

- **Datum:** 23 oktober 2026
- **Besluit:** de kolom met de korte dag en de tijd is 4 rem breed, met 0,75 rem ertussen en de kop, samen 4,75 rem in plaats van 5,75 rem (4,75 rem en 1 rem).
  De dag en de tijd staan altijd op één regel.
- **Waarom:** de breedste dag en tijd, "ma 20:08", is 61 pixels (3,84 rem) op de maat van Meta.
  In een kolom van 4,75 rem stond er tussen de tijd en de kop 31 tot 39 pixels lucht, naast een kop van 16 pixels.
  De projecteigenaar vond dat te veel.
  Nu is het 15 tot 23 pixels.
- **Hoe:** in `news-item.css` is `grid-template-columns` nu `minmax(4rem, max-content) minmax(0, 1fr)` en `column-gap` is `0.75rem`.
  De tijd krijgt `white-space: nowrap`: een breder lettertype, zoals de reservefont voordat het lettertype is geladen, mag de tijd niet over twee regels verdelen.
  De kolom is voor elke regel even breed, dus de koppen beginnen onder elkaar op dezelfde plek.
  Is een tijd breder dan 4 rem, bijvoorbeeld met de tekstafstand van WCAG 1.4.12 (letterafstand 0,12 em, woordafstand 0,16 em) of in een breder reservelettertype, dan groeit de kolom mee (`max-content`).
  Dan beginnen de koppen niet meer allemaal op één plek, maar raakt de tijd de kop niet: zonder dat stak "ma 08:14" met die tekstafstand 1 pixel over de ruimte tot de kop heen.
  De rem schaalt mee met de tekstgrootte van de bezoeker, net als de tijd.
- **Later:** de grens van 24 rem in _Een smalle nieuwsregel zet de dag en de tijd boven de kop, met een container query_ rekende met een kolom en tussenruimte van samen 5,75 rem.
  Die zijn nu samen 4,75 rem, dus de kop houdt bij 24 rem 19,25 rem in plaats van 18,25 rem, en de grens blijft staan.
- **Alternatieven:** de kolom altijd door de inhoud laten bepalen (`max-content`); dan begint de kop per regel op een andere plek, want "ma" is breder dan "di".
  Of de tijd laten afbreken in plaats van `nowrap`; dan staat "ma" boven "08:14" zodra het lettertype breder is, en springt de regel in hoogte.
  Of de kolom of de tussenruimte nog smaller; dan staat de breedste tijd bijna tegen de kop.
- **Later:** zie _Een datum in een nieuwsregel breekt in de kolom van de weekdag_.
  De kolom blijft 4 rem, maar de tijd mag breken: de dag en de tijd staan niet meer altijd op één regel.

### De volgorde van de lagen staat in een eigen bestand

- **Datum:** 23 oktober 2026
- **Besluit:** de regel met de volgorde van de lagen staat in `src/layers.css`, en `index.css` importeert dat bestand als eerste.
  `index.css` heeft zelf geen `@layer`-regel meer.
  De rooktest controleert op de pagina's die hij toetst dat de lagen in de CSS van de gebouwde site die volgorde hebben.
- **Waarom:** Next.js (Turbopack) voegt de bestanden samen die `index.css` importeert en zet de eigen regels van `index.css` erachter.
  Daardoor stond de `@layer`-regel op de site aan het eind van de CSS, in dev en in productie: op acceptatie op byte 27.113 van 27.180.
  De lagen kregen de volgorde van hun eerste blok: tokens, base, components, typography, utilities.
  Een regel in `hf.components` die een typestijl aanpast, verloor dan op de site, terwijl hij in Storybook won.
  Een geïmporteerd bestand komt op de plek van zijn import, dus nu staat de regel vooraan.
  Storybook (Vite) had de goede volgorde al, en zijn gebouwde CSS is niet veranderd.
- **Hoe:** de rooktest haalt de stylesheets op van de pagina's die hij toetst, in de volgorde van de links.
  Hij zet de lagen in de volgorde waarin ze voor het eerst voorkomen, in een regel of in een blok: de volgorde die een browser kiest.
  Die volgorde vergelijkt hij met `layers.css`, dus de volgorde staat nergens twee keer.
  Op de CSS van vóór deze wijziging faalt de test.
  Een test van het designsysteem controleert dat `layers.css` de eerste import van `index.css` is.
- **Gevolg:** op de site wint een regel in `hf.components` nu van een regel in `hf.typography`, zoals in Storybook.
  Een regel die alleen om deze fout in een andere laag stond, gaat terug naar `hf.components`: de grootte en het gewicht van de kop van een nieuwsregel (zie _Voorlopig heeft de kop van een nieuwsregel de maat van gewone tekst en gewicht 500_).
- **Alternatieven:** de regel in een bestand dat `layout.tsx` vóór `index.css` importeert; dan moet elke app die het designsysteem gebruikt dat zelf onthouden.
  Of de regel ook in `index.css` laten staan; dat is een tweede plek die kan afwijken, en de eerste import doet het werk al.
  Of een instelling van Next.js of Turbopack zoeken; dat hebben we niet onderzocht, omdat één import genoeg is.

### Een eigen component per soort veld, en één Field eromheen

- **Datum:** 23 oktober 2026
- **Besluit:** `Input`, `Textarea` en `Select` zijn eigen componenten, en `Field` zet er het label, de hulptekst en de foutmelding omheen.
  Er is geen `TextField` met een `type`-prop voor alles.
  Verder zijn er `Form`, `Button`, `ErrorSummary` en `Honeypot`.
- **Waarom:** `Select` en `Textarea` hebben andere eigenschappen dan `Input`; één component met alles wordt een berg condities.
  `Field` regelt de koppeling van label en fout op één plek.
  De sjablonen van de site mogen geen HTML bevatten (zie _Sjablonen bevatten geen HTML, alleen componenten uit het designsysteem_), dus ook de `option` van een keuzelijst is een component: `Select.Option`.
- **Alternatieven:** één `TextField` voor alles; of de HTML-elementen in de site toestaan voor formulieren, door de regel te verzwakken.
- **Buiten dit besluit:** een vinkje, een keuzerondje en een bestandsveld.
  Die komen met het eerste issue dat ze nodig heeft.

### Field krijgt een `id` en geeft het veld zijn koppelingen

- **Datum:** 23 oktober 2026
- **Besluit:** je geeft `Field` de `id` van het veld, en het zet op zijn kind (een `Input`, `Textarea` of `Select`) de `id`, `aria-describedby`, `aria-invalid` en `required`.
  De hulptekst krijgt de id `<id>-hint` en de foutmelding `<id>-error`.
  De hulptekst is een `string`: gewone tekst, zonder links of lijsten, net als de foutmelding.
  Een veld is verplicht tenzij `required={false}`, en alleen een veld dat niet verplicht is, zegt dat in het label: "(niet verplicht)".
- **Waarom:** de `id` hoort bij het veld en is ook het doel van een link in de `ErrorSummary`, dus hij moet voorspelbaar zijn en niet gegenereerd.
  Een kind dat `Field` aanpast met `cloneElement` houdt het sjabloon kort: `<Field …><Input name="naam" /></Field>`.
  We vragen alleen wat we echt nodig hebben, dus verplicht is de gewone staat en hoeft geen label.
  Een woord als "niet verplicht" kan iedereen lezen, en een sterretje hoeft niemand te raden (3.3.2).
  Een schermlezer zegt dat een veld verplicht is, want het veld heeft het attribuut `required`.
- **Alternatieven:** een render-prop (`{(veld) => <Input {...veld} />}`), die explicieter is maar elk veld langer maakt; of een context, die in een servercomponent niet werkt zonder dat `Field` een clientcomponent wordt.
  Of een `id` die `useId` maakt: de `ErrorSummary` kent die niet, tenzij de pagina hem doorgeeft.
  Of een hulptekst van het type `ReactNode`, zodat er een link in kan; dat raden we af, want sommige schermlezers, zoals VoiceOver, slaan opgemaakte tekst in een beschrijving over.

### De foutmelding is tekst, met een dikkere rand in de kleur van fouten

- **Datum:** 23 oktober 2026
- **Besluit:** een foutmelding bij een veld staat in tekst, in gewicht 500 en in `--hf-colour-text-accent`, en begint voor een schermlezer met "Fout:" (verborgen met `hf-visually-hidden`).
  Een veld met een fout heeft een dikkere rand in dezelfde kleur.
  We maken geen apart kleurtoken voor fouten.
- **Waarom:** kleur is nooit het enige teken (1.4.1), en de tekst zegt wat er mis is en hoe het wel moet (3.3.1, 3.3.3).
  Het accentrood haalt in licht en donker 6,3:1 tot 9,1:1 tegen de pagina en tegen een vlak, dus ruim genoeg voor tekst en voor de rand (3:1).
  Een nieuw token voor een kleur die al bestaat, geeft twee plekken om bij te houden.
- **Alternatieven:** een eigen token `--hf-colour-text-error`.
  Dat kan als fouten ooit een andere kleur dan het accent moeten krijgen.

### Een formulier laat de controle aan de site, en toont de fouten in een blok

- **Datum:** 23 oktober 2026
- **Besluit:** `Form` zet `noValidate` aan, en met `noValidate={false}` krijg je de controle van de browser terug.
  De site controleert zelf en toont de fouten bij het veld en in een `ErrorSummary` boven het formulier: een gebied met een kop en een link naar elk veld.
  Het blok staat buiten het `Form`: een schermlezer slaat een blok binnen het formulier soms over in de formuliermodus, en de maximale breedte van het formulier geldt er dan niet voor.
  Het blok verplaatst de focus niet.
  Zonder fouten toont het niets.
- **Waarom:** de bubbel van de browser staat in de taal van de browser, wordt niet altijd voorgelezen en past niet bij onze woorden.
  Een formulier dat de server controleert, laadt de pagina opnieuw, en een schermlezer begint dan boven aan, bij het blok.
  Controle in de browser met JavaScript valt buiten het issue en komt, als we het nodig hebben, met een eigen issue.
- **Alternatieven:** het blok `role="alert"` geven.
  Op een pagina die opnieuw laadt, leest een schermlezer dat niet betrouwbaar voor, en met JavaScript is de focus verplaatsen een betere oplossing.

### De Honeypot verbergt het veld met `inert` en uit beeld, niet met `display: none`

- **Datum:** 23 oktober 2026
- **Besluit:** de `Honeypot` is een tekstveld in een `div` met `hf-visually-hidden`, `inert` en `aria-hidden`.
  Het veld heeft `tabIndex={-1}` en `autoComplete="off"`.
  De site weigert een formulier waarin het veld niet leeg is.
- **Waarom:** het veld mag niet zichtbaar zijn, niet bereikbaar met Tab en niet voorgelezen worden.
  Robots herkennen `display: none` en slaan zo'n veld over, en dan vangt de val niets.
  Een veld dat uit beeld staat, vullen ze wel in.
  `inert` laat het veld buiten het toetsenbord en de toegankelijkheidsboom, en een browser of wachtwoordmanager vult het niet in, dus er komen geen mensen mee in de val.
  `aria-hidden` en `tabIndex={-1}` vangen een browser op die `inert` niet kent.
- **Alternatieven:** het veld met `display: none` of het attribuut `hidden` verbergen.
  Dat is makkelijker, en een schermlezer leest het ook niet voor, maar robots herkennen het.

### Button heeft een verplicht `type`, Input een lijst van soorten

- **Datum:** 23 oktober 2026
- **Besluit:** `Button` heeft een verplichte prop `type` (`submit`, `button` of `reset`).
  `Input` heeft een `type` uit een vaste lijst, zoals `email` en `url`; een ander type, zoals `checkbox`, laten de types niet toe.
- **Waarom:** een knop in een formulier verstuurt het formulier als je niets zegt, en dat gaat een keer mis.
  Een vinkje, een keuzerondje en een bestandsveld krijgen een eigen component, met hun eigen label en hulptekst; `Input` is alleen voor tekst.
- **Alternatieven:** `submit` als standaard; of elk type van HTML toestaan.

### De opmaak van de velden blijft in `base/forms.css`, de rest zit bij het component

- **Datum:** 23 oktober 2026
- **Besluit:** de regel die `input`, `select` en `textarea` hun look geeft, blijft in `base/forms.css`, want drie componenten delen hem.
  De knop (`button/button.css`), de hoogte van een tekstvak (`textarea/textarea.css`) en het veld met een fout (`input.css`, `select.css`, `textarea.css`) staan bij hun component, in dezelfde laag, met een elementselector zoals bij `Link` en `List`.
  De opmaak zelf is niet veranderd.
  Daarom hebben `Input`, `Textarea`, `Select` en `Button` geen eigen klasse met `hf-`, anders dan het issue vroeg; `Form`, `Field` en `ErrorSummary` hebben die wel.
- **Waarom:** de regel drie keer overschrijven zou drie plekken geven die uit de pas kunnen lopen.
  De regels bij een component zonder eigen klasse volgen `list.css`: een element in `hf.base`.
- **Alternatieven:** de gedeelde regel in elk van de drie bestanden herhalen; of klassen (`hf-input`) en de regels naar `hf.components` verplaatsen.
  Dan is de ruwe `input` zonder component niet meer opgemaakt, en dat is de bedoeling van `base/` niet.

### Een SegmentedControl bewaart niets, en de ingedrukte knop is gevuld

- **Datum:** 24 oktober 2026
- **Besluit:** `SegmentedControl` is een groep knoppen met een naam, waarvan er één `aria-pressed` is. De ingedrukte knop is gevuld als een gewone knop, de andere is een omlijning in de kleur van de tekst eromheen. Het component bewaart niets: de pagina geeft de waarde en handelt `onChange` af, ook als de ingedrukte knop wordt gekozen.
- **Waarom:** een schakelaar voor licht en donker (#208) is een keuze uit twee opties die meteen werkt. De groep en `aria-pressed` zeggen een schermlezer welke is gekozen, en het verschil tussen gevuld en omlijnd zegt het de ogen zonder kleur. Wat er met de keuze gebeurt, zoals bewaren, is aan de pagina, dus het component blijft klein en bruikbaar voor andere keuzes. In de footer staat de omlijning in de kleur van de footertekst, dus het contrast is dat van de tekst (4,5:1) in licht en donker.
- **Alternatieven:** een eigen component voor alleen het thema, met de opslag erin; dat bindt een knoppenrij aan één functie. Of keuzerondjes (`radio`) in een `fieldset`; dat is meer opmaak voor twee opties en leest een schermlezer minder kort voor. Of één knop die naar het andere thema schakelt; dan zegt de knop niet welk thema je ziet.

### Head zet één script vóór de eerste weergave in de head

- **Datum:** 24 oktober 2026
- **Besluit:** het designsysteem heeft een component `Head` met één eigenschap, `script`: het adres van een script van de site dat als gewoon script in de `head` staat, zonder `async` of `defer`. `Root` blijft de `html`. Alle andere inhoud van de `head` komt van Next.js, uit de Metadata API.
- **Waarom:** het script dat het gekozen thema op de pagina zet (#208) moet klaar zijn voordat de pagina getekend wordt, anders flitst ze in het verkeerde thema. De sjablonen van de site mogen geen HTML bevatten (_Sjablonen bevatten geen HTML, alleen componenten uit het designsysteem_), en _De namen van de paginacomponenten volgen NL Design System_ zegt dat een `Head` komt als er extra inhoud in de `head` nodig is.
- **Alternatieven:** `next/script` met `strategy="beforeInteractive"`. Dat zet alleen een `preload` in de `head`, en het script zelf start Next.js pas als de app laadt (we lazen het in de gebouwde HTML), dus de pagina flitst al. Of een inline script; dat past in de CSP, maar de code staat dan in een tekst in een component en niet in een bestand dat een test kan lezen. Of een eigenschap `head` op `Root`; dat maakt `Root` groter terwijl `Head` er al naast hoort te staan.

## Site

### Sjablonen bevatten geen HTML, alleen componenten uit het designsysteem

- **Datum:** 21 oktober 2026
- **Besluit:** de sjablonen in `apps/site` (de layouts, de pagina's en de pagina voor een onbekend adres) bevatten geen HTML-elementen, alleen componenten uit het designsysteem.
  Een ESLint-regel bewaakt dat.
- **Waarom:** de opmaak en de toegankelijkheid zitten dan op één plek.
  Een pagina kan niet om het designsysteem heen, en een kop, een link of een lijst is overal gelijk en wordt alleen daar gecontroleerd.
- **Alternatieven:** HTML in de sjablonen, met de CSS-klassen van het designsysteem.
  Dat is vrijer, maar elke pagina kan dan eigen opmaak en eigen toegankelijkheidsfouten maken.

### De ESLint-regel herkent HTML aan de kleine letter

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

### Een Content Security Policy die derden blokkeert, zonder nonces

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

### De lijst met bronnen staat een uur in het geheugen van de server

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

### Het hoofdmenu leest het pad in een clientcomponent

- **Datum:** 22 oktober 2026
- **Besluit:** `SiteNavigation` is een clientcomponent die met `usePathname` de huidige pagina markeert, met `aria-current="page"`.
  De layout zet het menu in de header van elke pagina.
- **Waarom:** in Next.js krijgt een layout het pad niet, en de header hoort in de layout, zodat elke pagina hem heeft.
  De server zet de markering al in de HTML.
- **Alternatieven:** de header in elke pagina, met de huidige pagina als prop; dan herhaalt elke pagina de header.
  Of het pad lezen uit de headers van het verzoek; dan maakt de server elke pagina per bezoek, ook de homepage.
  Of de huidige pagina niet markeren.

### Het hoofdmenu begint met Nieuws, en de huidige pagina krijgt een rode streep

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

### Een eigen foutpagina bij een fout op de server

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

### De homepage toont het nieuws van de afgelopen week, per dag

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

### Voorlopig is de query de poort voor het weergavebeleid

- **Datum:** 22 oktober 2026
- **Besluit:** de query voor de homepage geeft alleen de kop, de link, de tijd, de betaalmuur en de bronnaam.
  Het component voor een nieuwsregel heeft geen props voor een intro of foto.
  Het component dat het weergavebeleid van een bron leest, komt met de eerste bron die toestemming geeft.
- **Waarom:** de importer bewaart geen intro of foto, dus er valt nu niets te kiezen.
  Een component dat altijd hetzelfde beslist, is code zonder werking.
  Wat de query niet ophaalt, kan geen pagina tonen.
- **Alternatieven:** het component nu al bouwen, zoals #9 voorstelde, met het bericht en het beleid als invoer.

### De koppen staan vijf minuten in het geheugen van de server

- **Datum:** 22 oktober 2026
- **Besluit:** de server maakt de homepage bij elk bezoek, en vraagt de berichten hoogstens één keer per vijf minuten aan de database, met `cacheFor`, zoals bij `/bronnen`.
- **Waarom:** nieuws moet snel op de pagina staan, en één query per vijf minuten kost de gedeelde hosting niets.
  De build leest de database niet, net als bij `/bronnen`.
- **Alternatieven:** een uur, zoals de lijst met bronnen; dan staat een nieuw bericht er pas na een uur.
  Of ISR of `'use cache'`; die vielen om dezelfde redenen af als bij _De lijst met bronnen staat een uur in het geheugen van de server_.

### De toegankelijkheidscontrole zet zelf verzonnen koppen in de database

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

### De Coordinator schrijft per release wat er nieuw is, in het Nederlands

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

### Wat is er nieuw leest `CHANGELOG.md` bij de build

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

### De feed van Wat is er nieuw kiest zijn adres met `SITE_ENV`

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

### Eén korte pagina Over ons, met het bronnenbeleid en de privacyverklaring

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

### De homepage verbergt zijn `h1` voor het oog, en het blok heet Laatste nieuws

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

### Privacy staat op een eigen pagina

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

### Licht of donker: twee knoppen, drie toestanden, en een keuze gelijk aan het systeem wordt vergeten

- **Datum:** 24 oktober 2026
- **Besluit:** de footer heeft een schakelaar met twee knoppen, Licht en Donker, in een groep met de naam "Thema". De knop van het thema dat je ziet is ingedrukt. Achter de knoppen staan drie toestanden: `system`, `light` en `dark`. Is het ingedrukte thema wat het systeem al geeft, dan vergeet de pagina de keuze en volgt hij het systeem. Dat gebeurt alleen als een knop wordt ingedrukt, nooit als het systeem verandert. Zonder JavaScript staat de schakelaar er niet.
- **Waarom:** twee van de drie knoppen van "Systeem, Licht, Donker" zien er meestal hetzelfde uit, en een knop die niets lijkt te doen, is verwarrend. Zo is het systeem nooit buiten bereik, en blijft een keuze die toevallig gelijk wordt aan het systeem (een telefoon die donker wordt) staan. We volgen de aanpak van Lea Verou, [Dark mode toggles: two states are enough](https://lea.verou.me/blog/2026/dark-mode-toggles-two-states-are-enough/), en die van een eerder project van de projecteigenaar. Een knop die zonder JavaScript niets doet, is erger dan geen knop.
- **Alternatieven:** drie knoppen, zoals dat eerdere project eerst had. Of één knop die naar het tegenovergestelde schakelt; die zegt minder duidelijk welk thema je ziet. Of geen schakelaar, want het systeem beslist al; dat laat wie de site donker wil op een licht apparaat in de kou staan.

### De keuze staat in `localStorage`, en `data-theme` staat alleen op `html` als er een keuze is

- **Datum:** 24 oktober 2026
- **Besluit:** de keuze staat in `localStorage` onder de sleutel `fansite-theme`, alleen als de bezoeker iets anders koos dan het systeem. `public/theme.js`, een script in de `head` (via `Head`), zet `data-theme` op `html` vóór de eerste weergave, en alleen als er een keuze is. Zonder keuze en zonder JavaScript volgt de CSS het systeem. `src/theme.ts` neemt het over zodra de pagina geladen is. De sleutel en de regel in het script en in de module moeten gelijk blijven; de tests lezen ze allebei.
- **Hoe:** `html` heeft `suppressHydrationWarning`, omdat het script het attribuut zet voordat React start. De schakelaar toont niets op de server en tijdens het hydrateren, dus de HTML is voor iedereen gelijk en de pagina's blijven cachebaar. De `theme-color` van de browser volgt het thema dat de bezoeker ziet: bij een keuze krijgen beide tags de kleur van de header, en bij het systeem komen de tags van de server terug. De privacyverklaring noemt de opslag.
- **Waarom:** geen cookie, dus geen toestemming en niets naar de server, en een pagina die voor iedereen gelijk is, blijft te cachen. Het attribuut alleen zetten bij een keuze laat het gedrag voor wie niets koos gelijk aan dat van nu, en laat het script weinig beslissen.
- **Gecontroleerd:** een e2e-test blokkeert de scripts van de app en ziet dat `public/theme.js` alleen al `data-theme` zet, en dat de keuze na vernieuwen blijft. axe slaagt met een keuze die afwijkt van het systeem, in beide richtingen.
- **Alternatieven:** een functioneel cookie; dat laat de server het goede thema meteen tonen zonder script, maar maakt elke pagina per bezoeker anders en vraagt de privacyverklaring bij te werken (een vraag van #149). Of `data-theme` altijd zetten; dat laat het script meer beslissen en vraagt dat het script en de pagina's elkaar overal gelijk houden.

### De site test componenten met jsdom en Testing Library

- **Datum:** 24 oktober 2026
- **Besluit:** `apps/site` heeft `jsdom`, `@testing-library/dom` en `@testing-library/react` als devDependencies, in dezelfde exacte versies als het designsysteem. Een test die een DOM nodig heeft, zet bovenaan `// @vitest-environment jsdom`; de andere tests blijven in Node.
- **Waarom:** de schakelaar werkt met `localStorage`, `matchMedia` en `document`, en alleen een DOM laat zien dat een knop de keuze bewaart en dat de pagina het volgt. Het zijn geen nieuwe pakketten in de werkruimte, dus de lockfile kreeg alleen regels voor de site erbij.
- **Alternatieven:** de logica van de schakelaar in het designsysteem testen, waar jsdom al staat; dan staat de opslag in een component dat niets mag bewaren. Of alleen `renderToStaticMarkup`, zoals de andere tests van de site; dat ziet geen klik.

### De site mailt via SMTP van de hosting, vanaf de brievenbus van de redactie

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

### Voor SMTP gebruiken we nodemailer 10.0.16

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

### Mail gaat altijd over TLS, en zonder instellingen alleen lokaal naar het logboek

- **Datum:** 24 oktober 2026
- **Besluit:** poort 465 begint met TLS; elke andere poort moet naar TLS overschakelen (STARTTLS) voordat `sendMail` inlogt, en een server die dat niet kan, krijgt geen mail en geen wachtwoord.
  Een mislukte poging wordt niet herhaald; de aanroeper vangt de `MailError` op.
  De vijf variabelen `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` en `MAIL_FROM` zijn op `acceptance` en `production` verplicht, dus de site start er niet zonder.
  Lokaal horen ze alle vijf te ontbreken of alle vijf te staan; dan schrijft `sendMail` de mail in het logboek van de ontwikkelaar en verstuurt niets.
- **Waarom:** een mailserver die geen TLS spreekt, zou het wachtwoord en de berichten van bezoekers in het openbaar sturen.
  Een site die zonder instellingen start, merkt pas bij het eerste contactbericht dat er niets verstuurd wordt.
  Alles of niets lokaal, omdat een half ingevulde set een vergissing is die de ontwikkelaar anders pas bij het versturen ziet.
- **Gevolg:** de rooktest en de toegankelijkheidscontrole starten de site met `SITE_ENV=acceptance`; ze krijgen verzonnen instellingen mee, want geen pagina mailt.
- **Alternatieven:** ongecodeerd mailen als de server geen TLS kent (onveilig); de instellingen op acceptatie optioneel laten (de site start dan, maar mailt niet).

### Een foutmelding van `sendMail` bevat alleen een code, en een adres is precies één adres

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

### De test mailt naar een nepserver op de computer van de test

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

## Importer

### Een herkenbare fetcher die zich aan robots.txt houdt

- **Datum:** 22 oktober 2026
- **Besluit:** alle adapters halen hun gegevens op met één fetcher in `apps/importer`.
  Hij noemt zich `scHeerenveenFansite`, met een link naar de repository, en volgt `robots.txt` volgens RFC 9309.
  Is `robots.txt` niet te lezen, dan haalt hij niets op.
  Hij stuurt geen cookies, doet zich niet voor als browser en vraagt een feed die niet veranderd is met `If-None-Match` en `If-Modified-Since`.
- **Waarom:** een site moet kunnen zien wie wij zijn en ons kunnen weren, met de regels die ze al gebruiken.
  Een strenge lezing van `robots.txt` past bij wat we beloven: we nemen niets wat een bron ons niet wil geven.
  Een feed die niet veranderd is, kost de bron dan bijna niets.
- **Alternatieven:** een user agent die op een browser lijkt; dat komt vaker langs blokkades, maar dat is precies wat we niet willen.
  Of `robots.txt` overslaan voor feeds, zoals veel feedlezers doen omdat een feed bedoeld is om gelezen te worden; dan negeren we een bron die ons wil weren.
  Of een `robots.txt` die niet te lezen is als "alles mag" opvatten; dan halen we misschien iets wat de eigenaar verbiedt.

### robots.txt lezen we met eigen code

- **Datum:** 22 oktober 2026
- **Besluit:** de fetcher leest `robots.txt` met een kleine eigen parser, getest met de voorbeelden uit RFC 9309.
- **Waarom:** we hebben weinig van de regels nodig: onze naam of `*`, `Allow` en `Disallow`, `*` en `$`, en de langste regel wint.
  Dat zijn een paar tientallen regels code, zonder dependency om na te lopen.
- **Alternatieven:** het package `robots-parser` (MIT).
  Dat kan meer, zoals `Crawl-delay` en `Sitemap`, maar het is een dependency, en de laatste versie is van 2023.

### De fetcher meldt elke uitkomst als waarde

- **Datum:** 22 oktober 2026
- **Besluit:** `fetch` van de fetcher gooit geen fout voor wat een bron doet.
  Het antwoord is altijd een van vijf uitkomsten: gelukt, niet gewijzigd, geweigerd door `robots.txt`, wachten (429 of 503) of fout.
  Bij een fout staat een reden in een vaste lijst en een bericht in gewone woorden.
  Bij wachten staat het aantal seconden uit `Retry-After`, of niets als de bron dat niet zegt.
  De inhoud van een antwoord is een rij bytes: de adapter kent de tekenset van zijn feed.
- **Anders dan de RFC:** een 429 op `robots.txt` telt als niet te lezen, niet als "geen `robots.txt`".
  RFC 9309 zegt dat een 4xx betekent dat het bestand er niet is, maar een 429 betekent dat de host ons vraagt te wachten, en dan weten we niet wat hij zou antwoorden.
- **Waarom:** een adapter kan zo geen uitkomst vergeten, de jobplanner (#13) kan elke uitkomst gebruiken voor de gezondheid van een bron, en `Retry-After` kan hij zonder opnieuw te lezen gebruiken.
  Bytes verliezen geen tekens bij een feed die niet in UTF-8 staat.
- **Alternatieven:** fouten gooien en de adapter laten vangen; dat laat een adapter een fout vergeten.
  Of de inhoud als tekst geven; dat is handiger, maar het raadt de tekenset van de bron.

### De Leeuwarder Courant als eerste bron, ondanks het voorbehoud in robots.txt

- **Datum:** 22 oktober 2026
- **Besluit:** we lezen de RSS-feed van de Leeuwarder Courant voor kop, link en bronnaam.
  Tegelijk vragen we om toestemming (#35); zegt de krant nee, dan stoppen we met deze bron.
- **Waarom:** een RSS-feed is gepubliceerd om gelezen te worden, en de regels in `robots.txt` staan elke user agent toe.
  We tonen alleen de kop, de link en de naam, en sturen lezers door naar de krant.
  Het voorbehoud in een commentaar in `robots.txt` is breed geformuleerd, maar spreekt de regels zelf niet tegen.
- **Alternatieven:** eerst om toestemming vragen en wachten met de import.
  Of een andere eerste bron, zonder zo'n voorbehoud.

### De importer bewaart alleen wat we mogen tonen

- **Datum:** 22 oktober 2026
- **Besluit:** `items` heeft alleen kolommen voor de kop, de link, de sleutel, de tijd en de betaalmuur.
  Kolommen voor een intro of een afbeelding komen met de eerste bron die daar toestemming voor geeft.
- **Waarom:** principe 2 van de Redactie: wat we niet mogen tonen, slaan we ook niet op.
  Een kolom die er niet is, kan geen pagina per ongeluk tonen.
  Of een bericht achter de betaalmuur staat, is geen inhoud van de bron, en #73 kan het gebruiken.
- **Alternatieven:** alles uit de feed bewaren en pas bij het tonen filteren.
  Dan staat er inhoud in de database die we niet mogen gebruiken.

### Feeds lezen we met feedsmith

- **Datum:** 22 oktober 2026
- **Besluit:** de adapter leest feeds met `feedsmith` (MIT).
- **Waarom:** Node heeft geen XML-parser.
  `feedsmith` leest RSS, Atom, RDF en JSON Feed, ook met namespaces zoals Dublin Core en Media RSS, dus latere feeds, zoals die van podcasts (#14), passen er ook in.
  Het wordt onderhouden: versie 3 kwam in september 2026.
- **Alternatieven:** `fast-xml-parser` met eigen code die RSS en Atom naar onze velden vertaalt; dat is een laag minder, maar meer eigen code die moet kloppen.
  Of `rss-parser`; die is sinds 2023 niet bijgewerkt.

### De eerste echte bron komt via de seed

- **Datum:** 22 oktober 2026
- **Besluit:** de Leeuwarder Courant komt met haar feed in de seed, naast de testbronnen.
  Zo staat ze lokaal en op acceptatie in het register.
- **Waarom:** het register kent nog geen beheer (#30), en acceptatie krijgt de seed al bij elke start (#78).
- **Gevolg:** hoe echte bronnen op productie in het register komen, beslissen we met de bronnenlijst (#10) en het beheer (#30).
- **Alternatieven:** een migratie die de bron invoegt; dan staan gegevens tussen het schema.
  Of wachten op het beheer.

### Voetbal International als tweede bron

- **Datum:** 23 oktober 2026
- **Besluit:** we lezen de tagfeed van Voetbal International over sc Heerenveen voor kop, link en bronnaam.
  Tegelijk vragen we om toestemming (#35); zegt VI nee, dan stoppen we met deze bron.
- **Waarom:** de feed gaat over de club, komt vaak met nieuws (ongeveer elf berichten per week) en geeft een landelijke blik naast die van de Leeuwarder Courant.
  `robots.txt` staat elke user agent toe en bevat geen voorbehoud over datamining.
- **Alternatieven:** De Telegraaf (gaat alleen over de club, maar ongeveer één bericht per week, en met een voorbehoud tegen datamining), de algemene feed van Omrop Fryslân (te weinig over de club, zonder filter) en het Friesch Dagblad (geen feed over de club).

### De betaalmuur herkent de adapter per bron

- **Datum:** 23 oktober 2026
- **Besluit:** bij VI geldt een bericht als betaald als het de categorie `https://www.vi.nl/pro` heeft.
  De Leeuwarder Courant blijft het element `<premium>` gebruiken.
  De adapter kiest het teken aan de hand van het domein van de bron.
- **Waarom:** de Leeuwarder Courant en VI zeggen het op een andere manier, en een feed zonder zo'n teken heeft geen betaalmuur.
  De categorie is alleen een teken; we bewaren haar niet (zie "De importer bewaart alleen wat we mogen tonen").
- **Alternatieven:** de link controleren op `/pro/`; dat werkt nu ook, maar de categorie is bedoeld om dit te zeggen en de link kan veranderen.

### De opdracht heet `pnpm run import`

- **Datum:** 22 oktober 2026
- **Besluit:** we starten de import met `pnpm run import`, niet met `pnpm import`.
- **Waarom:** `import` is een opdracht van pnpm zelf, die een lockfile van npm of yarn omzet.
  Zonder `run` start pnpm die opdracht en niet ons script, en meldt dat er geen lockfile is.
  Het script heet toch `import`, zodat de naam in het issue, de documentatie en het rooster (#98) dezelfde blijft.
- **Alternatieven:** een andere naam die pnpm niet kent, zoals `pnpm import-feeds`; dan kun je `run` weglaten, maar de naam wijkt af van wat we zeggen: de import.

### Wat feedsmith niet geeft, lezen we er zelf bij

- **Datum:** 22 oktober 2026
- **Besluit:** de adapter noemt twee dependencies zelf, op een exacte versie: `entities` (BSD-2-Clause) en `fast-xml-parser` (MIT).
  Beide zijn al geïnstalleerd, want `feedsmith` gebruikt ze.
  - `entities` zet HTML-entiteiten in een kop om in tekens, met `decodeHTMLStrict`: alleen entiteiten met een puntkomma.
  - `fast-xml-parser` leest in een tweede lezing het element `<premium>` van de Leeuwarder Courant.
    Dezelfde parser controleert ook of de XML goed gevormd is.
- **Waarom:** een kop in CDATA, zoals bij de Leeuwarder Courant, kan HTML bevatten, en `feedsmith` laat de tekst daarin staan.
  `feedsmith` slaat ook elementen over die het niet kent, zoals `<premium>`, en leest een feed die halverwege stopt toch half.
  Met de tweede lezing zien we de betaalmuur en bewaren we niets uit een afgebroken feed.
  Die lezing zet geen entiteiten om, dus een feed kan er geen grote tekst mee opblazen.
- **Alternatieven:** de betaalmuur met een reguliere expressie uit de tekst halen; dat is minder code, maar fragiel bij CDATA en commentaar.
  Of de betaalmuur nog niet lezen; dan klopt de kolom `paywalled` niet.
  Of een eigen tabel met een paar entiteiten; dan blijft elke andere entiteit als tekst in de kop staan.

### Een bericht dat niet klopt, slaan we over

- **Datum:** 22 oktober 2026
- **Besluit:** de adapter slaat een bericht over, en meldt het, als het geen kop heeft, geen `http`- of `https`-link, of een kop, link of sleutel die niet in de kolom past.
  Hij kapt niets af.
  Een bericht zonder geldige tijd krijgt de tijd waarop we het zagen.
  Een tijd is geldig als hij een zone heeft, na 1990 ligt en niet meer dan een dag vooruit.
- **Waarom:** een afgekapte kop of link is niet meer wat de bron publiceert.
  Een tijd zonder zone telt in JavaScript als lokale tijd, en een tijd ver in de toekomst zet een bericht dagenlang bovenaan.
- **Alternatieven:** de kop afkappen met een beletselteken.
  Of een bericht zonder geldige tijd overslaan; dan verliezen we een kop die verder goed is.

### Een bericht heeft een sleutel per bron, en die is hoofdlettergevoelig

- **Datum:** 22 oktober 2026
- **Besluit:** een bericht is uniek op de bron en de sleutel samen (de `guid`, of anders de link).
  De kolom `item_key` vergelijkt hoofdlettergevoelig (`utf8mb4_bin`) en is hoogstens 700 tekens.
- **Waarom:** de collatie van de andere tabellen (`utf8mb4_unicode_ci`) ziet `A` en `a` en `é` en `e` als gelijk.
  Twee verschillende berichten zouden dan één rij worden, en het ene overschrijft het andere zonder dat iemand het merkt.
  Zonder sleutel per bron gaat een bericht dat in twee feeds van dezelfde bron staat, dubbel.
  700 tekens is het meeste dat een unieke index met `source_id` toestaat (3072 bytes).
- **Alternatieven:** een unieke index per feed; dan staat hetzelfde bericht uit twee feeds twee keer in `items`.
  Of een hash van de sleutel; dan kun je de sleutel niet lezen.

### De ETag en Last-Modified bewaren we samen met de berichten

- **Datum:** 22 oktober 2026
- **Besluit:** de adapter bewaart de berichten en de nieuwe `ETag` en `Last-Modified` van een feed in één transactie.
  Lukt het lezen of bewaren niet, dan blijven de oude waarden staan.
- **Waarom:** bewaren we de `ETag` voordat de berichten er staan, en mislukt het bewaren, dan zegt de bron de volgende keer dat niets veranderd is, en missen we die berichten.
- **Alternatieven:** de `ETag` meteen bewaren; dat is eenvoudiger, maar kan berichten laten ontbreken tot de feed verandert.

### De fetcher weigert adressen op een eigen netwerk, en controleert dat bij het verbinden

- **Datum:** 22 oktober 2026
- **Besluit:** de fetcher verbindt niet met een adres dat niet op het openbare internet ligt, zoals `localhost`, `127.0.0.1` of `10.0.0.1`, ook niet na een doorverwijzing.
  Hij gebruikt daarvoor `fetch` en een `Agent` van `undici`, met een `lookup` die het adres controleert waarmee hij echt verbindt.
- **Hoe:** de lijst volgt de registers van IANA voor adressen met een bijzonder doel.
  Van IPv6 is alleen `2000::/3` openbaar, zonder de bijzondere delen daarin, dus een IPv4-adres in IPv6-vorm weigert de fetcher altijd.
  Wijst een naam naar een openbaar adres en naar een adres op een eigen netwerk, dan weigert hij de naam.
  Tests met een eigen webserver geven de fetcher precies de adressen van die servers mee (`testOrigins`); de opdracht `pnpm run import` doet dat nooit, en een omgevingsvariabele kan het niet aanzetten.
- **Waarom:** de importer draait op gedeelde hosting, naast het forum en de database.
  Een bron kan doorverwijzen naar een adres op dat netwerk, of een naam laten wijzen naar zo'n adres, en dan haalt de importer iets op wat niet voor hem bedoeld is.
  Een controle vóór het verzoek mist een naam die bij het verbinden naar een ander adres wijst.
  `fetch` van Node zelf heeft geen haak voor het verbinden; `undici` is de bibliotheek eronder, onderhouden door het Node.js-team.
- **Alternatieven:** het transport zelf schrijven met `node:https` en een eigen `lookup`, met het uitpakken en de grens van 5 MB erbij; geen dependency, maar meer eigen code die moet kloppen.
  Of de naam vooraf opzoeken en daarna `fetch` aanroepen; dat mist een naam die tussendoor verandert.

### Een run neemt een lock, en een tweede run stopt meteen

- **Datum:** 22 oktober 2026
- **Besluit:** de import neemt aan het begin een lock in de database met `GET_LOCK`, met een naam per database, zoals de migraties.
  Is de lock bezet, dan stopt de run meteen, met exitcode 0.
- **Hoe:** `withLock` in `@fansite/db/lock` doet dat voor de import en voor de migraties, elk met een eigen naam: `fansite_import_<database>` en `fansite_migrate_<database>`.
- **Waarom:** _Importtaken via cron_ beloofde een lock, zodat een taak nooit twee keer tegelijk draait.
  Een run die stopt, mist niets, want een kwartier later komt de volgende.
  Er is niets kapot, dus exitcode 0.
  `GET_LOCK` hoort bij de verbinding, dus een proces dat sterft, laat de lock vanzelf los.
- **Alternatieven:** wachten tot de lock vrij is; dan stapelen de runs zich op als er een blijft hangen.
  Of een rij in een tabel als lock; die blijft staan als het proces sterft.

### Elke run komt in de database, en een feed is ongezond na drie mislukte runs op rij

- **Datum:** 22 oktober 2026
- **Besluit:** een tabel legt elke run vast, met per feed de uitkomst, 30 dagen lang.
  Per feed staan de laatste geslaagde run en het aantal mislukte runs op rij.
  Na drie mislukte runs op rij is een feed ongezond.
  Wachten en een weigering door `robots.txt` tellen niet als mislukt.
  `pnpm run import:status` toont de gezondheid; een pagina komt met het beheer (#31).
- **Hoe:** het logboek is twee tabellen: `import_runs` met een rij per run, en `import_results` met een rij per feed per run.
  De gezondheid staat in `feeds` zelf, naast de `ETag`: zo telt hij ook door na 30 dagen, en hoeft het overzicht geen runs na te tellen.
- **Waarom:** één fout kan toeval zijn; drie op rij is drie kwartier.
  Een bron die om rust vraagt of ons weert, is niet kapot.
  Dertig dagen is zo'n 2.900 runs per feed, genoeg om een patroon te zien en weinig opslag.
  Een opdracht werkt lokaal en op de host, zonder een pagina die interne gegevens aan iedereen toont.
- **Alternatieven:** ongezond na één fout, of na een tijd zonder geslaagde run, zoals twee uur.
  Of de runs altijd bewaren.
  Of een pagina met `noindex`, die ook de Coordinator kan lezen (#49).
  Of alleen het logbestand.

### De importer wacht als een bron daarom vraagt, en bewaart robots.txt een dag

- **Datum:** 22 oktober 2026
- **Besluit:** na een 429 of 503 slaat de import een feed over tot het moment uit `Retry-After`, hoogstens een dag, of een uur zonder `Retry-After`.
  Na drie mislukte runs op rij probeert hij de feed eens per uur, tot hij weer slaagt.
  De `robots.txt` van een host bewaart de fetcher hoogstens 24 uur in de database; een die niet te lezen was, bewaart hij niet.
- **Hoe:** `feeds.retry_at` zegt tot wanneer de import een feed overslaat.
  Is een feed ongezond, dan probeert de import hem 59 minuten na de vorige poging opnieuw.
  Cron start een run soms een paar seconden vroeger, en met een uur precies viel de poging dan een run later.
  De fetcher bewaart per origin, zoals `https://www.lc.nl`, de regels die voor ons gelden, in de tabel `robots_txt`.
- **Waarom:** een bron die om rust vraagt, krijgt die.
  Een kapotte feed hoeft geen 96 pogingen per dag.
  RFC 9309 staat toe dat een crawler `robots.txt` 24 uur bewaart, en dat scheelt 95 van de 96 verzoeken per dag per host.
  De database is de enige plek die tussen runs blijft staan: de deploy vervangt de map van de app.
- **Alternatieven:** elke run opnieuw proberen, zoals nu.
  Of uitstel dat steeds langer wordt; dat is meer code voor weinig winst bij één feed.
  Of `robots.txt` in een bestand op de host bewaren.

### Een bron nemen we als zijn feed over de club gaat en `robots.txt` ons toelaat

- **Datum:** 24 oktober 2026
- **Besluit:** we nemen een bron in het register als zijn feed (bijna) alleen over sc Heerenveen gaat en `robots.txt` ons de feed laat lezen.
  Een voorbehoud tegen datamining, in `robots.txt` of de voorwaarden, stopt ons niet voor de kop, de link, de bronnaam en de tijd.
  Vraagt een bron ons te stoppen, dan zetten we hem meteen uit.
- **Waarom:** een kop en een link sturen de lezer naar de journalist (principe 1 van de Redactie), en de fetcher houdt zich aan `robots.txt`.
  Zo laten we meer bronnen zien dan met toestemming vooraf, en een bron die bezwaar heeft, kan het ons zeggen.
  Het risico: een voorbehoud tegen datamining kan ook voor het automatisch lezen van een kop gelden, en geen jurist heeft die afweging getoetst.
  Daarom staat elk voorbehoud in [`bronnen.md`](bronnen.md), en zetten we een bron direct uit als hij erom vraagt.
- **Gevolg:** De Telegraaf staat met zijn tagfeed in het register, ondanks het voorbehoud in zijn `robots.txt`.
  Bij de keuze voor Voetbal International (#142) was dat voorbehoud nog een reden om De Telegraaf niet te kiezen.
- **Alternatieven:** bij een voorbehoud eerst schriftelijke toestemming vragen; dat is voorzichtiger, maar we missen dan bronnen die zelden antwoorden.

### De feeds van andere clubs nemen we niet

- **Datum:** 24 oktober 2026
- **Besluit:** de officiële feeds van FC Groningen en PEC Zwolle nemen we niet over.
- **Waarom:** de site gaat over sc Heerenveen.
  Het eerdere prototype had drie clubs; wij hebben er één.
- **Alternatieven:** ze toch opnemen voor wedstrijden tegen die clubs; dat vraagt een manier om berichten aan een wedstrijd te koppelen, en die is er niet.

### De forumdiscussies komen via de Flarum-API, niet uit de database van het forum

- **Datum:** 23 oktober 2026
- **Besluit:** de importer leest de nieuwste discussies bij de openbare API van het forum, als gast, en bewaart ze in onze eigen database.
  De site leest alleen onze database.
- **Waarom:** Flarum bepaalt zelf wat een gast mag zien, dus een besloten tag of een verborgen discussie komt er niet in.
  We hoeven de regels van het forum niet na te bouwen, en een fout daarin kan niets lekken.
  We hebben geen toegang tot de forumdatabase nodig.
  Die bevat e-mailadressen en wachtwoordhashes van leden, en een gebruiker op de gedeelde hosting kan mogelijk meer lezen dan we nodig hebben.
  De importer en de site hangen niet af van het schema van Flarum, dat bij een update kan veranderen.
  De importer heeft de lock, het logboek en de gezondheid van de bronnen al.
- **Alternatieven:** de database van het forum lezen met een gebruiker met leesrechten; die staat naast de onze bij mijn.host.
  Dat geeft geen vertraging van een kwartier, maar vraagt een tweede verbinding, een kopie van het schema voor tests en onze eigen regels voor wat zichtbaar is.
  Of de database van het forum bij elk bezoek lezen; dan werkt het blok niet meer als die database even wegvalt.
  We komen erop terug als de API voor gasten wegvalt of ons begrenst.

### Welke discussies in het blok komen

- **Datum:** 23 oktober 2026
- **Besluit:** het blok toont de discussies waar het laatst op is gereageerd, in alle tags die een gast ziet, behalve Offtopics en Sport overig.
- **Waarom:** de nieuwste activiteit zit vaak in Offtopics, zoals een algemeen muziektopic.
  Dat zegt een bezoeker van een clubsite weinig.
  De lijst met tags die we weglaten staat op één plek, dus een wijziging is klein.
- **Alternatieven:** alle tags die een gast ziet; dan kan het blok vol staan met discussies die niet over de club gaan.
  Of alleen Wedstrijden, Spelers & staf en Transfers & geruchten; dat is strakker, maar sluit supportersdiscussies uit.

### Het forum is een feed met een eigen lezer, en de discussies worden bij elke run vervangen

- **Datum:** 24 oktober 2026
- **Besluit:** het forum is een bron van het soort forum, en het adres van de lijst met discussies in de API is zijn feed.
  De import leest hem met dezelfde fetcher, lock, logboek en gezondheid als de andere feeds.
  Voor een bron van het soort forum gaat het antwoord naar `read-forum.ts` in plaats van naar de lezer van RSS en Atom.
  Na elke run staan in de tabel `discussions` precies de vier nieuwste discussies die aan de regels voldoen, en niets anders.
- **Hoe:** de lezer vraagt 30 discussies, laat die in een tag die we weglaten vallen, sorteert zelf op het moment van het laatste bericht en houdt de nieuwste vier.
  Een vastgezette discussie kan bij Flarum vooraan staan, dus de sortering van het forum is niet genoeg.
  De fetcher accepteert al elk soort antwoord en negeert de sessiecookie van de API, dus hij hoefde niet te veranderen.
  Het adres van een discussie bouwt de lezer uit het adres van de feed, het id, de slug en het nummer van het laatste bericht: een link uit het antwoord vertrouwen we niet.
  De `slug` in het antwoord begint al met het id, dus de lezer zet het id er niet nog eens voor.
  De lezer slaat een discussie met iets mis over en meldt waarom, zoals bij berichten.
  Een discussie in een tag die niet in het antwoord staat, slaat hij ook over, want die tag kon er een zijn die we weglaten.
  Zijn er discussies in het antwoord en kan er geen worden gelezen, dan is dat een fout en blijven de vorige discussies staan: dat wijst eerder op een verandering in de API dan op een leeg forum.
  Het forum vraagt geen `ETag` of `Last-Modified`: een lege database moet na één run discussies hebben, en de lijst is klein.
  Een run vervangt de rijen van het forum in één transactie, dus een lezer ziet nooit een halve lijst.
- **Waarom:** de machinerie bestaat en is getest, en het forum hoort bij `pnpm run import:status` te staan zoals de andere bronnen.
  Geen geschiedenis van titels of namen bewaren was een eis, en vervangen is de eenvoudigste manier.
- **Alternatieven:** een eigen opdracht voor het forum, met een eigen lock en logboek; dat zijn twee plekken om te bewaken.
  Of de discussies bijwerken en oude weghalen op id; dat is meer code, en een titel die het forum wijzigt zou dan niet vanzelf vervangen worden.

### Een podcast is een bron, en een aflevering is een rij in `items`

- **Datum:** 24 oktober 2026
- **Besluit:** een podcast staat in het register als bron van het soort podcast, en zijn afleveringen staan in `items`.
  De lezer van RSS leest de feed; een eigen adapter komt er niet.
  De link van een aflevering is het element `link`, de pagina van de aflevering, en nooit de `enclosure`.
- **Waarom:** `feedsmith` leest podcastfeeds al (zie _Feeds lezen we met feedsmith_), en een aflevering heeft dezelfde velden als een bericht: een titel, een link, een GUID en een tijd.
  We hergebruiken zo de sleutel per bron, de ontdubbeling, de lock en de gezondheid.
  Een link naar het MP3-bestand stuurt de luisteraar langs de pagina van de maker, en die pagina is waar we naartoe willen verwijzen (principe 1).
- **Alternatieven:** eigen tabellen `podcasts` en `episodes`, zoals het prototype; dat is dubbele machinerie voor dezelfde velden.
  Of een eigen adapter voor podcasts; die zou niets lezen wat de huidige lezer niet leest.

### Twee van de vier podcasts uit het prototype nemen we

- **Datum:** 24 oktober 2026
- **Besluit:** we nemen Omroep Abe en Radio Camataru.
  De Sportcast van Omrop Fryslân en de NOS Voetbalpodcast nemen we nu niet.
- **Waarom:** we volgen _Een bron nemen we als zijn feed over de club gaat en `robots.txt` ons toelaat_.
  Omroep Abe (205 van 224 afleveringen noemen Heerenveen in de titel of beschrijving) en Radio Camataru (95 van 100) gaan bijna helemaal over de club, hebben een pagina per aflevering en laten ons de feed lezen.
  De Sportcast gaat over Friese sport (8 van 390), zijn `robots.txt` sluit alles voor iedereen (`Disallow: /`), zijn adres uit het prototype werkt niet meer (nu `tydlik.omropfryslan.nl`), en elke aflevering heeft dezelfde link, de pagina van het programma.
  De NOS Voetbalpodcast gaat over het hele betaalde voetbal (5 van 664), en zijn `link` is het MP3-bestand zonder pagina van de aflevering.
- **Alternatieven:** alle vier, zoals het issue vroeg; twee daarvan kunnen we niet lezen of niet goed koppelen.
  Of Omrop Fryslân om toestemming en een feed met alleen clubafleveringen vragen; dat kan later, buiten dit issue.

### Geen artwork van een podcast

- **Datum:** 24 oktober 2026
- **Besluit:** we bewaren en tonen geen artwork.
  De naam van de podcast is genoeg.
  Een plaatje komt met #10, als lokaal bestand of als initialen.
- **Waarom:** een afbeelding van een ander tonen mag alleen met toestemming (principe 2) en van onze eigen server (principe 3).
  Het prototype laadde het artwork rechtstreeks van de bron.
  Wat we niet mogen tonen, slaan we ook niet op.
- **Alternatieven:** toestemming vragen aan beide podcasts en het plaatje op onze server zetten; dat wacht op hun antwoord en op een plek voor bestanden.

### Podcasts volgen het rooster van de rest

- **Datum:** 24 oktober 2026
- **Besluit:** er komt geen rooster per soort bron.
  De podcastfeeds worden bij elke run van 15 minuten gevraagd, met `ETag`.
- **Waarom:** beide bronnen sturen een `ETag`, dus een run zonder nieuwe aflevering kost een antwoord "niet gewijzigd" en niet de feed van bijna 1 MB.
  Een rooster per soort is extra code voor weinig winst.
  Omroep Abe plaatst ongeveer één aflevering per week, dus de lijst loopt hooguit een kwartier achter.
- **Alternatieven:** podcasts één keer per uur of per dag lezen; dat bespaart een verzoek per run, maar vraagt een manier om per soort te plannen.

### Een podcast komt niet in de nieuwslijst

- **Datum:** 24 oktober 2026
- **Besluit:** de query voor het nieuws slaat bronnen van het soort podcast over.
  Podcasts krijgen een eigen blok en een eigen pagina (zie het issue over het tonen, #188).
- **Waarom:** een aflevering is geen bericht, en het blok heet "Laatste nieuws".
  Het nieuwsarchief (#26) hergebruikt dezelfde query.
- **Alternatieven:** de afleveringen tussen het nieuws tonen, met "podcast" erbij; dat maakt één lijst die twee soorten mengt.

### De beschrijving van een podcast is die van de maker

- **Datum:** 24 oktober 2026
- **Besluit:** de beschrijving van een podcast in het register (`sources.description`) is de tekst die de maker zelf in zijn feed zet, letterlijk en zonder de HTML eromheen, met zijn eigen spelling.
  Zo staat hij in de seed, en zo tonen Onze bronnen en de zijbalk van `/podcasts` hem.
  - Omroep Abe: "Omroep Abe is de podcast over SC Heerenveen van de Leeuwarder Courant. Clubwatcher Sander de Vries bespreekt met oud-spelers Gerald Sibon, Geert Arend Roorda en Henrico Drost wekelijks de actualiteiten en achtergronden bij de club."
  - Radio Camataru: "Wekelijkse supporterspodcast over sc Heerenveen!"

  Beschrijvingen van bronnen van een ander soort blijven in eigen woorden (zie _De pagina 'Onze bronnen' toont per bron een beschrijving, niet wat we tonen_).

- **Waarom:** de maker publiceert deze tekst in de feed die wij lezen, dus zijn tekst gaat voor onze omschrijving.
  Het is één alinea over de podcast zelf, geen intro bij een aflevering.
- **Risico:** het is de tekst van de maker en we hebben er geen aparte toestemming voor gevraagd.
  Vraagt een maker ons de tekst te veranderen of weg te halen, dan doen we dat zo snel mogelijk.
  De seed bewaart de tekst; de importer leest hem niet bij elke run, dus een wijziging van de maker komt er pas als iemand de seed bijwerkt.
- **Alternatieven:** de beschrijving in eigen woorden, zoals eerder bedacht; dat staat verder van wat de maker over zichzelf zegt.
  Of de beschrijving uit de feed bij elke run overnemen; dat vraagt een lezer voor het kanaal van de feed en overschrijft wat in het register staat.

### `/podcasts` is één lijst met een filter, en de URL's hebben een slug

- **Datum:** 24 oktober 2026
- **Besluit:** `/podcasts` toont alle afleveringen met 25 per pagina, en een filter per podcast via `?podcast=<slug>`.
  De slug staat in een kolom van `sources`, zodat het adres niet verandert als de naam verandert.
- **Waarom:** met twee podcasts is een pagina per podcast overbodig, en een filter past bij het filter per bron van het nieuwsarchief.
  Een adres als `/podcasts?podcast=omroep-abe` blijft werken als we de naam van de podcast aanpassen of er een podcast bijkomt.
  Een pagina die buiten het bereik valt, geeft 404 en niet een lege lijst.
- **Alternatieven:** een pagina per podcast, `/podcasts/omroep-abe`.
  Of de slug uit de naam afleiden in de code; dan verandert het adres mee met de naam.

### Een aflevering linkt naar de maker, een podcast ook naar Apple en Spotify

- **Datum:** 24 oktober 2026
- **Besluit:** de titel van een aflevering linkt naar de pagina van de aflevering bij de maker.
  Bij een gekozen podcast staan tekstlinks naar de podcast op Apple Podcasts en Spotify, uit het register.
  Links per aflevering naar die platforms komen er niet.
- **Waarom:** de feeds geven alleen adressen van de show, niet van afleveringen.
  Per aflevering zoeken kan alleen bij hun diensten: Apple geeft de laatste 200 afleveringen, en Spotify vraagt een account met sleutel.
  Elke aflevering zou naar hen gaan.
  Een adres van de show schrijven we één keer op, en het werkt zonder app.
  De pagina van de maker blijft de standaard omdat die de maker zelf is (principe 1).
- **Alternatieven:** alleen de pagina van de maker, zonder platformlinks.
  Of links per aflevering, met opzoeken bij Apple en Spotify.

### Een slug vergelijken we letter voor letter

- **Datum:** 24 oktober 2026
- **Besluit:** de queries zoeken een podcast op zijn slug zonder de hoofdletters en accenten te negeren (`collate utf8mb4_bin`).
  De kolom zelf blijft hoofdletterongevoelig en uniek.
- **Waarom:** de kolom houdt twee slugs die alleen in hoofdletters of accenten verschillen buiten het register.
  Een adres moet één podcast noemen, dus `?podcast=Omroep-Abe` is een onbekende podcast en geen tweede adres voor Omroep Abe.
- **Alternatieven:** de collatie van de kolom veranderen in `utf8mb4_bin`; dan staan `omroep-abe` en `Omroep-Abe` allebei in het register.
  Of de pagina de slug laten toetsen; dan kan een andere query dezelfde fout maken.

### Een aflevering is een nieuwsregel

- **Datum:** 24 oktober 2026
- **Besluit:** een aflevering wordt getoond met `NewsItem`, met de naam van de podcast als bron.
  Er komt geen apart component voor een podcastregel.
- **Waarom:** een aflevering heeft dezelfde onderdelen als een bericht: een titel als link, een bron en een tijd.
  Een tweede component met dezelfde regel is code die hetzelfde doet.
  Komt er ooit iets bij dat alleen voor afleveringen geldt, zoals een duur, dan kan er een component bij.
- **Alternatieven:** een eigen component voor de podcastregel, zoals #20 voorstelde.

### Het blok op de homepage staat in de zijbalk onder het forum

- **Datum:** 24 oktober 2026
- **Besluit:** het blok "Nieuwste podcasts" toont de vier nieuwste afleveringen van alle podcasts samen, in de zijbalk onder "Nieuwste discussies", met een link naar `/podcasts`.
- **Waarom:** de hoofdkolom is voor het nieuws, en de zijbalk heeft plaats voor meer blokken naast elkaar.
  Vier regels past bij het forumblok.
- **Alternatieven:** het blok boven het forum, of in de hoofdkolom onder het nieuws.

### Het filter is een Navigation, en de paginering verdwijnt bij één pagina

- **Datum:** 24 oktober 2026
- **Besluit:** `Filter` in het designsysteem is een `Navigation` met een klasse van zichzelf, dus een `nav` met een naam, een lijst met links en `aria-current="page"` op de keuze.
  `Pagination` heeft "Vorige", "Pagina 2 van 9" en "Volgende", en laat een link weg waar geen pagina is.
  De pagina `/podcasts` toont de paginering alleen als er meer dan één pagina is.
- **Waarom:** een filter van links heeft dezelfde onderdelen als een menu: dezelfde 44 pixels hoge links, hetzelfde teken voor de huidige keuze en dezelfde naam voor schermlezers.
  Een tweede component zou dat nabouwen.
  "Pagina 1 van 1" zonder een link zegt een bezoeker niets.
- **Alternatieven:** een eigen component met een eigen lijst; dat is dubbel werk.
  Of een `Select` voor de podcasts; dat vraagt JavaScript of een knop om te verzenden.

### De tijd van een aflevering: de dag in de week, daarna de datum

- **Datum:** 24 oktober 2026
- **Besluit:** een aflevering van de zeven dagen tot en met vandaag toont de korte dag en de tijd, zoals bij het nieuws: "wo 14:05".
  Een oudere toont alleen de datum, zoals "16 okt", met het jaar als het niet dit jaar is: "6 okt 2021".
- **Waarom:** de lijst gaat jaren terug, dus een datum zonder jaar is onduidelijk.
  Zonder tijd past de datum met het jaar in de smalle kolom van een nieuwsregel; een tijd erbij zou over drie regels breken.
- **Alternatieven:** de datum en de tijd, zoals bij het nieuws; dat past niet in de kolom met het jaar erbij.
  Of altijd het jaar; dat is in de week overbodig.

### Een lijst per podcast en pagina staat vijf minuten in het geheugen, na de controle van het adres

- **Datum:** 24 oktober 2026
- **Besluit:** de server bewaart de lijst van elke combinatie van podcast en pagina vijf minuten, met `cacheForKey`.
  Hij controleert de slug en het paginanummer eerst tegen de lijst van podcasts en het aantal pagina's, en bewaart pas daarna iets.
- **Waarom:** een bezoeker kan elk adres bedenken, en een bewaarde lijst per adres zou het geheugen van de server vullen.
  Met de controle vooraf zijn er hooguit zoveel lijsten als er podcasts en pagina's zijn.
- **Alternatieven:** niet bewaren; dat is een query per bezoek.
  Of een grens aan het aantal bewaarde lijsten; dat is meer code en laat een bezoeker de goede lijsten uit het geheugen duwen.

### De duur, het seizoen en het nummer van een aflevering tonen we wel

- **Datum:** 24 oktober 2026
- **Besluit:** de import bewaart van een aflevering de duur in hele seconden, het seizoen en het nummer, als de feed ze geeft, en de pagina's tonen ze achter de naam van de podcast: "seizoen 9, aflevering 16 · 37 min".
  Een seizoen zonder nummer tonen we niet.
  Het soort aflevering (`itunes:episodeType`: `full`, `trailer` of `bonus`) bewaren we niet.
  De tabel `items` krijgt drie kolommen die leeg mogen zijn, `duration_seconds`, `season_number` en `episode_number`, met een migratie die de `ETag` en `Last-Modified` van de feeds vergeet, zodat de volgende run elke feed één keer helemaal leest en de bestaande afleveringen de feiten krijgen.
- **Waarom:** de projecteigenaar vroeg erom: een duur en een nummer zijn feiten over een aflevering en geen inhoud ervan, zoals een datum of een bronnaam, en ze helpen een luisteraar kiezen.
  Principe 2 gaat over inhoud van een ander, zoals een intro of een foto, en dat blijft weg.
  Beide feeds geven de duur bij elke aflevering; het nummer staat bij alle 100 van Radio Camataru en bij 151 van de 224 van Omroep Abe.
  Alle afleveringen in beide feeds zijn `full`, dus dat gegeven zegt niets.
- **Alternatieven:** niets tonen, zoals #14 besloot; dat laat een nuttig feit liggen.
  Het soort aflevering ook bewaren; dat zegt pas iets als een podcast een trailer of een extra aflevering plaatst.
- **Gevolg:** dit gaat tegen een regel uit #14 in ("geen duur"), met goedkeuring van de projecteigenaar.
  De kolommen komen niet in `items` voor nieuws: een nieuwsfeed geeft ze niet, dus ze blijven leeg.

## Redactie

### sc Heerenveen met kleine letters

- **Datum:** 20 oktober 2026
- **Besluit:** we schrijven de club altijd als sc Heerenveen, met een kleine s en c, ook aan het begin van een zin en in de sitenaam sc Heerenveen Fansite.
  Waar het woordmerk kapitalen toont, blijft de tekst erachter "sc", voor schermlezers en wie de tekst kopieert.
- **Uitzonderingen:** koppen uit de media citeren we zoals ze zijn gepubliceerd, ook met SC Heerenveen.
  Oude namen van de site blijven zoals ze waren, zoals SC Heerenveen Online (1997–98).
- **Waarom:** zo schrijft de club zichzelf.
  Koppen van anderen delen we; die passen we niet aan.
- **Alternatieven:** SC Heerenveen met hoofdletters, zoals in veel koppen uit de media.

### Standaard alleen kop, link en bronnaam

- **Datum:** 20 oktober 2026
- **Besluit:** vier principes gelden voor alles wat we van anderen tonen:
  - standaard alleen de kop, de link en de naam van de bron, met de tijd van publicatie;
  - intro's en foto's alleen met toestemming van de bron;
  - geen verzoeken naar derden: een pagina laadt niets van een ander domein;
  - bij alles de bron vermelden.
- **Waar:** de principes en een korte checklist voor de reviewer staan in het hoofdstuk Redactie van Storybook.
  Wat per bron mag, komt in het bronnenregister (#9); de principes leggen uit waarom.
  De schrijfwijzer volgt in #19.
- **Waarom:** een kop en een link sturen de lezer naar de journalist, en een samenvatting of foto kan dat bezoek vervangen.
  Tekst en foto's zijn van de maker.
  En een verzoek naar een ander domein vertelt dat domein wie onze pagina bekijkt.
  De principes stonden verspreid over issues; de reviewer en nieuwe vrijwilligers vinden ze nu op één plek.
- **Alternatieven:** korte intro's standaard tonen, zoals veel nieuwsverzamelaars doen.
  Of de principes in `docs/`, naast de checklist voor toegankelijkheid; maar Storybook is ook het handboek voor wie schrijft.

### De pagina 'Onze bronnen' toont per bron een beschrijving, niet wat we tonen

- **Datum:** 22 oktober 2026
- **Besluit:** de pagina zegt in één zin dat dit de bronnen zijn waar we het nieuws vandaan halen.
  Per bron staan er de naam als link naar de website en een beschrijving van een of twee zinnen, per soort onder een kop.
  Wat we van een bron tonen, en de toestemming, staan er niet.
- **Hoe:** de beschrijving staat in het register, in de kolom `description` van `sources` (hoogstens 300 tekens).
  We schrijven haar zelf, in eigen woorden.
  Later: de beschrijving van een podcast is de tekst van de maker uit zijn feed (zie _De beschrijving van een podcast is die van de maker_).
  `listEnabledSources` in `@fansite/db/queries` haalt alleen de naam, het domein, de soort en de beschrijving op, dus het beleid en de toestemming komen niet bij een pagina.
- **Waarom:** bezoekers hoeven niet te lezen wat we wel of niet van een bron tonen; dat zien ze zelf.
  Een korte beschrijving zegt wat de bron is, en dat helpt bij het kiezen.
  De toestemming beschrijft ons contact met de bron, en dat is niet aan de pagina.
- **Alternatieven:** per bron in gewone taal zeggen wat we tonen, zoals "kop, link en bronnaam", met één plek die het beleid in die tekst omzet.
  Zo stond het eerst in #70.
  Of ook de toestemmingsstatus tonen; dat laat zien wie we hebben gevraagd en wie nog niet heeft geantwoord.
  Of de beschrijvingen in de code van de site zetten; dan staat een bron op twee plekken, en kan het beheer (#30) ze niet aanpassen.

### Een bericht achter de betaalmuur krijgt de tekst "voor abonnees"

- **Datum:** 22 oktober 2026
- **Besluit:** staat een bericht achter de betaalmuur, dan staat er "voor abonnees" bij, in tekst.
- **Waarom:** de bezoeker weet dan vóór de klik dat hij een abonnement nodig heeft.
  De importer bewaart het al, en het is geen inhoud van de bron.
  Tekst werkt ook voor een schermlezer en zonder kleur.
- **Alternatieven:** de betaalmuur niet tonen.
  Of alleen een pictogram.

### De redactie is het aanspreekpunt, en pakt een verwijderverzoek zo snel mogelijk op

- **Datum:** 22 oktober 2026
- **Besluit:** het aanspreekpunt voor bezoekers, uitgevers en de privacyverklaring is "De redactie van de sc Heerenveen Fansite", op fansite@heerenveen.org.
  Een verwijderverzoek pakken we zo snel mogelijk op, zonder vaste termijn.
- **Waarom:** de site is van een groep supporters, niet van één persoon.
  Een vaste termijn kunnen vrijwilligers niet altijd halen, en een belofte die we niet houden, kost meer vertrouwen dan geen getal.
- **Alternatieven:** de projecteigenaar bij naam als verantwoordelijke; dat is voor de AVG herkenbaarder.
  Of een vaste termijn, zoals twee werkdagen of een week.

### Elke tekststijl een stap groter

- **Datum:** 22 oktober 2026
- **Besluit:** Tekst is 18 pixels, Nieuwskop 20 (op een smal scherm 19), Meta 16 en Label 15.
  De koppen en het woordmerk blijven gelijk, en de regelafstanden houden dezelfde verhoudingen.
- **Waarom:** in de hoofdkolom van 48 rem telt een regel bij 17 pixels zo'n 96 tekens.
  Groter leest prettiger en past bij een site die iedereen moet kunnen lezen.
  Eén stap houdt de verhoudingen tussen de stijlen, en de koppen zijn al groot genoeg.
- **Alternatieven:** twee stappen, met Tekst op 19 pixels; dan passen er nog minder woorden in een kaart.
  Of alles, de koppen en het woordmerk inbegrepen, 12,5% groter.
- **Later:** zie _Kleinere koppen en vaste tekstmaten_.
  Daar worden de koppen kleiner en krijgt de tekst vaste maten.

### Het nieuws staat in één lijst, met dag en tijd in een eigen kolom

- **Datum:** 22 oktober 2026
- **Besluit:** de homepage toont het nieuws van de week in één lijst, het nieuwste bovenaan, zonder kop per dag.
  Elke regel heeft links de korte dag en de tijd in rood, zoals "wo 14:05", dan de kop en daaronder de bron, met een dunne lijn tussen de regels, zoals op de artboard.
- **Waarom:** zo ziet het blok eruit zoals ontworpen, en leest een bezoeker de koppen achter elkaar.
  De lijst beslaat vandaag en de zes dagen ervoor, dus een weekdag komt maar één keer voor en is altijd duidelijk.
  Dag en tijd blijven kloppen in een pagina uit de cache.
- **Alternatieven:** de kop per dag houden, zoals #73 deed.
  Of zoals op de artboard: dag en tijd voor vandaag en dag en datum voor oudere berichten, zoals "za 17/10"; dan toont een pagina uit de cache rond middernacht even een tijd zonder datum.
- **Later:** zie _De homepage toont het nieuws van twee weken_ en _De tijd van een bericht: een weekdag in de week, daarna de datum_.
  De lijst blijft, maar beslaat nu twee weken, en een weekdag staat er alleen voor de laatste zeven dagen.

### De footer staat op een eigen vlak, met links in donker zand

- **Datum:** 23 oktober 2026
- **Besluit:** de footer heeft een eigen vlak van rand tot rand: in licht `grey-200`, in donker `blue-900`.
  Bovenaan staat een lijn in `grey-300` en `blue-700`.
  De twee zinnen staan onder elkaar, met de links rechts ervan; op een smal scherm staan de links eronder.
  De links zijn donker zand: `sand-700` in licht, `sand-300` in donker.
- **Waarom:** het vlak sluit de pagina af, zoals de header hem opent.
  Een stap donkerder dan de pagina is rustig en houdt de tekst goed leesbaar.
  Met de zinnen onder elkaar en de links rechts is de footer lager en sneller te overzien.
  Donker zand past bij het vlak en maakt de footer rustiger dan de rest van de pagina; de onderstreping laat zien dat het links zijn.
- **Hoe:** twee nieuwe rollen geven het vlak en de lijn hun kleur: `--hf-colour-background-footer` en `--hf-colour-border-footer`.
  De reeks zand krijgt een stap `sand-700` (`#52462d`): zo licht als `grey-700`, met 0,042 chroma en tint 85°.
  Ook de links hebben twee rollen: `--hf-colour-text-link-on-footer` en, onder de muis, `--hf-colour-text-link-hover-on-footer` (`grey-900` in licht, `sand-100` in donker).
  De `Page.Footer` zet daarmee de kleuren van links voor alles wat erin staat, zoals de `Page.Header` dat doet; een bezochte link krijgt de kleur van een gewone link.
  De twee zinnen zijn elk een eigen `Text`, want de sjablonen van de site bevatten geen HTML, dus ook geen `br` (zie _Sjablonen bevatten geen HTML, alleen componenten uit het designsysteem_).
  Daarom is de `Page.Footer` een raster.
  Op een smal scherm heeft het één kolom, met de links onder de tekst.
  Vanaf 40 rem, net als bij de kaart, staan de links in een tweede kolom rechts, over de twee regels en in het midden.
  De tekst haalt 4,85:1 in licht en 10,65:1 in donker, de links 6,95:1 en 9,47:1, en de focusrand 3,52:1 en 7,90:1.
  Het contrast staat bij Tokens › Kleur in Storybook.
- **Alternatieven:** de footer op de achtergrond van de pagina met alleen een lijn erboven, zoals eerst.
  Of het vlak alleen in de kolom; dan ziet het eruit als een losse kaart.
  Of blauwe links, zoals op de rest van de site; dat vraagt geen nieuwe tokens, maar de footer valt dan meer op.
  Of één alinea met een `br` tussen de zinnen, zodat de links naar de volgende regel gaan zodra ze niet meer passen, zoals in de header.
  Dan moet de ESLint-regel `br` toestaan, of krijgt het designsysteem een component voor een regeleinde.
- **Later:** zie _De links in de footer zijn blauw, zoals de andere links_; de kleur van de links is daarmee vervangen.

### Metadata, sitemap en canonieke URL's gebruiken het adres van de eigen omgeving

- **Datum:** 23 oktober 2026
- **Besluit:** de canonieke URL's, `og:url`, `og:image` en `/sitemap.xml` beginnen met het adres van de omgeving waar de site draait (`originOf()`), niet alleen met dat van productie.
  `robots.txt` verwijst alleen op productie naar de sitemap.
  Op acceptatie en lokaal blijft hij alles weigeren, zonder verwijzing.
- **Waarom:** de rooktest kan het dan op acceptatie controleren, en de code is op productie dezelfde.
- **Alternatieven:** alleen op productie een sitemap en canonieke URL's; dat laat de code ongetest tot de lancering.
- **Hoe:** de pagina's staan in `apps/site/src/pages.ts`, met hun beschrijving.
  De sitemap, de metadata en de rooktest lezen die lijst.
  `sitemap.test.ts` faalt als er een `page.tsx` in `src/app` staat die niet in de lijst staat en niet in de lijst met uitzonderingen in die test.
  Alle vier de pagina's zijn nu `force-dynamic`: `originOf()` leest `SITE_ENV` als de server draait, en Next.js zou het adres van de build in een statische pagina zetten.
  Voor Over ons en Wat is er nieuw maakt dat niets uit voor bezoekers, want de pagina's zijn klein en de versies komen nog steeds uit de build.
  De sitemap bevat alleen `loc`: geen `lastmod`, `changefreq` of `priority`.
- **Later:** de pagina heet nu Updates en staat op `/updates`; zie _De pagina Wat is er nieuw heet Updates, op `/updates`_.

### Het schild van de site, als PNG van ons eigen domein, is de afbeelding bij het delen van links

- **Datum:** 23 oktober 2026
- **Besluit:** het schild van de site, als PNG van ons eigen domein, is de afbeelding bij het delen van links.
- **Waarom:** een gedeelde link toont dan meer dan tekst, zonder foto van een ander of een verzoek naar een derde.
  Veel diensten voor het tonen van links accepteren geen SVG, dus het wordt een PNG.
- **Alternatieven:** geen afbeelding (alleen tekst bij het delen); de SVG zelf (wordt vaak niet getoond).
- **Hoe:** `pnpm --filter site share-image` maakt `apps/site/public/share-image.png` (1200 bij 630 pixels) met het Chromium van Playwright: het schild uit `packages/design-system/src/assets/logo.svg`, in het midden op het donkerblauw van de header.
  We maken de PNG één keer en zetten hem in de repository; het script is er alleen voor als het logo verandert.
  Het officiële clublogo staat er niet op.
  `assemble` kopieert `public` mee naar de map voor de host, want Next.js laat die weg uit de standalone build.
  De Content Security Policy staat de afbeelding toe: `img-src 'self'`.

### Twee kleine afwijkingen van het issue bij de metadata

- **Datum:** 23 oktober 2026
- **Besluit:** de beschrijving van Wat is er nieuw is langer dan het voorstel in het issue, en de pagina's hebben `twitter:`-tags die we niet zelf zetten.
  De beschrijving is "Wat er nieuw is op de sc Heerenveen Fansite, per versie: wat je er nu kunt vinden en doen."
- **Waarom:** het voorstel ("Wat er nieuw is op de sc Heerenveen Fansite, per versie.") heeft 56 tekens, en het criterium vraagt 70 tot 160.
  Next.js kopieert de Open Graph-tags naar `twitter:`-tags zodra een pagina Open Graph-tags heeft, en heeft geen manier om dat uit te zetten (`postProcessMetadata` in Next.js).
  We zetten zelf geen `twitter`-sleutel in de metadata, en een test controleert dat; de tags in de HTML komen van Next.js.
- **Alternatieven:** de beschrijving van 56 tekens laten staan en de test versoepelen.
  Of de Open Graph-tags als losse `<meta>`-elementen in elke pagina zetten, buiten de metadata van Next.js om; dat zijn extra regels in elke pagina en de tags staan dan niet meer bij de rest van de metadata.
- **Later:** de pagina heet nu Updates en staat op `/updates`; zie _De pagina Wat is er nieuw heet Updates, op `/updates`_.

### De zijbalk kan onder een inleiding beginnen, met benoemde gebieden en een subgrid

- **Datum:** 23 oktober 2026
- **Besluit:** `Page.Main` krijgt een eigenschap `intro` voor een inleiding, zoals de kop en de inleiding van een pagina.
  Op een breed scherm begint de zijbalk onder die inleiding, naast de eerste cel eronder.
  De inleiding is zo breed als de hoofdkolom.
  `Page.Body` tekent die opbouw met benoemde gebieden, en `Page.Main` is dan een subgrid in de rijen, met de inleiding en de cellen elk in een eigen `div`.
- **Waarom:** de `h1` moet in de `main` blijven, want met de landmarks sla je het menu over (2.4.1).
  De `aside` moet buiten de `main` blijven.
  axe controleert allebei, met `region` en `landmark-complementary-is-top-level`.
  Alleen met een subgrid weet `Page.Body` dan hoe hoog de inleiding is.
  Een subgrid zet elk kind in een eigen rij, dus de cellen eronder staan samen in één `div`.
  De eigenschap zet die `div` er zelf omheen, zodat een pagina hem niet kan vergeten.
  Benoemde gebieden laten de opbouw zien als een tekening.
  Met regelnummers, `grid-row: 2` op de zijbalk, sprong de zijbalk in Chromium en WebKit naar de eerste kolom: een raster plaatst een item met een vaste rij als eerste.
  Een inleiding zo breed als de hoofdkolom houdt de regels zo lang als _Een pagina van 64 rem, met kolommen van 36, 4 en 24 rem_ koos.
- **Hoe:** `:has()` kiest de opbouw, dus een pagina zonder inleiding houdt het raster van nu.
  Op een smal scherm zijn er geen gebieden nodig: de zijbalk volgt in de bron op de `main` en staat daaronder.
  Alleen een `Page.Body` met een inleiding krijgt gebieden, want een leeg gebied houdt zijn rij en zijn ruimte.
  De `main` beslaat beide rijen, dus een pagina met een inleiding maar zonder zijbalk heeft niets leeg: de cellen staan onder de inleiding zoals onder een eerste cel.
  Staan er geen cellen onder de inleiding, zoals op Onze bronnen zonder bronnen, dan laat `page.css` de lege `div` voor de cellen weg en beslaat de `main` één rij: de zijbalk staat dan één tussenruimte onder de inleiding, niet twee.
- **Alternatieven:** een inleiding over de volle breedte, met `Page.Main` als subgrid in beide richtingen.
  Die werkt, maar de `main` ligt dan onder de zijbalk, en een lange inleiding loopt over de hele pagina.
  Of de inleiding naast de `main` in `Page.Body`; dan staan de `h1` en de inleiding buiten de landmarks.
  Of `Page.Body` als de `main`; dan staat de `aside` in de `main`.
  Of een onderdeel `Page.Intro`, met een tweede onderdeel om de cellen; dan schrijft elke pagina die twee zelf.
  Of een vaste marge boven de zijbalk; die klopt niet meer bij een langere inleiding of als je inzoomt.

### We tonen de schermnaam van de laatste reageerder, als gewone tekst

- **Datum:** 23 oktober 2026
- **Besluit:** het blok toont de schermnaam van de laatste reageerder, zonder avatar en zonder link naar een profiel.
  De importer bewaart alleen de naam bij de vier discussies in het blok en vervangt ze bij elke run.
- **Waarom:** een gast ziet die naam al op het forum, en het blok laat de bezoeker zien dat er gepraat wordt.
  Door de lijst bij elke run te vervangen, houden we geen geschiedenis van namen bij, en verdwijnt een naam binnen een kwartier nadat het forum hem weghaalt.
- **Alternatieven:** geen naam tonen, alleen de reacties en de tijd.

### Ons eigen forum is een bron met eigen regels

- **Datum:** 23 oktober 2026
- **Besluit:** het forum staat in het bronnenregister als bron van het soort forum, "sc Heerenveen Forum", en dus op Onze bronnen.
  In het hoofdstuk Redactie staat wat we ervan tonen: de titel, de link, het aantal reacties, de schermnaam van de laatste reageerder en de tijd.
  De tekst van een bericht tonen we niet; citaten komen met #108.
- **Waarom:** het forum is van onze eigen gemeenschap, geen werk van journalisten, dus de regels over intro's en foto's passen er niet op.
  Een bezoeker kan wel zien waar het blok vandaan komt, en de reviewer heeft een regel om aan te toetsen.
- **Alternatieven:** het forum niet in het register zetten en het blok vastleggen in de code; dan staat nergens wat we ervan tonen.
  Of het forum niet op Onze bronnen tonen; dat vraagt een extra schakelaar in het register en op de pagina.

### De link van een discussie gaat naar het laatste bericht

- **Datum:** 24 oktober 2026
- **Besluit:** de titel in het blok linkt naar het laatste bericht van de discussie, zoals `https://forum.heerenveen.org/d/2859-<titel>/9`.
  De importer bewaart het adres met het nummer van het laatste bericht erin.
- **Waarom:** de regel zegt wie het laatst reageerde en wanneer, en de link brengt de bezoeker bij dat bericht.
  Het forum zelf opent een discussie bij het eerste ongelezen bericht, maar dat weet het alleen in de browser van een ingelogd lid, en onze pagina vraagt het forum niets (principe 3).
  Het forum is nog rustig, dus een bezoeker slaat niet veel ongelezen berichten over, en kan terugscrollen.
- **Hoe:** het nummer is het attribuut `lastPostNumber` van de API.
  Het is hoger dan het aantal berichten als er een bericht is verwijderd, dus de importer telt het niet zelf.
  Heeft het antwoord geen bruikbaar nummer, dan linkt het adres naar de discussie zelf.
  Het adres verandert nu met elk nieuw bericht, dus de import herkent een discussie aan het id en niet aan het adres.
- **Alternatieven:** naar het begin van de discussie linken, zoals eerst.
  Of het forum laten kiezen: een extensie of instelling op het forum die ingelogde leden bij het eerste ongelezen bericht laat beginnen, voor elke link naar het forum.

### De tijd van een discussie: vandaag alleen de tijd, daarna de dag, na een week de datum

- **Datum:** 24 oktober 2026
- **Besluit:** van een discussie van vandaag staat alleen de tijd, zoals "13:28".
  Van de zes dagen daarvoor staan de korte dag en de tijd, zoals bij het nieuws: "wo 14:05".
  Wat ouder is, krijgt de datum: "16 okt", en met het jaar erbij als het een ander jaar is.
  Zonder schermnaam staat er "83 reacties · laatst 13:28".
- **Waarom:** in een smalle zijbalk past weinig, en de tijd alleen is genoeg voor wat van vandaag is.
  Dezelfde week als bij het nieuws houdt de site voorspelbaar, en een weekdag zou na een week voor een andere dag kunnen staan.
  "laatst" laat de tijd ook zonder schermnaam zeggen waarvan hij is.
- **Alternatieven:** altijd dag en tijd; dat is drukker en zegt over vandaag minder.
  Of een relatieve tijd, zoals "2 uur geleden"; die klopt niet meer in een pagina uit de cache en een schermlezer leest hem minder gemakkelijk.
- **Later:** de homepage toont nu twee weken nieuws, maar de weekdag staat bij het nieuws nog voor dezelfde zeven dagen als hier.
  Zie _De tijd van een bericht: een weekdag in de week, daarna de datum_.
  De tijd van een discussie verandert niet.

### De homepage toont het nieuws van twee weken

- **Datum:** 24 oktober 2026
- **Besluit:** de homepage toont alle berichten van vandaag en de dertien dagen ervoor, in Nederlandse tijd, het nieuwste eerst, zonder maximum, in één lijst.
- **Waarom:** met een paar bronnen komen er per week weinig berichten bij, en een bezoeker die een paar dagen niet keek, ziet zo meer.
  Wachten op het archief (#26) laat de homepage tot Release 2 bij een week.
- **Alternatieven:** een week houden en een pagina met meer nieuws bouwen (#26); dat is groter en komt later.
  Of een vast aantal, zoals de nieuwste 20 of 50, wat we eerder al afwezen.
- **Later:** zie _De homepage toont het nieuws van de afgelopen week, per dag_ en _Het nieuws staat in één lijst, met dag en tijd in een eigen kolom_; van die twee blijft de lijst en vervalt de week.

### De tijd van een bericht: een weekdag in de week, daarna de datum

- **Datum:** 24 oktober 2026
- **Besluit:** van een bericht van vandaag en de zes dagen ervoor staan de korte dag en de tijd ("wo 14:05"); van een ouder bericht de datum en de tijd ("14 okt 14:05").
- **Waarom:** een weekdag is alleen duidelijk binnen zeven dagen; bij veertien dagen kan "wo" twee verschillende woensdagen zijn.
  De datum voor wat ouder is, houdt de regel van de discussies in de zijbalk aan (daar staat "16 okt" na een week).
  Dag en tijd blijven kloppen in een pagina uit de cache.
- **Alternatieven:** op elke regel de datum en de tijd; dat is altijd duidelijk, maar langer, en de weekdag helpt bij recent nieuws.
  Of de weekdag voor alles; dat is dubbelzinnig vanaf de achtste dag.
- **Hoe:** `news.ts` kent twee vensters: `windowStart` voor de twee weken van de homepage en `weekdayStart` voor de zeven dagen met een weekdag.
  De tijd van een discussie gebruikt `weekdayStart`, dus die regel verandert niet.

### Een datum in een nieuwsregel breekt in de kolom van de weekdag

- **Datum:** 24 oktober 2026
- **Besluit:** de kolom met de dag of de datum en de tijd blijft 4 rem breed.
  Een datum met een tijd, zoals "14 okt 14:05", past niet naast elkaar in die kolom: de tijd komt op een tweede regel, onder de datum.
- **Waarom:** een kolom die breed genoeg is voor "28 mei 20:08" (87 pixels op de maat van Meta) geeft de weekdagen veel lucht naast de kop, terwijl de meeste regels een weekdag hebben.
  Nu beginnen de koppen op elke regel op dezelfde plek, ook als de ene regel een weekdag heeft en de andere een datum, en het breken gaat vanzelf, zonder extra opmaak in de tekst.
- **Hoe:** in `news-item.css` is `grid-template-columns` nu `4rem minmax(0, 1fr)`, en de tijd heeft geen `white-space: nowrap` meer.
  Een breder lettertype of de tekstafstand van WCAG 1.4.12 kan nu ook "ma 20:08" over twee regels verdelen; de koppen blijven dan wel op één plek beginnen.
- **Alternatieven:** een bredere kolom, 5,75 rem, voor de breedste datum op één regel; dat kost elke weekdagregel ruimte.
  Of de kolom door de inhoud laten bepalen (`max-content`); dan beginnen de koppen niet op dezelfde plek.
  Of de datum en de tijd los doorgeven en onder elkaar zetten in het component; dat is een grotere wijziging van het component.

### Onder de kop van een kaart staat een lijst op 1,25 rem

- **Datum:** 24 oktober 2026
- **Besluit:** staat er in een kaart direct onder de kop een lijst (`ul`, `ol` of `dl`), dan is de ruimte tussen de kop en de lijst 1,25 rem in plaats van de 0,75 rem onder een kop.
  Dat geldt voor elke kaart met dit patroon: het nieuws en de discussies op de homepage, de bronnen op Onze bronnen en de stories.
- **Waarom:** de regels van een lijst zijn zelf blokken met een eigen witruimte, en met de ruimte van een alinea zit de eerste regel te dicht tegen de kop.
  De projecteigenaar vroeg om meer ruimte.
- **Hoe:** één regel in `card.css`, op de kop gevolgd door een lijst direct in de kaart.
  De marges van kop en lijst vallen samen, dus de grootste telt.
  Tekst onder een kop houdt de ruimte van een kop.
- **Alternatieven:** de ruimte onder elke kop groter maken; dat verandert ook tekst en pagina's zonder kaart.
  Of de ruimte in elke lijst of op elke pagina zelf zetten; dat laat het patroon uit elkaar lopen.

### De site is installeerbaar, zonder service worker

- **Datum:** 24 oktober 2026
- **Besluit:** de site krijgt een favicon en een manifest, zodat hij als app te installeren is.
  Er komt geen service worker, dus geen offline gebruik en geen pushmeldingen.
- **Waarom:** het icoon op het beginscherm en een eigen venster kosten weinig, en er is geen risico op pagina's die in de cache verouderen.
  Bij een nieuwsverzamelaar zonder de artikelen zelf is offline lezen van koppen weinig waard.
  Pushmeldingen vragen een sleutel, het bewaren van abonnementen (persoonsgegevens) en sturen elk bericht via de pushdienst van Google, Apple of Mozilla.
  Dat past niet bij "we laten bezoekers met rust".
- **Alternatieven:** een service worker die de homepage bewaart voor offline gebruik; daarover besluiten we later.
  Of pushmeldingen; die doen we niet.

### Het icoon is het logo zelf, transparant, en op donkerblauw waar het moet

- **Datum:** 24 oktober 2026
- **Besluit:** de bron van het icoon is het logo, `logo.svg`, zonder aanpassing: het schild met het pompeblêd van het logo, op een transparante achtergrond.
  Voor de iPhone en voor het afgesneden icoon van Android staat het schild op een vlak van het donkere blauw van de kop.
- **Waarom:** de projecteigenaar wil dat de iconen precies lijken op het logo.
  Een eigen tekening met een groter pompeblêd, die we eerst maakten, vond hij te groot en misvormd.
  Een iPhone vult een transparant icoon met zwart, en een afgesneden icoon van Android heeft een vlak nodig; de witte rand van het schild is gemaakt voor een donkere achtergrond, dus het blauw past.
  Eén icoon voor licht en donker volstaat door de witte en de blauwe rand.
- **Alternatieven:** een eigen tekening voor kleine formaten, met een groter pompeblêd dat op 16 pixels herkenbaar blijft.
  Die hadden we gebouwd en is laten vallen.
  Of een wit vlak; dan verdwijnt de witte rand van het schild.
  Of overal transparant; dan hangt de kleur af van de telefoon.
- **Hoe:** `pnpm --filter site icons` maakt de bestanden in `apps/site/public` met het Chromium van Playwright: `icon.svg` (een kopie van het logo), `favicon.ico` met PNG's van 16, 32 en 48 pixels, `icon-192.png` en `icon-512.png` (transparant), `apple-touch-icon.png` (180 bij 180) en `icon-maskable-512.png`.
  Op het vlak is het logo 88% van de breedte, dus het schild 76% van de hoogte: het afgesneden icoon van Android houdt zijn inhoud binnen een cirkel van 80% van de breedte, en de hoeken van het schild liggen het verst van het midden.
  De bestanden staan in de repository, zoals de afbeelding bij het delen van links.

### Het donkerblauw van het icoon en het manifest komt uit het token van de kop

- **Datum:** 24 oktober 2026
- **Besluit:** het vlak van de iconen, `theme_color` en `background_color` van het manifest zijn de lichte waarde van `--hf-colour-background-header`.
  De `theme-color` van de pagina volgt de kop in licht en in donker: `blue-900` en `blue-800`.
  Een test controleert dat het manifest en de PNG's op het vlak dezelfde waarde hebben als het token.
- **Waarom:** een manifest en een PNG kennen geen CSS-variabelen, en een tweede kopie van de kleur loopt vroeg of laat uit de pas met de kop.
  Het manifest heeft één `theme_color`, dus daar staat de waarde van de kop in licht; een telefoon met een donker thema kleurt zijn balk met de `theme-color` van de pagina.
- **Alternatieven:** de kleur overnemen in het manifest en in het script, met een test die ze vergelijkt; dat zijn drie kopieën.
  Of de CSS als tekst in de code zetten, zoals `CHANGELOG.md`: Turbopack geeft dat voor CSS-bestanden een foutmelding.
- **Hoe:** `next.config.ts` leest `colour.css` bij de bouw (`src/header-colour.ts` zoekt de rol en de twee schalen) en zet de twee kleuren in de code met `env`, want de server heeft dat bestand niet.
  Het script voor de iconen en `vitest.config.ts` lezen hetzelfde bestand op dezelfde manier.

### Alleen koppen laten zien dat je ze al hebt geopend

- **Datum:** 24 oktober 2026
- **Besluit:** alleen de kop van een nieuwsbericht en de titel van een discussie krijgen het grijs voor bezocht.
  Elke andere link ziet er bezocht hetzelfde uit als onbezocht.
- **Waarom:** de berichten en de discussies veranderen de hele dag, en een bezoeker wil zien wat hij al heeft geopend.
  Links naar vaste pagina's, zoals "Naar het forum", "Alle podcasts", het menu en de links in tekst, gaan naar pagina's die je vaker bezoekt, en "je was hier al" zegt daar weinig.
  Een link blijft verschillen van lopende tekst door de onderstreping.
- **Alternatieven:** het grijs voor alle links laten staan, zoals nu.
  Of alleen de kop van een nieuwsbericht; dan krijgen de titels in "Nieuwste discussies" het niet.
- **Hoe:** `link.css` zet geen kleur meer voor `:visited`.
  `news-item.css` en `discussion-item.css` zetten die wel, als `&:visited:not(:hover)`.
  Die regel staat in de laag voor componenten en wint daarmee van de hover in de basisstijl, dus de `:not(:hover)` laat de kop onder de muis de kleur voor hover houden, ook als hij bezocht is.
  De overschrijvingen van het token in `page.css` (de header en de footer) zijn weg.
  Het token `--hf-colour-text-link-visited` blijft, met een nieuwe omschrijving.
  Titels van podcastafleveringen krijgen het grijs bij hun eigen component, zodra dat er is.

### Onze bronnen staat in de footer, als Bronnen

- **Datum:** 24 oktober 2026
- **Besluit:** de link naar `/bronnen` staat niet meer in het hoofdmenu maar in de footer, tussen Over ons en Privacy, met de tekst "Bronnen".
  De pagina zelf blijft Onze bronnen heten, in de kop, de titel en de link op de homepage.
  Dit past de beslissing _Het hoofdmenu begint met Nieuws, en de huidige pagina krijgt een rode streep_ aan, die Onze bronnen in het hoofdmenu zette.
- **Waarom:** het hoofdmenu houdt de inhoud over, Nieuws en het Forum.
  Bronnen hoort bij wat de site over zichzelf zegt, net als Over ons en Privacy.
  In de footer past het korte woord beter naast de andere links; de pagina zegt zelf "Onze bronnen".
- **Alternatieven:** "Onze bronnen" ook in de footer, zodat de link en de kop hetzelfde heten.
  Of Bronnen in beide menu's.
- **Let op:** de footer markeert de huidige pagina niet, dus op `/bronnen` heeft geen enkele link in een menu de streep van de huidige pagina.

### De links in de footer zijn blauw, zoals de andere links

- **Datum:** 24 oktober 2026
- **Besluit:** de links in de footer hebben de kleur van gewone links: `blue-700` in licht en `blue-300` in donker, en onder de muis `blue-800` en `blue-200`.
  Dit vervangt het donkere zand van de links uit _De footer staat op een eigen vlak, met links in donker zand_; het vlak, de lijn en de indeling blijven.
- **Waarom:** de footer valt zo minder uit de toon.
  Een link heeft overal op de site dezelfde kleur, dus een bezoeker herkent hem zonder erbij na te denken.
  De blauwe links halen het contrast ook op het vlak van de footer: de link 7,02:1 in licht en 7,90:1 in donker, onder de muis 9,34:1 en 10,65:1.
  De focusrand blijft 3,52:1 in licht en 7,90:1 in donker.
- **Alternatieven:** het donkere zand houden; dat is rustiger, maar het geeft de site een tweede linkkleur.
- **Hoe:** de tokens `--hf-colour-text-link-on-footer` en `--hf-colour-text-link-hover-on-footer` zijn weg, en `page.css` zet de kleuren van links in de footer niet meer.
  De footer erft `--hf-colour-text-link` en `--hf-colour-text-link-hover`.
  De contrasttabel bij Tokens › Kleur toetst die twee op het vlak van de footer.
  De stap `sand-700` blijft in de reeks, ook al gebruikt nu niets hem.
  Een bezochte link ziet er in de footer hetzelfde uit als een andere, zoals overal behalve bij koppen en discussietitels.

### De pagina Wat is er nieuw heet Updates, op `/updates`

- **Datum:** 24 oktober 2026
- **Besluit:** de pagina Wat is er nieuw heet Updates, in de kop, de titel, de link in de footer en de titel van de feed.
  Het adres wordt `/updates` en dat van de feed `/updates/feed.xml`.
  `next.config.ts` verwijst `/wat-is-er-nieuw` en `/wat-is-er-nieuw/feed.xml` blijvend door (308) naar de nieuwe adressen.
  In de code heet het onderdeel nu ook `updates`.
- **Waarom:** de projecteigenaar wil de kortere naam.
  Een adres dat bij de naam past, is makkelijker te onthouden en te delen.
  De site is nog jong, dus een doorverwijzing kost weinig en geen oude link of feedlezer breekt.
- **Alternatieven:** alleen de naam veranderen en het adres laten staan; dan past het adres niet bij de naam.
  Of de oude adressen zonder doorverwijzing weghalen; dan breken links en feedlezers.
- **Let op:** de link van elke versie in de feed is ook de `guid`, en die verandert mee (`/updates#versie-0.1.0`).
  Een feedlezer die de oude feed volgt, kan de versies daarom één keer als nieuw tonen.
  De regel voor versie 0.1.0 in `release-notes.ts` noemt de pagina nu Updates.
  De oude naam blijft staan in de eerdere beslissingen hierboven en in de geschiedenis van `CHANGELOG.md`.

### Omlaag trekken ververst de pagina, alleen in de app op het beginscherm

- **Datum:** 24 oktober 2026
- **Besluit:** als de site draait als app op het beginscherm (`display-mode: standalone`, of `navigator.standalone` op een iPhone), laadt omlaag trekken bovenaan de pagina de pagina opnieuw (`location.reload()`).
  Een klein label bovenaan het scherm (`PullIndicator`) zegt "Trek omlaag om te verversen", dan "Loslaten om te verversen" na 80 pixels, en "Bezig met verversen" na het loslaten.
  `PullToRefresh` in het designsysteem doet het, en staat in de layout.
  In een browsertabblad en zonder JavaScript verandert er niets.
- **Waarom:** in een app op het beginscherm is er geen verversknop in de browser, en een iPhone kent daar ook geen pull to refresh.
  De bezoeker kon het nieuws dus niet verversen zonder de app te sluiten.
  In een tabblad heeft de browser een eigen knop, dus daar voegt het niets toe.
- **Alternatieven:** een verversknop die altijd zichtbaar is; dat verandert wat alle bezoekers zien.
  `router.refresh()` in plaats van een volledige herlading; dat voelt zachter, maar de bezoeker ziet dan niet of er iets gebeurt, en een herlading is zeker.
  Ook in een tabblad werken; daar botst het met de eigen verversing van Chrome en Safari.
- **Hoe:** de beweging is een touch-gebaar op `document` met alleen passieve luisteraars, dus de pagina scrolt en veert zoals altijd.
  Het begint niet als de pagina niet bovenaan staat, bij een tweede vinger, in een veld, in een element dat opzij scrolt of omlaag gescrold is (een brede tabel), en als de vinger eerst omhoog of opzij gaat.
  Touch-events zijn niet Baseline en worden dat niet (desktop-Safari heeft ze niet); pointer-events zijn het wel, maar een browser breekt die af (`pointercancel`) zodra hij gaat scrollen, en het trekken begint als scrollen.
  Daarom staat bovenaan `pullGesture.ts` een `eslint-disable` met die reden.
  In de app zet het component ook `overscroll-behavior-y: contain` op `html` (via het attribuut `data-pull-to-refresh`, binnen `@supports` omdat de eigenschap nog niet 'widely available' is).
  Chrome op Android heeft in een geïnstalleerde app een eigen pull to refresh; die gaat zo niet óók af.
  Zonder JavaScript zet niets dat attribuut, dus dan houdt de browser zijn eigen gedrag.
- **Toegankelijkheid:** het label is `aria-hidden`.
  Het is een hint voor een vinger op het scherm; een schermlezer ziet het gebaar niet, en leest de pagina die daarna laadt zelf voor.
  Met minder beweging komt het label niet omlaag: het blijft staan en verschijnt zodra loslaten ververst.
- **Een knop voor wie niet kan trekken:** in de app staat ook een knop "Pagina verversen" (`RefreshButton`), die hetzelfde doet als het gebaar.
  Een gebaar mag nooit de enige manier zijn (WCAG 2.1.1 en 2.5.1), en in de app is er geen verversknop van de browser.
  De knop komt als eerste in de volgorde van Tab, vóór de kop.
  Hij is onzichtbaar tot hij focus heeft, zoals een link om naar de inhoud te springen, en blijft voor een schermlezer te vinden.
  Met focus staat hij vast bovenaan het scherm, onder de statusbalk van de app.
  Dan heeft niets anders focus, dus hij bedekt geen element met focus (2.4.11).
  Hij staat alleen in de app: in een tabblad heeft de browser een eigen knop, en zonder JavaScript is er niets.
  De site heeft nog geen link om naar de inhoud te springen; als die komt, staat de knop erna.
  Dit was een open punt van de eerste versie; de projecteigenaar koos de knop boven een regel in de toegankelijkheidsverklaring.
  De verklaring zegt niets over verversen en blijft daarom zoals ze is.
- **Gecontroleerd en niet gecontroleerd:** in Chromium met de emulatie van een Pixel 7, met echte aanraakinvoer en toetsenbordinvoer, en de modus 'app' nagebootst.
  Niet op een iPhone, in de iOS Simulator of in een echte app op het beginscherm; of VoiceOver de knop als eerste leest, moet de projecteigenaar daar nakijken.

### De pagina gebruikt het hele scherm en houdt de inhoud uit de uitsparing

- **Datum:** 24 oktober 2026
- **Besluit:** de pagina zet `viewport-fit=cover` aan, en elke zijmarge van de header, de body en de footer is het grootste van de maat die er nu staat en de inset van het apparaat (`max()` met `env(safe-area-inset-…, 0px)`).
  De header krijgt bovenin minstens de inset bovenin en de footer onderin minstens de inset onderin.
  Daarmee lopen de header en de footer onder de uitsparingen door in een effen kleur, terwijl tekst en knoppen er naast staan.
  Op een iPhone op het beginscherm is de statusbalk doorzichtig (`black-translucent`), zodat de header eronder doorloopt.
  Een vaste strook in de kleur van de header, zo hoog als de inset bovenin, houdt de statusbalk donkerblauw als de pagina scrolt (de projecteigenaar wilde de statusbalk ook donkerblauw).
  De strook neemt geen aanraking aan, en `scroll-padding-block-start` op het html-element houdt een element met focus uit de strook (WCAG 2.4.11).
  Zonder inset heeft de strook geen hoogte, dus er is dan geen.
- **Waarom:** met een standaardpagina laat de browser een balk in de kleur van de pagina over bij een uitsparing, en dat ziet er onaf uit naast een header van rand tot rand.
  Bij `black-translucent` is de tekst van de statusbalk wit, en de header is in licht en donker donkerblauw, dus de tekst blijft leesbaar.
  Met alleen een doorzichtige statusbalk is hij alleen donkerblauw zolang de header erachter staat; scrolt de pagina, dan schuift lichte inhoud onder de witte tekst van de statusbalk.
  De waarden hebben een terugvalwaarde van 0, dus op schermen zonder uitsparing verandert er niets.
- **Alternatieven:** de pagina laten zoals hij is: een balk in de kleur van de pagina naast de header.
  Of de statusbalk op de standaardstijl laten (`default`); dan blijft de statusbalk een eigen balk boven de header.
  Of een afbeelding of een verloop achter de uitsparing; dat is meer werk en meer om te onderhouden dan een effen kleur.
- **Gecontroleerd en niet gecontroleerd:** in de iOS Simulator, in Safari, in staande en liggende stand.
  De statusbalk van een app op het beginscherm en de strook eronder laat de simulator niet zien, want Safari heeft bovenin geen inset; de projecteigenaar kijkt dat na op een echte telefoon.
