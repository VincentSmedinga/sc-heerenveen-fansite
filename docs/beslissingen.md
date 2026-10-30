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
- **Later:** zie _Axe draait op elke story, in licht en donker_.
  Zodra die controle draait, toetst axe ook de stories.
  Een verhaal met een visuele wijziging houdt zijn Reviewer, want axe ziet geen hover, focus, alt-teksten of de redactieregels.

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

### Screenshots staan op een eigen branch, niet in de repository

- **Datum:** 25 oktober 2026
- **Besluit:** de screenshots bij een pull request staan op de branch `pr-screenshots`, één map per pull request (`pr-<nummer>/`), en worden in de beschrijving ingesloten.
  De branch is een orphan-branch met alleen een `README.md` en die mappen, en wordt nooit samengevoegd of verwijderd.
  De Builder zet de plaatjes er zelf op, zonder tweede toestemming: dat is een uitzondering op het punt Go-ahead in `AGENTS.md`.
  Een wijziging die bezoekers zien, krijgt één tot drie screenshots; een wijziging die niemand ziet, zegt dat in de beschrijving.
- **Waarom:** GitHub kan vanaf de opdrachtregel geen plaatjes aan een beschrijving hangen, en een agent moet het zelf kunnen.
  Op `main` horen ze niet: elk plaatje zou de repository voor altijd groter maken en komt in het commitbericht van de squash.
  Een eigen branch laat de geschiedenis van `main` schoon en laat de plaatjes in de beschrijvingen werken.
- **Alternatieven:** de plaatjes in `docs/` of `apps/site`; die vervuilen `main`.
  Een commentaar waar de eigenaar de plaatjes zelf in sleept; dat is niet te automatiseren.
  Bijlagen van een workflow; die verlopen en staan niet in de beschrijving.

### Alleen verzonnen gegevens in een screenshot

- **Datum:** 25 oktober 2026
- **Besluit:** een screenshot toont de gebouwde site met de verzonnen testgegevens van de e2e-tests of een story, nooit een echte forumdiscussie, een schermnaam of gegevens van de hosting.
  `pnpm screenshots` neemt daarom alleen een build op deze computer aan.
- **Waarom:** de repository is openbaar, en een plaatje blijft staan, ook als de pull request gesloten wordt.
  Wat we niet openbaar maken, zetten we niet in een plaatje (_geen persoonsgegevens in code, tests, testgegevens of logs_).
- **Alternatieven:** echte koppen en discussies tonen; die zijn herkenbaarder, maar bevatten namen van leden en kunnen later aanleiding geven tot een verwijderverzoek.

### Licht is genoeg, donker alleen met een reden

- **Datum:** 25 oktober 2026
- **Besluit:** een screenshot is standaard licht.
  Donker komt erbij als de wijziging over het thema of de kleuren gaat, of als iets in donker te zien is wat in licht niet te zien is.
  Er komen geen kopieën van hetzelfde plaatje waar alleen het thema verschilt.
- **Waarom:** in de meeste wijzigingen, zoals een nieuwe pagina, een lijst of een knop, is het thema niet wat verandert.
  Een tweede plaatje vertelt de eigenaar dan niets en kost bytes in de repository voor altijd.
  Wie het donkere thema wil nakijken, kan dat in Storybook en met axe, die beide thema's controleren.
- **Alternatieven:** altijd licht en donker, zoals het andere project vaak doet; dat verdubbelt de plaatjes.
  Nooit donker; dan mist een wijziging aan het thema precies wat ze wil laten zien.

### Een telefoon en een smal bureaublad, zo klein als kan

- **Datum:** 25 oktober 2026
- **Besluit:** de standaardbreedtes zijn 390 pixels (telefoon) en 900 pixels (bureaublad), zonder dubbele resolutie, als PNG zonder overbodige gegevens.
  Mappen van samengevoegde pull requests blijven op `pr-screenshots` staan, want ze staan in de beschrijvingen van gesloten pull requests.
  Is de branch groter dan 100 MB, dan kijken we opnieuw.
- **Waarom:** een kleinere breedte bespaart bytes, en wat in 900 pixels past, past in elke breedte daarboven.
  Een tablet voegt voor een eerste blik weinig toe; wie de opbouw tussen telefoon en bureaublad wil zien, vraagt er een.
- **Alternatieven:** 1200 pixels voor een bureaublad, zoals eerst voorgesteld; dat is een derde groter in elke richting.
  Een tablet erbij.

### Een klein script in plaats van een wegwerptest per Builder

- **Datum:** 25 oktober 2026
- **Besluit:** `pnpm screenshots` maakt de plaatjes met de Playwright die er al staat, voor een lijst met paden of stories.
  Het start geen server en voegt geen dependency toe.
- **Waarom:** anders schrijft elke Builder zijn eigen wegwerptest, met elk eigen breedtes en bestandsnamen, en vergeet hij de breedte of kiest hij donker zonder reden.
- **Alternatieven:** alleen beschrijven in `AGENTS.md`, zoals het andere project; dat is minder code, maar elke Builder bedenkt de test opnieuw.

### Een laatste controle van de Builder vóór de eerste push

- **Datum:** 25 oktober 2026
- **Besluit:** `AGENTS.md` heeft een sectie _The final check_ voor de Builder, vlak voordat hij om de go-ahead vraagt.
  Elk punt is een opdracht of een blik van een minuut:
  - alles is gecommit;
  - elk acceptatiecriterium staat naast de diff;
  - de tekst die de wijziging verving, is overal gezocht;
  - de rooktest is gedraaid;
  - de beslissingen en hun regels "Later" kloppen;
  - de beweringen in tekst en commentaar kloppen met de code;
  - nieuw gedrag heeft een test;
  - de toegankelijkheid is nagelopen;
  - twee zoekopdrachten vinden te brede commentaarregels en twee zinnen op één regel.

  `CONTRIBUTING.md` zet de rooktest bij _De controles_.
  CI draait hem, en `pnpm test` niet.
  Voor de breedte van commentaar in JavaScript en TypeScript komt een ESLint-regel in een eigen pull request.
  De zoekopdracht blijft voor CSS.

- **Waarom:** de reviewer schreef 87 verslagen over de pull requests #103 tot en met #241.
  Daarin staan 123 bevindingen.
  16 van de 68 eerste verslagen hadden er geen.
  Het meeste is klein en komt steeds terug:
  - tekst of een beslissing die na de wijziging niet meer klopt: 46 keer;
  - een wijziging die afwijkt van het issue zonder dat het issue is bijgewerkt: 14 keer, waarvan 7 Blokkerend;
  - een rooktest of testlijst die niet is aangepast: 11 keer, waarvan 4 Blokkerend en rood in CI;
  - Nederlands dat niet loopt, of twee zinnen op één regel: 13 keer;
  - commentaarregels die ruim breder zijn dan 120 tekens: 6 keer.

  De rooktest stond niet bij _De controles_, dus de Builder draaide hem niet.
  De eerste zoekopdracht vindt de te brede regels in alle zes de pull requests waar de reviewer ze vond (#166, #184, #198, #210, #238 en #240).
  De tweede vindt de twee regels met twee zinnen van #150.
  De zin met een komma van #210 vindt ze niet; die blijft aan de Builder en de reviewer.

- **Alternatieven:** alleen een ESLint-regel (`max-len`) voor de breedte van commentaar; die ziet CSS niet, en op 120 tekens vindt hij 317 regels in de code van nu.
  Een eigen script dat de diff controleert; dat is code om te onderhouden voor iets wat twee regels doen.
  Niets doen en de reviewer deze dingen laten melden; dat kost een reviewronde per pull request, en de limiet is twee.

### Skills voor de stappen van de rollen, regels blijven in AGENTS.md

- **Datum:** 26 oktober 2026
- **Besluit:** skills in `.claude/skills/` leggen de volgorde van de stappen vast.
  Voor de Builder: `builder-workflow` voor elk issue, `review-pr` voor de reviewer na het openen van de pull request, `add-source` voor een nieuwe bron, `pr-screenshots`, `write-story` voor een component met zijn stories en `record-decision`.
  Voor de Coordinator: `specify`, `weekly-coordination` en `release-notes`.
  `write-dutch` is voor iedereen die openbare tekst schrijft.
  Een skill verwijst naar `AGENTS.md` en `CONTRIBUTING.md` en herhaalt hun regels niet; hij voegt de stappen toe die eerder werden overgeslagen.
  De regels zelf blijven in die twee bestanden.
- **Waarom:** acht pull requests voegden een bron toe en raakten steeds dezelfde bestanden.
  Elke Builder moest de lijst opnieuw samenstellen uit de bronnenlijst, de README van de importer en de beslissingen.
  De stappen rond het openen van een pull request stonden verspreid over `AGENTS.md`, het sjabloon en de geheugens van de projecteigenaar, en Builders sloegen ze over: de vakjes in het issue, het openen als de GitHub-app en het plaatsen van het verslag van de reviewer vóór de verbeteringen.
  Een skill laadt alleen als hij nodig is, zodat `AGENTS.md` niet langer wordt.
- **Nadeel:** een stap staat nu in een skill en de regel erachter in `AGENTS.md`, en ze kunnen uit elkaar lopen.
  Wie een regel wijzigt, zoekt daarom ook in `.claude/skills/`.
- **Alternatieven:** alles in `AGENTS.md` laten staan; dat wordt een lang bestand dat elke sessie leest, ook als de Builder het niet nodig heeft.
  Of de stappen in de briefing van de Coordinator zetten; die moet ze dan elke keer opnieuw schrijven en vergeet er een.

### CI slaat de controles van de site over bij wijzigingen die ze niet raken

- **Datum:** 26 oktober 2026
- **Besluit:** bij een pull request die alleen `docs/`, `.claude/`, `AGENTS.md`, `CONTRIBUTING.md`, `README.md`, `apps/importer/` of `apps/design-system-mcp/` wijzigt, slaat CI de rooktest en de toegankelijkheidscontrole (de e2e-tests) over.
  Alles anders draait alles, en `main` draait altijd alles.
  Het script `scripts/ci-changes.js` beslist, en het log zegt in een regel wat en waarom.
  De regels, van de veiligste naar de ruimste:
  - Alleen een pull request kan overslaan.
    Een push naar `main` en een handmatige run draaien alles.
  - Een pull request met het label `volledige controle` draait alles.
  - Zijn de gewijzigde bestanden niet te bepalen, of zijn er geen, dan draait alles.
  - Overslaan mag alleen als elk gewijzigd bestand in de lijst hierboven staat.
    Een bestand dat het script niet kent, draait alles.
  - Een `package.json` of een `tsconfig`, ook binnen die mappen, draait alles.
    Een dependency of een compileroptie verandert wat de site bouwt.
- **Waarom:** de twee controles kosten ongeveer 150 van de 268 seconden van de opdracht en raken zulke wijzigingen niet.
  Van de laatste 60 samengevoegde pull requests (26 oktober 2026) sloeg het script er 9 over: #326, #322, #319, #275, #273, #268, #242, #237 en #217.
  Dat is 15%, gemiddeld ongeveer 25 seconden per pull request, en 2,5 minuut voor wie in die 15% zit.
  De winst zit vooral in een reeks kleine wijzigingen achter elkaar.
  Een standaard die alles draait, houdt de kans op een gemiste fout klein: wat het script niet kent, draait mee.
  Lint, typecheck, `pnpm test` (ook de tests van de importer en de pakketten), de build en de controle van de titel draaien altijd.
- **Importer:** `apps/importer/` is de enige map in de lijst die de site raakt, want `assemble` bundelt de importer in de map voor de host.
  De test van die bundel staat in de tests van de importer (`bundle.test.ts`), die `pnpm test` altijd draait.
  De workflow van de acceptatie draait de bundel bij elke samenvoeging naar `main`.
- **Hoe:** de stap `Decide which checks of the site and the stories to run` zet `site=true` of `site=false` in de uitvoer.
  De twee stappen hebben `if: steps.changes.outputs.site != 'false'`, dus een uitvoer die ontbreekt draait ze ook.
  We hebben het label gekozen en niet een regel in de beschrijving: je ziet het op de pull request en je zet het zonder de beschrijving te wijzigen.
  Het script vraagt de labels bij elke run aan GitHub, dus een label dat na het openen is gezet, telt bij een nieuwe run van de opdracht.
- **Let op:** de opdracht "Lint, typecheck, test and build" blijft één opdracht die altijd meldt.
  Een stap die met `if` wordt overgeslagen, telt voor de regels van `main` als geslaagd.
  Een `paths`-filter op de workflow start de opdracht niet, en een vereiste controle die nooit meldt blokkeert het samenvoegen.
- **Alternatieven:** per spec of per pagina kiezen; bijna elke wijziging raakt gedeelde code, dus de winst is klein en de regels zijn veel.
  Kiezen op grond van de dekking van elke test; dat kan, maar het is zwaar en broos.
  Een `paths`-filter; dat blokkeert het samenvoegen.
  Niets doen; elke documentatiewijziging wacht dan ruim vier minuten.

### CI toetst de stories alleen bij wijzigingen die ze raken

- **Datum:** 27 oktober 2026
- **Besluit:** de stap `pnpm test:stories` in CI (zie _Axe draait op elke story, in licht en donker_) draait bij een pull request alleen als een gewijzigd bestand in `packages/design-system/` staat, of `pnpm-lock.yaml`, `pnpm-workspace.yaml` of `.github/workflows/ci.yml` is.
  Een push naar `main`, een handmatige run, het label `volledige controle`, een lege of onbekende lijst en een pad dat we niet vertrouwen draaien hem altijd.
  Het script `scripts/ci-changes.js` beslist, naast de controles van de site, en het log zegt er een eigen regel over.
  De regels van _CI slaat de controles van de site over bij wijzigingen die ze niet raken_ gelden voor de site en veranderen niet.
- **Waarom:** de stories staan in het designsysteem en hangen af van de versies van Storybook, Vitest, axe en de browser.
  Een wijziging in `apps/site/` of `docs/` raakt ze niet, en de stap kost lokaal ongeveer 16 seconden en in CI 44 seconden (pull request #357).
  Het lockfile en de workflow staan erbij, omdat een nieuwe versie of een gewijzigde stap de controle zelf verandert.
- **Chrome:** de controle gebruikt in CI het Google Chrome van de runner (`channel: 'chrome'`) en lokaal het Chromium van Playwright, zoals de controle van de site.
  Zo hoeft CI geen browser te installeren.
- **Alternatieven:** de stap altijd draaien (eenvoudiger, maar elke pull request betaalt ervoor); de regel van de site hergebruiken (dan draait hij ook bij elke wijziging in de site, die de stories niet raakt).

### Issue-formulieren in YAML, met drie soorten en zonder lege issues

- **Datum:** 26 oktober 2026
- **Besluit:** de repository krijgt drie issue-formulieren in YAML, in `.github/ISSUE_TEMPLATE/`: een fout melden, een idee voorstellen en een bron voorstellen.
  Lege issues staan uit.
  Vragen gaan naar het forum.
  Een beveiligingsprobleem moet naar de privé-melding van GitHub, zodra de projecteigenaar "Private vulnerability reporting" aanzet; tot dan verwijst `config.yml` er niet naar.
- **Waarom:** een formulier vraagt wat we nodig hebben en laat verplichte velden niet leeg, wat een Markdown-sjabloon niet doet.
  Een supporter die GitHub niet kent, weet dan wat er verwacht wordt.
  Een lege optie laat de formulieren omzeilen.
- **Alternatieven:** sjablonen in Markdown (eenvoudiger, maar niets is verplicht en ze vullen zich met gedeeltelijke teksten).
  Een lege optie laten staan voor de Coordinator; de Coordinator maakt issues met `gh`, dus daar is geen web-optie voor nodig.

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
- **Later:** de back-up vóór een migratie op productie hoort sinds 26 oktober 2026 bij #347; zie _De dump bewaart 14 dagen, laat de nieuwste altijd staan, en laat tabellen zonder blijvende gegevens leeg_ en _Back-ups zijn een dagelijkse dump op de host, 14 dagen bewaard, en een terugzetting die we één keer echt testen_.
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
- **Later:** de testbronnen staan sinds 26 oktober 2026 alleen nog lokaal en in de tests; zie _Testbronnen alleen lokaal; acceptatie en productie hebben alleen echte bronnen_.

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

### Storybook staat op ds.heerenveen.org

- **Datum:** 25 oktober 2026
- **Besluit:** Storybook staat op ds.heerenveen.org op de hosting van mijn.host, en niet meer op GitHub Pages.
  De workflow `storybook.yml` zet het neer met rsync over SSH, zoals `acceptance.yml` de site neerzet, met een eigen omgeving in GitHub (`designsystem`) en eigen geheimen.
  `docs/designsysteem-publiceren.md` zegt wat de eigenaar eenmalig instelt.
- **Waarom:** één plek en één adres voor het designsysteem, ook voor de MCP-server die er in een volgend issue bij komt.
  GitHub Pages kan alleen bestanden tonen, dus daar kan geen `/mcp` op hetzelfde adres.
  We deployen al over SSH, dus er komt geen nieuw soort werk bij.
- **Alternatieven:** GitHub Pages met ds.heerenveen.org als eigen domein (geen werk op de host, maar de MCP-server moet dan op een ander adres); Chromatic (een derde partij die onze bestanden bewaart, en kosten).

### Storybook wordt alleen neergezet als een samenvoeging Storybook wijzigt

- **Datum:** 25 oktober 2026
- **Besluit:** Storybook wordt alleen opnieuw neergezet als een samenvoeging bestanden raakt waar Storybook uit bestaat: iets in `packages/design-system/`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` of de workflow zelf.
  Met de hand starten (`workflow_dispatch`) zet het altijd neer.
- **Waarom:** een wijziging aan de site of aan documentatie in `docs/` verandert Storybook niet.
  Zo blijft de host rustig en laat een run in GitHub zien wat er echt veranderde.
- **Hoe:** het filter `paths` staat alleen op de trigger `push`, niet op de hele workflow.
  Op de hele workflow zou het ook de build bij een pull request stoppen, en een regel voor `main` eist de taak `Build Storybook` bij elke pull request.
  Een push naar `main` die geen van de bestanden raakt, start de workflow niet.
- **Alternatieven:** na elke samenvoeging deployen (simpeler, maar elke run zet dezelfde bestanden neer).

### De deploy van Storybook kopieert de geteste build en weigert een verkeerd pad

- **Datum:** 25 oktober 2026
- **Besluit:** de taak `Build Storybook` bewaart de build als artifact `storybook`, en de taak die deployt kopieert dat artifact in plaats van opnieuw te bouwen.
  Die taak stopt (rood) als `DEPLOY_PATH` niet de document root van het subdomein is, een absoluut pad dat eindigt op `/domains/ds.heerenveen.org/public_html`.
  Ze stopt ook als de build leeg is of `index.json` of `manifests/components.json` mist.
  rsync laat `.well-known/`, `.htaccess` en `cgi-bin/` van de host staan.
  Na het kopiëren moeten `https://ds.heerenveen.org/index.json` en `https://ds.heerenveen.org/manifests/components.json` met 200 antwoorden en hetzelfde zijn als in de build.
- **Waarom:** `rsync --delete` maakt de doelmap leeg.
  Een geheim met een verkeerd of leeg pad mag daarom nooit tot een kopie leiden.
  Wat live gaat, is precies wat de controle op `--lightningcss` goedkeurde.
  Het vergelijken met de build bewijst dat de nieuwe versie live staat, niet alleen dat er iets antwoordt.
- **Let op:** op de gedeelde hosting kan de sleutel van deze deploy niet tot één map beperkt worden zonder `rrsync` en een aangepast `authorized_keys`.
  De sleutel is wel eigen aan deze deploy en los in te trekken; de beperking is de controle van het pad hierboven.
- **Alternatieven:** de deploy opnieuw laten bouwen (twee builds die kunnen verschillen); alleen controleren of `index.json` antwoordt.

### De MCP-server van het designsysteem staat op ds.heerenveen.org/mcp

- **Datum:** 25 oktober 2026
- **Besluit:** de losse MCP-server `@storybook/mcp` staat openbaar en alleen-lezen op ds.heerenveen.org/mcp, naast de lokale server voor agents in deze repository.
  Hij geeft `docs-list`, `docs-show` en `docs-show-story` uit de gepubliceerde Storybook, en niets om te ontwikkelen of te testen.
  Een agent in een andere repository voegt hem toe met `claude mcp add --transport http ds https://ds.heerenveen.org/mcp`.
- **Waarom:** agents buiten deze repository en sessies zonder draaiende Storybook kunnen zo dezelfde documentatie raadplegen.
  Storybook zelf is al openbaar en de server geeft daar alleen de documentatie uit, dus er valt niets te beschermen en er is geen login nodig.
- **Let op:** Storybook noemt de manifests en deze server nog een voorbeeldversie ("preview"), en de API kan veranderen.
  De versie staat daarom vast op 10.6.3, die van Storybook zelf, en gaat pas omhoog als iemand dat bewust doet en de test van `apps/design-system-mcp` nog slaagt.
  De licentie is MIT, net als die van wat het pakket meebrengt (`tmcp`, `valibot`), en het pakket heeft geen installatiescript.
  Dat het pakket geen telemetrie stuurt en geen verzoeken naar derden doet, is gecontroleerd in de broncode: de enige `fetch` zit in de standaardbron voor manifests, en die gebruiken we niet (zie _De server leest de manifests van schijf_).
  Het veld `telemetry` in de antwoorden van de gereedschappen is gegevens die de aanroeper krijgt; het pakket stuurt ze nergens heen.
- **Alternatieven:** een token (meer code en een geheim om uit te delen); de MCP-server van Chromatic (een derde partij, met kosten); niets publiceren en agents buiten de repository laten werken zonder.

### De MCP-server is een eigen kleine app zonder sessies

- **Datum:** 25 oktober 2026
- **Besluit:** de server is `apps/design-system-mcp`, een Node.js-app met alleen het pad `/mcp`, die `esbuild` tot één bestand bundelt (`server.mjs`, zonder `node_modules`).
  Hij beantwoordt alleen `POST`, met een body van hoogstens 64 kB.
  Elk ander adres geeft `404 Not found`, elke andere methode `405`, en de server houdt geen sessie bij.
  Hij draait op de hosting als app in _Setup Node.js App_, in `domains/ds.heerenveen.org/mcp` met het pad `mcp` als adres.
  Dat de host een pad als adres toelaat, is niet uitgeprobeerd.
- **Waarom:** `@storybook/mcp` is een bibliotheek, dus we moeten er zelf een server omheen zetten.
  Een eigen app laat de statische bestanden van Storybook zoals ze zijn.
  De bibliotheek bewaart sessies in het geheugen van één proces en opent voor elke `GET` een stream.
  Een host die meer dan één proces kan starten, of er een herstart, breekt dan een client die een sessie vasthoudt.
  Een openbare server moet dat geheugen ook begrenzen: elke `initialize` laat iets achter, en elke `GET` houdt een verbinding open.
  Elk verzoek krijgt daarom een nieuwe handler, die weg is als het verzoek klaar is, en `GET` en `DELETE` worden geweigerd.
  De server geeft geen sessie-id en leest de sessie van een client niet.
  Het protocol staat dat toe.
  Een handler maken kost enkele milliseconden.
  De gereedschappen hebben geen stream of melding nodig.
  De test laat zien dat een tweede proces een client beantwoordt die op het eerste begon, met `initialize` op de een en `docs-list` op de ander.
- **Let op:** het logboek bevat alleen de start van de app en de naam van een fout, zonder adressen van bezoekers en zonder inhoud van verzoeken.
  De server zet geen cookies en geen CORS-headers: hij is voor agents, niet voor een pagina in een browser.
  Een limiet op het aantal verzoeken of een token valt buiten dit issue; komt er misbruik, dan volgt een nieuw issue.
- **Alternatieven:** de bibliotheek ongewijzigd gebruiken, met sessies in het geheugen (simpeler, maar breekt bij een tweede proces en laat geheugen volgroeien); de server op een eigen subdomein, als de host geen pad als adres toelaat; de app het hele subdomein laten beantwoorden en de statische bestanden zelf laten geven (een app die niets wijzigt aan Storybook is veiliger).

### De server leest de manifests van schijf

- **Datum:** 25 oktober 2026
- **Besluit:** de server leest `manifests/components.json`, `manifests/docs.json` en de bestanden waar die naar verwijzen uit de document root van het subdomein, bij elk verzoek opnieuw.
  Hij vindt die map zelf: `../public_html`, vanaf de map met `server.mjs`.
  Hij leest alleen `.json` onder `manifests/`, en `STORYBOOK_DIR` kan de map vervangen.
- **Waarom:** de standaardbron van de bibliotheek haalt de manifests op van het adres van het verzoek zelf.
  Een verzoek met een andere `Host` laat de server dan bij een andere host ophalen, en elk verzoek zou een verzoek van de server aan zichzelf kosten.
  Van schijf lezen kost niets, doet geen verzoek, en kan niet verouderen: rsync vervangt de bestanden, en het volgende verzoek leest de nieuwe.
  De map is `../public_html` omdat de workflow de app naast de document root zet, vanuit hetzelfde pad (`DEPLOY_PATH`), dus er is geen tweede pad dat gelijk moet blijven.
  Zonder cache is er niets dat langer duurt dan een deploy.
  Lezen en parsen van de manifests kost enkele milliseconden.
- **Alternatieven:** de manifests via HTTPS ophalen van `https://ds.heerenveen.org/manifests/…` (een verzoek aan zichzelf, en de server moet dan een vast adres kennen); een cache op de wijzigingstijd van de bestanden (sneller, maar meer code voor iets wat enkele milliseconden kost).

### De deploy van de MCP-server deelt de omgeving en het pad van Storybook

- **Datum:** 25 oktober 2026
- **Besluit:** dezelfde workflow, `storybook.yml`, deployt de app met dezelfde omgeving (`designsystem`), dezelfde geheimen en dezelfde sleutel.
  Het pad van de app is `DEPLOY_PATH` zonder `/public_html`, plus `/mcp`.
  De stap die kopieert controleert dat pad opnieuw: het moet eindigen op `/domains/ds.heerenveen.org/mcp`, zonder `..`, anders stopt de run.
  Het filter voor een push naar `main` krijgt `apps/design-system-mcp/**`.
  Na de kopie raakt de workflow `tmp/restart.txt` aan en voert `check.js` uit: `initialize`, de lijst met gereedschappen en `docs-list` op `https://ds.heerenveen.org/mcp`, tot anderhalve minuut lang.
  De run wordt rood als de server niet antwoordt, andere gereedschappen geeft dan de drie, of een component van de build mist.
- **Waarom:** de controle van `DEPLOY_PATH` blijft zo de enige poort naar de host, en er is geen tweede geheim dat verkeerd kan staan.
  De twee kopieën raken elkaars bestanden niet.
  Storybook gaat naar `public_html` en slaat `/mcp/` over; de app gaat naast `public_html`, en slaat `tmp/`, `stderr.log`, `.htaccess` en `node_modules` over, die van de host zijn.
  Dat de build de server al start tegen de Storybook die hij net maakte, voordat iets gekopieerd wordt, houdt een kapotte app van de host.
  De controle erna vergelijkt met de build van deze run, dus ze bewijst dat de nieuwe versie live staat.
- **Let op:** de eerste deploy wordt rood als de eigenaar de app in _Setup Node.js App_ nog niet maakte.
  `docs/designsysteem-publiceren.md` zet die stap daarom voor het samenvoegen.
- **Alternatieven:** een eigen workflow voor de app (twee workflows die elkaars bestanden kunnen raken, en twee omgevingen met dezelfde geheimen); een eigen geheim voor het pad van de app (een tweede pad om te controleren); de controle overslaan als de app er nog niet is (de run blijft dan groen terwijl er niets werkt).

### Storybook op ds.heerenveen.org krijgt `noindex`, en geen `robots.txt` die blokkeert

- **Datum:** 25 oktober 2026
- **Besluit:** Storybook op ds.heerenveen.org krijgt `<meta name="robots" content="noindex">` in `index.html` en `iframe.html`, via `managerHead` en `previewHead` in `.storybook/main.ts`.
  Er komt geen `robots.txt` die blokkeert.
  De taak `Build Storybook` controleert bij elke build dat beide bestanden de tag hebben.
- **Waarom:** de pagina's zijn voor bijdragers en agents.
  `noindex` houdt ze uit de zoekresultaten en laat het lezen toe, terwijl `Disallow` ook agents en gereedschap tegenhoudt die zich aan robots houden.
- **Alternatieven:** indexeerbaar laten, zoals nu (zonder nut en met een nietszeggende titel); een `robots.txt` met `Disallow: /` (blokkeert ook de gereedschappen die zich aan robots houden).

### Back-ups zijn een dagelijkse dump op de host, 14 dagen bewaard, en een terugzetting die we één keer echt testen

- **Datum:** 23 oktober 2026
- **Besluit:** een dagelijkse dump op de host, 14 dagen bewaard, plus één dump vlak voor elke deploy, en een terugzetting die we één keer echt testen.
  Geen kopie buiten de host.
  De projecteigenaar splitste het issue (#171) op 26 oktober 2026: de dagelijkse dump, het opruimen, de opdrachten voor een dump en het terugzetten, de documentatie en de proef lokaal kwamen eerst.
  De dump vlak voor het kopiëren in `acceptance.yml` en `production.yml` en de proef op de host van acceptatie volgen in #347, omdat de deploy van productie (#33) nog niet in `main` staat.
- **Waarom:** de gegevens zijn klein en voor het grootste deel opnieuw op te halen.
  Wat niet opnieuw te maken is (het register, later de verborgen berichten en accounts), is klein genoeg voor een dump.
  Een kopie elders vraagt een derde partij of werk van de eigenaar.
  Een dump beschermt tegen een fout in een migratie of een verkeerde actie, niet tegen het verlies van de host zelf.
- **Nadeel:** de dumps staan op dezelfde host als de database en delen de 10 GB met het forum.
  Een dump van een database van 100.000 koppen met een volledig logboek woog 4,1 MB, dus 14 dagen kosten ongeveer 58 MB (zie `docs/back-ups.md`).
- **Gevolg:** de back-up vóór een migratie op productie, die _De site draait de migraties als ze start_ en _De migratie van de versies kan opnieuw draaien, want MariaDB maakt DDL niet ongedaan_ noemen, komt met #347.
- **Alternatieven:** een kopie buiten de host; alleen de back-ups van mijn.host, die we niet kunnen testen.
  We bekijken het opnieuw als er accounts en berichten bijkomen.

### De dump is `mysqldump` met het wachtwoord in een optiebestand, in één bestand dat cron en de eigenaar draaien

- **Datum:** 26 oktober 2026
- **Besluit:** `packages/db/backup.mjs` is één bestand zonder `node_modules` dat `assemble` maakt, zoals de importer en `admin.mjs`.
  Het heeft twee opdrachten: `backup` (dump en opruimen) en `restore <bestand>`.
  Het start `mysqldump` en `mysql` van de host, en krijgt `DATABASE_URL` uit hetzelfde bestand als de importer, met `BACKUP_FOLDER` erbij.
  Het wachtwoord gaat in een optiebestand (`--defaults-extra-file`) met rechten voor alleen het account, in een eigen tijdelijke map die na afloop weggaat.
  Een dump op aanvraag is dezelfde opdracht `backup`, die met code 1 stopt als de dump mislukt.
- **Waarom:** `mysqldump` is het gereedschap dat MariaDB zelf voor een dump levert, en een dump die het niet maakt, zouden we moeten bewijzen.
  Zelf een dump schrijven (`SHOW CREATE TABLE` en `INSERT`-regels in Node) heeft geen programma op de host nodig, maar moet binaire waarden, tekensets, `foreign keys` en tijden zelf goed krijgen.
  Een opdrachtregel met het wachtwoord (`-p…`) laat het zien aan elk account op de host (`ps`).
  De omgevingsvariabele `MYSQL_PWD` staat bij de MySQL-clients als verouderd.
  Eén bestand voor beide opdrachten houdt het laden van de instellingen en het optiebestand op één plek, en een workflow roept het zonder pnpm aan.
- **Nadeel:** de host moet `mysqldump` en `mysql` hebben.
  Dat is niet bevestigd: `docs/back-ups.md` zegt hoe de eigenaar het controleert, en `MYSQLDUMP_COMMAND` en `MYSQL_COMMAND` wijzen naar een ander pad.
- **Alternatieven:** een dump in Node zelf schrijven; `MYSQL_PWD` of `-p` voor het wachtwoord; de dump aan de host overlaten met de back-up van mijn.host (die we niet kunnen testen); een eigen bestand met instellingen voor de back-up (een tweede plek voor het wachtwoord).

### De dump bewaart 14 dagen, laat de nieuwste altijd staan, en laat tabellen zonder blijvende gegevens leeg

- **Datum:** 26 oktober 2026
- **Besluit:** het opruimen rekent met de datum in de naam van het bestand (`<database>-<datum>T<tijd>Z.sql.gz`, in UTC) en niet met de datum van het bestand.
  - Het gebeurt na een dump die lukte, en een mislukte dump laat de oude dumps staan.
  - Het raakt alleen bestanden met de naam van deze database, dus andere bestanden en de dumps van een andere database blijven.
  - De nieuwste dump gaat nooit weg, ook niet als hij oud is.
  - De dump bevat van `visitor_salts`, `visitor_hashes`, `discussions`, `admin_sessions` en `admin_login_links` alleen de structuur, in een tweede aanroep van `mysqldump` met `--no-data`.
  - De opdracht weigert een map in `public_html` en een bestaande map die andere accounts kunnen lezen, en verandert de rechten van een bestaande map niet.
  - Een dump krijgt eerst de naam `….partial` en wordt pas na de controle op de regel `-- Dump completed` omgenoemd.
- **Waarom:** de naam blijft kloppen als iemand een bestand kopieert of aanraakt.
  Als cron stopt, mag het opruimen de laatste dump niet weghalen.
  Het zout en de kenmerken van de bezoekers van de dag gooit de site aan het eind van de dag weg (zie _We tellen paginaweergaven en unieke bezoekers per dag_); in de dumps zouden ze 14 dagen blijven, en met het zout zijn de kenmerken terug te rekenen naar adressen.
  De schermnaam bij een discussie vervangt de importer bij elke run (zie _We tonen de schermnaam van de laatste reageerder, als gewone tekst_), en een teruggezette sessie of inloglink zou een toegang herstellen die na de dump is ingetrokken.
  De importer vult de discussies binnen een kwartier opnieuw, en een sessie maak je door opnieuw in te loggen.
  Een map die we zelf niet maakten, zoals de thuismap, kan de site breken als we haar rechten wijzigen.
- **Alternatieven:** `--ignore-table-data`, dat alleen de `mysqldump` van MariaDB kent; alles dumpen en deze tabellen leeg laten bij het terugzetten (de gegevens zouden dan wel in het bestand staan); de rechten van een bestaande map zelf zetten.

### Een dump gaat alleen terug in een lege database

- **Datum:** 26 oktober 2026
- **Besluit:** `restore` weigert een database met tabellen, voordat hij iets schrijft, en meldt na afloop hoeveel tabellen er staan.
  De dump heeft geen `DROP TABLE` en geen `CREATE DATABASE` (`--skip-add-drop-table`, zonder `--databases`).
  Wie terugzet, maakt eerst een nieuwe lege database en wijst `DATABASE_URL` van de app daarheen.
- **Waarom:** terugzetten bovenop bestaande tabellen kan gegevens overschrijven of mengen zonder dat iemand het ziet.
  In een nieuwe database blijft de oude, kapotte staan om in te kijken.
  Zonder `CREATE DATABASE` kan de dump naar elke database, ook die met een andere naam van DirectAdmin.
- **Nadeel:** de eigenaar maakt een database en past `DATABASE_URL` op twee plekken aan (DirectAdmin en het bestand voor de import).
  Dat staat uitgeschreven in `docs/back-ups.md`.
- **Alternatieven:** de tabellen vooraf laten wegvallen (`DROP TABLE`, een fout met grote gevolgen); terugzetten in een niet-lege database met `--force` (kan half werk achterlaten).

### Een afgelopen seizoen wordt op acceptatie geïmporteerd met een workflow die je met de hand start

- **Datum:** 30 oktober 2026
- **Besluit:** een workflow `import-season.yml` draait `import.mjs --season <seizoen>` op de host, alleen met de hand gestart, met het seizoen als gecontroleerde invoer en dezelfde omgeving, geheimen en SSH-opzet als de deploy.
  - Het seizoen gaat door een reguliere expressie (`^[0-9]{4}/[0-9]{2}$`) voordat de workflow verbinding maakt, en gaat via een omgevingsvariabele naar de stappen en niet in de tekst van een opdracht.
  - De workflow draait de opdracht met de Node van cron (`/opt/alt/alt-nodejs24/root/usr/bin/node`) en het bestand met `DATABASE_URL` uit de thuismap (`~/fansite-acceptatie.env`).
  - Hij deelt de `concurrency`-groep `acceptance` met `acceptance.yml` en breekt geen draaiende run af, dus een import en een deploy draaien nooit tegelijk.
  - Zijn de geheimen er niet, dan slaat hij de import over met een melding en blijft hij groen.
- **Waarom:** een afgelopen seizoen wordt eenmalig gelezen, en over SSH met de hand is een fout met een pad of een bestand met variabelen snel gemaakt.
  Een workflow laat het logboek zien en laat niemand zijn sleutel gebruiken buiten GitHub.
- **Nadeel:** het pad van Node staat nu ook in de workflow, naast de cronjob.
  Verandert het, dan past de eigenaar het op twee plekken aan (`docs/acceptatieomgeving.md`, stap 9).
  GitHub houdt per `concurrency`-groep één wachtende run, dus een wachtende run kan door een nieuwere worden vervangen.
  Start je een import terwijl een deploy wacht, dan vervangt de import die deploy, en de samengevoegde wijziging komt dan niet op acceptatie: start de deploy dan opnieuw.
- **Alternatieven:** de opdracht met de hand over SSH draaien (kost elke keer de stappen en het pad).
  De seizoenen in de deploy meenemen (de deploy leest dan elke keer Wikipedia).
  Een tweede cronjob (leest een afgelopen seizoen steeds opnieuw, zonder reden).

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
- **Later:** de controles van de site worden sinds 26 oktober 2026 bij sommige pull requests overgeslagen; zie _CI slaat de controles van de site over bij wijzigingen die ze niet raken_.

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
- **Later:** de controles van de site worden sinds 26 oktober 2026 bij sommige pull requests overgeslagen; zie _CI slaat de controles van de site over bij wijzigingen die ze niet raken_.

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
- **Later:** zie _Axe draait op elke story, in licht en donker_.
  De controle van de pagina's van de site blijft, en de checklist van de reviewer ook.
  Alleen de stories toetst axe nu ook in CI.

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

### ESLint houdt commentaar op 96 tekens

- **Datum:** 25 oktober 2026
- **Besluit:** de regel `max-len` van ESLint staat aan voor commentaar in JavaScript en TypeScript, op 96 tekens per regel, met `ignoreUrls`.
  De inspringing en het teken voor commentaar tellen mee.
  Voor code zet hij de grens op 1000 tekens: Prettier breekt code af, en een regel in een tekst tussen aanhalingstekens blijft zoals hij is.
  De regel staat na `eslint-config-prettier`, want dat zet `max-len` uit.
  CSS valt erbuiten: stylelint heeft sinds versie 15 geen regel voor de breedte van een regel.
  De 1246 commentaarregels die er al boven zaten, in 250 bestanden, zijn afgebroken.
  Er is geen woord van het commentaar veranderd, behalve de reden achter twee `eslint-disable`-regels die korter moest.
- **Waarom:** Prettier breekt code af op 120 tekens en laat commentaar staan.
  De reviewer vond in zes pull requests commentaarregels van 130 tekens of breder.
  De projecteigenaar koos 96.
  Een deel van het commentaar brak al op die breedte af, zoals de uitleg bovenaan `pullGesture.ts`.
- **Alternatieven:** 125 tekens; dat laat het commentaar van nu bijna zoals het is (55 regels in 43 bestanden).
  120 tekens; dat past bij Prettier, maar vraagt 317 regels in 135 bestanden.
  `@stylistic/max-len`; dat is een nieuwe dependency voor een regel die ESLint zelf nog heeft.
- **Let op:** ESLint heeft `max-len` als verouderd gemarkeerd, en hij kan in een volgende hoofdversie verdwijnen.
  Dan kiezen we opnieuw.

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
  Zie ook _De acht voorlopige kleuren blijven en heten niet meer voorlopig_ (29 oktober 2026): de waarden zijn vastgelegd en niet meer voorlopig.

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
- **Later:** zie _Een uitslag toont de uitkomst in kleur, zonder letter_.
  Het palet heeft nu ook groen (150°), een heldere reeks zoals blauw en rood.

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
- **Later:** zie _Axe draait op elke story, in licht en donker_.
  De tests met Vitest en Testing Library blijven; alleen de Vitest-addon van Storybook, het alternatief hierboven, is nu aangenomen voor de controle met axe op de stories.

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
  Het motto staat sinds 27 oktober 2026 zonder komma, zoals de site het al had: zie _De footer zegt waar de site over gaat, met het motto eronder_.

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
- **Later:** zie _Een pagina in Storybook is kort, met het voorbeeld en een story per variant_.
  Een component krijgt geen lichte en donkere story meer; "Show code" toont nog steeds de JSX van het voorbeeld.

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
- **Later:** zie _De footer zegt waar de site over gaat, met het motto eronder_.
  Het motto staat daar zonder komma, zoals de site het al had.

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
- **Later:** de losse server en het publiceren bleven buiten dit besluit.
  Ze staan er nu wel, naast deze lokale server: zie _De MCP-server van het designsysteem staat op ds.heerenveen.org/mcp_.
- **Later:** zie _Axe draait op elke story, in licht en donker_.
  `@storybook/addon-vitest` komt er dan toch, voor de controle met axe op de stories.

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
- **Later:** zie _De kaarten van een zijbalk staan standaard onder elkaar, naast elkaar is een optie_.
  De cellen van de zijbalk staan nu standaard onder elkaar; alleen met `split` staan ze, onder de hoofdkolom, in twee gelijke kolommen.

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
- **Later:** zie _Een inleiding of toelichting bestaat alleen als ze iets toevoegt, en ze staat op een vaste plek_.
  Een inleiding is één zin van hooguit ongeveer twintig woorden en bestaat alleen als ze iets zegt wat de kop en de inhoud niet zeggen.
  Onze bronnen heeft er alleen nog een voor de lege plek.

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
- **Later:** zie _De hoofdkolom is 38 rem, met 2 rem ruimte naast de zijbalk_.
  De hoofdkolom is nu 38 rem, met 2 rem ertussen; de zijbalk en de kolom van de pagina blijven 24 en 64 rem.
  Ook onder 56 rem is de hoofdkolom 38 rem breed.
- **Later:** zie _De kaarten van een zijbalk staan standaard onder elkaar, naast elkaar is een optie_.
  Het `repeat(auto-fit, …)` hierboven geldt nu alleen voor een zijbalk met `split`; zonder staan de cellen onder elkaar.
- **Later:** zie _De tweede kolom begint bij 52 rem, voor alle pagina's met een zijbalk_.
  De kolommen staan naast elkaar vanaf 52 rem en niet meer vanaf 56 rem.

### De hoofdkolom is 38 rem, met 2 rem ruimte naast de zijbalk

- **Datum:** 26 oktober 2026
- **Besluit:** de hoofdkolom is 2 rem breder en de ruimte tussen de hoofdkolom en de zijbalk 2 rem smaller: 38, 2 en 24 rem, samen 64 rem.
  Een pagina zonder zijbalk heeft dezelfde hoofdkolom van 38 rem.
- **Waarom:** de ruimte naast elkaar was twee keer zo groot als de ruimte onder elkaar, en dat voelde scheef.
  De ruimte gaat naar de inhoud.
- **Hoe:** `--hf-content-max-width` is 38 rem, en de ruimte tussen de kolommen naast elkaar is de ruimte tussen de cellen (`--hf-page-body-cell-gap`, 2 rem).
  De eigen maat voor de ruimte tussen de kolommen (`--hf-page-body-column-gap`) is vervallen.
  De 4 rem onder de kolommen blijft, nu onder de naam `--hf-page-body-end-space`.
  De sporen zijn `minmax(24rem, 38rem)` en `minmax(16rem, 24rem)`, vanaf 56 rem en tot 66 rem breed (64 rem plus 1 rem marge aan beide kanten) krimpen ze mee.
  Bij 56 rem hebben ze 52 rem samen, na de ruimte ertussen, dus ze krimpen niet tot hun minimum en niets scrolt opzij.
  Onder 56 rem staan de hoofdkolom en de zijbalk gecentreerd onder elkaar, hoogstens 38 rem breed.
  De grens van 56 rem, de hang van het schild vanaf 74,5 rem en de strepen over de volle breedte veranderen niet, want de kolom van de pagina blijft 64 rem.
- **Gemeten:** in Atkinson Hyperlegible Next op 16 pixels telt een regel Tekst in de hoofdkolom op een scherm van 1440 pixels, met de vier alinea's van Over ons, hoogstens 87 tekens en gemiddeld 82,4 (alleen de volle regels).
  In 36 rem was dat met dezelfde tekst hoogstens 84 en gemiddeld 79,3.
  De regels zijn dus 3 tekens langer geworden, en de gemiddelde volle regel zit net boven de 80.
  De grens van 70 tot 80 tekens uit _Een pagina van 64 rem, met kolommen van 36, 4 en 24 rem_ rekt daarmee een paar tekens op; verder niet.
  Geen scrollen opzij van 280 tot 1200 pixels breed, dus ook niet op 320 pixels (400% zoom op 1280 pixels).
- **Alternatieven:** de zijbalk 2 rem breder maken; de hoofdkolom blijft dan op de leeslengte van 36 rem, maar de zijbalk heeft zelden zoveel nodig.
  De pagina breder maken; dat raakt de header, de footer en het logo.
- **Later:** zie _/wedstrijden heeft een zijbalk van 32 rem met de stand en de uitslagen_.
  Een pagina kan met `wide` op de `Page.Sidebar` een hoofdkolom van 30 rem en een zijbalk van 32 rem kiezen; elke andere pagina houdt 38, 2 en 24 rem.
- **Later:** zie _De kolommen van `/wedstrijden` zijn even breed_.
  De hoofdkolom en de zijbalk met `wide` zijn allebei 31 rem breed, met 2 rem ertussen.
- **Later:** zie _/nieuws heeft een hoofdkolom van 46 rem en een zijbalk van 16 rem_.
  Een pagina kan met `narrow` op de `Page.Sidebar` een hoofdkolom van 46 rem en een zijbalk van 16 rem kiezen.
- **Later:** zie _De tweede kolom begint bij 52 rem, voor alle pagina's met een zijbalk_.
  De kolommen staan naast elkaar vanaf 52 rem en niet meer vanaf 56 rem; bij 52 rem is er dus 48 rem voor de sporen, en niet meer 52 rem.

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
- **Later:** zie _Eén stel regels voor het gewicht van letters, met tokens die een bedoeling uitdrukken_ (28 oktober 2026): 500 blijft, "voorlopig" is bevestigd, en de Nieuwskop zelf heeft nu ook gewicht 500, zodat Storybook zegt wat de bezoeker ziet.

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
- **Later:** zie _De themaschakelaar is één knop rechtsboven in de header_.
  De site gebruikt `SegmentedControl` niet meer voor het thema, maar het component blijft in het designsysteem, en wat hier staat over de groep, `aria-pressed` en de gevulde knop blijft gelden.

### Head zet één script vóór de eerste weergave in de head

- **Datum:** 24 oktober 2026
- **Besluit:** het designsysteem heeft een component `Head` met één eigenschap, `script`: het adres van een script van de site dat als gewoon script in de `head` staat, zonder `async` of `defer`. `Root` blijft de `html`. Alle andere inhoud van de `head` komt van Next.js, uit de Metadata API.
- **Waarom:** het script dat het gekozen thema op de pagina zet (#208) moet klaar zijn voordat de pagina getekend wordt, anders flitst ze in het verkeerde thema. De sjablonen van de site mogen geen HTML bevatten (_Sjablonen bevatten geen HTML, alleen componenten uit het designsysteem_), en _De namen van de paginacomponenten volgen NL Design System_ zegt dat een `Head` komt als er extra inhoud in de `head` nodig is.
- **Alternatieven:** `next/script` met `strategy="beforeInteractive"`. Dat zet alleen een `preload` in de `head`, en het script zelf start Next.js pas als de app laadt (we lazen het in de gebouwde HTML), dus de pagina flitst al. Of een inline script; dat past in de CSP, maar de code staat dan in een tekst in een component en niet in een bestand dat een test kan lezen. Of een eigenschap `head` op `Root`; dat maakt `Root` groter terwijl `Head` er al naast hoort te staan.

### Root zet data-scroll-behavior op de html, naast de CSS voor soepel scrollen

- **Datum:** 25 oktober 2026
- **Besluit:** het attribuut `data-scroll-behavior="smooth"` hoort bij `Root`, naast de CSS die het soepel scrollen aanzet. Het staat in `Root` achter de meegegeven eigenschappen, zoals `lang`, dus een pagina kan het niet veranderen. Het commentaar in `Root.tsx` en dat in `root.css` verwijzen naar elkaar.
- **Waarom:** sinds Next.js 16 zet Next.js `scroll-behavior: smooth` niet meer uit tijdens het wisselen van pagina, tenzij `html` dit attribuut heeft. Zonder het attribuut meldt de dev-server een waarschuwing, en schuift een pagina die zonder herladen opent (nu na een formulier, later met links) vanaf de oude plek soepel omhoog in plaats van meteen bovenaan te staan. Het attribuut en de regel `scroll-behavior: smooth` horen bij elkaar, en `Root` is het onderdeel dat `html` maakt. Zo kan geen pagina het ene zonder het andere hebben.
- **Alternatieven:** het attribuut in `apps/site/src/app/layout.tsx` zetten; dan staat het los van de CSS. De waarschuwing negeren; de pagina's laden nu bijna altijd helemaal opnieuw, maar de waarschuwing blijft elke ontwikkelaar storen en het effect komt terug zodra er links met `next/link` komen.

### Button heeft een zachte uitvoering, met een rand die het contrast draagt

- **Datum:** 25 oktober 2026
- **Besluit:** `Button` krijgt een prop `appearance` met de waarden `default` (de gevulde knop) en `soft` (een lichtblauwe vulling met blauwe tekst), in de geëxporteerde lijst `buttonAppearances`. De gevulde knop heeft geen eigen klasse, de zachte heeft `hf-button-soft`. De vulling haalt 3:1 tegen de kaart niet, dus de zachte knop heeft een rand met een eigen kleur die dat wel haalt. De zachte knop gebruikt vier nieuwe tokens: `--hf-colour-background-button-soft`, `--hf-colour-background-button-soft-hover`, `--hf-colour-text-on-button-soft` en `--hf-colour-border-button-soft`.
- **Waarom:** de zachte vulling is rustig genoeg naast de koppen en blijft toch herkenbaar als knop. Een prop past bij hoe `Text` en `Card` hun uitvoering kiezen. Gemeten in licht: blauw-100 op wit haalt 1,21:1 en blauw-200 1,48:1, dus een vulling alleen is te zwak. De rand blauw-500 haalt 3,84:1 of meer op de vier vlakken (wit, sterk, zacht en warm) en 3,86:1 tegen de vulling. In donker haalt blauw-700 op de donkere vlakken 1,69:1 en 1,33:1, de rand blauw-400 dan 5,28:1 en 4,16:1. De tekst haalt 10,25:1 op de vulling in licht en 8,38:1 onder de muis, in donker 8,57:1 en 6,34:1. Onder de muis wordt de vulling in licht donkerder (blauw-200) en in donker lichter (blauw-600), zoals de gevulde knop dat doet: de knop wordt dan sterker. De rand blijft bij de muis gelijk. De focusrand is die van `base/focus.css`, dus net zo zichtbaar als bij de gevulde knop. De rand houdt de knop in geforceerde kleuren zichtbaar, en een rand van 1 pixel maakt de knop even groot als de gevulde.
- **Alternatieven:** de vulling zo donker maken dat ze 3:1 haalt; dan lijkt de knop weer op de gevulde en valt de zachte knop niet meer terug. Een uitvoering met alleen een rand, of alleen tekst; die lijkt op een link. Een apart onderdeel zoals `SecondaryButton`; dat geeft dubbel werk bij elke wijziging aan knoppen.

### De strepen staan aan het einde van de pagina en scrollen mee

- **Datum:** 25 oktober 2026
- **Besluit:** de strepen van de Friese vlag staan aan het einde van de pagina en scrollen met de pagina mee, over de footer en erboven; ze staan niet vast aan de onderkant van het scherm.
- **Waarom:** de projecteigenaar vindt het prettiger voor het oog als de strepen met de pagina meescrollen, in plaats van dat de kaarten er voorlangs scrollen, en het laat zien dat je het einde van de pagina bereikt.
  Daarnaast is de hoogte zo een percentage van de footer ("2 tot 3 keer zo hoog") en volgt hij de footer op een telefoon, zonder JavaScript en zonder vaste maat.
  Alleen de tekst bij de footer ligt over de strepen, niet elke tekst die voorbijscrolt, dus het contrast hoeft alleen daar te kloppen.
- **Alternatieven:** vast aan de onderkant van het scherm (`position: fixed`; altijd zichtbaar, maar de hoogte is dan een vaste maat, tekst scrolt over de strepen heen en een vast element onderaan een iPhone gedraagt zich lastig met de werkbalk van Safari); strepen als achtergrond van de hele pagina (geen duidelijke "hoogte van de footer" en ze zijn dan overal te zien).

### De strepen zijn alleen CSS: twee pseudo-elementen van de footer

- **Datum:** 25 oktober 2026
- **Besluit:** de strepen zijn alleen CSS: twee pseudo-elementen van de footer met een `repeating-linear-gradient` en een `mask-image`, onder een hoek van 35 graden.
  Ze doen geen verzoek.
  `::before` is het deel over de footer, onder de tekst en de knoppen erin (die krijgen `position: relative`); `::after` is het deel boven de footer, met `z-index: -1`.
  Beide delen hebben dezelfde gradient en dezelfde `background-size` en `background-position`, zodat de strepen zonder naad over de bovenrand van de footer doorlopen.
  `.hf-page` krijgt `isolation: isolate`.
- **Waarom:** de site doet geen verzoeken naar derden en moet snel blijven.
  Een gradient en een masker worden één keer getekend en scrollen mee met de pagina.
  De richting is die van de vlag (van linksboven naar rechtsonder, 34,695 graden).
  Er zijn twee pseudo-elementen nodig, omdat de achtergrond van de footer boven alles met een negatieve `z-index` wordt getekend: de strepen over de footer moeten boven die achtergrond en onder de tekst liggen, en de strepen erboven onder de kaarten.
  Met `isolation: isolate` op `.hf-page` liggen de strepen boven de pagina en onder de inhoud, ook binnen een element dat zelf een achtergrond tekent, zoals de themawrapper in Storybook.
- **Alternatieven:** een SVG of PNG als achtergrondafbeelding (een extra bestand en een verzoek, en het schaalt niet mee met de footer); één pseudo-element met ook de achtergrond van de footer erin (de footer wordt dan een tekening in plaats van een vlak, en de rand en de kleur van de footer hangen van het masker af); een laag in de kleur van de pagina over de strepen in plaats van een masker (zelfde uiterlijk, maar de laag moet de kleur van de pagina kennen; dit is de terugvaloptie als een masker ergens vreemd uitpakt).

### Twee kleurtokens voor de strepen, uit grijs-300 en blauw-800

- **Datum:** 25 oktober 2026
- **Besluit:** twee nieuwe kleurtokens, `--hf-colour-background-stripe` (boven de footer) en `--hf-colour-background-stripe-footer` (over de footer), gemaakt van grijs-300 in licht en blauw-800 in donker, met een dekking per deel (licht 30% en 30%, donker 40% en 60%).
- **Waarom:** "iets donkerder" werkt in licht, maar in donker is de pagina al bijna het donkerste blauw, dus daar is de streep iets lichter en blauwer.
  In licht is een warm grijs rustiger dan blauw en past bij de pagina en de footer, die zelf uit het grijs komen.
  Beide kleuren staan al in het palet, dus er komt geen nieuwe stap bij.
  Over de footer is de streep in licht donkerder dan de footer, dus de tekst in de footer heeft daar minder contrast dan op de footer zelf: bij 30% haalt secundaire tekst 4,53:1 tegen 4,5:1, bij het gekozen 50% niet (4,36:1).
  In donker is de streep lichter dan de footer en het contrast ruim voldoende.
  Twee tokens, omdat de dekking per deel en per thema verschilt en `light-dark()` geen getallen kiest, alleen kleuren.
- **Alternatieven:** staal (steel-200 in licht, blauwer en frisser, even licht als de footer en dus zonder contrastprobleem); zand (zand-300 en zand-700, warmer, dezelfde krappe marge); één token voor beide delen (de dekking boven en over de footer is dan gelijk, wat in donker niet gewenst was); een streep die uit de pagina en een tint gemengd wordt (geeft kleuren die in geen enkele reeks staan).

### De contrasttabellen meten een streep op het vlak eronder

- **Datum:** 25 oktober 2026
- **Besluit:** een paar in `pairGroups` kan een `under` hebben: het vlak waarop een doorzichtige achtergrond ligt.
  De tabellen in Tokens/Kleur rekenen de streep over dat vlak heen uit (`flatten` in `docs/contrast.ts`) en meten het contrast op de uitkomst.
  Voor de strepen boven de footer is dat de pagina, voor de strepen over de footer de footer.
- **Waarom:** een streep is doorzichtig, en het contrast van een doorzichtige kleur is niet te meten zonder de kleur eronder.
  De menging gebeurt in `flatten` zelf, niet op een canvas: een canvas mengt in 8 bits en verschoof het contrast van secundaire tekst in de footer van 4,53:1 naar 4,50:1, terwijl de marge daar maar 0,03 is.
- **Alternatieven:** de tint met `color-mix()` vooraf in een eigen token mengen met de pagina of de footer (dat zijn extra tokens die alleen de tabel gebruikt); de streep zonder het vlak eronder meten (dat meet niets, want de streep is doorzichtig).

### Een kop met een anker is zelf de link, met een ketting als pictogram

- **Datum:** 26 oktober 2026
- **Besluit:** een kop met een anker is een link naar zichzelf, met de tekst van de kop als naam en een pictogram van een schakel erachter.
  Het pictogram staat altijd op een aanraakscherm en verschijnt bij hover en focus waar een muis is.
  Het doel krijgt een rustige markering.
- **Waarom:** de naam van de link is de tekst van de kop, dus een schermlezer hoort waarheen hij gaat.
  Een pictogram dat alleen op hover verschijnt, is er niet voor wie geen muis heeft.
  De ketting is een teken dat ook niet-technische lezers kennen, anders dan een hekje.
  De markering laat de bezoeker die via de link komt zien welk deel is bedoeld.
- **Hoe:** `Heading` heeft de eigenschap `anchor` (alleen voor `h2` tot en met `h4`) en nieuwe pictogram `link`, zelf getekend zoals de andere.
  Met een muis (`@media (hover: hover)`) is het pictogram er bij hover en bij focus van het toetsenbord, en het houdt zijn plaats, zodat er niets verschuift.
  Op een aanraakscherm staat het altijd, in de kleur van secundaire tekst, en bij hover of focus in de kleur van links.
  Het blijft bij de laatste letter van het laatste woord, zodat het niet alleen op een regel komt en een lang woord toch kan afbreken.
  Het doel (`:target`) krijgt een pijl (`arrow-right`) aan de beginkant, in het midden van de opvulling van de kaart (zonder kaart in de marge van de pagina), in de kleur van de focus, zonder beweging; in forced colours heeft de pijl de kleur van het systeem.
  De projecteigenaar koos de pijl in plaats van een balk in de kleur van de accenten (26 oktober 2026), en de kleur van de focus omdat die al zegt waar je bent.
  `Card` zegt in `--hf-heading-gutter` hoe breed die opvulling is.
  De pijl staat in de opmaak, niet in de stijl, want een stijl kan geen pictogram tekenen zonder een verzoek om een afbeelding, en de regels van de site staan dat niet toe.
  Bij het afdrukken valt het pictogram weg.
- **Alternatieven:** een hekje (`#`) achter de kop (bekend bij technische lezers, minder bij supporters); een pictogram in de marge links van de kop (past niet in een kaart met opvulling en komt buiten het scherm op een telefoon); een aparte link met de tekst "Link naar dit kopje" (extra tekst bij elke kop, die een schermlezer steeds opnieuw voorleest).

### Een anker is een `id` in het Nederlands dat de pagina kiest, en blijft bestaan

- **Datum:** 26 oktober 2026
- **Besluit:** een anker is een `id` in het Nederlands, van kleine letters, cijfers en streepjes, dat de schrijver van de pagina kiest en niet uit de tekst van de kop wordt gemaakt.
  Een oud anker blijft werken met een leeg element met het oude `id` in de kop, en een controle faalt als een gepubliceerd anker verdwijnt.
- **Waarom:** de tekst van een kop verandert vaker dan het onderwerp, en een link die ergens op staat (een andere site, een bericht in het forum) mag niet stuk gaan.
  De server ziet het deel na het hekje nooit, dus een doorverwijzing van een oud anker op de server kan niet, en een script om oude ankers om te zetten werkt alleen met JavaScript.
  Een leeg element met het oude `id` werkt overal.
  Nederlandse ankers passen bij een site in het Nederlands, en bij links die supporters aan elkaar sturen.
- **Hoe:** `Heading` weigert een `id` dat niet aan de regels voldoet, met een fout bij het renderen (`isAnchorId` in `anchor.ts`): kleine letters en cijfers in woorden met één streepje ertussen, niet langer dan 40 tekens.
  Een oud anker (`aliases`) mag de regels overtreden, want het bestond al, zoals `versie-0.2.0`.
  Een kop die naar een andere pagina verhuist, neemt zijn anker mee, en de oude pagina verwijst blijvend door in `next.config.ts`, waar elke doorverwijzing een reden heeft.
  De browser houdt het deel na het hekje vast in zo'n doorverwijzing, als de doorverwijzing er zelf geen heeft.
- **Alternatieven:** het anker automatisch uit de tekst van de kop maken (elke wijziging van de kop breekt de link); oude ankers met een script op de pagina omzetten (werkt niet zonder JavaScript); geen controle op verdwenen ankers (een link breekt dan pas als iemand het merkt).

### De kaarten van een zijbalk staan standaard onder elkaar, naast elkaar is een optie

- **Datum:** 26 oktober 2026
- **Besluit:** `Page.Sidebar` zet haar cellen standaard onder elkaar, op elke breedte.
  De eigenschap `split` zet ze naast elkaar zodra er twee van 16 rem met 2 rem ertussen passen, zoals ze tot nu toe deden.
  `/bronnen` kiest `split`.
- **Waarom:** twee kaarten naast elkaar werken voor kleine kaarten, zoals op `/bronnen`, maar kaarten met lijsten, zoals de discussies en de podcasts op de homepage, worden er smal en krap van.
  Een standaard die voor de meeste pagina's goed is, en een keuze voor de pagina die er baat bij heeft, is eenvoudiger dan een regel die op elke pagina moet worden afgezet.
- **Hoe:** de regel met `repeat(auto-fit, minmax(min(16rem, 100%), 1fr))` is nu `.hf-page-sidebar-split`, en de zijbalk houdt één spoor.
  De regel `.hf-page-sidebar-wide` voor de kolommen van de cellen is vervallen, want dat is nu de standaard; `wide` maakt de zijbalk alleen nog breder, met dezelfde sporen als eerst: 38, 2 en 24 rem voor een gewone zijbalk en 31, 2 en 31 rem voor een brede.
  De zijbalk staat nog na de hoofdkolom in de bron, zonder `order`, en de benoemde gebieden voor een pagina met een inleiding blijven gelden.
- **Alternatieven:** de verdeling in twee kolommen helemaal weghalen (`/bronnen` verliest iets wat goed werkte); de verdeling als standaard laten en per pagina afzetten, zoals met `wide` (elke nieuwe pagina met lijsten moet eraan denken).

### Een donutdiagram is een eigen onderdeel in SVG, met een positieve en een negatieve kleur

- **Datum:** 26 oktober 2026
- **Besluit:** het designsysteem krijgt `DonutChart`: een ring van plakken, getekend als SVG in onze eigen code, met het totaal in het gat en bij elke plak de naam en de waarde als tekst.
  Een waarde van nul krijgt geen plak en geen tekst; een diagram zonder waarden toont een lege ring met een nul.
  Meer diagrammen naast elkaar staan in een `DonutChart.Group`.
- **Waarom:** de kaart Doelpunten per kwartier (#344) vraagt twee taartdiagrammen, en een grafiekbibliotheek is een dependency en laadt of berekent meer dan twee ringen nodig hebben.
  Een ring met een totaal in het gat leest beter dan een volle taart: het getal staat op de plek waar het oog heen gaat, en de plakken zijn dunner, dus de verschillen in hoek vallen beter op.
  De vorm is de keuze van de Builder, voorgelegd aan de projecteigenaar in Storybook; een taart zonder gat of een donut zonder getal is een kleine wijziging van `ring` in `geometry.ts` en de regel voor het totaal in `donut-chart.css`.
- **Hoe:**
  - De plakken lopen met de klok mee vanaf boven, in de volgorde van de gegevens, zoals een wijzerplaat.
  - De kleur komt uit de bestaande uitkomsttokens, gekozen met de eigenschap `tone`: `positive` is `--hf-colour-outcome-win` en `negative` is `--hf-colour-outcome-loss`.
    Het onderdeel kent geen voetbal: de pagina bepaalt welke getallen positief zijn, en `/wedstrijden` kiest `positive` voor de doelpunten voor en `negative` voor de tegendoelpunten.
    Er komen geen nieuwe tokens bij.
  - De plakken lopen op van 70% van de kleur naar de volle kleur, in de volgorde van de plakken.
    70% is het zwakste dat nog 3:1 haalt op het vlak van de kaart: 3,39:1 voor het groen en 4,22:1 voor het rood in licht, 4,81:1 en 4,43:1 in donker.
  - Het verschil tussen twee buurplakken is kleiner dan 3:1.
    Een rand in de kleur van het vlak, van 3 eenheden van de tekening, scheidt ze, en elke plak heeft zijn eigen tekst.
    Niemand hoeft een kleur te zien om een plak te lezen.
  - De tekening is 320 bij 300 eenheden en schaalt met de breedte van het diagram.
    De teksten zijn HTML, met een vaste grootte in rem, en staan in procenten van de tekening om de ring.
    Zo blijven ze op een telefoon even groot als de tekst van de pagina, en volgen ze het tekstformaat van de bezoeker.
  - Staan twee teksten minder dan 40 graden van elkaar, dan schuiven ze uit elkaar en loopt er een streepje van de plak naar de tekst (`spreadAngles` in `geometry.ts`).
  - Diagrammen staan naast elkaar zolang elk 10 rem breed kan zijn, en anders onder elkaar (`repeat(auto-fit, minmax(min(10rem, 100%), 1fr))`): de breedte van de plek telt, niet die van het scherm.
  - Het diagram heeft `aria-hidden="true"` en geen eigen beschrijving: het is een plaatje van getallen, en dezelfde getallen staan in een `DataTable` ernaast.
  - Er is geen beweging en geen hover.
    In forced colors krijgen alle plakken één kleur en doet de rand het werk.
- **Nadeel:** de teksten zijn geen onderdeel van de SVG, dus een diagram dat je als plaatje bewaart, heeft ze niet.
  Zes plakken in een ring van een kolom van 31 rem zijn klein: de ring is ongeveer 110 pixels breed.
- **Alternatieven:** een taart zonder gat (meer oppervlak, maar geen plek voor het totaal); het getal in de plak zelf (kleine plakken van één doelpunt zijn te smal); een legenda onder het diagram (de koppeling loopt dan alleen via de kleur); zes of twaalf nieuwe kleurtokens voor de plakken (veel om bij te houden, en toch geen 3:1 tussen buren); de teksten als SVG-tekst (die schaalt mee en wordt op een telefoon te klein); een grafiekbibliotheek (het issue sluit die uit).
- **Later:** zie _De scheiding in een ring is een lichte omlijning, in licht en in donker_.
  De lijn tussen de plakken is niet meer de kleur van het vlak maar een eigen rol, `--hf-colour-border-chart-slice`; de rest blijft.

### Een pagina in Storybook is kort, met het voorbeeld en een story per variant

- **Datum:** 23 oktober 2026
- **Besluit:** de pagina van een component in Storybook heeft een titel, een korte tekst, het voorbeeld met controls en de stories die nodig zijn.
  - **Tekst per component:** één alinea over waarom het component er is en wanneer je het kiest.
    Geen regels over marges, maten of afstanden: die staan in de code en in dit log.
    Een regel voor het gebruik die een bezoeker of schrijver nodig heeft, mag er staan als één zin.
  - **Stories:** per component het voorbeeld met controls, en een story per variant die er anders uitziet, niet per prop.
    Licht en donker komt van de themaknop, niet van een tweede story per component.
    Alleen een component dat zelf van thema verandert, zoals op een donker vlak, krijgt een eigen donkere story.
  - **Hover, focus en bezocht en de breedtes:** die zitten niet in de stories van elk component.
    De reviewer controleert ze op de pagina's (de checklist in `docs/toegankelijkheid.md`).
    De stories voor links en formulieren tonen ze één keer.
    Voor een smal en een breed scherm gebruiken we de werkbalk van Storybook, geen aparte stories.
  - **Controls:** een component krijgt controls zodra meer dan één prop de uitkomst verandert.
    De typen met `(typeof lijst)[number]` veranderen we niet.
    De weergave lossen we op in `ControlsDocsPage`, zodat de MCP-server de typen blijft lezen uit de code.
  - **Pagina:** `ControlsDocsPage` is de standaard voor een component (titel, beschrijving, voorbeeld, controls).
    De gedeelde `DocsPage` blijft voor hoofdstukken zonder voorbeeld, zoals Huisstijl en Redactie.
  - **Wat axe niet ziet:** de reviewer kijkt naar de pagina's van de site in licht en donker, volgens de checklist, en niet naar elke story.
    De eis "nagekeken in licht en donker" in `CONTRIBUTING.md` wordt "elk visueel component heeft een story, en de reviewer kijkt naar de pagina's".
    Dit blijft gelden voor wat axe niet ziet, ook na _Axe draait op elke story, in licht en donker_.
  - **Tokens:** de tabellen met kleuren en contrast blijven staan, want de contrasttabel is het bewijs voor `docs/toegankelijkheid.md`.
    De waarden in rem en pixels gaan uit de tekst, niet uit de tabellen die ze berekenen.
- **Waarom:** een korte pagina wordt gelezen en blijft waar.
  Wat de code of de beslissingen al zeggen, hoeft niet nog eens te staan en loopt anders uit de pas.
  De themaknop en de pagina's van de site dekken licht en donker beter dan een story per component.
- **Alternatieven:** uitgebreide pagina's met alle regels per component; dat geeft veel onderhoud en dubbel werk.
  Een story in licht en een in donker per component; dat waren 26 bestanden aan stories om bij te houden.
  Alles uit Storybook halen en alleen de code laten spreken; de MCP-server en nieuwe vrijwilligers verliezen dan hun handboek.

### Storybook heeft de groepen Componenten en Patronen

- **Datum:** 26 oktober 2026
- **Besluit:** de zijbalk heeft de groepen Componenten en Patronen, en een verplaatste story mag een nieuw adres krijgen.
  - **Indeling:** een component is één element of een algemeen onderdeel dat op elke site past.
    Een patroon zet componenten samen voor één soort inhoud van deze site.
    Componenten heeft vijf subgroepen:
    - Pagina: Root, Body, Head, Page en de delen van Page.
    - Tekst: Heading, Text, Link, List, Emphasis, Strong en Time.
    - Formulier: Form, Field, Input, Textarea, Select, Button, SegmentedControl, ErrorSummary en Honeypot.
    - Navigatie: Navigation, Pagination, Filter, RefreshButton en PullIndicator.
    - Weergave: Card, DataTable, DonutChart, Pictogram en Logo.
  - **Patronen:** NewsItem, ArticleCard, Article, DiscussionItem, WikipediaCredit, Match, ShortMatch, StandingsTable en TopScorersTable.
    Navigation, Pagination, Filter, SegmentedControl en ErrorSummary bouwen op andere componenten, maar zijn algemeen en blijven componenten.
    Het lege hoofdstuk Patronen en de pagina Componenten/Overzicht vervallen.
    De volgorde in de zijbalk staat vast in `storySort`, binnen een groep alfabetisch.
    Een pagina van een patroon is zoals die van een component, met één zin erbij waaruit het is gebouwd.
  - **Nieuwe adressen:** een verplaatste story mag een nieuwe URL en een nieuw id in de MCP-server krijgen.
    Huisstijl, Redactie, Tokens en HTML-elementen houden hun id, omdat het sjabloon van de pull request en `CONTRIBUTING.md` ernaar linken.
- **Waarom:** de indeling laat iemand die de zijbalk opent zien wat algemeen is en wat bij deze site hoort, zoals het Amsterdam Design System dat met zijn subgroepen doet.
  Dat kan zonder pagina's vol tekst.
- **Gevolg:** de stories verhuizen met #350.
- **Alternatieven:** de groep Composities of Pagina's noemen in plaats van Patronen.
  Subgroepen op soort component in plaats van op functie.

### Axe draait op elke story, in licht en donker

- **Datum:** 26 oktober 2026
- **Besluit:** de Vitest-addon van Storybook draait axe op elke story in een echte browser, één keer in licht en één keer in donker.
  Dat wordt `pnpm test:stories` en een stap in CI.
  Dit keert _axe toetst de pagina's, niet de stories_ om, en neemt het alternatief over dat bij _Componenten testen we met Vitest en Testing Library_ is afgewezen.
  - **Wat blijft:** de controle van de pagina's van de site en de checklist van de reviewer.
    Axe ziet geen hover, focus, toetsenbordvolgorde, schermlezers, alt-teksten, zoom of regels voor een hele pagina.
    De regel _Wat axe niet ziet_ in _Een pagina in Storybook is kort, met het voorbeeld en een story per variant_ blijft daarom gelden.
  - **Niet nu:** geen play-tests en geen visuele regressietests.
    Er is één component met gedrag in de browser, en een dienst voor schermafbeeldingen kost meer onderhoud dan hij oplevert voor één lezer.
    We kijken opnieuw bij het eerste component met echt gedrag.
- **Waarom:** de Vitest-addon vraagt een kleine instelling, draaide alle 298 stories in ongeveer 6 seconden per thema en vangt wat de themaknop en de reviewer missen.
  De drie redenen van de oude beslissing gelden niet meer: de instelling is klein, CI wordt minder dan een minuut langer, en twee componenten (PullIndicator en RefreshButton) staan op geen enkele pagina.
- **Gevolg:** de oude beslissingen _axe toetst de pagina's, niet de stories_ en _Componenten testen we met Vitest en Testing Library_ hebben een **Later:**-regel.
  De controle zelf komt met #351.
- **Alternatieven:** een eigen script met Playwright en `@axe-core/playwright` over alle stories; dat is een script van veertig regels om te onderhouden, en het steunt geen play-tests.
  De checks laten zoals ze zijn, met alleen het paneel in Storybook.

### De teksteditor staat in een eigen onderdeel van het package, zodat Tiptap alleen laadt waar hij nodig is

- **Datum:** 27 oktober 2026
- **Besluit:** `RichTextEditor` komt niet uit het hoofdbestand van het designsysteem, maar uit `@fansite/design-system/rich-text-editor`.
  Alleen een pagina die dat bestand importeert, krijgt Tiptap in haar JavaScript.
- **Waarom:** Tiptap is groot.
  Een proefpagina met de editor kreeg één bestand van 391 kB (123 kB gezipt) erbij, en geen enkele andere route verwees ernaar.
  Het hoofdbestand is een rij `export`s, en het package zegt niet dat de bestanden geen neveneffecten hebben, dus een bundelaar mag niet aannemen dat hij een ongebruikte export kan weglaten.
  Een eigen onderdeel laat Tiptap buiten beeld zonder dat we op een bundelaar hoeven te vertrouwen.
- **Hoe:** de editor is een clientcomponent (`'use client'`) in `src/components/rich-text-editor/`, met de stijlen in `rich-text-editor.css` in `index.css` (een paar regels die elke pagina krijgt).
  `index.test.ts` controleert dat het hoofdbestand de editor niet geeft en dat de `exports` van het package naar een bestand wijzen.
  - We nemen alleen de onderdelen die nodig zijn: `core`, `react`, `pm`, de extensies voor document, alinea, tekst, kop, lijst met bolletjes, lijstpunt, vet, cursief en link, en `extensions` voor ongedaan maken en opnieuw doen.
    Het is geen `starter-kit`, want die brengt onderdelen mee die we niet gebruiken.
    Alle pakketten zijn MIT, hebben geen installatiescript dat bij het installeren draait en doen zelf geen verzoeken naar buiten.
    `allowBuilds` verandert niet.
  - Een lijstpunt bevat één alinea, dus er is geen lijst in een lijst, en Tab en Shift+Tab verplaatsen geen lijstpunt maar verlaten de editor.
    Zo zit er geen toetsenbordval in, en de opmaak blijft die van een artikel nu.
  - Een link bewaart alleen het adres.
    Een adres dat niet met `https://` of met een enkele `/` begint, geeft geen link, ook niet in geplakte tekst.
    De editor maakt zelf geen link van een adres dat iemand typt of plakt.
  - De editor bewaart de tekst als Tiptap's JSON in een verborgen veld, dat bij elke wijziging wordt bijgewerkt.
    Het kleine formulier voor een link is geen `form`, want de editor staat zelf in een formulier, en zijn velden hebben geen naam en horen bij geen formulier, dus ze worden nooit verstuurd.
- **Alternatieven:** de editor uit het hoofdbestand geven en `next/dynamic` gebruiken (de gebruiker van het package moet dan weten dat het moet, en een vergeten import voegt stilletjes 123 kB toe aan elke pagina); `"sideEffects": false` in het package (dat is een belofte over alle bestanden, ook de CSS, en geeft geen zekerheid voor een clientcomponent); de editor in `apps/site` zetten (dan is het geen component van het designsysteem, zonder stories en axe).

### Beweging heeft vaste duren en curves, en valt bij minder beweging op één plek weg

- **Datum:** 27 oktober 2026
- **Besluit:** het designsysteem heeft een kleine reeks tokens voor beweging (duren en curves) en een taal die elke toestandswisseling in een groep zet.
  Alleen kleur, doorzichtigheid en transformatie bewegen.
  Bij `prefers-reduced-motion: reduce` valt elke overgang uit de taal weg, en dat is geregeld bij de tokens, niet per onderdeel.
  Een test bewaakt dat.
- **Waarom:** zonder taal kiest elk onderdeel zijn eigen duur en versnelling, en voelt de site als een verzameling losse handelingen.
  Een vaste reeks maakt het goedkoop om iets toe te voegen en maakt "minder beweging" een eigenschap van het systeem.
  Beweging van kleur en doorzichtigheid belast de pagina het minst en verschuift niets onder de ogen van wie leest.
- **Hoe:** `tokens/motion.css` heeft drie duren (`--hf-motion-duration-quick`, `-short` en `-medium`) en vier curves (`--hf-motion-ease-change`, `-morph`, `-enter` en `-exit`), in de laag `hf.tokens`.
  Bij `prefers-reduced-motion: reduce` zijn de drie duren 0 s, in datzelfde bestand.
  De vijf groepen zijn Aanwijzen, Ingedrukt en geselecteerd, Verschijnen en verdwijnen, De hele pagina en Zonder overgang.
  Het hoofdstuk Beweging in Storybook (Tokens/Beweging) heeft de tokens, de groepen, de regels, een voorbeeld per groep en de lijst van alle toestandswisselingen.
  De themaknop gebruikt de tokens: `--hf-theme-button-morph` is nu `var(--hf-motion-duration-medium)`, en kleur, rand en vulling nemen de korte duur.
  Hij ziet en beweegt er hetzelfde uit; het `@media`-blok voor `no-preference` is weg, omdat de duur van de tokens met minder beweging 0 s is.
  `tokens/motion-css.test.ts` faalt op een tijd in de CSS buiten `motion.css`, en op een `transition` of `animation` die haar duur niet uit een token haalt.
  De enige uitzondering is vloeiend scrollen in `root.css`, dat zijn eigen `@media` heeft.
  Het label van `PullToRefresh` volgt de vinger, heeft geen overgang en blijft zoals het is.
  Dit besluit zet zelf geen overgang in een onderdeel; dat komt per groep in eigen issues.
- **Alternatieven:** per onderdeel een eigen overgang laten kiezen; dat geeft geen samenhang.
  Of een bibliotheek voor animaties; dat is een dependency voor iets wat CSS kan.
  Of helemaal geen overgangen behalve de themaknop; dat laat de site hard aanvoelen, en het besluit is dat beweging een bewuste keuze is, geen toeval.
- **Later:** vult het besluit _Onder de muis en bij focus toont de themaknop het thema waar je naartoe gaat_ (27 oktober 2026) aan: de duren staan nu in de tokens van `motion.css`.

### Het label van de balk blijft staan, de rij scrolt, en de vervaging is CSS

- **Datum:** 27 oktober 2026
- **Besluit:** het label "Op deze pagina:" van `Page.Shortcuts` scrolt niet mee.
  De rij scrolt zijwaarts zonder schuifbalk, met een half afgesneden laatste link en een vervaging aan de rand die er alleen is als er iets te scrollen valt.
  Bij 20em of minder loopt de rij om.
- **Waarom:** wie halverwege de rij is, ziet nog steeds wat de rij is.
  Een afgesneden link en een vervaging zeggen dat er meer is, zonder schuifbalk.
  Bij 400% zoom mag de pagina niet zijwaarts scrollen (WCAG 1.4.10), dus daar loopt de rij om.
  20em volgt de lettergrootte van de bezoeker, dus wie grotere tekst heeft, krijgt de omlopende balk eerder dan bij 320 pixels.
- **Hoe:** de vervaging is een `mask-image` met twee lengtes (`--hf-shortcuts-fade-start` en `--hf-shortcuts-fade-end`, geregistreerd met `@property`).
  Een animatie met `animation-timeline: scroll(x self)` verandert ze met de afstand die de rij is gescrold: links komt de vervaging na 4% van de scrollafstand, rechts is ze weg bij 96%.
  Zonder iets om te scrollen is de tijdlijn niet actief, dus er is geen vervaging.
  Een browser zonder `animation-timeline` krijgt een vaste vervaging rechts en ruimte achter de laatste link.
  De animatie volgt het scrollen en heeft geen tijd van zichzelf, dus ze hoort niet bij de tokens van Beweging en valt niet onder "minder beweging": er beweegt niets zolang de bezoeker niet scrolt.
  De overgang van kleur en vulling van een link neemt wel de tokens: de korte duur voor de kleur (Aanwijzen) en de snelle voor de vulling bij indrukken (Ingedrukt en geselecteerd).
  De rij heeft aan alle kanten 5 pixels ruimte, zodat het scrollgebied de focusrand niet afsnijdt.
  De rij snapt ook (`scroll-snap-type: x proximity`, met `scroll-snap-align: start` op elk item en `scroll-padding-inline` gelijk aan de breedte van de vervaging plus de ruimte van de lijst, aan beide kanten): het begin van een link komt tot rust op het begin van de rij.
  Het is `proximity` en niet `mandatory`, zodat de rij alleen snapt als ze bij een link stopt, en een langzame beweging of het toetsenbord niet wordt tegengehouden.
  Een omlopende rij scrolt niet en snapt dus niet.
  Een browser scrolt een link met de focus alleen in beeld als hij bijna onzichtbaar is: een link die half in beeld staat of onder de vervaging, blijft staan, met een focusrand die is afgesneden of vervaagd.
  Daarom heeft de rij een klein onderdeel met JavaScript (`ShortcutsRow`, een `onFocus`): staat de link met de focus niet vrij van de vervaging, dan scrolt de rij hem naar het begin van de rij, achter de vervaging.
  Dat is ook waar de rij snapt, dus het snappen scrolt hem niet terug.
  Het doet dat alleen voor het toetsenbord (`:focus-visible`): bij een druk met een vinger of de muis zou de rij de link onder de vinger weg scrollen, en dan gaat de klik verloren.
  De links zelf werken zonder JavaScript; zonder blijft alleen dit scrollen met het toetsenbord weg.
  De balk blijft aan de bovenkant van het venster plakken als de pagina scrolt (`position: sticky`, onder de bovenrand van een telefoon met een inham), zodat de links bij de hand zijn langs de hele pagina.
  Een omlopende balk plakt niet, want hij is te hoog (bij 320 pixels bijna 200 pixels) en zou een groot deel van een klein venster innemen.
  De pagina houdt bij een link naar een kop ruimte voor de balk (`scroll-padding-block-start`, de hoogte in `--hf-shortcuts-height`), zodat de kop eronder staat en niet erachter.
- **Alternatieven:** het label scrolt mee (de woorden verliezen hun uitleg); een balk die niet blijft plakken (na een stuk scrollen moet je terug naar boven voor de links); een schuifbalk (lelijk, en op een telefoon niet te zien); altijd omlopen op een smal scherm (de balk wordt twee of drie regels hoog); de vervaging met JavaScript (meer code, en het schuift pas na het laden op zijn plek).

### De balk is in donker blauw-900, niet het warme vlak

- **Datum:** 27 oktober 2026
- **Besluit:** in licht heeft de balk het warme vlak (zand) en zijn rand, in donker blauw-900, een trede donkerder dan de header.
  De balk heeft eigen rollen in `colour.css`: `--hf-colour-background-shortcuts`, `--hf-colour-border-shortcuts`, `--hf-colour-text-shortcuts-label`, `--hf-colour-text-shortcuts-link`, `--hf-colour-text-shortcuts-link-hover` en `--hf-colour-background-shortcuts-pressed`.
  De focusrand is de gewone (`--hf-colour-focus`).
- **Waarom:** het warme vlak is in donker blauw-800, net als de header, dus de balk zou daar met de header één vlak lijken.
  Blauw-900 houdt de balk als een aparte strook onder de header.
  De projecteigenaar koos deze variant (B) boven het warme vlak zoals het is (A).
- **Hoe:** het ontwerp rekende op blauw-800; op blauw-900 haalt het label (blauw-200) 10,65:1, een link (blauw-300) 7,9:1, een link onder de muis (blauw-200) 10,65:1, en de focusrand (blauw-300) 7,9:1 op de balk en 5,55:1 op de ingedrukte vulling.
  De ingedrukte vulling is blauw-700 voor 70% over de balk, en een link (blauw-200) haalt daar 7,47:1.
  In licht blijven de waarden van het ontwerp: label 7,61:1, link 7,68:1, link onder de muis 10,22:1, en de focusrand 3,85:1 op de balk en 3,20:1 op de ingedrukte vulling.
  Geen waarde moest veranderen.
  Alle paren staan in de contrasttabellen van Tokens/Kleur.
- **Nadeel:** de gevulde achtergrond van een ingedrukte link haalt geen 3:1 tegen de balk zelf (ongeveer 1,2:1 in licht en in donker).
  Dat is zo in het ontwerp, en het is bewust: de vulling is de reactie op een druk van een vinger en blijft niet staan, dus ze hoeft geen toestand te dragen.
  Wat de link aanwijst, haalt de eis wel: de tekst op de vulling (8,49:1 in licht, 7,47:1 in donker) en de focusrand erop (3,2:1 in licht, 5,55:1 in donker).
- **Alternatieven:** het warme vlak zoals het is, blauw-800 (A); dan lijkt de balk een verlengstuk van de header en is hij gelijk aan de warme kaart, maar hij valt minder op.

### Een link in de balk is 36 pixels hoog

- **Datum:** 27 oktober 2026
- **Besluit:** een link in de balk is 2,25 rem hoog (36 pixels bij de gewone lettergrootte), met minstens 24 bij 24 pixels voor de kleinste ("Stand" is 62 pixels breed), en dus lager dan de 44 pixels van het menu.
  De balk is 46 pixels hoog plus een rand van 1 pixel.
- **Waarom:** de balk is een tweede rij onder het menu en mag niet te veel ruimte kosten.
  36 pixels haalt WCAG 2.5.8 (24 bij 24) ruim, en de links hebben ruimte boven en onder.
  De hoogte staat in rem, zodat hij met de lettergrootte van de bezoeker meegroeit.
- **Alternatieven:** 44 pixels, zoals het menu; dan is de balk 54 pixels hoog.

### Een spelersnaam is één component, met de voornaam gewoon en de achternaam vet

- **Datum:** 27 oktober 2026
- **Besluit:** het designsysteem heeft `PlayerName`.
  De voornaam staat in het gewone gewicht en de achternaam in het zwaardere.
  Volledige namen staan waar een rij één speler is en er ruimte is, alleen de achternaam waar de ruimte krap is, en bij twee gelijke achternamen komt de voornaam erbij.
- **Waarom:** de achternaam is het deel dat je herkent en waarop de zoekpagina zoekt, dus die valt op.
  In een lijst met ruimte maakt de voornaam het verschil tussen twee spelers duidelijk.
  Eén component houdt het gewicht op één plek, in plaats van op de rijkop van elke tabel.
- **Hoe:** het gewicht staat op de delen van de naam zelf, dus in een vette rijkop blijft de voornaam gewoon.
  Voor een schermlezer en voor kopiëren is het één tekst, zonder `strong`.
  De site splitst een speler uit `players` met `splitPlayerName`: de zoekterm is de achternaam als de naam erop eindigt.
  Is de zoekterm geen einde van de naam, zoals een verbetering met de hand, dan staat de hele naam in het gewone gewicht, in plaats van een verkeerde splitsing.
  Een doelpunt zonder speler heeft alleen de naam uit de wedstrijdregel, en is een achternaam.
  De kaart Doelpuntenmakers en de selectie op de zoekpagina tonen de volledige naam, en de lijst staat op achternaam, dan op voornaam.
  In de wedstrijdregel staat de achternaam zoals Wikipedia hem schrijft, met de beginletter van de voornaam erbij (`J. Trenskow`) als twee verschillende spelers in die regel dezelfde naam hebben, en met de hele voornaam als ook die beginletter gelijk is.
  Waar de naam van de media komt, zoals in koppen, veranderen we niets.
- **Alternatieven:** de hele naam vet laten, zoals nu in de kaart; dan valt het deel dat je zoekt niet op.
  Of `strong` om de achternaam; dat zegt een schermlezer iets wat niet nodig is.
  Of de volledige naam overal tonen; dat past niet in de wedstrijdregel op een smal scherm.

### Staafjes en lijn zijn algemene onderdelen, de grafiek van het seizoen zet ze samen

- **Datum:** 27 oktober 2026
- **Besluit:** `BarChart`, `BarChart.Trend` en `MarkRow` zijn algemeen en weten niets van voetbal.
  `FormChart` is de voetbalversie en zet ze samen met hulpfuncties voor punten, tonen en het voortschrijdend gemiddelde.
  De tonen `positive`, `neutral` en `negative` horen bij de groep van de grafieken.
- **Waarom:** de eigenaar wil geleidelijk een samenhangende bibliotheek voor datavisualisatie.
  Een staafje en een lijn komen terug bij doelpunten per wedstrijd en bij andere cijfers, en de kleuren en maten horen dan overal gelijk te zijn.
- **Hoe:** de gedeelde delen staan in `components/chart/` (de tonen, `chart.css` met de kleur en de sterkte van een toon, en `movingAverage` en `monotonePath`).
  `bar-chart/`, `mark-row/` en `form-chart/` hebben elk hun eigen map, naast `donut-chart/`.
  De lijn krijgt de schaal van de grafiek van `BarChart`, die haar `max` doorgeeft aan een `BarChart.Trend` die als kind staat.
  Een context kan niet, omdat de onderdelen servercomponenten blijven.
- **Alternatieven:** één `FormChart` met alles erin (sneller, maar de volgende grafiek begint opnieuw).
  Of de onderdelen eerst en `FormChart` later, wat de onderdelen alleen met losse verhalen test.

### Een verlies is een streepje van 0,25 rem, geen lege plek

- **Datum:** 27 oktober 2026
- **Besluit:** een verlies is een rood streepje van 0,25 rem op de grond.
  Een plek die nog niet gespeeld is, is leeg (alleen de grond).
- **Waarom:** een staafje van echt 0 hoog lijkt op een wedstrijd die nog niet gespeeld is.
  Zonder kleur is een verlies een klein blok en een lege plek alleen de lijn.
- **Alternatieven:** niets tekenen bij een verlies (lijkt op een lege plek).
  Of een streepje onder de grond (leest als een negatief getal).

### De lijn is het gemiddelde over de laatste 5 wedstrijden, als vloeiende kromme

- **Datum:** 27 oktober 2026
- **Besluit:** de lijn laat het gemiddelde aantal punten per wedstrijd over de laatste 5 zien, van wedstrijd 5 af.
  Hij is een monotone kubische kromme: vloeiend, nooit onder 0 of boven het maximum en vlak tussen gelijke waarden.
  De groottes van het venster (3, 5, 8) liggen in het canvas ter vergelijking.
- **Waarom:** 5 is het aantal letters in de vorm, wie beide bekijkt, denkt in vijven.
  Korter springt tussen 0 en 3, langer is rustig maar laat.
  Een vloeiende lijn is rustiger dan rechte stukken.
  Een gemiddelde sinds het begin wordt steeds trager en een lopend totaal stijgt altijd.
- **Alternatieven:** rechte stukken (de eerste versie; schokkerig).
  Een gemiddelde sinds wedstrijd 1.
  Een lopend totaal aan punten (niet op de schaal van de staafjes).

### De lijn is licht met een rand in de kleur van de kaart in donker, en donker met een witte rand in licht

- **Datum:** 27 oktober 2026
- **Besluit:** de lijn is 2 pixels, met een rand van 5 pixels.
  In licht is de lijn donker (blue-900) met een witte rand.
  In donker is hij licht (blue-50) met een rand in de kleur van de kaart (blue-800 op de warme kaart).
  Twee nieuwe rollen: `--hf-colour-chart-line` en `--hf-colour-chart-line-edge`.
  De lijn tegen een gelijkspelstaafje haalt in donker 1,92:1.
  De rand ertussen haalt 4,02 tot 5,94:1 en draagt de scheiding, zoals de rand van de taartgrafiek zijn stukken scheidt.
  De sterkte van de staafjes (70% en 80%) blijft.
- **Waarom:** een lichte lijn zonder rand haalt in donker 1,99:1 tegen een gelijkspelstaafje.
  Een donkere lijn in donker valt weg.
  Zwakkere staafjes in donker (50 tot 65%) zouden afwijken van de tabelbalk en de taartgrafiek.
- **Alternatieven:** een vaste rand van blue-950 (lijkt op een schaduw).
  Geen rand (faalt tegen een gelijkspel).
  Een rand die altijd de kleur van de kaart volgt, wat vraagt dat `Card` zijn kleur in een eigenschap zet.

### Een winst en een verlies op 70%, een gelijkspel op 80%

- **Datum:** 27 oktober 2026
- **Besluit:** de staafjes gebruiken de kleur van de uitslag op 70% (winst en verlies) en 80% (gelijkspel).
  De letters en de tekst gebruiken de volle kleur.
- **Waarom:** 70% is de sterkte van de tabelbalk en van het zwakste stuk van de taartgrafiek.
  Het grijs van een gelijkspel haalt op de warme kaart op 70% maar 2,93:1 en op 80% 3,51:1.
- **Alternatieven:** overal 70% (het gelijkspel haalt dan 3:1 niet).
  Overal 80% (de grafiek valt uit de familie).

### De vorm staat als tekst boven de grafiek, zonder koppeling met de staafjes

- **Datum:** 27 oktober 2026
- **Besluit:** boven de grafiek staat "Vorm" met de laatste vijf uitslagen als letters, het oudste links.
  Er staat geen haak onder de laatste vijf staafjes en er staan geen letters onder de staafjes.
- **Waarom:** de eigenaar zei dat bezoekers de haak niet zouden begrijpen.
  De letters zijn de bekende afkorting en de grafiek legt de rest uit.
- **Alternatieven:** een haak onder de laatste vijf staafjes.
  Letters onder elk staafje (zwaar op een smalle kaart).

### De footer zegt waar de site over gaat, met het motto eronder

- **Datum:** 27 oktober 2026
- **Besluit:** de footer van de Fansite en die van het Forum hebben dezelfde opzet: een eerste regel die zegt waar je op die plek voor komt, met "over onze club", en daaronder hetzelfde motto, "Voor supporters door supporters.", als eigen zin.
  De Fansite zegt "Alles over onze club op één plek." en het Forum "Praat mee over onze club."
  De beschrijving voor zoekresultaten is één zin met een gedachtestreepje: "Alles over sc Heerenveen op één plek – voor supporters door supporters."
  Daar staat "sc Heerenveen" in plaats van "onze club", omdat wie het resultaat leest nog niet weet van wie "onze" is.
  De beschrijving van de app in `manifest.ts` is dezelfde zin zonder het motto.
  Dit vervangt _De footer zegt wat je op de site vindt_ (22 oktober 2026).
- **Waarom:** "Alle koppen en links" past niet meer nu er ook wedstrijdgegevens, statistieken en spelletjes komen.
  De Fansite en het Forum delen het logo en het motto.
  De eerste regel zegt per plek waarvoor je er bent: lezen op de site, praten op het Forum.
  Het motto op een eigen regel blijft herkenbaar, ook als de eerste regel later weer verandert.
- **Alternatieven:** één zin met een streepje of een komma in de footer; dan staat het motto niet meer op zichzelf en hangt de regelafbreking af van de breedte van het scherm.
  Alleen het motto; dat zegt niet wat je er vindt.
  Een lijst van wat er te vinden is; die veroudert.
  "Sinds 1997 …"; dat botst met de beslissing van 22 oktober 2026 dat "sinds 1997" alleen in het logo staat.
  Een regel uit een supporterslied; de rechten, en sommige regels zijn van de club of van een andere club.

### Een knop naar boven in de footer, alleen op lange pagina's, en alleen met CSS

- **Datum:** 27 oktober 2026
- **Besluit:** de footer heeft een ronde knop "Naar boven", in de stijl van de themaknop, die er alleen is als de pagina meer dan twee vensterhoogtes hoog is.
  Dat is dezelfde regel als: de pagina kan meer dan één vensterhoogte scrollen.
  Het is CSS (een scroll-gestuurde animatie op `visibility`), zonder JavaScript, en een browser zonder die functie toont de knop altijd.
  De knop staat rechts in de footer en als laatste in de code, zodat het toetsenbord hem bereikt nadat de pagina naar beneden is gescrold.
- **Waarom:** de footer is waar je naartoe komt na een lange pagina, en daar wil je terug naar boven.
  De knop is er alleen als dat nuttig is, dus niet op een korte pagina waar hij niets doet.
  Een scroll-gestuurde animatie heeft geen script, geen flits bij het laden en volgt het formaat van het venster.
  `visibility: hidden` houdt hem uit de Tab-volgorde en weg bij een schermlezer.
- **Alternatieven:** JavaScript meet de hoogte van de pagina (meer code en een flits voor het script draait).
  De knop altijd tonen (ook waar hij niets doet).
  Een knop die vastzit aan een hoek van het scherm (kan over de inhoud en de balken van de browser liggen).

### De knop naar boven is `Page.TopLink`, een link naar `#top`

- **Datum:** 28 oktober 2026
- **Besluit:** het onderdeel heet `Page.TopLink` en is een gewone `a` met `href="#top"`.
  De prop `label` is verplicht en is de naam voor schermlezers ("Naar boven"); er is geen zichtbare tekst.
  Het adres kan niet worden veranderd, want de knop is er om naar de bovenkant van het document te gaan.
  Het pictogram is een nieuwe pijl omhoog (`arrow-up`) in `Icon`, met dezelfde lijn als de andere pijlen.
  Het onderdeel heeft geen status en blijft daarom een servercomponent.
- **Waarom:** het is een eigenschap van `Page`, net als `Page.Footer` waar het in staat.
  "Link" en niet "button", want de knop navigeert en is een `a`.
  `#top` is de bovenkant van het document, ook als er geen element met dat id is, dus de pagina hoeft geen anker te dragen.
  Een schermlezer hoort "Naar boven, link", zoals bij elke andere link.
  Het werkt zonder JavaScript.
  De Next.js-router onderschept een gewone `a` met een anker niet.
  Het vloeiende scrollen van `root.css` blijft dus gelden, en "minder beweging" ook.
- **Alternatieven:** `Page.TopButton` (het is geen knop); een anker op `.hf-page` met een eigen id (een extra id dat elke pagina moet dragen); `window.scrollTo` in een klik (JavaScript, en dan werkt het niet zonder).

### De knop naar boven toont zich na één `svh`, met een scroll-gestuurde animatie die in `@supports` staat

- **Datum:** 28 oktober 2026
- **Besluit:** de animatie loopt op de scrollpositie van het document (`animation-timeline: scroll(root block)`) en heeft een bereik van `100svh` tot `calc(100svh + 1px)`.
  De sleutelbeelden zetten `visibility` van `hidden` naar `visible`, met `animation-fill-mode: both`.
  Dat is dus verborgen tot en met precies één vensterhoogte scrollen en zichtbaar zodra de pagina verder is.
  Een pagina die niet verder kan scrollen dan één vensterhoogte, haalt die grens nooit.
  De animatie staat in `@supports (animation-timeline: scroll()) and (animation-range: 1px 2px)`.
  Buiten dat blok is de knop zichtbaar, dus een browser zonder die functies toont hem altijd.
  De animatie heeft geen duur en geen overgang, dus "minder beweging" hoeft niets te stoppen.
- **Waarom:** `svh` is de hoogte van het venster als de balken van de browser op een telefoon zichtbaar zijn.
  Hij blijft gelijk tijdens het scrollen, dus de knop verspringt niet.
  `dvh` volgt de balken, waardoor de grens beweegt terwijl je scrolt.
  `lvh` is het grote venster zonder balken, waardoor een bezoeker verder moet scrollen dan hij zag.
  Het bereik van 1 pixel maakt van de animatie een omslag op één punt.
  De knop zit in de footer, onderaan de pagina, en daar is de scrollpositie het maximum.
  Hij is dus zichtbaar precies als dat maximum groter is dan één vensterhoogte, dus als de pagina hoger is dan twee vensterhoogtes.
  De animatie staat in `@supports`, omdat `animation-timeline` en `animation-range` nog niet breed beschikbaar zijn.
  De stylelint-regel `use-baseline` eist dat.
  Het issue vroeg om een terugval met `@supports not`.
  Dit is hetzelfde gedrag, omgekeerd opgeschreven: de terugval is de standaard, en alleen een browser die de functies kent, verbergt de knop.
- **Alternatieven:** `dvh` of `lvh` (zie hierboven); een animatie in tijd die door JavaScript wordt gestart; `opacity` in plaats van `visibility` (de knop blijft dan bereikbaar met Tab en wordt voorgelezen).

### De knop naar boven heeft de kleuren van links in de footer en een eigen kolom in het raster

- **Datum:** 28 oktober 2026
- **Besluit:** het pictogram heeft in rust de kleur van een link (`--hf-colour-text-link`) en onder de muis, ingedrukt en bij focus die van een link onder de muis (`--hf-colour-text-link-hover`).
  De rand (55%) en de vulling (14%) zijn tinten van de kleur van het pictogram, met `color-mix()` op `currentcolor`, zoals bij de themaknop.
  Er komt geen nieuwe kleurrol bij.
  De knop is rond, 44 pixels, met een pictogram van 26 pixels, en heeft dezelfde lijn en toestanden als de themaknop.
  In geforceerde kleuren is de rand `LinkText`, en bij het afdrukken is de knop er niet.
  Heeft de footer een `Page.TopLink`, dan krijgt hij een kolom voor de knop.
  Op een smal scherm staat de knop rechts, op hoogte van de twee regels tekst, en de links eronder.
  Vanaf 40rem staat hij in een derde kolom rechts van de links.
  De links worden gevonden met hun klasse (`.hf-navigation`) en niet meer als laatste kind.
  De zinnen breken pas af onder 22,25rem in plaats van 19,5rem, want naast de knop is minder plaats.
- **Waarom:** de footer is een ander vlak dan de header, dus de kleuren van de themaknop (voor het blauw van de header) passen er niet.
  De rollen van links in de footer halen er al 4,5:1.
  Het pictogram haalt 6,57:1 in rust en 6,66:1 onder de muis met de vulling.
  Dat geldt in licht en in donker, ook op de strepen, gerekend met de tokens van de strepen.
  Een rand en vulling uit `currentcolor` volgen de toestand zonder extra rollen.
  14,1rem tekst, 0,5rem ruimte, 2,75rem knop en 2rem marge is 19,35rem; met de tekstafstand van WCAG 1.4.12 is de tekst 17rem breed en komt het op 22,25rem.
  Onder die breedte mogen de zinnen weer afbreken, zodat ze niet onder de knop lopen en de pagina niet zijwaarts scrolt.
  De knop is het laatste kind van de footer, dus een toetsenbordgebruiker komt hem tegen na de andere links.
  Op een smal scherm staat hij boven de links, dus de volgorde van het toetsenbord en die van het scherm verschillen.
  Dat mag, want WCAG 2.4.3 vraagt een betekenisvolle volgorde en geen gelijke.
  De knop hoort bij het eind van de pagina, dus bij de laatste plek in de volgorde.
  De knop ligt over de strepen: de kinderen van de footer zijn gepositioneerd en liggen daarom boven het deel van de strepen over de footer.
- **Alternatieven:** de kleuren van de themaknop (die zijn gemaakt voor het donkerblauw van de header); nieuwe rollen voor rand en vulling in de footer (meer tokens voor dezelfde tinten); de knop in een hoek van de footer met `position: absolute` (hij schuift dan over de tekst of de links); de knop vóór het menu in de code (de volgorde van het toetsenbord volgt dan het scherm, maar de bezoeker die onderaan komt, tabt eerst door de knop).

### Eén stel regels voor het gewicht van letters, met tokens die een bedoeling uitdrukken

- **Datum:** 28 oktober 2026
- **Besluit:** het gewicht van letters volgt vier regels: nadruk is 700, rangorde gebruikt eerst maat, kleur en lettertype, de huidige plek in een balk is 200 zwaarder dan de rest, en gewicht beweegt niet bij aanraken.
  Componenten gebruiken alleen tokens voor het gewicht, en een test weigert een kaal getal.
  De tokens noemen de bedoeling en mogen dezelfde waarde hebben.
  De nieuwskop blijft op 500.
  Het gewicht van de huidige plek geldt ook voor de balk "Op deze pagina" (700 tegen 500), en voor de huidige pagina in het submenu en in het menu in de footer (600 tegen 400).
- **Waarom:** er was geen regel, dus elke nieuwe plek koos een getal: 23 van de 53 regels waren een kaal getal.
  De regel van 200 verschil volgt uit de metingen: een stap van 100 is op 16 pixels nauwelijks te zien.
  Tokens met een bedoeling maken duidelijk waarom een waarde gekozen is, en een test voorkomt dat de getallen weer uit elkaar lopen.
  De nieuwskop is de regel waarvoor mensen komen, dus iets meer gewicht helpt bij het scannen.
- **Hoe:** `tokens/typography.css` heeft `--hf-figure-font-weight` (700), `--hf-name-font-weight` (600) en de paren `--hf-menu-…`, `--hf-submenu-…` en `--hf-anchor-…`, elk met een huidige plek.
  `--hf-headline-font-weight` is 500.
  Geen token voegt een nieuw gewicht toe; ongeveer 25 regels kregen een token met dezelfde waarde.
  `weight-css.test.ts` leest de CSS van alle componenten en faalt bij een kaal getal bij `font-weight`, zoals `motion-css.test.ts` dat voor tijden doet.
  `fonts.css`, de definities van de tokens en de CSS van de documentatie vallen erbuiten.
  De zichtbare wijzigingen zijn: de huidige link van de balk "Op deze pagina" (500 naar 700), de huidige pagina in het submenu en in het menu in de footer (700 naar 600), `legend` en `dt` (700 naar 600), "Uitgesteld" (600 naar 700) en de foutmelding bij een veld (500 naar 700).
  De huidige link van de balk "Op deze pagina" wisselt van gewicht terwijl de bezoeker scrolt, zonder overgang.
  De regels staan op de pagina Typografie in Storybook, onder "Afspraken".
- **Alternatieven:** alleen de regels opschrijven, zonder tokens (goedkoper, maar de getallen lopen weer uit elkaar).
  Tokens naar waarde noemen, zoals `--hf-weight-600` (zeggen niet waarvoor).
  De huidige plek in de balk "Op deze pagina" laten zoals hij is (de regel zou dan een uitzondering hebben).
  Het gewicht van de huidige link verbergen met een onzichtbare dikke kopie, zodat de rij niet verspringt (extra opmaak bij elke link, en de site laadt bij elke klik toch een nieuwe pagina).
- **Later:** vervangt delen van vier eerdere besluiten; zie de **Later:**-regels bij _Voorlopig heeft de kop van een nieuwsregel de maat van gewone tekst en gewicht 500_, _Het hoofdmenu is 16 tot 18 pixels en wordt vetter, de huidige pagina nog vetter_, _De balk met links naar de kaarten volgt de pagina_ en _Het hoofdmenu en het submenu zijn één `nav` tussen de `header` en de `main`, met een geneste lijst_.

### De acht voorlopige kleuren blijven en heten niet meer voorlopig

- **Datum:** 29 oktober 2026
- **Besluit:** de kleuren die in Storybook _voorlopig_ heetten, blijven zoals ze zijn.
  Het label en de code ervoor zijn weg uit `ColourDocs.tsx`, `tokens.ts`, `docs.css` en `colour.mdx`.
  De tabel met contrast in Storybook meet nu ook de rand van een invoerveld op de drie andere vlakken en de gevulde knop, ook onder de muis, op een vlak en op de pagina.
  Verhalen in licht en donker laten de kleuren zien: de knop onder de muis, de toestanden van een link, een tabel met zebrarijen en een rij onder de muis, een invoerveld, en de kop van een nieuwsbericht en de titel van een discussie, bezocht en onder de muis.
  Lopende tekst haalt AAA (7:1), andere tekst AA (4,5:1) en wat je moet kunnen zien 3:1.
  Het contrast is nagemeten op alle vlakken waar de kleur voorkomt, in licht en donker:
  - knop in donker (blauw-300): de tekst erop (blauw-950) haalt 9,13:1, en de knop haalt 7,90:1 op een vlak en 9,13:1 op de pagina;
  - knop onder de muis: wit op blauw-900 haalt 15,75:1 in licht, en blauw-950 op blauw-200 haalt 12,30:1 in donker;
  - rij onder de muis in donker (blauw-950): lopende tekst haalt 17,17:1, een link 9,13:1;
  - zebrarijen in donker (blauw-950): lopende tekst haalt 17,17:1, secundaire tekst en een positie 12,30:1;
  - link onder de muis in donker (blauw-200): 10,64:1 op een vlak en 8,38:1 op een sterk of warm vlak;
  - bezochte link: grijs-600 in licht haalt 5,30:1 tot 6,44:1 en grijs-400 in donker 4,89:1 tot 7,18:1, op elk vlak waar een kop of titel staat;
  - rand van een invoerveld: grijs-500 in licht haalt 3,46:1 tot 4,20:1 en blauw-400 in donker 4,16:1 tot 6,10:1, op de pagina en de vier vlakken.
- **Waarom:** elke kleur haalt zijn eis, dus er is geen reden om hem te veranderen.
  Zo blijft wat bezoekers zien gelijk.
- **Nadeel:** in licht en in donker zijn de rij onder de muis en de zebrarij dezelfde kleur, en geen tabel of component gebruikt ze nog.
  Een zebrarij verandert dus niet onder de muis.
  Wie zebrarijen gaat bouwen, besluit dan of ze een eigen kleur krijgen.
- **Alternatieven:** per kleur een andere stap uit de reeks.
  Elke kleur haalt zijn eis, dus daar was geen reden voor.
- **Later:** vervangt _Voorlopige kleurtokens_ (20 oktober 2026): de waarden zijn vastgelegd.

### De tweede kolom begint bij 52 rem, voor alle pagina's met een zijbalk

- **Datum:** 29 oktober 2026
- **Besluit:** `Page.Body` heeft twee kolommen vanaf 52 rem (832 pixels) in plaats van 56 rem, voor een gewone en een brede zijbalk.
  De balk "Op deze pagina:" verdwijnt op dezelfde grens.
  De grens is een breedte in rem, geen oriëntatie of hoogte.
- **Waarom:** de kolommen passen al vanaf 52 rem (24 + 24 + 2 rem voor de sporen en 2 rem voor de marges), en de grens van 56 rem liet de meeste telefoons in liggende stand in één kolom: 844 tot 874 pixels voor de meeste modellen, 896 en meer alleen voor de grootste.
  Eén grens voor alle pagina's houdt de site voorspelbaar, en de balk en de kolommen wisselen op hetzelfde moment.
  Een breedte in rem zorgt dat inzoomen en tekstvergroting op een liggend scherm weer één kolom geven (WCAG 1.4.10).
- **Hoe:** het getal staat als `52rem` in `page.css` (drie keer, in de media queries van de sporen en van de gebieden), in `shortcuts.css` (de balk en de ruimte voor het scrollen) en in `barWidths` in `followPage.ts`.
  Een media query kan geen custom property gebruiken, dus `page-css.test.ts`, `shortcuts-css.test.ts`, `followPage.test.ts` en de e2e-test van de balk (op 831 en 832 pixels) controleren dat ze gelijk blijven.
  De sporen krimpen van 66 rem tot 52 rem: bij 52 rem is er 48 rem voor de sporen (50 rem na de marges, minus 2 rem ertussen).
  De marge is zo breed als de inkeping van het apparaat (`env(safe-area-inset-left)` en `env(safe-area-inset-right)`), en een media query kan die niet lezen.
  Een telefoon in liggende stand heeft er 47 tot 62 pixels (tot 3,875 rem) aan elke kant, dus bij 52 rem blijft 42,25 rem voor de sporen.
  Een gewone zijbalk heeft minstens 24 + 16 rem nodig, en past.
  Een brede zijbalk had 24 + 24 rem nodig en paste niet: op 844 pixels met een inkeping van 47 pixels liep het raster 50 pixels over.
  De sporen van een brede zijbalk krimpen daarom tot 20 rem in plaats van 24 rem, 40 rem samen.
  De reviewer vond dit, want Chromium heeft geen inkeping en de meting zag het niet.
  Met een nagebootste inkeping (47 pixels op 844 en 852, 62 pixels op 874 en meer, en 62 pixels op 832 als slechtste geval) zijn de sporen 338 tot 400 pixels breed, en loopt in licht en donker op `/wedstrijden`, de homepage, `/podcasts` en `/bronnen` niets over.
  Alle andere vermeldingen van 56 rem in dit bestand, in de beslissingen over de kolommen, de balk en `/wedstrijden`, zijn nu 52 rem; de **Later:**-regels staan bij de drie beslissingen die de kolommen vastleggen.
- **Alternatieven:** 44 rem voor een gewone zijbalk en 52 rem voor een brede (benut elke indeling, maar twee grenzen om gelijk te houden).
  Een lagere grens met smallere kolommen van 18 tot 20 rem (knijpt tabellen en kaarten).
  Voor de brede zijbalk een hogere grens dan 52 rem (laat precies de telefoons in één kolom waarvoor het issue is, en de balk en de kolommen wisselen dan op twee plaatsen).
  Een grens op oriëntatie of hoogte (laat zoom en tekstvergroting op een liggend scherm twee kolommen houden, en breekt het herschikken).

### Een keuzelijst krijgt de opmaak van de site met `appearance: base-select`, binnen `@supports`, te beginnen bij de seizoenskiezer

- **Datum:** 30 oktober 2026
- **Besluit:** `Select` heeft een klasse `hf-select-styled` (in `select.css`) die de gesloten en de open lijst opmaakt met `appearance: base-select`.
  Alles staat binnen `@supports (appearance: base-select)`; een browser die het niet kent, houdt zijn eigen lijst (zie _Functies die nog niet zover zijn: `@supports`, of een tijdelijke uitzondering_).
  Alleen de `SeasonPicker` vraagt de klasse aan.
  De andere keuzelijsten (het contactformulier, `base/forms.css`, `Field`) volgen in een eigen issue als dit goed blijkt.
  - Het pijltje is `::picker-icon`, dus het pijltje van de browser zelf.
    De lijst heeft 0,75 rem opvulling aan het einde en 0,5 rem tussen de tekst en het pijltje, en het pijltje draait als de lijst open is.
  - De open lijst (`::picker(select)`) is een vlak met de rand en de hoek van het veld, en opties van minstens 2,75 rem hoog.
  - Een optie onder de muis heeft een tint en een dunne lijn.
    Een optie waar het toetsenbord staat, heeft een tint en de focusring van de site.
    De gekozen optie heeft een blauwe tint, een vinkje (`::checkmark`) en een zwaarder gewicht, dus kleur staat er niet alleen.
  - Alle kleuren zijn tokens, in licht en donker.
  - De regels van `plugin/use-baseline` staan uit rond dat blok, met de reden erbij.
    Zodra Baseline de functie 'widely available' noemt, meldt Stylelint de uitzondering als overbodig (`reportNeedlessDisables`) en gaan de uitzondering en de `@supports` weg.
- **Waarom:** het pijltje van een gewone `select` zit tegen de rand en is met opvulling niet te verschuiven.
  Een eigen pijltje als achtergrond (een verloop) is geprobeerd en door de projecteigenaar afgewezen.
  `::picker-icon` is het pijltje zelf, dus het blijft staan in gedwongen kleuren.
  Het toetsenbord werkt zoals in _Het toetsenbord kiest een seizoen met de pijltjes en bevestigt met Enter_: de e2e-test van de kiezer slaagt in Chromium 156 en WebKit 27.2, en de lijst blijft een `select` met dezelfde gebeurtenissen.
  Gedwongen kleuren (in Chromium nagebootst) en 400% zoom (320 × 256 pixels, vier seizoenen) zijn bekeken: het pijltje, de rand en het vinkje staan er, en de lijst past.
- **Nadeel:** het pijltje heeft per browser een andere vorm (een driehoek in Chromium, een punthaak in WebKit).
  De gesloten lijst is ongeveer 10 pixels breder dan de gewone, en de kiezer past naast de kop tot 320 pixels.
  Firefox is niet gecontroleerd, omdat Playwright hier alleen Chromium en WebKit heeft; zonder `base-select` houdt hij de lijst die hij heeft.
  De e2e-tests draaien alleen in Chromium.
  Met de hand draaide hetzelfde bestand in WebKit: alles slaagde, behalve de test die met Tab naar de knop "Toon" gaat, want WebKit op een Mac tabt niet naar een knop, ook niet op een lege pagina.
- **Alternatieven:** een eigen pijltje als achtergrond van de `select` (door de projecteigenaar afgewezen, en het verdwijnt in gedwongen kleuren).
  Een eigen keuzelijst van `div`'s (staat buiten dit issue, en het toetsenbord en de schermlezer moeten dan allemaal opnieuw).
  Alle keuzelijsten in één keer opmaken (raakt het contactformulier en `Field`, en de seizoenskiezer is de enige met een e2e-test voor het toetsenbord).

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
- **Later:** zie _De CSP laat afbeeldingen van het type `data:` toe_ (28 oktober 2026): `img-src` is nu `'self' data:`.
  De rest van de lijst blijft zoals hij was.

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
- **Later:** zie _Het hoofdmenu staat in een eigen rij onder de sitenaam_ voor de opmaak van het menu: de onderdelen staan niet meer in halfvet en in de lichtblauwe kleur maar in gewicht 500 en de lichtste kleur van de header, en de huidige pagina heeft alleen de rode streep.
  De onderdelen van het menu zelf en de rode streep blijven.

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
- **Later:** zie _De themaschakelaar is één knop rechtsboven in de header_ voor de plek en het aantal knoppen: één knop in de header, niet twee in de footer.
  De drie toestanden en het vergeten van een keuze gelijk aan het systeem blijven.

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
- **Gevolg:** de rooktest en de toegankelijkheidscontrole starten de site met `SITE_ENV=acceptance`; ze krijgen verzonnen instellingen mee, want ze vragen geen mail aan (de inlogpagina mailt alleen voor een account, en de testdatabase heeft er geen).
- **Alternatieven:** ongecodeerd mailen als de server geen TLS kent (onveilig); de instellingen op acceptatie optioneel laten (de site start dan, maar mailt niet).
- **Later:** het contactformulier (#99) mailt nu, en de toegankelijkheidscontrole stuurt die mail naar een nepserver; zie _De browsertest mailt naar een eigen nepserver die de mails in een map zet_.
  De rooktest houdt de verzonnen instellingen, want hij laadt geen pagina die mailt.

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
- **Later:** het contactformulier (#99) importeert `sendMail`, dus de standalone build neemt nodemailer nu mee; zie _De browsertest mailt naar een eigen nepserver die de mails in een map zet_.

### Het contactformulier mailt de redactie en slaat niets op

- **Datum:** 23 oktober 2026
- **Besluit:** een bericht via het formulier gaat alleen als mail naar de redactie, en komt niet in de database.
  We bewaren het tot de zaak is afgehandeld, hoogstens een jaar.
- **Waarom:** de redactie leest mail al, en het formulier hoeft dan niet te wachten op het beheer (#30).
  Er staan geen persoonsgegevens op de site zelf; de mailbox ruimt de redactie zelf op.
  Een belofte van "hoogstens een jaar" kunnen vrijwilligers houden.
- **Alternatieven:** opslaan in de database en lezen in het beheer (we zien dan ook wat er binnenkwam als mail verloren gaat, maar het hangt af van #30 en voegt een tabel met persoonsgegevens toe); of allebei.

### Spam weren met een val-veld en een limiet voor het hele formulier

- **Datum:** 23 oktober 2026
- **Besluit:** spam weren met een val-veld en een limiet voor het hele formulier, zonder diensten van derden en zonder IP-adressen te bewaren.
- **Waarom:** reCAPTCHA en dergelijke sturen bezoekers naar een derde (principe 3 van de Redactie).
  Een limiet per IP-adres vraagt om IP-adressen te bewaren.
  Dit is eenvoudig en dekt de meeste robots; komt er toch veel spam, dan bekijken we het opnieuw.
- **Alternatieven:** een rekensom of puzzel (kost toegankelijkheid, WCAG 3.3.8); een limiet per IP-adres; een tijdcontrole met een getekend tijdstip.

### Het formulier is een server action met een eigen bevestigingspagina

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

### Het val-veld heet `website`, en een robot krijgt dezelfde bevestiging als een bezoeker

- **Datum:** 24 oktober 2026
- **Besluit:** het `Honeypot` heeft de naam `website`.
  Is het ingevuld, dan stuurt de actie door naar de bevestiging en verstuurt niets.
  Zo'n bericht telt niet mee voor de limiet.
- **Waarom:** robots vullen een veld met zo'n naam graag in.
  Een foutmelding zou de robot leren dat hij is herkend.
- **Alternatieven:** een foutmelding of een lege pagina voor een robot.

### De limiet is tien berichten per uur in het geheugen van de server

- **Datum:** 24 oktober 2026
- **Besluit:** `createLimit` (`apps/site/src/rate-limit.ts`) onthoudt de tijden van de laatste berichten, voor het hele formulier samen.
  Een bericht met fouten, een robot en een geweigerde poging tellen niet mee; een bericht dat wel wordt verstuurd, ook als de mail mislukt, telt wel.
  De limiet begint opnieuw als de server herstart.
- **Waarom:** de eis is een bescherming tegen een stortvloed, geen exacte telling.
  Een bezoeker die een typefout herstelt, hoort niet tegen de limiet aan te lopen.
  Op gedeelde hosting kan er meer dan één proces zijn, dan telt elk proces apart; dat is hier acceptabel, omdat het alleen een bovengrens per proces is.
- **Alternatieven:** de tijden in de database of in een bestand (bewaart gegevens, voor weinig winst).

### Een leeg eerste antwoord bij het onderwerp, en de naam en link in de tekst van de mail

- **Datum:** 24 oktober 2026
- **Besluit:** de keuzelijst Onderwerp begint met "Kies een onderwerp" (waarde leeg), en de server weigert die keuze.
  De mail heeft het antwoord-adres van de bezoeker als `Reply-To` (alleen het adres, zonder naam), de onderwerpregel "Contact: <onderwerp>" met de woorden uit de lijst, en naam, adres, onderwerp en link in de tekst.
- **Waarom:** een lijst met een voorgekozen antwoord laat bezoekers het onderwerp verkeerd laten staan zonder dat ze het merken.
  Een naam in de kop `Reply-To` kan tekens bevatten die `sendMail` weigert (een komma, aanhalingstekens), dus de naam staat in de tekst.
- **Alternatieven:** "Een bericht laten verwijderen" als voorgekozen antwoord; de naam in de kop `Reply-To`.

### Bij een fout gaat de focus naar het blok met fouten

- **Datum:** 24 oktober 2026
- **Besluit:** na een verzending met fouten, of een mislukte verzending, krijgt het blok bovenaan de focus (`tabIndex={-1}`, `focus()` in een effect van `ContactForm`).
  Mislukt het versturen of is de limiet bereikt, dan staat dat in een `Card` met een kop, met een link `mailto:` naar de redactie, en geen `ErrorSummary`: er is geen veld om naartoe te linken.
  Die `Card` heeft ook `tabIndex={-1}`, en krijgt dan de focus.
- **Waarom:** met JavaScript laadt de pagina niet opnieuw, dus een schermlezer begint niet bovenaan en hoort anders niets (zie _Een formulier laat de controle aan de site_).
  Zonder JavaScript laadt de pagina opnieuw en staat het blok bovenaan; het effect doet dan na het laden hetzelfde.
- **Alternatieven:** `role="alert"` op het blok; dat leest op een pagina die opnieuw laadt niet betrouwbaar voor.

### De browsertest mailt naar een eigen nepserver die de mails in een map zet

- **Datum:** 24 oktober 2026
- **Besluit:** `e2e/contact.spec.ts` verstuurt het formulier naar `scripts/fake-smtp.js`, een kleine SMTP-server met STARTTLS die Playwright start en die elke mail als bestand in `.next/fake-smtp` zet.
  De test leest die map.
  De server maakt zelf een certificaat met `openssl`, en de sites in de test vertrouwen het via `NODE_EXTRA_CA_CERTS`.
- **Waarom:** de site draait in een ander proces dan de test, dus de test kan een mail alleen zien als de server die opslaat.
  Geen echte mail en geen verzoek aan een derde.
  `NODE_TLS_REJECT_UNAUTHORIZED=0` zou de controle van het certificaat voor het hele proces uitzetten.
- **Alternatieven:** de nepserver van `mail.test.ts` hergebruiken; die draait in het testproces zelf en kan de site niet bedienen.
  Of de verzending stubben; dan test de e2e-test de mail niet.

### Inloggen voor het beheer met een link per e-mail, zonder wachtwoord

- **Datum:** 23 oktober 2026
- **Besluit:** het beheer logt in met een inloglink per e-mail, zonder wachtwoord.
- **Waarom:** het beheer heeft een paar mensen.
  Een wachtwoord moet bewaard, gereset en tegen raden beschermd worden; een link per e-mail laat de mailserver de identiteit bewijzen, en we kunnen sessies intrekken.
- **Alternatieven:** wachtwoorden met een sterke hash en tweestapsverificatie (meer code en meer beveiligingsrisico); inloggen met het forum (#36, nog niet); een gedeeld wachtwoord zoals het prototype (geen persoonlijke verantwoording).

### Accounts voor het beheer maken we met een opdracht op de host

- **Datum:** 23 oktober 2026
- **Besluit:** accounts maken we met een opdracht op de host (`admin:create`), niet met een aanmeldpagina.
  Hoe die opdracht draait, staat onder _De opdrachten voor accounts zijn één bestand in de build_.
- **Waarom:** een aanmeldpagina is een aanvalsvlak en nog niet nodig voor een handvol mensen.
- **Alternatieven:** uitnodigen vanuit het beheer; dat kan later, met #31.

### Het logboek van beheeracties komt met de eerste beheeractie

- **Datum:** 23 oktober 2026
- **Besluit:** het logboek van beheeracties komt met de eerste beheeractie (#75), niet met het inloggen (#30).
- **Waarom:** het inloggen heeft nog geen acties om te loggen, en een logboek zonder gebruik is ongetest.
- **Alternatieven:** het logboek bij het inloggen bouwen, zoals het oorspronkelijke issue stond.

### Inloggen voor het beheer is eigen code, geen Better Auth

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

### Een link en een sessie bewaren we als SHA-256, in de database

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

### Het antwoord op een verzoek om een link is voor elk adres hetzelfde

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

### De rate limit van het inloggen staat in een eigen tabel

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

### De link in de mail toont een knop; de knop logt in

- **Datum:** 25 oktober 2026
- **Besluit:** `/beheer/inloggen/bevestigen?token=…` logt niet in als je hem opent, maar toont de knop Inloggen; de knop gebruikt de link op en begint de sessie.
  De pagina controleert of de link nog werkt, zonder hem te gebruiken, en zegt anders "Deze link werkt niet".
- **Waarom:** een virusscanner of voorbeeldweergave opent een link in een mail voordat de persoon dat doet (Microsoft 365 heeft dat), en zou een link die maar één keer werkt opgebruiken.
  Dat is één klik meer voor wie inlogt.
- **Alternatieven:** inloggen bij het openen van de link (kortste weg, maar breekbaar bij mailscanners).

### `requireRole` is de ene controle, en een test loopt het beheer zelf na

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

### Het beheer krijgt zijn eigen headers, en `robots.txt` weigert het overal

- **Datum:** 25 oktober 2026
- **Besluit:** de proxy geeft elk antwoord onder `/beheer` (en `/beheer` zelf) `X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store` en `Referrer-Policy: no-referrer`, op elke omgeving, productie ook.
  De `Referrer-Policy` is sinds #75 `same-origin`; zie _Het beheer stuurt een referrer naar de eigen site, zodat formulieren zonder JavaScript werken_.
  `/robots.txt` heeft `Disallow: /beheer` op elke omgeving.
  Next.js stuurt voor een pagina die het per verzoek rendert een eigen, langere waarde (`private, no-cache, no-store, max-age=0, must-revalidate`); die bevat `no-store` ook, en de rooktest controleert dat.
  De pagina's zeggen ook `noindex, nofollow` in de HTML, en staan niet in de sitemap.
- **Waarom:** de inloglink staat in het adres van een pagina; zonder `Referrer-Policy` zou hij als referrer naar een andere site kunnen gaan, en een cache mag niets van het beheer bewaren.
- **Alternatieven:** alleen `noindex` in de HTML (een zoekmachine ziet dat pas na het ophalen); de headers in `next.config.ts` (dezelfde plek als de andere headers is de proxy).

### De opdrachten voor accounts zijn één bestand in de build, dat alleen `DATABASE_URL` leest

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

### De privacyverklaring noemt het cookie van het beheer

- **Datum:** 25 oktober 2026
- **Besluit:** `/privacy` zegt nog steeds "De site zet geen cookies" bovenaan, en heeft een alinea dat wie inlogt in het beheer één cookie krijgt: alleen een nummer voor de sessie, alleen naar de pagina's van het beheer, hooguit 7 dagen, en nooit voor een bezoeker.
- **Waarom:** de eerste zin klopt voor bezoekers, en de rest zegt wat voor de redactie anders is.
  De alinea staat bij de andere dingen die we moeten noemen, en het cookie is geen tracking.
- **Alternatieven:** de eerste zin veranderen in "De site zet geen cookies voor bezoekers"; die zin is al waar, en de intro hoeft niet te veranderen.

### Een bericht verbergen zet drie kolommen op `items`, en elke query die berichten toont sluit het uit

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

### De importer laat een verborgen bericht met rust, in de query zelf

- **Datum:** 25 oktober 2026
- **Besluit:** het `INSERT … ON DUPLICATE KEY UPDATE` van `storeItems` zet elke kolom op de nieuwe waarde alleen als `hidden_at` leeg is (`unlessHidden`).
  Een verborgen bericht verandert dus niet: niet de kop, de link, de tijd of de betaalmuur, en ook `last_seen_at` niet.
  Het telt als ongewijzigd in het verslag.
- **Waarom:** de moderator verborg het om een reden, bijvoorbeeld een fout in de kop of een verzoek van de bron, en de bron biedt het bericht bij elke run opnieuw aan.
  Een controle op de rij die de importer eerst las, mist een bericht dat een moderator tijdens de run verbergt; de voorwaarde in de query zelf mist dat niet.
- **Alternatieven:** een bericht met `hidden_at` vooraf uit de lijst halen (snel, maar met die kleine kans op een bericht dat net verborgen is); een tabel met verborgen sleutels (een tweede plek om bij te houden).

### Het logboek van het beheer krijgt één schrijffunctie, en alleen toevoegen

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
- **Lezen:** er is nog geen scherm voor.
  `docs/acceptatieomgeving.md` heeft de vraag voor phpMyAdmin.

### `/beheer/berichten` is een lijst met gewone formulieren, en toont wat de database nu zegt

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

### Het beheer stuurt een referrer naar de eigen site, zodat formulieren zonder JavaScript werken

- **Datum:** 25 oktober 2026
- **Besluit:** de `Referrer-Policy` van alles onder `/beheer` is `same-origin` en niet `no-referrer`.
- **Waarom:** met `no-referrer` stuurt Chromium bij een formulier dat post `Origin: null`, en Next.js weigert dan elke serveractie ("Invalid Server Actions request").
  Elk formulier van het beheer, het inloggen ook, werkte daardoor niet zonder JavaScript; met JavaScript gebruikt de pagina `fetch`, en dat stuurt het goede `Origin`.
  Een browsertest zonder JavaScript liet het zien.
  `same-origin` doet voor de inloglink hetzelfde als `no-referrer`: naar een andere site gaat geen referrer, dus de link in het adres blijft van ons.
- **Alternatieven:** bij `no-referrer` blijven en het beheer alleen met JavaScript laten werken (dan haperen de formulieren juist bij wie geen JavaScript kan gebruiken); `Origin: null` toestaan in `serverActions.allowedOrigins` (de controle tegen vervalste verzoeken wordt dan zwakker).

### De browsertest van het beheer zet een moderator met een sessie in de testdatabase

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

### De pagina van de inloglink zegt dat de link klopt

- **Datum:** 25 oktober 2026
- **Besluit:** boven de knop Inloggen staat "Deze link klopt. Kies hieronder Inloggen om binnen te komen." in plaats van "Je bent bijna binnen. Kies Inloggen om door te gaan."
- **Waarom:** de extra klik na de link in de mail voelde als een fout (zie _De link in de mail toont een knop; de knop logt in_).
  De pagina zegt eerst dat het goed gaat, en dan wat er nu moet gebeuren, in de woorden van de knop.
- **Alternatieven:** de knop weghalen en bij het openen inloggen (breekt bij mailscanners, zie hetzelfde besluit).

### Eén pagina `/wedstrijden` voor programma, uitslagen en stand

- **Datum:** 25 oktober 2026
- **Besluit:** programma, uitslagen en stand staan samen op één pagina, `/wedstrijden`, onder drie kopjes.
  De blokken op de homepage linken er direct naartoe, de stand naar `/wedstrijden#stand`.
- **Waarom:** supporters zoeken ze samen en één pagina is minder om te bouwen en te onderhouden.
- **Alternatieven:** een pagina `/stand` apart (kortere pagina's, maar twee menu-items en twee keer een bronvermelding).

### Blokken onderaan de zijbalk

- **Datum:** 26 oktober 2026
- **Besluit:** de blokken "Wedstrijden" en "Stand" staan onderaan de zijbalk van de homepage, onder de discussies en de podcasts.
  Op een telefoon staat de zijbalk onder het nieuws, dus de blokken staan dan onderaan de pagina.
- **Waarom:** de projecteigenaar koos dit bij het bouwen van #271.
  De specificatie van 25 oktober had ze bovenaan, boven de discussies en de podcasts, omdat de volgende wedstrijd het eerste is wat supporters willen weten.
- **Alternatieven:** bovenaan de zijbalk, boven de discussies en de podcasts (de eerste specificatie van 25 oktober); in de hoofdkolom boven het nieuws (valt het meest op, maar verdringt het nieuws).

### Het programma, de volgende wedstrijd en de uitslagen volgen uit de status

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

### Een wedstrijd is een regel zonder link en zonder clubwapen

- **Datum:** 26 oktober 2026
- **Besluit:** het component `Match` toont de competitie en de ronde, de twee clubs met de uitslag ertussen, en daaronder de aftrap, "Thuis" of "Uit" en het stadion.
  De thuisclub staat eerst en de regel zegt ook "Thuis" of "Uit", zodat een bezoeker niet hoeft af te leiden uit de volgorde.
  De uitslag is "2–0" vanaf de kant van de thuisclub, en een schermlezer hoort "2 tegen 0".
  De aftrap is een `Time` in Nederlandse tijd, het weekend ("weekend 12–14 februari", met de eerste dag voor machines) zolang de tijd niet bekend is, en bij een uitslag alleen de dag.
  De wedstrijd heeft geen link, want een pagina per wedstrijd is #108, en er zijn alleen namen, geen clubwapens.
- **Waarom:** de namen dragen de regel voor iedereen, ook met een schermlezer, en een wapen is een afbeelding van een ander, met rechten die we niet hebben.
- **Alternatieven:** alleen de volgorde van de clubs voor thuis en uit (niet te zien voor wie het niet weet); een kolommentabel voor de wedstrijden (breed, en op een telefoon moet hij zijwaarts scrollen).

### De stand is een tabel met een scrollgebied en een korte vorm voor de zijbalk

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

### De bronvermelding van Wikipedia is een component met een link per pagina

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

### De bronvermelding staat in een doorzichtige kaart, zonder link naar de geschiedenis

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

### Zoeken in koppen, afleveringen en artikelen, met LIKE

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

### De zoekpagina staat in de footer, met de lijst met spelers in de zijbalk

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

### De zoekpagina laat woorden van één teken niet toe, toont hoogstens 100 resultaten en staat niet in de sitemap

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

### Een gepubliceerd anker staat in `src/anchors.ts`, en de rooktest bewaakt het

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

### De themaschakelaar is één knop rechtsboven in de header

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

### Het hoofdmenu staat in een eigen rij onder de sitenaam

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

### Onder de muis en bij focus toont de themaknop het thema waar je naartoe gaat

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

### Een balk onder de kop voor de links naar de kaarten, alleen op een smal scherm

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

### De balk komt via een slot in de layout, een parallelle route

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

### Het hoofdmenu is 16 tot 18 pixels en wordt vetter, de huidige pagina nog vetter

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

### De balk met links naar de kaarten volgt de pagina

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

### Het submenu is een tweede balk in een tint van de kop, zonder label

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

### De submenubalk is een eigen onderdeel, `Page.Submenu`, en hergebruikt de rij van `Page.Shortcuts`

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

### De CSP laat afbeeldingen van het type `data:` toe

- **Datum:** 28 oktober 2026
- **Besluit:** `img-src` wordt `'self' data:`.
  Een `data:`-afbeelding is een afbeelding in de pagina zelf en vraagt niets van een ander domein.
  Dit vult _Een Content Security Policy die derden blokkeert, zonder nonces_ aan.
- **Waarom:** de bibliotheek tekent de kaart als een SVG-afbeelding in een `data:`-adres (zie _De afbeelding van een kaart wordt in de browser gemaakt_).
  Zonder dit staat de CSP dat niet toe.
  Het principe blijft: een pagina laadt niets van een ander domein.
  `blob:` is niet nodig: de bibliotheek werkt zonder web worker (`workerNumber: 0`), want een worker zou van een `blob:`-adres starten.
- **Alternatieven:** `blob:` toelaten (alleen als de bibliotheek het echt nodig heeft, en dat is niet zo); `img-src *` (zou verzoeken naar elk domein toelaten, en dat doen we niet).

### Het hoofdmenu en het submenu zijn één `nav` tussen de `header` en de `main`, met een geneste lijst

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

### Het hoofdmenu krijgt een knop "Meer" bij zes of meer onderdelen

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

### Uitersten staan als vijf regels in een lijst, en bij gelijke stand telt de laatste wedstrijd

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

### De vorige en de volgende wedstrijd volgen uit de aanvangstijd, en een wedstrijd zonder uitslag zegt dat na twee uur

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

### Over ons zegt waar de gegevens vandaan komen en wat er mis kan gaan

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

### De naam van een regel in Uitersten staat boven de wedstrijd

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

### Het nieuwsarchief staat op `/nieuws`, met 50 koppen per pagina en een filter per bron

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

### De homepage heeft geen knop "Laad 5 meer" meer, maar de link "Alle koppen"

- **Datum:** 30 oktober 2026
- **Besluit:** de kaart Laatste nieuws op de homepage toont de tien nieuwste koppen, en onder de lijst staat de link "Alle koppen" naar `/nieuws`.
  De knop "Laad 5 meer" is weg, met `?nieuws=`, de ankers `#nieuws-N` bij de koppen, `parseHeadlineCount`, `maxHeadlines` en `moreHeadlines`.
  Een adres als `/?nieuws=15` laat de homepage zien.
- **Waarom:** het archief op `/nieuws` is er voor ouder nieuws, met vaste adressen en paginering.
  Een tweede manier om meer koppen te laden maakt de pagina langer en de code groter, zonder iets wat het archief niet beter doet.
  De homepage heeft zo geen parameters meer, en de lijst heeft nog maar één plek in het geheugen.
- **Gevolg:** de koppen van de homepage hebben geen `id` meer, en de knop blijft op de pagina met de gehouden nullen en op `/zoeken`.
- **Alternatieven:** de knop houden naast de link (twee manieren om meer koppen te zien, en de knop en de link raken elkaar onder de lijst).

### Het filter van het nieuwsarchief staat in een lichtblauwe kaart in de zijbalk

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

### /nieuws heeft een hoofdkolom van 46 rem en een zijbalk van 16 rem

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

### Op `/nieuws` kies je bronnen met selectievakjes in een fieldset

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
- **Later:** de echte bronnen komen sinds 26 oktober 2026 op productie via de lijst `realSources` in de seed; zie _De echte bronnen komen op productie via de seed_.
  De Leeuwarder Courant staat sinds dezelfde dag ook niet meer naast de testbronnen op acceptatie.

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
- **Later:** zie _We nemen ESPN NL, met het filter `club` en een eigen regel voor de zone EST_.
  Voor het domein `www.espn.nl` geldt een tijd met de zone `EST` nu als Nederlandse tijd; voor elke andere bron is hij nog steeds ongeldig.

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
- **Later:** zie _Omrop Fryslân is de eerste regionale bron, met het filter `club` vanaf de seed_; ook een brede feed nemen we, als het relevantiefilter (`club`) erop staat.

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
- **Later:** zie _Elke kaart op de homepage toont vijf items, uit één gedeelde waarde_: de lezer houdt nu de nieuwste vijf in plaats van vier.

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
- **Later:** zie _Op `/podcasts` kies je podcasts met selectievakjes in een fieldset_: het filter per podcast is een groep selectievakjes met een knop "Toon", en `?podcast=<slug>` mag vaker voorkomen.
  Zonder `podcast` zijn het alle podcasts.

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
- **Later:** zie _Op `/podcasts` kies je podcasts met selectievakjes in een fieldset_: een adres mag meer podcasts noemen, elk met zijn eigen slug.
  Elke slug wordt letter voor letter vergeleken, en `?podcast=Omroep-Abe` blijft een onbekende podcast.

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
- **Later:** zie _Elke kaart op de homepage toont vijf items, uit één gedeelde waarde_: het blok toont nu vijf afleveringen.

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
- **Later:** zie _Op `/podcasts` kies je podcasts met selectievakjes in een fieldset_: `/podcasts` gebruikt `Filter` niet meer.
  Het component blijft in het designsysteem, maar geen enkele pagina gebruikt het nu.
  De paginering blijft zoals ze was.

### De tijd van een aflevering: de dag in de week, daarna de datum

- **Datum:** 24 oktober 2026
- **Besluit:** een aflevering van de zeven dagen tot en met vandaag toont de korte dag en de tijd, zoals bij het nieuws: "wo 14:05".
  Een oudere toont alleen de datum, zoals "16 okt", met het jaar als het niet dit jaar is: "6 okt 2021".
- **Waarom:** de lijst gaat jaren terug, dus een datum zonder jaar is onduidelijk.
  Zonder tijd past de datum met het jaar in de smalle kolom van een nieuwsregel; een tijd erbij zou over drie regels breken.
- **Alternatieven:** de datum en de tijd, zoals bij het nieuws; dat past niet in de kolom met het jaar erbij.
  Of altijd het jaar; dat is in de week overbodig.
- **Later:** de datum van een aflevering van meer dan zeven dagen krijgt de korte dag erbij, zoals "wo 21 okt" (29 oktober 2026).
  Zie _Een publicatiedatum van meer dan een week oud is de korte dag en de datum, zonder tijd_.

### Een lijst per podcast en pagina staat vijf minuten in het geheugen, na de controle van het adres

- **Datum:** 24 oktober 2026
- **Besluit:** de server bewaart de lijst van elke combinatie van podcast en pagina vijf minuten, met `cacheForKey`.
  Hij controleert de slug en het paginanummer eerst tegen de lijst van podcasts en het aantal pagina's, en bewaart pas daarna iets.
- **Waarom:** een bezoeker kan elk adres bedenken, en een bewaarde lijst per adres zou het geheugen van de server vullen.
  Met de controle vooraf zijn er hooguit zoveel lijsten als er podcasts en pagina's zijn.
- **Alternatieven:** niet bewaren; dat is een query per bezoek.
  Of een grens aan het aantal bewaarde lijsten; dat is meer code en laat een bezoeker de goede lijsten uit het geheugen duwen.
- **Later:** zie _Op `/podcasts` kies je podcasts met selectievakjes in een fieldset_: de sleutel is de lijst slugs van de gekozen podcasts, in de volgorde van de lijst, en alle podcasts zijn dezelfde sleutel als geen.
  De controle vooraf blijft.

### Op `/podcasts` kies je podcasts met selectievakjes in een fieldset

- **Datum:** 31 oktober 2026
- **Besluit:** het filter per podcast op `/podcasts` is een formulier met `method="get"` naar `/podcasts`, met een `fieldset` en een `legend` "Podcasts", een selectievakje per podcast (`name="podcast"`, de `slug` als waarde) en een knop "Toon".
  Het is dezelfde aanpak als bij de bronnen op `/nieuws` (_Op `/nieuws` kies je bronnen met selectievakjes in een fieldset_), met hetzelfde onderdeel, `CheckboxGroup`.
  - **Geen vinkje betekent alle podcasts**, en alle vinkjes ook.
    Vanaf het eerste vinkje toont de pagina alleen de aangevinkte podcasts.
    "Alle podcasts" als link vervalt.
  - **Het adres** is `?podcast=a&podcast=b`, in de volgorde van de lijst, en `?pagina=N` blijft.
    Een adres met alle podcasts is dezelfde pagina als het adres zonder `podcast`: het canonieke adres en de adressen van de paginering hebben geen `podcast`.
    Een onbekende slug, een slug die twee keer voorkomt en een verkeerde `pagina` geven "niet gevonden".
    Een nieuwe keuze begint op pagina 1, omdat het formulier geen `pagina` verstuurt.
  - **De kaart staat bovenaan de zijbalk**, lichtblauw, en de pagina heeft dus altijd een zijbalk zolang er podcasts zijn.
    De maten van `/nieuws` (46 rem, 2 rem en 16 rem) gelden hier niet; de zijbalk heeft de gewone breedte.
  - **Eén podcast aangevinkt:** de naam van de podcast staat niet bij elke aflevering, want hij staat in de kop ("Podcasts van A") en in het vakje, en de naam blijft in elke regel voor een schermlezer (`showSource` van `NewsItem`).
    De kaart "Over A" met de beschrijving en de links naar Apple Podcasts en Spotify staat dan onder de kaart met de vakjes, op een warm vlak, zodat de twee kaarten niet allebei lichtblauw zijn.
    Bij geen vinkje, bij alle vinkjes en bij meer dan één vinkje is er geen kaart "Over".
  - **De titel en de kop** noemen de gekozen podcasts: "Podcasts van A en B", bij meer podcasts "A, B en C", en "Podcasts" voor alle podcasts.
- **Waarom:** met links kun je één podcast kiezen en met vakjes meer, en een formulier met een GET geeft een adres dat je kunt delen en werkt zonder JavaScript.
  Dezelfde regels als op `/nieuws` houden de twee pagina's gelijk voor wie ze gebruikt, en voor wie ze onderhoudt: de functies die het adres lezen en maken staan voor beide in `src/filter-query.ts`.
- **Gevolg:** de queries `listPodcastEpisodes` en `countPodcastEpisodes` nemen `podcasts`, een lijst slugs, in plaats van `podcast`.
  De server bewaart de pagina's per keuze, met de podcasts in de volgorde van de lijst.
  `Filter` heeft geen pagina meer die hem gebruikt.
  We laten hem staan; of hij weg moet, beslist de projecteigenaar.
- **Alternatieven:** de kaart "Over" ook tonen bij meer podcasts (dan zijn het er meer dan de zijbalk aankan, en de teksten zijn per podcast).
  De maten van `/nieuws` ook hier gebruiken (dat vraagt de projecteigenaar apart).
  Alle vakjes aangevinkt als een eigen adres laten bestaan (twee adressen voor dezelfde pagina).

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

### Het relevantiefilter kijkt alleen naar de kop, en bewaart wat het niet toont

- **Datum:** 23 oktober 2026
- **Besluit:** het filter kijkt alleen naar de kop.
  Twijfelgevallen en afgewezen berichten bewaren we, maar tonen we niet, tot het beheer ze kan beoordelen.
- **Waarom:** de importer bewaart geen intro of categorie, en we lezen ze niet om te beslissen.
  Zo blijft duidelijk waar het filter op rust, en blijft het één zuivere functie die we met koppen kunnen testen.
  "Niets stil weggooien" betekent dat een mens een fout kan zien en herstellen (#76), en dat we regels kunnen verbeteren aan echte gevallen.
- **Alternatieven:** ook de intro en de categorie van de feed lezen en weer weggooien (nauwkeuriger, maar dan verwerken we meer van de bron dan we tonen); of een taalmodel laten beoordelen (traag, duur, niet te testen).
  Twijfelgevallen tonen met een label (het lijkt dan onze keuze); of afgewezen berichten niet bewaren (geen spoor).

### De regels van het filter: hele woorden, zonder hoofdletters en accenten

- **Datum:** 25 oktober 2026
- **Besluit:** `judgeRelevance` in `apps/importer/src/relevance.ts` is één zuivere functie met de regels uit #74:
  - de kop noemt "sc Heerenveen", of Abe Lenstra: `relevant`;
  - de kop noemt "Heerenveen" met een voetbalwoord of de naam van iemand van de club: `relevant`;
  - de kop noemt alleen "Heerenveen", of alleen de naam van iemand van de club: `doubtful`;
  - anders: `irrelevant`.
- **Hoe ze lezen:** de kop wordt kleine letters zonder accenten, "s.c." en "S. C." worden "sc", en de kop valt in woorden bij alles wat geen letter of cijfer is.
  Zo telt "sc Heerenveen-fan", "SC HEERENVEEN" en "sc. Heerenveen" als de club.
  "sc" moet direct voor "Heerenveen" staan.
  Alleen het hele woord telt: "Asc Heerenveen" noemt de club niet, "Heerenveenseweg" en het bijvoeglijk naamwoord "Heerenveense" zijn niet "Heerenveen" (dat wordt `irrelevant`, tenzij er een naam of club bij staat), en "wandelwedstrijd" is geen "wedstrijd".
  Een term van meer woorden, zoals "Europa League" of een volledige naam, telt alleen als die woorden naast elkaar staan.
- **Wat de regels niet zien:** de wedstrijd van een andere club in Heerenveen, zoals een interland in het Abe Lenstra Stadion, heeft "Heerenveen" en een voetbalwoord en wordt dus `relevant`.
  De lijsten kennen geen andere clubs en spelers van andere clubs: een kop met "Heerenveen" en een speler van Ajax zonder voetbalwoord is `doubtful`.
  De koppen uit de logs van het prototype laten straks zien of dat vaak genoeg misgaat om een lijst met andere clubs te maken.
  Een kop over de Abe Lenstra Boulevard komt er ook in; een moderator verbergt zo'n bericht.
- **Later:** zie _Een kop over de tegenstander is `relevant` in de week voor en na de wedstrijd_: `judgeRelevance` blijft zuiver, maar krijgt de tegenstanders van de wedstrijden rond de publicatie als tweede argument, en de kop alleen is dan niet meer alles wat het filter ziet.
- **Abe Lenstra:** een kop met "Abe Lenstra" is `relevant`, ook zonder de club.
  Hij is onze grootste speler aller tijden, dus berichten over hem horen op de site (besluit van de projecteigenaar, 25 oktober 2026; dit is een aanvulling op de regels van #74).
- **Niet te streng:** de projecteigenaar wil een filter dat niet te streng is, want een bericht dat doorkomt is zo verborgen, en een bericht dat wordt tegengehouden ziet niemand.
  Daarom staan de voetbalwoorden ruim in de lijst, ook woorden als coach, competitie, kampioen en stadion, die er samen met "Heerenveen" bijna altijd een voetbalkop van maken.
- **Waarom:** een Nederlandse kop heeft de club bijna altijd met naam erin, en een gemeentebericht heeft "Heerenveen" zonder voetbal.
  Hele woorden voorkomen de meeste valse treffers zonder een lijst met uitzonderingen.
- **Alternatieven:** zoeken op een deel van een woord (meer treffers, ook "Asc" en straatnamen); een lijst met andere clubs om een wedstrijd van een andere club in Heerenveen te weren (nog een lijst die iemand bijhoudt, zonder dat we weten of het nodig is).
- **Later:** zie _Een volledige naam is genoeg, en "wint" en "verliest" zijn voetbalwoorden_; de naam van iemand van de club maakt een kop alleen `relevant` als het de volledige naam is, en "wint" en "verliest" zijn voetbalwoorden.
  Zie ook _De namen van de profclubs geven context: "Heerenveen" naast een club is een wedstrijd_: de naam van een andere profclub naast "Heerenveen" maakt een kop ook `relevant`.
  Zie ook _Het relevantiefilter kent de Friese schrijfwijze van de club en Friese voetbalwoorden_: "Hearrenfean" telt als "Heerenveen".

### De lijst met namen en voetbalwoorden: selectie, staf en wie in 2026 vertrok

- **Datum:** 25 oktober 2026
- **Besluit:** `apps/importer/src/relevance-terms.ts` heeft twee lijsten: de selectie en staf van sc Heerenveen in 2026/27 (de spelers, de hoofdtrainer, de assistenten en de directeuren), en voetbalwoorden.
  De bovenkant van het bestand zegt wie ze bijhoudt (de projecteigenaar en de Coordinator) en wanneer ze zijn nagekeken (25 oktober 2026, naar de Nederlandse Wikipedia, bijgewerkt op 17 oktober 2026, en de selectie op vi.nl).
  Van iemand staat de volledige naam op de lijst en de achternaam alleen, ook een veelvoorkomende zoals Kersten of Veldman.
  Een achternaam alleen maakt een kop `relevant` met "Heerenveen" erbij, en zonder de club `doubtful`.
  Een achternaam die ook een gewoon woord is, staat er niet alleen op (Proper, Machine, Schaken, De Haan, Zaal, Bakker, Brugge): die heeft de volledige naam nodig.
  Hristiyan Petrov schrijven we zo, met een H (de projecteigenaar, 25 oktober 2026; Wikipedia schreef Christijan).
  Spelers en staf die in 2026 vertrokken (onder anderen Brouwers, Hopland, Van Overeem, Bakker, Brugge en Zaal), staan er ook op.
  Ouder vertrokken spelers staan er niet op; voeg er een toe als een kop laat zien dat we hem missen.
- **Waarom:** de projecteigenaar wil het filter niet te streng en vindt nieuws over spelers die vertrokken zijn ook prettig om te lezen.
  Een achternaam alleen is niet gevaarlijk: zonder "Heerenveen" is de kop `doubtful`, en een kop die doorkomt, is snel verborgen.
  Alleen namen, geen andere gegevens over een persoon.
- **Alternatieven:** alleen volledige namen (een kop als "Vente is los bij Heerenveen" valt dan weg, dat zagen we in de opname van Voetbal International); alle oud-spelers van de club (de lijst groeit nooit uit); de selectie elke dag ophalen bij een bron (een extra verzoek aan een derde en een extra stuk code voor een lijst die elke maand een regel wijzigt).
- **Later:** zie _Een volledige naam is genoeg, en "wint" en "verliest" zijn voetbalwoorden_; een volledige naam maakt een kop nu `relevant`, en een achternaam alleen blijft `doubtful`.

### Een feed heeft een filter, `none` of `club`, en de importer beoordeelt elk bericht opnieuw

- **Datum:** 25 oktober 2026
- **Besluit:** `feeds.filter` is `none` (de feed gaat alleen over de club; zo staat het nu) of `club`, en begint op `none`.
  `items.relevance` is `relevant`, `doubtful` of `irrelevant` en begint op `relevant`.
  De migratie laat daarom elk bestaand bericht `relevant` en elke bestaande feed `none`.
  De waarde van een feed met `club` stellen we in met een SQL-opdracht, die in de README van de importer staat; de seed laat `filter` met rust, zodat een ingestelde waarde een nieuwe seed overleeft.
  Een scherm daarvoor komt niet in dit issue.
- **Hoe de importer het doet:** bij elke run beoordeelt hij elk bericht van een feed met `club`, ook een bericht dat hij al had, zodat een betere regel op oude berichten werkt.
  Een andere waarde telt als bijgewerkt.
  Bij een feed met `none` is de waarde altijd `relevant`.
  Een verborgen bericht (`hidden_at`) houdt zijn waarde, in de query zelf, net als de andere kolommen (zie _De importer laat een verborgen bericht met rust, in de query zelf_).
  Het logboek van een run (`import_results`) krijgt per feed drie tellers, `relevant`, `doubtful` en `irrelevant`: wat het filter van elk bericht in de feed vond, ook van een verborgen bericht.
  Het verslag van de opdracht heeft ze erbij.
- **Waarom:** een nieuwe feed wordt zo een regel in de database, en zonder filter verandert er voor de twee bronnen van nu niets.
  De waarde bij elke run opnieuw bepalen maakt van het filter een regel en geen stempel: wie een naam toevoegt, ziet het resultaat bij de volgende run, zonder een aparte opdracht.
- **Alternatieven:** het filter in de configuratie van de importer of op de bron (een feed van dezelfde bron kan anders zijn); alleen bij een nieuw bericht beoordelen (een betere regel werkt dan nooit op wat er al is); `relevance` overschrijven voor een verborgen bericht (dat gaat tegen #75 in).
- **Later:** zie _Omrop Fryslân is de eerste regionale bron, met het filter `club` vanaf de seed_; voor een nieuwe feed in `realSources` stelt de seed het filter in, bij het toevoegen van de feed.

### De site toont alleen `relevant`, en het beheer toont alles met een woord erbij

- **Datum:** 25 oktober 2026
- **Besluit:** elke query die berichten voor bezoekers toont, gaat door één functie, `isShown` in `packages/db/src/queries.ts`: `relevance = 'relevant'` en `hidden_at IS NULL`.
  Dat zijn de koppen van de homepage, de afleveringen en hun aantal, en de podcasts in het filter.
  `/beheer/berichten` blijft alles tonen, van elke waarde, zodat een moderator ook een twijfelgeval vindt, en zet bij een bericht "twijfelgeval, niet op de site" of "niet over de club, niet op de site".
  Tests: de queries, de koppen en afleveringen in de site, en de controle in de browser (`e2e/relevance.spec.ts`) dat de twijfelgevallen op geen enkele pagina staan.
  De sitemap en de RSS-feed van Updates tonen geen berichten.
- **Waarom:** één plek voor de voorwaarde voorkomt dat een nieuwe query er een vergeet.
  De moderator moet een bericht kunnen vinden dat het filter ten onrechte weghoudt.
- **Alternatieven:** de voorwaarde in elke query zelf (zoals bij `hidden_at` tot nu toe); een apart scherm voor twijfelgevallen (een eigen issue).

### Omrop Fryslân is de eerste regionale bron, met het filter `club` vanaf de seed

- **Datum:** 25 oktober 2026
- **Besluit:** Omrop Fryslân (`https://www.omropfryslan.nl/rss/index.xml`) staat in `realSources` in `packages/db/src/seed.ts`, met het filter `club`.
  Een feed in `realSources` is een adres of een object met `filter` en `url`; een feed zonder object begint op `none`, zoals tot nu toe.
  De seed zet het filter alleen als hij de feed in het register zet, en verandert het daarna nooit meer (zie _Een feed heeft een filter, `none` of `club`, en de importer beoordeelt elk bericht opnieuw_).
  Van de bron tonen we alleen de kop, de link, de bronnaam en de tijd, zoals bij elke bron.
  Het register in [`bronnen.md`](bronnen.md) zegt nu "nemen" voor deze bron, met het filter.
  Voor de tests heeft `@fansite/db` een export `./seed`, zodat de test van de importer de bron neemt zoals de seed hem in het register zet.
- **Gemeten op de echte feed** (25 oktober 2026, één run van de importer): 50 berichten bewaard, waarvan 2 `relevant`, 4 `doubtful` en 44 `irrelevant`.
  Geen bericht stond achter een betaalmuur, geen tijd was ongeldig en de importer sloeg niets over.
  De importer leest de feed dus zonder aanpassing.
- **Waarom:** een regionale feed gaat over alles in de provincie, en de club is een klein deel (6 van de 50 op 24 oktober).
  Begint de feed op `none`, dan toont een nieuwe omgeving alle 50 berichten tot iemand het filter met SQL aanzet.
  Op acceptatie zet de site de bronnen met de seed in een lege database, dus daar zouden brand en storm op de homepage komen.
  Met `club` vanaf de seed gebeurt dat niet.
- **Alternatieven:** de feed op `none` beginnen en het filter met SQL aanzetten (een venster waarin alles zichtbaar is); het filter in elke seed opnieuw zetten (dat maakt een keuze in de database ongedaan); een filter op de bron in plaats van op de feed (een tweede feed van dezelfde bron kan anders zijn).
- **Daarna:** de projecteigenaar bekeek de koppen van de run en veranderde twee regels (zie _Een volledige naam is genoeg, en "wint" en "verliest" zijn voetbalwoorden_).
  Dezelfde 50 koppen geven met de nieuwe regels 4 `relevant`, 2 `doubtful` en 44 `irrelevant`.

### Een volledige naam is genoeg, en "wint" en "verliest" zijn voetbalwoorden

- **Datum:** 25 oktober 2026
- **Besluit:** twee veranderingen in de regels van het filter, op de koppen van de eerste run op de feed van Omrop Fryslân (besluit van de projecteigenaar):
  - De volledige naam van iemand van de club maakt een kop `relevant`, ook zonder "Heerenveen".
    `relevance-terms.ts` heeft daarom twee lijsten: `clubPeople` met de volledige namen, en `clubSurnames` met de achternamen.
    Een achternaam alleen blijft `doubtful`, en is `relevant` met "Heerenveen" erbij, zoals voorheen.
  - "wint" en "verliest" staan bij de voetbalwoorden, dus "Heerenveen wint met 3-2 van ADO Den Haag" is `relevant`.
- **Waarom:** de eerste run vond twee koppen over de club `doubtful`: "Lees terug: Heerenveen overleeft Haags kwartiertje en wint met 3-2 van ADO Den Haag" en een kop over Ringo Meerveld.
  In een kop is "Heerenveen" zonder "sc" vaak de club, en een werkwoord als "wint" hoort bij een wedstrijd.
  Een volledige naam is niet dubbelzinnig, een achternaam wel (Kersten, Veldman).
- **Gevolg:** een kop als "Man wint loterij in Heerenveen" wordt ook `relevant`.
  Dat is een bekende valse treffer, die een moderator verbergt; de projecteigenaar wil het filter niet te streng (zie _De regels van het filter: hele woorden, zonder hoofdletters en accenten_).
  Ook de volledige naam van iemand die in 2026 vertrok, maakt een kop `relevant`.
- **Alternatieven:** een lijst met andere clubs, zodat "ADO Den Haag" in een kop de wedstrijd verraadt (nog een lijst om bij te houden); een regel voor een uitslag als "3-2" in de kop (nieuwe code, en alleen voor koppen met een uitslag).
- **Later:** zie _De regels van het filter: hele woorden, zonder hoofdletters en accenten_ en _De lijst met namen en voetbalwoorden: selectie, staf en wie in 2026 vertrok_ voor de regels die hier veranderden.

### De namen van de profclubs geven context: "Heerenveen" naast een club is een wedstrijd

- **Datum:** 25 oktober 2026
- **Besluit:** `relevance-terms.ts` krijgt een lijst `otherClubs` met de profclubs van de Eredivisie en de Eerste Divisie in 2026/27 (18 en 20 clubs, met de Jong-teams), zonder sc Heerenveen zelf.
  Een kop met "Heerenveen" en een van die clubs is `relevant`, zoals een kop met "Heerenveen" en een voetbalwoord.
  De projecteigenaar vroeg erom, na de kop met ADO Den Haag.
  Een club zonder "Heerenveen" telt niet.
- **Hoe de lijst is gemaakt:** naar de pagina "2026-27 Eredivisie" op en.wikipedia.org (18 clubs, stand van 24 oktober 2026) en "Eerste divisie 2026/27" op nl.wikipedia.org (20 clubs, laatst bewerkt op 24 oktober 2026).
  De Nederlandse pagina over de Eredivisie van dit seizoen konden we niet lezen (404).
  De 20 clubs van de Eerste Divisie staan in de tekst van het deel "Teams" van die pagina, en we hebben ze een tweede keer met die tekst vergeleken; de datum van de laatste bewerking komt uit een samenvatting van de pagina.
  De 18 clubs van de Eredivisie komen uit de tabel "Stadiums and locations" van de Engelse pagina, via een leesdienst; die lijst is niet met de paginatekst zelf vergeleken.
  De lijst moet na de promotie en degradatie van elk seizoen worden nagekeken.
- **Waarom korte namen niet altijd:** een club waarvan de korte naam een plaats is, staat er alleen met zijn volledige naam (FC Groningen, FC Utrecht, FC Twente, PEC Zwolle, FC Emmen).
  Koppen met "Heerenveen en Groningen" of "Heerenveen en Zwolle" gaan vaak over de A7 of de trein, en zouden anders allemaal `relevant` worden.
  Een club waarvan de korte naam in bijna elke kop de club is (Ajax, PSV, Cambuur, Volendam) staat er met die naam.
  VVV staat er alleen als VVV-Venlo, want de VVV is ook het toeristenbureau.
- **Gevolg:** een kop die alleen "Utrecht" of "Groningen" schrijft voor de club, heeft nog een voetbalwoord nodig.
  De 50 koppen van Omrop Fryslân geven nog steeds 4 `relevant`, 2 `doubtful` en 44 `irrelevant`.
- **Verandert de regels van #254:** ja, dit is een derde aanvulling op de regels van het filter uit #254 (na de volledige naam en de twee werkwoorden).
  De projecteigenaar hield de regel en de lijst zoals ze zijn (25 oktober 2026), ook "Sparta" en "Excelsior", die ook namen van amateurclubs zijn.
- **Alternatieven:** alle korte namen toelaten (de A7 en de trein worden dan `relevant`); een regel voor een uitslag als "3-2" in de kop (nieuwe code); de clubs elke dag bij een bron ophalen (een verzoek aan een derde voor een lijst die één keer per seizoen verandert).

### De beoordeelde koppen zijn testgevallen, met de waarde die het filter hoort te geven

- **Datum:** 25 oktober 2026
- **Besluit:** de quiz van de projecteigenaar komt als testgevallen in de tests van het filter: 26 koppen, 21 echte uit de feeds van Omrop Fryslân, NOS en Voetbal International en 5 verzonnen randgevallen.
  Een kop die de projecteigenaar niet relevant vindt en die het filter `doubtful` geeft, staat met `doubtful`.
  Een fout-positief dat we accepteren, staat in een eigen lijst, `knownFalsePositives`, met een commentaar.
- **Waarom:** een testgeval beschrijft wat het filter hoort te doen, niet alleen wat de projecteigenaar vindt.
  `doubtful` en `irrelevant` komen voor een bezoeker op hetzelfde neer, en de regel dat alleen "Heerenveen" `doubtful` is, is een bewuste keuze van #74.
  Een bekend fout-positief blijft zo zichtbaar, en niemand repareert het per ongeluk met een regel die clubberichten mist.
- **Uitkomst van de quiz:** de projecteigenaar en het filter zijn het eens over 19 van de 26 koppen.
  Het filter verbergt geen clubbericht.
  Zes koppen noemt de projecteigenaar niet relevant en geeft het filter `doubtful`: drie echte en drie verzonnen ("Nieuw VVV-kantoor in Heerenveen", "Ongeluk op de A7 tussen Heerenveen en Groningen" en "Heerenveen en Zwolle: wat de nieuwe treinverbinding betekent voor forenzen").
  De tabel van het issue gaf de drie verzonnen koppen `irrelevant`, maar ze noemen alleen "Heerenveen".
  "Man wint loterij in Heerenveen" toont het filter, door het woord "wint" (zie _Een volledige naam is genoeg, en "wint" en "verliest" zijn voetbalwoorden_).
- **Alternatieven:** de uitkomst van de projecteigenaar overnemen als verwachte waarde (dan falen drie tests tegen een bewuste keuze en moet de regel veranderen); alleen de koppen opnemen waar we het over eens zijn (dan verdwijnt het fout-positief uit beeld).

### Wedstrijdgegevens komen van de Nederlandse Wikipedia, voor het eerste mannenelftal

- **Datum:** 25 oktober 2026
- **Besluit:** het programma, de uitslagen en de stand komen van de Nederlandse Wikipedia, alleen voor sc Heerenveen 1 (mannen).
  Dat zijn de pagina's van het seizoen en de pagina van de KNVB Beker.
  We halen ze op met de bestaande fetcher en alleen via `/wiki/<pagina>?action=raw`.
- **Waarom:** het is gratis, zonder sleutel of account, ongeveer een kwartier na het laatste fluitsignaal bijgewerkt en met de beker erbij.
  Onderzoek van 25 oktober: alle tien uitslagen en de stand kwamen overeen met de site van de club en met drie andere sites.
  De licentie past bij ons open uitgangspunt.
- **Alternatieven:** de site van de club (geen voorwaarden gevonden, een verkeerde tijdzone in de gegevens, een stand zonder alle kolommen).
  football-data.org (geen beker, voorwaarden die ons binden nadat we stoppen).
  Sportmonks (ongeveer €290 per jaar).
  OpenFootball (verouderd).
  Eredivisie.nl en andere sites (verbieden scrapen).

### Onze wedstrijdgegevens zijn CC BY-SA 4.0

- **Datum:** 25 oktober 2026
- **Besluit:** de wedstrijdgegevens die we bewaren en tonen, publiceren we onder CC BY-SA 4.0, zoals de licentie van Wikipedia dat vraagt.
  Dat regelt het deel van #39 over de wedstrijdgegevens.
  De regel over de licentie in _Licentie: EUPL-1.2 voor de code en onze eigen teksten_ en het licentiedeel van de README zeggen dat nu ook.
- **Waarom:** het is de veiligste lezing van de share-alike.
  Of een tabel met feiten een bewerking is, is niet zeker, en deze keuze past bij ons open uitgangspunt.
- **Alternatieven:** de gegevens onder de EUPL laten vallen (kan botsen met de licentie van Wikipedia).
  Een jurist laten beoordelen of de share-alike geldt (kost tijd en geld voor weinig winst).

### Controles in plaats van een tweede bron

- **Datum:** 25 oktober 2026
- **Besluit:** Wikipedia is door vrijwilligers geschreven, dus de importer controleert elke lezing.
  Faalt een controle, dan blijft de laatste goede versie staan en schrijft de importer een waarschuwing.
  We zetten geen versie van de Wikipedia-pagina vast.
- **Waarom:** de club als tweede bron is uitgesloten, en een vastgezette versie vraagt meer code en meer toestand voor een zeldzaam geval.
  Het beheer (#272) is de uitweg als Wikipedia lang fout blijft.
- **Alternatieven:** de laatste goede versie van Wikipedia zelf vastzetten tot een mens ingrijpt.
  Elke wijziging eerst door iemand laten goedkeuren.

### De controles gelden op elk moment, ook midden in een speelronde

- **Datum:** 25 oktober 2026
- **Besluit:** de importer controleert het programma en de stand met `apps/importer/src/check-wikipedia.ts`:
  - sc Heerenveen speelt 34 competitiewedstrijden, elk in een eigen speelronde, 17 thuis en 17 uit;
  - de stand heeft 18 clubs;
  - per club is gespeeld gelijk aan gewonnen + gelijk + verloren, zijn de punten 3 × gewonnen + gelijk en is het doelsaldo gelijk aan voor min tegen;
  - over de hele stand zijn de doelpunten voor gelijk aan de doelpunten tegen, en het aantal gewonnen gelijk aan het aantal verloren;
  - de regel van sc Heerenveen in de stand komt overeen met onze eigen uitslagen: gespeeld, doelpunten en punten.
- **Waarom:** een controle die alleen klopt als alle clubs even vaak speelden, zou elk speelweekend falen.
  Midden in een speelronde hebben clubs een wedstrijd meer of minder gespeeld, maar elke gespeelde wedstrijd telt voor twee clubs, dus de sommen blijven kloppen.
  Een stand die pas voor de helft bijgewerkt is, valt zo wel op en komt een uur later in orde.
- **Alternatieven:** controleren dat alle clubs evenveel gespeeld hebben (faalt elk weekend).
  Alleen de regel van sc Heerenveen controleren (mist een tikfout bij een andere club).
- **Let op:** Wikipedia geeft in de pagina gewonnen, gelijk, verloren en doelpunten, niet gespeeld en punten.
  De importer rekent die twee uit, dus voor die twee is de controle per club een zekerheid van de code en geen controle van de bron.
  Een puntenaftrek zou de stand dan niet meer laten kloppen met de uitslagen.

### De aftrap staat in UTC en mag ontbreken

- **Datum:** 25 oktober 2026
- **Besluit:** de aftrap is een tijdstip in UTC dat mag ontbreken.
  Zonder tijd staat er het weekend of de datum zoals Wikipedia die geeft (`date_text`), en de eerste dag in `match_date`, zodat het programma op volgorde blijft.
  Een bezoeker ziet altijd Nederlandse tijd.
- **Waarom:** de KNVB maakt de data en tijden van speelronde 22 tot en met 32 pas op 22 december 2026 bekend.
  Alle tijden slaan we in UTC op, zoals de rest van de database.
- **Alternatieven:** een geschatte tijd tonen (geeft supporters een verkeerde tijd).
  Die wedstrijden niet tonen tot de tijd er is.

### Een seizoen heeft eigen rijen, en rijen van een eerder seizoen blijven bewaard

- **Datum:** 25 oktober 2026
- **Besluit:** elke wedstrijd en elke regel van de stand hoort bij een seizoen, dat op 1 juli begint (`2026/27`).
  De import leest alleen het lopende seizoen en laat rijen van eerdere seizoenen staan.
  Pagina's en blokken tonen alleen het lopende seizoen.
  `seasonOf` en `seasonStart` staan in `@fansite/db/season`, zodat de importer, de seed en de site hetzelfde seizoen kiezen.
- **Waarom:** bewaren kost bijna niets, en #39 (de geschiedenis) en een mogelijk archief beginnen dan met gegevens die er al zijn.
  Een nieuw seizoen hoeft niets te wissen.
- **Alternatieven:** de rijen bij elk nieuw seizoen vervangen (eenvoudiger, maar de uitslagen van een afgelopen seizoen zijn dan weg).
- **Later:** zie _Een seizoen heeft een eigen adres, `/wedstrijden/2025-26`, en een kiezer die zonder JavaScript werkt_: `/wedstrijden` en de statistieken tonen nu ook een eerder seizoen, op een adres van dat seizoen.
  Het lopende seizoen blijft op `/wedstrijden`, en de homepage toont alleen het lopende seizoen.
- **Later:** zie _Een eerder seizoen wordt eenmalig geïmporteerd met een opdracht, zonder selectie_.
  De uurlijkse import leest nog altijd alleen het lopende seizoen, en de rijen van eerdere seizoenen blijven bewaard.
  Alleen de opdracht `pnpm run import:season` leest een afgelopen seizoen.

### Een uitgestelde wedstrijd blijft in het programma staan als "Uitgesteld"

- **Datum:** 25 oktober 2026
- **Besluit:** een uitgestelde wedstrijd blijft op zijn plek in het programma, zonder nieuwe datum, en telt niet als gespeeld.
  Zodra Wikipedia een nieuwe datum heeft, nemen we die over.
  De importer herkent een uitgestelde wedstrijd aan een score die "uitgesteld" of "afgelast" zegt.
- **Waarom:** supporters zien dan waarom de wedstrijd niet doorging, en niemand zoekt hem tevergeefs.
  We hebben nog geen uitgestelde wedstrijd op de pagina gezien, dus de herkenning is een aanname.
  Schrijft Wikipedia het anders, dan geeft de import een fout en blijft de laatste goede versie staan.
- **Alternatieven:** de wedstrijd verbergen tot er een nieuwe datum is.

### Het weer valt buiten dit werk

- **Datum:** 25 oktober 2026
- **Besluit:** de optionele weersverwachting uit dit issue krijgt later een eigen issue.
- **Waarom:** een weerdienst is een tweede bron met eigen voorwaarden, en de server zou die zelf moeten ophalen zonder dat bezoekers iets aan een derde vragen.
  Dat werk past niet bij de import van de wedstrijden.
- **Alternatieven:** het weer nu meenemen.
  Dat maakt de import en de review groter.

### Drie pull requests in plaats van één

- **Datum:** 25 oktober 2026
- **Besluit:** #27 is gesplitst in de import (#27), de blokken en de pagina voor bezoekers (#271) en het aanpassen in het beheer (#272), in die volgorde.
- **Waarom:** de import, de pagina's en het beheer kunnen elk apart naar acceptatie.
  De import levert de gegevens, en de reviewer ziet per pull request één onderdeel.
- **Alternatieven:** vier issues, met de blokken van de homepage en de pagina `/wedstrijden` apart.
  Eén issue voor alles.

### De import van de wedstrijden slaagt of mislukt als geheel, één keer per uur

- **Datum:** 25 oktober 2026
- **Besluit:** de import leest de drie pagina's van het seizoen, controleert alles en schrijft dan de wedstrijden, de stand en de gelezen pagina's in één transactie.
  Is een pagina niet te lezen, of faalt een controle, dan verandert er niets.
  Ook een ontbrekende pagina van de beker houdt de hele import tegen.
  Een bekerpagina die er wel is maar nog geen wedstrijdsjabloon heeft, zoals vroeg in een seizoen, telt als "nog geen bekerwedstrijd".
  Heeft de import eerder bekerwedstrijden van die pagina gelezen, dan is zo'n pagina veranderd en houdt ze de import tegen.
  Een wedstrijd van sc Heerenveen die de import niet kent of niet kan lezen (een datum, een tijd of een score), is dezelfde fout.
  De import van de wedstrijden en de import van de feeds lopen in dezelfde run, maar een fout in de ene stopt de andere niet.
  Een mislukte import van de wedstrijden is een waarschuwing en geen fout van de run: de exitcode blijft 0.
- **Hoe vaak:** hoogstens één keer per uur, bijgehouden in `match_imports.retry_at` (59 minuten na elke poging, bij een verzoek om te wachten zo lang als Wikipedia vraagt).
  Een run die het uur nog niet vol vindt, schrijft niets.
- **Waarom:** een stand zonder de bijbehorende uitslag, of een programma zonder de beker, zou een bezoeker iets verkeerds laten zien.
  Een verkeerde wedstrijd die een uur te lang blijft staan, kost minder dan een half bijgewerkte pagina.
  Elk uur is vaak genoeg: Wikipedia is binnen een kwartier na het fluitsignaal bijgewerkt, en een bezoeker merkt een uur verschil nauwelijks.
  Een exitcode van 1 elk uur dat Wikipedia hapert, zou de cronmail vullen.
  De gezondheid in `pnpm run import:status` houdt de mislukte runs bij en geeft exitcode 1 bij drie op rij, zoals bij de feeds.
- **Alternatieven:** per pagina schrijven (de stand en de uitslagen kunnen dan elkaar tegenspreken).
  Elke 15 minuten lezen (vier keer zoveel verzoeken aan Wikipedia voor weinig winst).
  Een ontbrekende bekerpagina overslaan (een hernoemde pagina laat dan stil onze bekerwedstrijden verdwijnen).
  Een bekerpagina zonder sjablonen altijd tegenhouden (vroeg in het seizoen blokkeert dat de competitie wekenlang).

### Een uitslag die verandert, nemen we over, en na drie dagen met een waarschuwing

- **Datum:** 25 oktober 2026
- **Besluit:** verandert Wikipedia een uitslag, dan neemt de import de nieuwe uitslag over.
  Stond de oude uitslag drie dagen of langer vast, dan schrijft de import ook een waarschuwing met de oude en de nieuwe uitslag, in de uitvoer en in `match_imports.last_warning`.
  `matches.result_set_at` houdt bij sinds wanneer de uitslag zo staat; het verandert alleen als de uitslag verandert.
- **Waarom:** soms klopt de verbetering, en een tikfout herstellen is een gewone bewerking.
  Een uitslag die na dagen nog verandert, is zeldzaam genoeg om een mens te laten kijken, en dan kan het beheer (#272) de uitslag zetten.
- **Alternatieven:** een gewijzigde uitslag niet overnemen tot een mens hem goedkeurt (een goede verbetering blijft dan liggen).
  Elke wijziging van een uitslag melden (te veel meldingen voor een tikfout van een uur oud).

### De ronde is de kop boven de wedstrijd, en de versie van een pagina is de `Last-Modified`

- **Datum:** 25 oktober 2026
- **Besluit:** de speelronde van een wedstrijd is de kop boven het sjabloon op de pagina: `Speelronde 12` in de competitie, `Eerste ronde` in de beker.
  Zo hoeft een nieuw bekerseizoen geen code, en een wedstrijd is uniek per seizoen, competitie en ronde.
  `wikipedia_pages.version` bewaart de `Last-Modified` die Wikipedia bij de pagina stuurt.
- **Waarom:** de ruwe tekst van een pagina (`?action=raw`) komt zonder versienummer, en de API met het nummer is voor ons gesloten door `robots.txt`.
  De `Last-Modified` is het tijdstip van de versie die we lazen, en samen met de titel en het leestijdstip kan een bezoeker de geschiedenis van de pagina bekijken.
- **Alternatieven:** de rondes van de beker per seizoen met de hand benoemen (code om bij te houden).
  Een tweede verzoek om het versienummer uit de HTML te halen (ongeveer tien keer zo veel gegevens).
- **Later:** zie _De bronvermelding staat in een doorzichtige kaart, zonder link naar de geschiedenis_.
  De bronvermelding linkt niet meer naar de geschiedenis van de pagina; de bezoeker bereikt haar vanaf het artikel zelf.

### De verzonnen wedstrijden komen alleen in een leeg seizoen

- **Datum:** 25 oktober 2026
- **Besluit:** de seed zet verzonnen wedstrijden en een verzonnen stand in het lopende seizoen, maar alleen als dat seizoen nog geen wedstrijden of stand heeft.
  De datums tellen vanaf het moment van de seed, dus het seizoen is altijd het lopende.
  De verzonnen uitslagen hebben geen `result_set_at`, zodat de import niet waarschuwt als hij ze vervangt.
- **Waarom:** de site zet de seed op acceptatie bij elke start (zie _De testbronnen staan alleen op acceptatie_).
  Zonder deze regel zouden de verzonnen wedstrijden de echte van Wikipedia bij elke start overschrijven.
  De eerste echte import vervangt de verzonnen wedstrijden en de verzonnen stand.
- **Alternatieven:** de verzonnen wedstrijden in een eigen seizoen zetten (de pagina's tonen dan niets in het lopende seizoen).
  De seed op acceptatie niet voor wedstrijden laten lopen (de toegankelijkheidscontrole heeft ze nodig).

### De selectie komt van de Nederlandse Wikipedia, zoals de wedstrijden

- **Datum:** 26 oktober 2026
- **Besluit:** de lijst met spelers voor de zoekpagina komt uit de tabel "Spelers" op de pagina van het seizoen van sc Heerenveen op de Nederlandse Wikipedia, via de importer, met dezelfde controles, bronvermelding en licentie (CC BY-SA 4.0) als de wedstrijden.
  We bewaren alleen de naam, de positie en het rugnummer.
- **Waarom:** het is dezelfde bron, hetzelfde besluit en dezelfde techniek als bij #27, dus er komt geen nieuwe afspraak bij.
  Een transfer staat binnen dagen op Wikipedia, dus niemand houdt een lijst bij.
- **Alternatieven:** een lijst in het beheer die een redacteur bijhoudt (er is geen redactieproces voor, en hij is na elke transfer verouderd).
  De namen uit de doelpuntenmakers (#297) halen (alleen spelers die scoorden, dus onvolledig).
  De site van de club (geen toestemming, zie #16).
- **Later:** we bewaren sinds 27 oktober 2026 ook de pagina van de speler op Wikipedia en of hij nog in de selectie staat; zie _Spelers hebben een vaste `id`, en doelpunten verwijzen ernaar_.

### De zoekterm is de achternaam, als eigen kolom

- **Datum:** 26 oktober 2026
- **Besluit:** bij elke speler bewaren we een zoekterm: de naam zonder de eerste voornaam.
  De lijst toont de volledige naam, een klik zoekt op de zoekterm.
- **Waarom:** media schrijven "Klaverboer" of "Van der Flier", zelden de volledige naam.
  Een zoekopdracht op de achternaam vindt ook de koppen met de volledige naam.
- **Alternatieven:** zoeken op de volledige naam (mist de meeste koppen).
  De zoekterm elke keer uit de naam afleiden (kan niet voor één speler worden gecorrigeerd, zoals een speler die onder één naam bekend is).

### De selectie heeft een eigen gezondheidsrij, en een bekende speler houdt zijn zoekterm

- **Datum:** 26 oktober 2026
- **Besluit:** de import van de selectie heeft een eigen tabel voor de gezondheid, `squad_imports`, met dezelfde velden als `match_imports`, en een eigen uur: hij loopt in dezelfde run als de wedstrijden, na de wedstrijden, en een fout in de ene stopt de andere niet.
  De pagina van de selectie staat in `wikipedia_pages` met `kind` `squad`, voor de bronvermelding op de zoekpagina (#107).
  `listWikipediaPages` geeft alleen de pagina's van de wedstrijden, dus de selectie staat niet in de bronvermelding van `/wedstrijden`.
  Een goede lezing vervangt de selectie van het lopende seizoen, maar zet de zoekterm alleen bij een nieuwe speler: een speler die er al is, houdt de zoekterm die hij heeft.
  De naam geldt als dezelfde speler zoals de database namen vergelijkt, zonder accenten en hoofdletters.
  Een naam die met een voorvoegsel begint, zoals "Van Bergen", heeft geen voornaam en blijft heel.
  De seed zet een verzonnen selectie, maar alleen in een lopend seizoen zonder spelers, zoals bij de verzonnen wedstrijden (zie _De verzonnen wedstrijden komen alleen in een leeg seizoen_).
- **Waarom:** een eigen rij houdt een mislukte selectie en een mislukte wedstrijdlezing uit elkaar, en de wedstrijden en de feeds gaan door als de tabel van de selectie verandert.
  Een zoekterm die de import elk uur terugzet, maakt de eigen kolom zinloos: een verbetering voor één speler, zoals "Jan Paul van Hecke", blijft zo staan tot hij vertrekt.
- **Alternatieven:** de gezondheid van de selectie in `match_imports` zetten (een kolom of rij erbij voor iets wat een eigen uur en een eigen uitkomst heeft).
  De zoekterm bij elke lezing opnieuw afleiden (de eigen kolom heeft dan geen nut).
- **Later:** een goede lezing vervangt de selectie sinds 26 oktober 2026 niet meer: een speler die niet meer in de tabel staat, verdwijnt niet maar blijft staan als "niet meer in de selectie", met zijn `id` en zijn doelpunten; zie _Spelers hebben een vaste `id`, en doelpunten verwijzen ernaar_.

### Spelers hebben een vaste `id`, en doelpunten verwijzen ernaar

- **Datum:** 26 oktober 2026
- **Besluit:** een doelpunt van een speler van ons verwijst met `player_id` naar zijn rij in `players`.
  De rij houdt zijn `id` bij elke import.
  Een speler die uit de selectie verdwijnt, blijft staan als "niet meer in de selectie".
- **Waarom:** een naam in tekst koppelt twee spelers met dezelfde achternaam aan elkaar, en een achternaam komt niet overeen met de volledige naam in de selectie.
  Een verwijzing naar de rij maakt de topscorers juist, en geeft latere functies (een pagina per speler, statistieken) een vaste plek.
  De selectie moet daarvoor worden bijgewerkt en niet vervangen, anders breekt elke nieuwe import de verwijzingen.
- **Hoe:** `players` heeft `in_squad` en `left_squad_at`, en `match_goals` heeft `player_id` (`ON DELETE SET NULL`) en `wikipedia_page`.
  De import van de selectie zoekt een speler op zijn pagina en anders op zijn naam, zonder accenten en hoofdletters, en past hem aan: een nieuwe speler komt erbij, naam, positie, rugnummer en pagina worden bijgewerkt, en wie terugkomt staat weer in de selectie.
  Wie uit de tabel verdwijnt, krijgt `in_squad` onwaar en het moment in `left_squad_at`, en blijft staan met zijn doelpunten.
  `listSquad` toont alleen de spelers die in de selectie staan, dus ook de lijst van #107.
  De kaart met doelpuntenmakers telt een gekoppeld doelpunt per `id` en toont de volledige naam, een doelpunt zonder speler per naam als een eigen rij.
- **Alternatieven:** doorgaan met namen in tekst en per naam tellen (twee spelers met dezelfde achternaam tellen samen); de verwijzing maken met de zoekterm of de achternaam (breekt bij dezelfde achternaam); de selectie bij elke lezing vervangen en de doelpunten opnieuw koppelen (de `id`'s veranderen, dus een link of een pagina per speler breekt later).
- **Later:** een doelpunt zonder speler maar met een Wikipedia-pagina telt sinds 30 oktober 2026 voor die pagina en toont de titel als volledige naam; zie _Zonder koppeling is de naam van een doelpuntenmaker de titel van zijn Wikipedia-pagina_.

### De Wikipedia-pagina van een speler is de sleutel, de naam is de reserve

- **Datum:** 26 oktober 2026
- **Besluit:** de importer koppelt eerst op de pagina van de link, dan op de volledige naam, dan op een achternaam die maar één speler heeft, en laat anders `player_id` leeg.
- **Waarom:** de pagina is wat Wikipedia zelf in de selectie en in de doelpunten gebruikt, en is uniek per speler.
  De volledige naam en de achternaam vangen schrijfwijzen op die de pagina niet geven, zonder een gok bij twee spelers met dezelfde achternaam.
- **Hoe:** de regels staan op één plek, `playerLinker` in `apps/importer/src/link-players.ts`, en de import van de wedstrijden past ze toe bij elke lezing.
  Alleen een doelpunt van een speler van ons krijgt een koppeling: een doelpunt van sc Heerenveen dat geen eigen doelpunt is, en een eigen doelpunt dat bij de tegenstander staat.
  De spelers van andere clubs staan niet in `players`.
  Bij de achternaam tellen ook spelers die niet meer in de selectie staan, zodat een vertrokken speler met dezelfde achternaam een gok niet verkeerd laat uitvallen.
  Een doelpunt van ons dat niet te koppelen is, houdt de wedstrijd bewaard en geeft een waarschuwing met het aantal en de namen, zodra de selectie is gelezen.
  `pnpm run import:status` toont hetzelfde aantal.
  Zo'n doelpunt krijgt zijn speler bij een latere lezing, want de import van de wedstrijden schrijft de doelpunten van een wedstrijd opnieuw als een koppeling verandert.
- **Alternatieven:** alleen op de achternaam koppelen (fout bij dezelfde achternaam); een koppeling met de hand in het beheer (er is geen redactieproces voor, en na elke transfer verouderd).

### De eerste goede lezing van de selectie vervangt de verzonnen selectie

- **Datum:** 27 oktober 2026
- **Besluit:** de eerste goede lezing van de selectie van een seizoen haalt eerst de spelers van dat seizoen weg, en zet dan de spelers van Wikipedia erin.
  Daarna werkt de import de selectie alleen nog bij.
- **Waarom:** de seed zet een verzonnen selectie, zoals bij de verzonnen wedstrijden.
  Zonder deze regel bleven die spelers voor altijd staan als "niet meer in de selectie", en kon een doelpunt van een echte speler op een verzonnen speler met dezelfde achternaam vallen.
  De import herkent de eerste goede lezing eraan dat `squad_imports` nog geen geslaagde lezing heeft.
- **Alternatieven:** de verzonnen spelers laten staan (rommel in de tabel en kans op een verkeerde koppeling); de verzonnen spelers een eigen seizoen geven (de pagina's tonen dan niets in het lopende seizoen, zoals bij de verzonnen wedstrijden).

### Een eerder seizoen wordt eenmalig geïmporteerd met een opdracht, zonder selectie

- **Datum:** 29 oktober 2026
- **Besluit:** `pnpm run import:season <seizoen>` importeert de wedstrijden, doelpunten, stand en bronpagina's van een afgelopen seizoen, zoals `2025/26`.
  De opdracht gebruikt dezelfde fetcher, controles en opslag als de uurlijkse import, in één transactie, en kost drie verzoeken aan Wikipedia.
  De uurlijkse import blijft het lopende seizoen lezen, en `pnpm run import:status` gaat over het lopende seizoen.
  De selectie van een eerder seizoen komt er niet bij, dus die doelpunten hebben geen `player_id`.
- **Waarom:** een afgelopen seizoen verandert niet meer, dus elk uur lezen kost verzoeken aan Wikipedia zonder winst.
  Een aparte opdracht met een controle op het seizoen houdt het lopende seizoen veilig: de opdracht weigert het lopende en een toekomstig seizoen, voordat ze iets vraagt of schrijft.
  De vergelijking met het vorige seizoen (#413) heeft de selectie niet nodig, en `players` is een begrip van nu.
- **Gevolg:** op de host draait de opdracht uit hetzelfde bestand als de uurlijkse import, met `import.mjs --season 2025/26`, zodat de host geen tweede bestand nodig heeft.
  Zonder die optie doet het bestand niets anders dan voorheen.
  De opdracht neemt de lock van de import, dus ze loopt nooit naast een run van cron.
  Ze schrijft wel de rij van dat seizoen in `match_imports`, maar de status en de waarschuwingen tellen alleen het lopende seizoen, zodat een seizoen dat niet wordt ververst nooit als ongezond meetelt.
- **Alternatieven:** de uurlijkse import ook het vorige seizoen laten lezen (verzoeken zonder reden, en een seizoen dat ongezond kan worden).
  Een parameter van `pnpm run import` zelf (een foutje met de opdracht raakt dan de uurlijkse run).
  Ook de selectie van 2025/26 importeren (nodig voor spelers bij doelpunten, maar niet voor deze vergelijking).

### De bekerpagina's van eerdere seizoenen schrijven de score met de stand bij de rust, en de lezer kent die vorm

- **Datum:** 30 oktober 2026
- **Besluit:** `readCup` leest `eindstand (rust)` en `eindstand (stand na 90 minuten, rust)`, en een tijd met of zonder "uur".
  De eindstand is de score van de wedstrijd, en de waarden in de haakjes worden gelezen en gecontroleerd maar nog niet opgeslagen.
- **Waarom:** de pagina's van 2021/22 tot en met 2024/25 schrijven zo, en zonder dit stopt de import van die seizoenen.
  De stand na 90 minuten is de gegevens waar #300 om vraagt, dus de lezer vergeet hem niet.
- **Controles:** een stand bij de rust is niet hoger dan de stand na 90 minuten of, zonder die, de eindstand.
  Een stand na 90 minuten is niet hoger dan de eindstand en hoort bij een wedstrijd met verlenging (`aet`).
  Een score die niet klopt, is een fout met de naam van de wedstrijd, zoals een score die niet te lezen is.
  De haakjes werken ook voor de competitie, want de lezer van een score is voor beide dezelfde; de competitiepagina's van 2021/22 tot en met 2024/25 hebben ze niet.
- **Alternatieven:** de haakjes weggooien (de stand na 90 minuten gaat dan verloren en #300 moet de pagina opnieuw lezen).
  Elke onbekende vorm als fout laten staan (de import van eerdere seizoenen mislukt).

### Een gestaakte wedstrijd telt niet, de latere uitslag geldt

- **Datum:** 29 oktober 2026
- **Besluit:** een blok met de score "Gestaakt ..." telt niet zolang de pagina onder dezelfde kop (dezelfde speelronde) voor dezelfde twee clubs een later blok heeft.
  Het latere blok geldt, met zijn datum en aftrap.
  Zonder later blok stopt de import met een fout die de wedstrijd noemt.
  Een voetnoot (`<ref>...</ref>`) haalt de reader weg voordat hij de pagina leest, dus een datum met een voetnoot leest als de datum.
- **Waarom:** de pagina van 2025/26 heeft twee blokken voor NAC Breda – sc Heerenveen in speelronde 33, en de uitslag van de KNVB (2–0, op 11 mei 2026) is de definitieve.
  Een tweede blok in dezelfde speelronde zou de controle op één wedstrijd per ronde laten falen.
  Een gok bij een onbekende score is erger dan een fout.
- **Alternatieven:** de gestaakte wedstrijd houden en het latere blok overslaan (de datum en de aftrap kloppen dan niet met de definitieve uitslag).
  Elke "Gestaakt"-score als fout laten staan (het vorige seizoen is dan niet te lezen).

### Een kop over de tegenstander is `relevant` in de week voor en na de wedstrijd

- **Datum:** 26 oktober 2026
- **Besluit:** noemt een kop een club tegen wie sc Heerenveen een wedstrijd speelt die hoogstens 7 dagen voor of na de publicatie ligt, dan is de kop `relevant`, ook zonder de naam van onze club.
- **Waarom:** de voorbeschouwing en de nabeschouwing van een wedstrijd gaan ook over ons, en de kop noemt vaak alleen de tegenstander ("ADO beleeft frustrerende avond").
  De wedstrijden staan sinds #27 in de database, dus het filter kan weten wie wanneer onze tegenstander is.
- **Hoe:** de regel komt erbij op het eind van `judgeRelevance`, en maakt alleen van een `doubtful` of `irrelevant` kop een `relevant` kop.
  - `judgeRelevance` blijft zuiver.
    Het krijgt de namen van de tegenstanders als tweede argument, en leest zelf niets uit de database.
  - `importFeeds` leest de wedstrijden van het lopende seizoen één keer per run, en geeft `opponentsAround` bij elk bericht de wedstrijden mee.
    Wedstrijden van een eerder seizoen tellen niet, want `pnpm import:season` zet er ook in de tabel.
    Een wedstrijd die de Wikipedia-import in dezelfde run bewaart, telt vanaf de volgende run.
  - Het venster loopt van de datum van de wedstrijd min 7 dagen tot en met plus 7 dagen.
    De dag van het bericht en `match_date` zijn Nederlandse dagen (`Europe/Amsterdam`).
    Een uitgestelde wedstrijd zonder nieuwe datum telt niet.
    Een club die twee keer tegen ons speelt, heeft per wedstrijd een venster.
  - Het verband tussen de naam in `matches.opponent` en de woorden van het filter staat in `relevance-terms.ts`: `otherClubGroups` zet de namen van één club bij elkaar ("ado den haag" en "ado", "nec" en "n e c").
    De naam uit de wedstrijd, of zonder voor- of achtervoegsel uit `clubPrefixes` (FC, SC, VV, SV, AFC), moet een van die namen zijn.
    Een club die naar een plaats heet, telt dus alleen met zijn volledige naam ("FC Twente").
  - Staat de tegenstander niet in de lijst, zoals een amateurclub in de beker, dan telt zijn naam zonder voor- of achtervoegsel, als hij uit twee woorden bestaat ("Excelsior Maassluis", "Quick Boys").
    Eén woord telt ook, tenzij het een gewoon woord is (`ordinaryClubWords`) of alleen een voorvoegsel ("AFC").
- **Nadeel:** de regel kijkt niet of de kop over de wedstrijd tegen ons gaat.
  Een kop over een andere wedstrijd van de tegenstander in die week wordt ook `relevant` (zie de meting in de pull request van #315).
- **Alternatieven:** niets doen (een supporter mist de berichten over de tegenstander rond de wedstrijd).
  Elke kop met een andere profclub `relevant` maken (te veel: elk bericht over de Eredivisie komt erdoor).
  `doubtful` in plaats van `relevant` (de projecteigenaar wil ze tonen).
  Een ander venster dan 7 dagen (een week voor en na past bij de speelweek, en de Builder kan het meten).
  Het filter zelf de database laten lezen (dan is het niet meer zuiver en zijn de tests trager).
- **Later:** zie _Een kop over de tegenstander is `relevant` van 3 dagen voor tot 3 dagen na de wedstrijd, en alleen als hij geen andere profclub noemt_: het venster is 3 dagen voor en 3 dagen na de wedstrijd, en een kop met een tweede profclub telt niet.
  De rest blijft: het filter blijft zuiver, alleen het lopende seizoen telt, de dagen zijn Nederlandse dagen en `otherClubGroups` legt het verband met de namen.

### Een kop over de tegenstander is `relevant` van 3 dagen voor tot 3 dagen na de wedstrijd, en alleen als hij geen andere profclub noemt

- **Datum:** 30 oktober 2026
- **Besluit:** het venster van de regel over de tegenstander loopt van 3 dagen voor tot en met 3 dagen na de dag van de wedstrijd, en een kop die ook een andere profclub uit `otherClubGroups` noemt, telt niet.
  - `opponentDaysBefore` en `opponentDaysAfter` zijn allebei 3 in `apps/importer/src/relevance.ts`.
    Een bericht van 3 dagen voor de wedstrijd telt, een bericht van 4 dagen ervoor niet, en een bericht van 3 dagen erna telt, een bericht van 4 dagen erna niet.
  - `judgeRelevance` laat de kop alleen door als hij een naam van de tegenstander heeft en geen naam van een andere club in de lijst.
    Een club die naar een plaats heet, telt als andere club alleen met zijn volledige naam, zoals de lijst nu al doet.
    De woorden van de naam van de tegenstander tellen niet mee als andere club, zodat "Excelsior Maassluis" niet ook "Excelsior" uit Rotterdam is.
- **Waarom:** de meting op de berichten die de importer toen had (30 oktober 2026): van de 8 koppen die de regel `relevant` maakte, ging er 1 over de wedstrijd tegen ons.
  De andere 7 gingen over een andere wedstrijd van de tegenstander in dezelfde week: vijf koppen over N.E.C. tegen Groningen, zes dagen voor onze wedstrijd tegen N.E.C., een podcast over ADO, en het bekerduel van ADO bij Excelsior'31.
  In de dagen voor de wedstrijd gaat het nieuws over de tegenstander vooral over hun vorige wedstrijd, en dat gaat niet over ons.
  Een nabeschouwing komt meestal in de dagen na de wedstrijd, dus het venster erna is even lang als dat ervoor.
- **Nadeel:** een voorbeschouwing van meer dan 3 dagen voor de wedstrijd mist de regel.
  Een kop over de tegenstander in de 3 dagen na de wedstrijd, die niet over de wedstrijd gaat (zoals een podcast over ADO), blijft `relevant`.
  Een nabeschouwing van meer dan 3 dagen na de wedstrijd mist de regel ook.
- **Alternatieven:** het venster van 7 dagen aan beide kanten houden (7 van de 8 koppen waren een misser).
  3 dagen voor en 7 dagen na (de eerste versie van dit besluit): dat gaf dezelfde twee koppen, maar een langer venster laat meer koppen door die niet over de wedstrijd gaan.
  Alleen de aanscherping met de tweede club (dat haalt twee van de zeven missers weg).
  Alleen het kortere venster (dat haalt de vijf koppen over N.E.C. weg).

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
- **Later:** zie _De toon en de schrijfwijzer staan in het hoofdstuk Redactie_: de schrijfwijzer staat nu in het hoofdstuk, in plaats van in #19.

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
  De lijn bovenaan en de rol `--hf-colour-border-footer` zijn daarna weggehaald; zie _De footer heeft geen lijn bovenaan_.

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
- **Later:** de sitemap heeft ook een regel voor elk gepubliceerd artikel van de redactie, uit de database; zie _Een artikel is gepubliceerd als `published_at` gevuld is en niet na nu ligt_.
  Alleen de lijst met pagina's in `pages.ts` blijft de lijst van vaste pagina's.

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
- **Later:** van een discussie van meer dan zeven dagen staan de korte dag en de datum, zoals "wo 16 okt" (29 oktober 2026).
  Zie _Een publicatiedatum van meer dan een week oud is de korte dag en de datum, zonder tijd_.

### De homepage toont het nieuws van twee weken

- **Datum:** 24 oktober 2026
- **Besluit:** de homepage toont alle berichten van vandaag en de dertien dagen ervoor, in Nederlandse tijd, het nieuwste eerst, zonder maximum, in één lijst.
- **Waarom:** met een paar bronnen komen er per week weinig berichten bij, en een bezoeker die een paar dagen niet keek, ziet zo meer.
  Wachten op het archief (#26) laat de homepage tot Release 2 bij een week.
- **Alternatieven:** een week houden en een pagina met meer nieuws bouwen (#26); dat is groter en komt later.
  Of een vast aantal, zoals de nieuwste 20 of 50, wat we eerder al afwezen.
- **Later:** zie _De homepage toont het nieuws van de afgelopen week, per dag_ en _Het nieuws staat in één lijst, met dag en tijd in een eigen kolom_; van die twee blijft de lijst en vervalt de week.
- **Later:** zie _Het nieuws heeft geen grens in de tijd, en een grens van 100 koppen_; de twee weken vervallen.

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
- **Later:** van een bericht van meer dan zeven dagen staan de korte dag en de datum, zonder tijd: "wo 21 okt" (29 oktober 2026).
  De weekdag staat dan wel bij de datum, dus de reden dat "wo" twee woensdagen kan zijn, geldt niet meer.
  Zie _Een publicatiedatum van meer dan een week oud is de korte dag en de datum, zonder tijd_.

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
- **Later:** de kolom is 4,5 rem breed, voor de korte dag met de datum, zoals "ma 10 mei" (29 oktober 2026).
  Zie _Een publicatiedatum van meer dan een week oud is de korte dag en de datum, zonder tijd_.

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
  Of de strook weglaten; dan wisselt de statusbalk bij scrollen van kleur, en schuift lichte inhoud onder de witte tekst ervan.
- **Later:** de strook is nu een echt element en in Safari op een iPhone minstens 8 pixels hoog, en niet langer een pseudo-element zonder hoogte; zie _De rand bovenaan in Safari heeft de kleur van de kop, door een echte strook van minstens 8 pixels_.
- **Gecontroleerd en niet gecontroleerd:** in de iOS Simulator, in Safari, in staande en liggende stand.
  De statusbalk van een app op het beginscherm en de strook eronder laat de simulator niet zien, want Safari heeft bovenin geen inset; de projecteigenaar kijkt dat na op een echte telefoon.

### Alleen een extern item in het hoofdmenu krijgt het pictogram

- **Datum:** 25 oktober 2026
- **Besluit:** een item van `Navigation` met `external` krijgt het pictogram voor een externe link, hetzelfde als bij de koppen van het nieuws.
  In het hoofdmenu is dat alleen het Forum.
- **Waarom:** het Forum is het enige item in het menu dat naar een ander adres gaat; de andere items zijn pagina's van de site.
  Het pictogram zegt dat zonder woorden, en het is hetzelfde teken als bij de koppen, dus een bezoeker kent het al.
  Een schermlezer hoort "Forum", zoals bij de koppen de naam van de kop; het pictogram is versiering voor het oog.
- **Alternatieven:** het pictogram bij elke externe link op de site; dat is meer werk en raakt teksten die een eigen opmaak hebben.
  Of het afleiden uit het adres (`https://`); dat is minder expliciet dan een optie.
  Of een tekst "externe site" voor schermlezers; dat kan later voor alle externe links tegelijk.

### De tekening van het pictogram staat in een eigen intern component

- **Datum:** 25 oktober 2026
- **Besluit:** de tekening van het pictogram voor een externe link staat in `ExternalLinkIcon`, in een eigen map met een eigen CSS-bestand (`external-link-icon.css`) en een eigen test.
  `NewsItem` en `Navigation` gebruiken het.
  Het component staat niet in de uitvoer van het package en heeft geen eigen story: het pictogram is een onderdeel van die twee, en hun stories tonen het in licht en donker.
  De grootte, de ruimte ervoor en de plaats in de regel zijn voor de nieuwsregel en het menu gelijk.
- **Waarom:** één tekening betekent één plek om aan te passen, en het pictogram ziet er overal hetzelfde uit.
  Een bezoeker of een pagina heeft het niet los nodig; wie het nodig heeft, kan het later exporteren.
  Dit volgt `Pompebled` in de map van het logo, dat ook een intern onderdeel zonder eigen story is.
- **Alternatieven:** het pictogram exporteren uit het package; dat maakt er een deel van de interface van, terwijl niets op de site het los gebruikt.
  Of de tekening in beide componenten laten staan; dan lopen ze uit elkaar.
- **Later:** zie _Pictogrammen zijn zelf getekend, bij een link erachter en bij een knop ervoor_; `ExternalLinkIcon` is daarin opgegaan in `Icon`.

### Elke kaart op de homepage toont vijf items, uit één gedeelde waarde

- **Datum:** 25 oktober 2026
- **Besluit:** elke kaart met een lijst op de homepage toont standaard vijf items, uit één gedeelde waarde, `itemsPerCard` in `apps/site/src/items-per-card.ts`.
  De kaarten met nieuws, discussies en podcasts gebruiken die, en een kaart met een lijst die later bijkomt ook.
  De importer bewaart de vijf nieuwste discussies in plaats van vier.
  De pagina `/podcasts` houdt zijn eigen paginering (25 per pagina) en filter.
- **Waarom:** de kaarten wisselden (twee weken, vier, vier) en horen op een rij gelijk te zijn.
  Eén waarde houdt ze gelijk.
- **Hoe:** het aantal van de importer, `discussionsToKeep` in `apps/importer/src/read-forum.ts`, is een eigen waarde: de importer en de site delen geen code, en de importer mag niet minder bewaren dan de site toont.
- **Alternatieven:** per kaart een eigen aantal, zoals nu; ook `/podcasts` op vijf zetten (meer pagina's voor dezelfde afleveringen).
- **Later:** het nieuws begint sinds 25 oktober 2026 met tien koppen en laadt er vijf bij; de kaarten met discussies en podcasts blijven op vijf.
  Zie _De nieuwskaart begint met tien koppen_.

### "Laad 5 meer" werkt zonder JavaScript

- **Datum:** 25 oktober 2026
- **Besluit:** onder de lijst van de nieuwskaart staat de knop "Laad 5 meer" als er oudere koppen zijn.
  De knop zit in een `Form` met `method="get"`: hij heeft `name="nieuws"` en als `value` het aantal na de volgende vijf.
  Het formulier gaat naar de eerste nieuwe kop: elke kop in de lijst heeft een `id` met zijn nummer (`nieuws-6`), en het formulier gaat naar `/#nieuws-6` als er vijf koppen staan.
  De pagina laadt zo opnieuw met `?nieuws=10#nieuws-6` in het adres, en de bezoeker blijft op dezelfde plek: de nieuwe koppen staan bovenaan het scherm.
  Er komt geen script bij en geen API, en geen component in het designsysteem: het is een `Button` in een `Form`.
- **Waarom:** de site werkt voor iedereen, ook zonder script, en we hebben dan geen API en geen client-component nodig.
  Het aantal is geen persoonsgegeven en er komt geen cookie bij.
- **Hoe:** de pagina vraagt de database om één kop meer dan ze toont, om te weten of de knop nodig is.
  Het adres van een pagina met `?nieuws=` is de homepage zelf als canoniek adres, en zo'n pagina staat niet in de sitemap.
- **Gecontroleerd:** in Chromium, op een telefoon van 390 en een bureaublad van 900 pixels breed, met en zonder JavaScript.
  Na de klik staat de eerste nieuwe kop bovenaan het scherm (op de telefoon op 0 pixels, op het bureaublad op 85 pixels omdat de pagina niet verder scrollt), en de koppen eronder zijn de nieuwe.
  De focus staat bovenaan de pagina, en Tab gaat naar de link van de eerste nieuwe kop.
  Wij hebben dit niet met een schermlezer geprobeerd.
- **Eerst gekozen en weer losgelaten:** het formulier ging eerst naar de kaart zelf (`/#nieuws`).
  Dan sprong de pagina na de klik naar de bovenkant van de kaart, en moest de bezoeker de nieuwe koppen zelf zoeken.
- **Alternatieven:** de koppen met JavaScript ophalen en toevoegen (vloeiender, maar een API en niets voor wie geen script heeft); dat kan later als aanvulling.
- **Later:** de knop is weg en de homepage kent `?nieuws=` niet meer; zie _De homepage heeft geen knop "Laad 5 meer" meer, maar de link "Alle koppen"_.
  Het besluit blijft gelden voor de knop op andere pagina's, zoals de pagina met de gehouden nullen en `/zoeken`.

### Het nieuws heeft geen grens in de tijd, en een grens van 100 koppen

- **Datum:** 25 oktober 2026
- **Besluit:** het nieuws op de homepage heeft geen grens in de tijd meer (de twee weken van _De homepage toont het nieuws van twee weken_ vervallen), met een grens van 100 koppen.
  Het aantal in het adres is een geheel getal vanaf 5, in stappen van 5, en nooit meer dan 100; een ander getal, of een getal dat twee keer in het adres staat, geeft de eerste vijf.
  Bij 100 koppen verdwijnt de knop ook; ouder nieuws is voor het archief (#26).
- **Waarom:** met vijf koppen eerst is de lengte van de pagina geen reden meer voor een tijdgrens.
  De grens van 100 houdt een adres met een groot getal niet tot een zware vraag aan de database; het archief (#26) is voor ouder nieuws.
- **Hoe:** de server bewaart de lijst per getal vijf minuten, en omdat een getal dat niet klopt de lijst van vijf deelt, zijn er hoogstens twintig lijsten (5 tot en met 100).
  Een bezoeker kan het geheugen van de server dus niet vullen met adressen van zichzelf.
  Een bericht van een ander jaar toont het jaar bij de datum ("30 dec 2025 11:00"), want zonder grens in de tijd is "30 dec" niet meer duidelijk.
- **Alternatieven:** de twee weken houden als grens van de knop; geen grens, ook niet van aantal (een pagina die onbeperkt kan groeien).
- **Later:** het aantal in het adres is een geheel getal vanaf 10, in stappen van 5; een ander getal geeft de eerste tien, en er zijn hoogstens negentien lijsten (10 tot en met 100).
  Zie _De nieuwskaart begint met tien koppen_.
- **Later:** zie _Het nieuwsarchief staat op `/nieuws`, met 50 koppen per pagina en een filter per bron_; het archief is er, en de grens van 100 koppen op de homepage blijft.
- **Later:** de grens van 100 koppen en de getallen in het adres vervallen met de knop; zie _De homepage heeft geen knop "Laad 5 meer" meer, maar de link "Alle koppen"_.
  Het nieuws heeft nog steeds geen grens in de tijd.

### De nieuwskaart begint met tien koppen

- **Datum:** 25 oktober 2026
- **Besluit:** de nieuwskaart op de homepage begint met tien koppen en laadt er steeds vijf bij.
  De kaarten met discussies en podcasts blijven op vijf.
  Het nieuws heeft zo twee eigen waarden naast `itemsPerCard`, alle drie in `apps/site/src/items-per-card.ts`: `firstHeadlines` (10) en `moreHeadlines` (5).
  Het aantal in het adres (`?nieuws=`) is een geheel getal vanaf 10, in stappen van 5, en nooit meer dan 100; een ander getal, ook 5, geeft de eerste tien.
  Zijn er tien koppen of minder, dan is er geen knop.
- **Waarom:** het nieuws is de hoofdkaart van de pagina.
  Met tien koppen ziet een bezoeker meer zonder te klikken, terwijl de kaarten naast het nieuws kort blijven.
- **Alternatieven:** alle kaarten op vijf, zoals _Elke kaart op de homepage toont vijf items, uit één gedeelde waarde_ besloot; alle kaarten op tien, wat de kaarten met discussies en podcasts langer maakt dan nodig.
- **Later:** de nieuwskaart heeft tien koppen en geen knop meer, en `moreHeadlines` en `?nieuws=` zijn weg; zie _De homepage heeft geen knop "Laad 5 meer" meer, maar de link "Alle koppen"_.

### Storybook en het Forum krijgen dezelfde iconen als de fansite, op een eigen vlak

- **Datum:** 25 oktober 2026
- **Besluit:** Storybook (ds.heerenveen.org) heeft dezelfde iconen als de fansite, het schild van het logo, maar het vlak van het `apple-touch-icon` en het afgesneden icoon is het roze van Storybook, `#ff4785`.
  Voor het Forum, voor later, maken we dezelfde iconen op `blue-600` (`#1559aa`) uit de kleurtokens van het designsysteem: een lichter blauw dan de kop van de fansite.
  De iconen van Storybook staan in `packages/design-system/src/assets/icons/storybook`, die van het Forum in `.../forum`.
  Het script `pnpm --filter site icons` maakt alle drie de sets, en `src/icons.test.ts` controleert ze.
- **Waarom:** in de favorieten van Safari toonde ds.heerenveen.org een roze vlak met een S, omdat de pagina alleen de SVG van Storybook zelf aanwijst en `/favicon.ico` en `/apple-touch-icon.png` niet bestonden.
  Het roze is de eigen kleur van Storybook (uit zijn `favicon.svg`), zodat Storybook en de fansite op een telefoon of in de favorieten niet voor elkaar worden aangezien.
  Het Forum krijgt een lichter blauw: dat hoort bij de huisstijl en is te onderscheiden van het donkerblauw van de fansite.
  Een icoon is geen tekst, maar het contrast met het vlak is er wel: de witte rand van het schild haalt op het roze 3,2:1 en op `blue-600` 6,9:1.
- **Alternatieven:** zand (`sand-300`) voor het Forum; dat vond de projecteigenaar niet bij de huisstijl passen.
  Of `blue-500`: daar verdwijnen de blauwe randen en de banen van het schild in het vlak.
  Of `blue-700`, dat de blauwe rand van het schild bijna opslokt.
  Of de iconen van Storybook zelf op het roze zetten, met een S; dat is het vlak dat we juist willen vervangen.
- **Hoe:** het script krijgt een lijst sets (`src/icon-sets.ts`) in plaats van één map; alleen de tegel verschilt, dus de transparante iconen, de ICO en de SVG zijn in elke set dezelfde bytes.
  Storybook neemt de map van zijn set op met `staticDirs` (op de root) en zet de links in `managerHead` en `previewHead` (`.storybook/icons.ts`); zodra de kop zelf een icoon heeft, laat Storybook zijn eigen weg.
  De tabbladen van de fansite en van Storybook tonen hetzelfde transparante schild; het roze verschijnt in het `apple-touch-icon`, dus in de favorieten van Safari en op een beginscherm.

### Pictogrammen zijn zelf getekend, bij een link erachter en bij een knop ervoor

- **Datum:** 25 oktober 2026
- **Besluit:** pictogrammen zijn een kleine set die het designsysteem zelf tekent (SVG in de code), zonder pictogrammenbibliotheek als dependency.
  De set is een pijl naar rechts, een pijl naar links, een envelop, een plus, een zon, een maan en het pictogram voor een externe link.
  Bij een link staat het pictogram achter de tekst, bij een knop ervoor.
  "Vorige" is de uitzondering, omdat zijn pijl naar links wijst.
- **Waarom:** een pictogram achter een link wijst vooruit, naar waar de link heen gaat.
  Een pictogram voor een knop zegt wat hij doet: versturen, meer laden.
  Eén regel voor alle plaatsen houdt het rustig.
  Zelf tekenen houdt de site vrij van verzoeken naar derden en van een dependency met honderden pictogrammen waarvan we er zeven gebruiken, en geeft de site één eigen stijl.
- **Alternatieven:** alle pictogrammen achter de tekst, ook bij knoppen (consistenter op papier, maar de envelop staat dan op een ongebruikelijke plek).
  Een pictogrammenset of lettertype van een derde partij, of losse tekeningen uit zo'n bibliotheek (een verzoek naar buiten of een dependency, en de stijl is van een ander).
- **Later:** zie _Een link naar ons e-mailadres krijgt een envelop vóór de tekst_; bij een link staat de envelop ook vóór de tekst.

### Elke link naar een andere site toont het pictogram voor een externe link

- **Datum:** 25 oktober 2026
- **Besluit:** elke link naar een andere site toont het pictogram voor een externe link, ook in een zin of een lijst.
  Een `mailto:`-link en een link binnen de site niet.
  Op de site zijn dat "Naar het forum" op de homepage, de bronnen op `/bronnen`, de links naar de platforms op `/podcasts`, "ons forum" op `/over-ons`, de Autoriteit Persoonsgegevens op `/privacy` en "het forum" op de foutpagina.
  "Alle podcasts" op de homepage is een link naar meer van de eigen site en krijgt een pijl naar rechts.
- **Waarom:** het nieuws en het menu doen het al.
  Een bezoeker moet overal kunnen zien dat een link de site verlaat.
- **Alternatieven:** alleen in het nieuws en het menu (zoals daarvoor, maar een link naar een bron of een platform verlaat de site dan zonder waarschuwing).
  Het afleiden uit het adres (`https://`); dat is minder expliciet dan een optie, en `Link` kiest zijn pictogram dus met de prop `icon`, net als `Navigation` met `external`.
- **Later:** zie _Een link naar ons e-mailadres krijgt een envelop vóór de tekst_; een `mailto:`-link krijgt wel een pictogram, de envelop, en dat is niet het pictogram voor een externe link.

### Eén component Icon, gekozen met een naam, en de plaats volgt uit het component dat het tekent

- **Datum:** 25 oktober 2026
- **Besluit:** alle pictogrammen zitten in één intern component, `Icon`, met een verplichte `name` uit een vaste lijst (`iconNames`).
  De zon en de maan hebben daarnaast `appearance` (`line` of `filled`); de typen laten `filled` bij een ander pictogram niet toe, zoals `Text` een inleiding alleen bij een `p` toelaat.
  Dat vervangt `ExternalLinkIcon`, dat nu `Icon name="external-link"` is: de grootte, de ruimte en de plaats in de regel staan in `icon/icon.css`, voor alle zeven.
  `Icon` staat niet in de uitvoer van het package.
  De lijn is even dik als de stam van de letters van gewone tekst (0,084 em in Atkinson Hyperlegible Next, gemeten aan de l), ook als het pictogram groter is: de dikte staat in em in `icon.css` en de tekening rekent die om naar zijn eigen maat.
  Het pictogram staat zo dat zijn middelste lijn op de hoogte van de dwarsbalk van de e staat, halverwege de kleine letters, en niet op de grondlijn.
  In een knop is het pictogram iets groter dan in een link (`button .hf-icon`), omdat de vette tekst van een knop een kleine tekening zwak laat lijken; we zagen dat in Storybook op de envelop, de plus, de zon en de maan.
  De lijn wordt daar niet dikker: de pictogrammen blijven in één stijl.
  Een bezoeker of een pagina kiest het pictogram met een prop van het component dat het tekent: `Link` heeft `icon` (`arrow-right`, `external-link`, `arrow-left`), `Button` heeft `icon` (`envelope`, `plus`) en een optie van `SegmentedControl` heeft `icon` (`sun`, `moon`).
  Het component weet waar het pictogram staat: bij een link achter de tekst, behalve `arrow-left` dat ervoor staat, en bij een knop ervoor.
  De gevulde tekening van de zon en de maan is dezelfde tekening met een vulling (`fill="currentColor"`), dus de lijn en de vulling blijven één stijl; de stralen van de zon zijn lijnen zonder oppervlak, dus de vulling verschijnt alleen in de schijf en de sikkel.
  `SegmentedControl` tekent de gevulde tekening op de ingedrukte knop en de lijn op de andere.
  Dat is een tweede aanwijzing naast het gevulde vlak en `aria-pressed`; wie het pictogram niet ziet, mist niets.
- **Waarom:** het is de eenvoudigste vorm die past bij hoe `Text` en `Card` hun uiterlijk kiezen: een lijst met namen en een getypeerde prop.
  Eén bestand met zeven tekeningen en één CSS-bestand houdt de stijl bij elkaar, en een volgend pictogram is een regel erbij.
  Een eigen component per pictogram geeft zeven bestanden met dezelfde kolom code.
  Het pictogram heeft altijd `currentColor`, dus het heeft de kleur en het contrast van de tekst eromheen, ook onder de muis, met de focus en in geforceerde kleuren.
- **Alternatieven:** een component per pictogram (`ArrowRightIcon` en zo verder); meer bestanden en dezelfde regels in elk.
  `Icon` exporteren zodat de site het los kan zetten; dat opent de weg naar een pictogram dat de enige aanwijzing is, terwijl `Link`, `Button` en `SegmentedControl` het pictogram altijd als tweede aanwijzing tekenen.
  Een `filled` als aparte naam (`sun-filled`); dat maakt de lijst langer en laat de twee tekeningen uit elkaar lopen.
- **Later:** zie _Een link naar ons e-mailadres krijgt een envelop vóór de tekst_; `Link` heeft daarnaast `icon="envelope"`, ook vóór de tekst.

### Het pictogram blijft aan zijn woord vast met een groep die niet afbreekt

- **Datum:** 25 oktober 2026
- **Besluit:** `Link` en `Button` zetten het pictogram met het laatste woord van de tekst (bij een link) of het eerste woord (bij een knop) in een groep met `white-space: nowrap`: `hf-icon-tail` en `hf-icon-head`.
  Dat doet de functie `attachIcon` in `icon/attachIcon.tsx`, die de tekst bij het laatste of eerste woord splitst.
  Eindigt de inhoud van een link niet met tekst (of begint die van een knop er niet mee), dan krijgt het pictogram een groep voor zichzelf en kan het alleen op een regel komen; de documentatie van `Link` zegt dat de inhoud met tekst moet eindigen.
- **Waarom:** een pictogram dat alleen op een regel staat, hoort bij niets en is niet te begrijpen.
  Een groep zonder afbreking houdt het bij zijn woord, bij 320 pixels breed en bij grote letters.
  Het pictogram heeft geen eigen kleur en geen beweging, dus er is niets anders te regelen.
- **Alternatieven:** een onzichtbaar teken ertussen (een woordverbinder); dat komt in de naam van de link, in een kopie van de tekst en in de test van de naam.
  Het hele label niet laten afbreken; dat laat een lange link over de rand van een smal scherm lopen.

### Een link naar ons e-mailadres krijgt een envelop vóór de tekst

- **Datum:** 25 oktober 2026
- **Besluit:** een link naar ons e-mailadres (`mailto:`) krijgt een envelop vóór de tekst, met `icon="envelope"` van `Link`.
  Dat is één naam meer in `linkIcons`, met de plaats `before`, zoals `arrow-left`; er is geen nieuwe prop.
  Op de site zijn dat de twee kaarten op `/bronnen`, de melding bij een mislukte verzending op `/contact`, en de `EmailLink` van `/over-ons` en `/privacy` en de link op `/toegankelijkheid`.
  Een adres dat als gewone tekst staat, zoals dat van de ingelogde beheerder, is geen link en krijgt geen envelop.
- **Waarom:** de envelop zegt dat de link een mail opent, en dat is anders dan een link naar een pagina.
  Hij zegt wat de link doet, en staat daarom vóór de tekst, zoals het pictogram bij een knop; een pijl wijst vooruit, een envelop niet.
  Een regel in `Link` die uit het adres `mailto:` afleidt, is minder expliciet dan een optie, en de pagina kiest haar pictogram al overal met `icon`.
- **Alternatieven:** geen pictogram bij `mailto:`-links (zoals na #239); de envelop achter het adres (volgens de regel voor links).
- **Hoe:** een adres is één lang woord zonder spaties, dus de groep die niet afbreekt (`hf-icon-head`) zou het hele adres onbreekbaar maken en bij 320 pixels en grote letters over de rand van de kaart duwen.
  `attachIcon` krijgt daarom `keep: 'letter'`: de envelop blijft alleen bij de eerste letter van het adres, en de rest mag afbreken.
  `link.css` zet `overflow-wrap: anywhere` op een link naar `mailto:`, zodat het adres heel op een eigen regel staat en alleen afbreekt als het langer is dan de regel.
  De naam van de link blijft het adres alleen, want de envelop is `aria-hidden`, en hij heeft de kleur van de tekst, dus ook bij de muis erover, bij de focus en in geforceerde kleuren.

### De rand bovenaan in Safari heeft de kleur van de kop, door een echte strook van minstens 8 pixels

- **Datum:** 25 oktober 2026
- **Besluit:** de rand bovenaan de pagina, achter de statusbalk van Safari op een iPhone of iPad, heeft in licht en in donker de kleur van de kop (`blue-900` en `blue-800`, uit het token van de kop), zonder verloop of schaduw.
  Daarvoor is de strook bovenaan, die voor de app op het beginscherm al bestond, een echt element geworden in plaats van `.hf-page::before`: de lege `div` `hf-page-top-edge`, die `Page` als eerste kind zet, met `aria-hidden`.
  De hoogte is `--hf-top-edge`, die `root.css` op `html` zet: de inset bovenin, en in een browser die `-webkit-touch-callout` kent (Safari op iOS en iPadOS, ook in een app op het beginscherm) minstens 8 pixels: `max(env(safe-area-inset-top, 0px), 8px)`.
  `scroll-padding-block-start` gebruikt dezelfde maat, zodat een element met focus ook niet achter de smalle strook komt.
  Op een computer en in Android is de hoogte nog steeds de inset, dus 0.
  In de app op het beginscherm is de inset ruim groter dan 8 pixels, dus daar verandert niets.
  `theme-color` blijft gelijk aan de kop (zie _Het donkerblauw van het icoon en het manifest komt uit het token van de kop_), voor Chrome en Android.
  Drukt een bezoeker op Licht of Donker, of wisselt het systeem van thema terwijl de pagina open staat, dan haalt `theme.ts` de strook twee frames van de pagina (`refreshTopEdge`, `display: none`) en zet hem terug.
- **Oorzaak:** Safari in de iOS Simulator (iOS 27.0, iPhone 18 Pro) gebruikt `theme-color` niet meer voor de balk bovenin.
  De rand krijgt de kleur van een ondoorzichtig element dat vastzit aan de bovenkant van de pagina en hoog genoeg is, en anders de kleur van de pagina (`grey-100` in licht, `blue-950` in donker), met een zachte overgang naar de inhoud.
  Dat is het lichtgrijs en bijna zwart met het verloop dat de projecteigenaar zag.
  Onze strook deed niet mee, om twee redenen: in Safari is de inset bovenin 0, dus de strook had geen hoogte, en Safari kijkt niet naar een pseudo-element.
- **Gemeten in de simulator:** een vaste strook van 4 pixels in de kleur van de kop telt niet mee; een van 6, 8, 12 en 60 pixels wel.
  Een strook van 8 pixels waarvan het grootste deel boven het scherm staat (`top: -52px`, 60 pixels hoog) telt ook mee.
  Een strook met `opacity: 0.01` telt niet mee; hij moet dus echt getekend zijn.
  Een achtergrond voor `html` in de kleur van de kop verandert niets zolang `body` de kleur van de pagina heeft.
  `.hf-page::before` met 8 pixels deed niets; hetzelfde element als `div` wel.
  Na het scrollen is de rand één egaal blauw vlak, zonder verloop, in licht en in donker.
  Een nieuwe kleur van de strook wordt niet gelezen door alleen de kleur te veranderen, door de hoogte met 1 pixel te veranderen of door het element weg te halen en meteen terug te zetten.
  Wel door `display: none` te zetten en er twee frames later weer af te halen; dat is wat `refreshTopEdge` doet.
  De strook ligt over de bovenste 8 pixels van het scherm.
  Boven aan de pagina valt dat weg tegen de kop, die dezelfde kleur heeft; na het scrollen loopt de egale rand 8 pixels door onder de statusbalk.
- **Waarom:** het is de kleinste aanpassing die Safari de gewenste kleur laat nemen, uit het token van de kop, zonder dat de achtergrond van de pagina, de footer of het gebied bij uitrekken (overscroll) blauw wordt.
  Een blauwe `html` zou dat wel doen.
  Het onderzoek in een andere sessie, dat naar dezelfde kant wees, vond dat ook in de WebKit-bugs 301756 en 305546 en bij de Apple-ontwikkelaarsforums (thread 801239); wij hebben die bronnen niet zelf nagelopen.
- **Alternatieven:** de rand laten zoals hij was, met het verloop, of in de kleur van de pagina met een scherpe overgang.
  `html` blauw maken; dat kleurt ook de ruimte onder de footer bij uitrekken.
  De strook alleen op een iPhone met uitsparing tonen; daar is in CSS geen vraag voor, want de inset is in Safari 0.
  Een strook van 4 pixels of minder, of een bijna doorzichtige; Safari negeert die.
- **Later:** de strook blijft niet meer staan als de kop uit beeld is; zie _De blauwe rand bovenaan scrolt weg met de kop_.
- **Gecontroleerd en niet gecontroleerd:** in de iOS Simulator (iOS 27.0, iPhone 18 Pro) in Safari, in licht en in donker, boven aan de pagina en na het scrollen, met Licht en Donker en met het systeemthema gewisseld terwijl de pagina open stond.
  Niet in iOS 26 (geen simulator beschikbaar), niet op een echte telefoon, niet op een iPad en niet in een app op het beginscherm; de projecteigenaar kijkt dat na.
  Een test in Chromium (`e2e/safe-area.spec.ts`) controleert dat de strook het eerste element van de pagina is, vastzit, geen aanraking aanneemt, dezelfde kleur heeft als de kop en `theme-color` in licht en donker, en na Licht of Donker terugkomt.
  De 8 pixels en de kleur van de statusbalk zelf zijn alleen op een telefoon te zien.

### De blauwe rand bovenaan scrolt weg met de kop

- **Datum:** 25 oktober 2026
- **Besluit:** in Safari op een iPhone of iPad haalt de site de strook bovenaan van de pagina zodra de kop uit beeld is, en zet hem terug als de kop terugkomt.
  Daarmee heeft de statusbalk dan weer de kleur van de pagina, met de zachte overgang naar de inhoud die Safari zelf tekent.
  Dat doet `watchTopEdge` (`apps/site/src/watchTopEdge.ts`, gestart door `TopEdge`, dat de lay-out zet): een `IntersectionObserver` op de kop met een bovenmarge van 8 pixels, de hoogte van de strook, die het attribuut `hidden` op de strook zet.
  In een app op het beginscherm blijft de strook staan, en zonder JavaScript of `IntersectionObserver` ook.
- **Waarom:** de projecteigenaar vond de blauwe rand na het scrollen mooi bovenaan, maar wilde dat hij met de pagina meeschuift: blauw bij de kop, en daarna de kleur van de pagina.
  Safari tekent de rand alleen blauw zolang er een vast element in die kleur bovenaan staat, dus meeschuiven kan alleen door dat element weg te halen.
  In de app op het beginscherm is de statusbalk doorzichtig met witte tekst, dus daar moet de strook blijven (zie _De pagina gebruikt het hele scherm en houdt de inhoud uit de uitsparing_).
  `hidden` en niet `display` via de stijl, zodat `refreshTopEdge` (dat `display` gebruikt voor Licht en Donker) de strook niet terugzet terwijl de kop weg is.
- **Alternatieven:** de strook altijd laten staan, zoals na de vorige beslissing; dan blijft er een blauwe balk bovenaan staan die bij niets hoort als de kop uit beeld is.
  De strook laten meeschuiven met `position: absolute` in plaats van `fixed`.
  Safari ziet dan waarschijnlijk geen vast element meer en neemt de kleur van de pagina, ook bovenaan, zodat het grijs met het verloop terugkomt.
  Een animatie op basis van de scrollpositie in CSS (`animation-timeline: scroll()`); of Safari de kleur van de strook tijdens zo'n animatie bijhoudt, weten we niet.
  Beide hebben we niet uitgeprobeerd.
- **Gecontroleerd en niet gecontroleerd:** in de iOS Simulator (iOS 27.0, iPhone 18 Pro) in Safari, in licht en donker: blauw bovenaan, de kleur van de pagina met de zachte overgang na het scrollen langs de kop, weer blauw als de kop terugkomt, en na Licht of Donker terwijl de strook weg was.
  Niet op een echte telefoon, niet in iOS 26 en niet in de app op het beginscherm.

### De inhoud van de kop blijft zichtbaar als hij onder de statusbalk wegscrolt

- **Datum:** 25 oktober 2026
- **Besluit:** de inhoud van de kop blijft zichtbaar tot de kop uit beeld is.
  De pull request die hem doorzichtig maakte (#253, voor issue #252) is teruggedraaid.
  De strook die met de kop wegscrolt (zie _De blauwe rand bovenaan scrolt weg met de kop_) blijft.
- **Waarom:** de projecteigenaar vond het resultaat van de eerste aanpak (#251) goed genoeg.
  Het menu dat even door de statusbalk schemert, neemt hij op de koop toe.
- **Alternatieven:** de inhoud van de kop doorzichtig maken zodra hij binnen 64 pixels van de bovenkant komt, met `opacity: 0` en niet met `visibility: hidden`, zoals #253 deed.
  Dat haalt het menu uit de statusbalk, maar kost een tweede `IntersectionObserver` en een attribuut op de kop.
  Een drempel van 8 pixels, gelijk aan die van de strook, was te laag: het menu bleef in de simulator zichtbaar tot ongeveer 55 punten.
  `visibility: hidden` haalt de kop uit de toegankelijkheidsboom en laat een element met focus verdwijnen.
- **Gecontroleerd en niet gecontroleerd:** de code is gelijk aan die na #251.
  Niet op een echte telefoon, niet in iOS 26 en niet in de app op het beginscherm.

### De footer heeft geen lijn bovenaan

- **Datum:** 25 oktober 2026
- **Besluit:** de footer heeft geen lijn bovenaan.
  Het kleurverschil met de body is genoeg: de footer is een vlak van rand tot rand dat alleen door zijn kleur van de body verschilt.
  De rol `--hf-colour-border-footer` is weggehaald, met zijn regel in de tabel Tokens › Kleur en zijn contrastpaar.
- **Waarom:** een lijn bovenaan de footer maakt hem glazig.
  Het vlak van de footer is al te zien aan zijn kleur, en de lijn voegt daar niets aan toe.
  Zonder rand heeft de footer geen strook van 1 pixel meer buiten het vlak waar de strepen van de Friese vlag hun maat van nemen, dus de twee delen van de strepen sluiten precies op elkaar aan.
- **Alternatieven:** de lijn houden zoals hij is; een zachtere lijn (dichter bij de kleur van de footer, maar nog steeds een lijn die het vlak omlijst).

### De zinnen en de knoppen in de footer breken niet af

- **Datum:** 25 oktober 2026
- **Besluit:** de twee zinnen en de knoppen Licht en Donker in de footer breken niet af binnen een regel; het menu met de links mag dat wel.
  Een zin blijft op één regel (`white-space: nowrap`), een knop houdt zijn pictogram en tekst bij elkaar, en de twee knoppen staan naast elkaar (`flex-wrap: nowrap`).
  Op een middelbaar scherm geeft het menu mee: vanaf 40rem is de kolom met de tekst zo breed als de tekst zelf (`auto`) en neemt de kolom met de links de rest (`1fr`), rechts uitgelijnd.
  De links breken dan af in een tweede rij naast de tekst, en de tekst en de knoppen blijven heel.
  Het menu staat ter hoogte van de bovenkant van de tekst en beslaat alle rijen, zodat een tweede rij links de twee zinnen niet uit elkaar duwt.
  Onder 19,5rem breken de tekst en de knoppen weer af, als noodgreep.
  De links in de footer breken af in rijen die ongeveer even lang zijn (`text-wrap: balance`), zodat een tweede rij niet maar één link telt terwijl de eerste vol is.
  Een rij van een flexbox is niet te verdelen, dus in de footer is de lijst een regel van `inline-block`-elementen, met 1,5rem tussen de links, net als in de andere menu's.
  Een browser die `text-wrap: balance` niet kent (het staat in `@supports`) houdt de flexbox, zoals het was.
- **Waarom:** een zin of een knop die midden in de regel afbreekt, ziet er onhandig uit bij een middelbare breedte.
  Het menu bestaat uit losse links die makkelijk onder elkaar passen.
  De tekst en de knoppen zijn hoogstens 14,1rem breed, en 17rem met de tekstafstand van WCAG 1.4.12 (letters 0,12em en woorden 0,16em uit elkaar, gemeten in Chromium); met 2rem marge aan de zijkanten past dat vanaf 19rem op één regel.
  De grens 19,5rem ligt daar een stukje boven, en onder 320 pixels (20rem).
  Een scherm van 320 pixels breed en 400% zoom (dat is ook 320 CSS-pixels) scrolt dus niet zijwaarts (WCAG 1.4.10), ook niet met die tekstafstand.
  De grens staat in rem, dus hij volgt een groter lettertype: bij tekst op 200% ligt hij op 624 pixels, en daar zijn de tekst en de knoppen ook twee keer zo breed.
  Een grens in pixels zou dat niet doen.
- **Alternatieven:** alles laten afbreken zoals nu.
  Het menu ook niet laten afbreken en het onder het blok zetten tot de links op één regel passen (vanaf 51rem met de zes links van nu); dan hangt de breedte van de footer af van het aantal links, dat het designsysteem niet kent, en op veel meer breedtes staat het menu onder de tekst.
  Een flexbox in plaats van het raster, waarin het menu als geheel naar een volgende rij verhuist; dat kan niet zonder de twee zinnen en de knoppen in een eigen element te zetten.
  De links laten afbreken zoals voorheen, met de eerste rij vol en een kort stuk in de tweede; de projecteigenaar wilde rijen van gelijke lengte.
- **Gecontroleerd en niet gecontroleerd:** de footer op de site, met de zes links van nu, in een breedte van 240 tot 1200 pixels, ook met een groter lettertype en in donker: de zinnen staan op één regel, de knoppen naast elkaar en de pagina scrolt niet zijwaarts, vanaf 19,5rem.
  De links staan bij 640 tot 800 pixels in twee rijen van drie (223 en 274 pixels breed, voorheen vier en twee), en bij 240 tot 300 pixels in drie rijen van twee, ook zonder zijwaarts scrollen.
  Voor de wijziging braken de zinnen en de knoppen af tussen 640 en ongeveer 790 pixels: bij 640 pixels viel de eerste zin in vijf regels uiteen en de knoppen stonden onder elkaar.
  Niet gecontroleerd: een echte instelling van het lettertype in de browser, want de grens in rem volgt die instelling en een test in een iframe kan hem niet zetten.
- **Later:** zie _De themaschakelaar is één knop rechtsboven in de header_.
  De footer heeft de knoppen Licht en Donker niet meer, dus de regels voor knoppen in de footer zijn weg.
  De twee zinnen breken nog niet af, en de links blijven afbreken in rijen van gelijke lengte.
- **Later:** zie _De knop naar boven heeft de kleuren van links in de footer en een eigen kolom in het raster_.
  Heeft de footer die knop, dan breken de zinnen pas af onder 22,25rem in plaats van 19,5rem, en staan de links in de tweede kolom van drie.

### Artikelen van de redactie staan in de database

- **Datum:** 25 oktober 2026
- **Besluit:** artikelen van de redactie staan in de database, in een eigen tabel `articles`, en niet als bestanden in de code.
- **Waarom:** de redactie bestaat uit vrijwilligers die het beheer gebruiken.
  Een artikel in de code vraagt voor elk woord een release.
  In de database kan het beheer het schrijven, en blijft er een logboek van wie wat deed.
- **Alternatieven:** een pagina in de code (sneller te bouwen, maar elke wijziging is een release en een vrijwilliger kan het niet zelf); een bericht in de tabel `items` met onze eigen naam als bron (hergebruikt veel, maar het filter, het verbergen en de vijf kaarten gaan er dan over, en een artikel is geen kop met een link).

### Het nieuwste artikel is een kaart bovenaan de homepage, en elk artikel heeft een eigen pagina

- **Datum:** 25 oktober 2026
- **Besluit:** het nieuwste artikel staat als kaart "Van de redactie" bovenaan de hoofdkolom van de homepage, en elk artikel heeft een eigen pagina op `/redactie/<slug>`.
- **Waarom:** bij de lancering stelt de redactie zich zo voor, en een eigen adres is te delen.
  De kaart staat boven het nieuws omdat het eerste artikel een aankondiging is; zonder artikel verdwijnt hij.
- **Alternatieven:** een kaart in de zijbalk (rustiger, maar een aankondiging valt dan minder op); alleen een pagina met een link in de footer en bij Over ons (de homepage blijft puur nieuws, maar niemand vindt het artikel).
- **Hoe:** de kaart is het component `ArticleCard` van het designsysteem, de pagina gebruikt `Article`.
  De titel en "Lees verder" in de kaart gaan naar dezelfde pagina; de naam van "Lees verder" noemt het artikel, zodat de link ook los begrijpelijk is.
  De kaart telt niet mee voor de tien koppen van "Laatste nieuws".
  Een artikel krijgt geen eigen afbeelding bij een gedeelde link; het heeft hetzelfde plaatje als elke pagina: het schild op het donkerblauw van de kop, zoals de app-iconen (zie _Het schild van de site, als PNG van ons eigen domein, is de afbeelding bij het delen van links_).
  De projecteigenaar koos dit op 25 oktober 2026; het issue (#263) zegt dat "geen afbeelding bij de link" geen eigen afbeelding per artikel betekende.
  Een eigen afbeelding per artikel kan later.

### Artikeltekst heeft een kleine eigen opmaak, die een eigen functie omzet

- **Datum:** 25 oktober 2026
- **Besluit:** de tekst van een artikel heeft een kleine eigen opmaak (alinea's, een kop, een lijst, vet, cursief en een link) en wordt met een eigen functie omgezet, zonder HTML en zonder dependency.
- **Waarom:** een artikel is tekst met een paar kopjes en links.
  Wie het schrijft, hoeft geen HTML te kennen, en wie het account van een schrijver overneemt, kan er geen scripts mee inspuiten.
- **Alternatieven:** Markdown met een bibliotheek (volledig, maar een dependency en veel meer dan we nodig hebben); HTML (gevaarlijk); platte tekst zonder opmaak (te weinig voor een artikel met koppen en links).
- **Hoe:** `parseArticleText` in `apps/site/src/article-text.ts` leest de tekst tot gewone gegevens, en `ArticleText` maakt er elementen van die React escapet.
  Er is geen `dangerouslySetInnerHTML` en geen reguliere expressie die over de hele tekst loopt.
  Elke zoektocht naar een sluitteken stopt bij het eerste teken dat een partner uitsluit, dus de tijd groeit met de lengte van de tekst.
  De tests proberen een regel van een miljoen tekens, een miljoen openende tekens zonder partner en tienduizend regels met vijfduizend alinea's erachter.
  - Een alinea is een stuk tussen lege regels; de regels erin lopen in elkaar over.
  - Een kop is een stuk van één regel dat met `## ` begint, en is een kop van niveau 2.
    Een lijst is een stuk waarvan elke regel met `- ` begint.
    Alles anders is een alinea, ook `# Kop`, `### Kop` en `1. punt`.
  - Vet en cursief staan binnen één alinea of lijstpunt.
    Cursief staat in vet (ook aan het einde: `**vet *cursief***`), niet andersom.
    Een teken met een spatie ertegenaan (`2 * 3 * 4`) en een teken zonder partner blijven staan zoals ze zijn.
    Een kop en de tekst van een link bevatten geen opmaak.
  - Een link gaat naar `https://` met een adres zonder spatie, haakjes, backslash, aanhalingsteken of inlog (`https://www.lc.nl@evil.example`), of naar een pagina van ons die met één `/` begint.
    `//evil.example` en `/\evil.example` weigert de functie, want een browser leest ze als een andere site, net als een adres met een tab of nieuwe regel.
    `http:`, `javascript:`, `data:`, `mailto:` en een adres zonder `https://` blijven gewone tekst, met de tekens erbij.
    Een afbeelding (`![](…)`) is geen opmaak: het uitroepteken blijft staan, en de rest wordt een link.
  - Een link naar een andere site krijgt het pictogram voor een externe link en `rel="noopener"`.
    Er komt geen `nofollow` en geen `noreferrer` bij: de tekst schrijven wij, en een bron mag zien dat bezoekers van ons komen.
    De link opent in hetzelfde tabblad, zoals elke link van de site.

### Een artikel is gepubliceerd als `published_at` gevuld is en niet na nu ligt

- **Datum:** 25 oktober 2026
- **Besluit:** een artikel staat op de site als `published_at` een tijd heeft die niet na het moment van nu ligt.
  Een artikel met een lege `published_at` is een concept, en met een tijd in de toekomst staat het er pas als die tijd komt.
  Intrekken is `published_at` weer leeg maken.
- **Waarom:** één kolom zegt alles, ook voor de SQL-opdrachten van de eigenaar zolang het beheer ontbreekt (#264), en een gepland artikel kost niets extra.
- **Alternatieven:** een aparte kolom `status` (twee kolommen die elkaar kunnen tegenspreken, en een concept met een tijd zou raadselachtig zijn); een tijd in de toekomst weigeren (kan niet in een kolom, en de eigenaar kan een artikel dan niet vooruit zetten).
- **Hoe:** de queries krijgen het moment van nu mee, zoals `listRecentItems`, en vergelijken met `lte`.
  Een concept en een adres dat geen artikel is geven dezelfde pagina "niet gevonden" met een 404, zodat niets verraadt dat een concept bestaat.
  Het adres moet precies kloppen: de collatie van de tabel negeert hoofdletters en een spatie erachter, en dat zou één artikel twee adressen geven, dus de query vergelijkt de `slug` daarna nog eens exact.

### De pagina's met artikelen komen niet uit een cache

- **Datum:** 25 oktober 2026
- **Besluit:** de kaart op de homepage en de pagina van een artikel lezen de database bij elk bezoek, zonder de cache van vijf minuten die de koppen hebben.
  Een artikel dat verschijnt of wordt ingetrokken, staat er dus meteen.
- **Waarom:** een fout in een artikel moet meteen weg kunnen, en de vraag is één opzoeking in een index (`articles_published_at_idx` voor de kaart, de unieke `slug` voor de pagina).
  Met een cache zou de eigenaar vijf minuten lang een artikel zien dat hij al introk.
- **Alternatieven:** vijf minuten cachen zoals de koppen (minder vragen, maar het artikel is niet meteen weg); de kaart wel en de pagina niet cachen (een ingetrokken artikel blijft dan bereikbaar via zijn adres).
- **Hoe:** een fout bij het lezen van het nieuwste artikel laat alleen de kaart weg en komt in het logboek; de homepage toont het nieuws gewoon.
  Een fout bij het lezen van de pagina van een artikel geeft de foutpagina, zoals bij `/podcasts`.

### De tabel `articles`: een mediumtext, een sleutel naar het account en een controle op het adres

- **Datum:** 25 oktober 2026
- **Besluit:**
  - `body` is een `mediumtext` (16 MB): een artikel past ruim in een `text` (64 kB), maar de grens van het beheer staat dan niet in het schema, en een `mediumtext` heeft geen nadeel.
    `title`, `slug`, `intro` en `author` zijn `varchar` van 120, 80, 300 en 100 tekens, en een tekst die te lang is, laat de opdracht falen in plaats van hem af te kappen, zolang MariaDB op zijn standaardinstelling staat (strikt).
  - `slug` is uniek en heeft een CHECK-regel die alleen kleine letters, cijfers en enkele streepjes toestaat.
    De regel begint met `(?-i)`, want de collatie `utf8mb4_unicode_ci` negeert hoofdletters en `[a-z]` zou ze anders doorlaten.
  - `created_by` heeft een foreign key naar `admin_users`, zonder cascade.
    Een account wordt uitgezet (`admin:revoke`) en nooit verwijderd, dus de schrijver van elk artikel blijft bekend, en het verwijderen van een account met artikelen faalt, net als bij het logboek.
  - `published_at` heeft een index voor de vraag naar het nieuwste artikel.
  - `updated_at` krijgt bij een wijziging geen waarde van de database: wie een artikel verandert, zet het zelf, zoals de SQL-opdrachten in `docs/artikelen.md` doen.
    De sitemap gebruikt hem niet.
- **Waarom:** het schema dwingt af wat een pagina nodig heeft, ook als iemand rechtstreeks met SQL werkt, zoals de eigenaar tot #264 klaar is.
- **Alternatieven:** een `text` voor `body` (kleiner, maar het scheelt niets en 64 kB is vlug bereikt); de opmaak van het adres alleen in de code controleren (de SQL-opdrachten van de eigenaar komen er dan omheen); `ON DELETE CASCADE` of `SET NULL` voor `created_by` (een artikel mag niet stil verdwijnen of zijn schrijver kwijtraken).
- **Later:** de tabel heeft ook `updated_by`, verplicht en met dezelfde foreign key, en wie een artikel verandert zet hem samen met `updated_at`; zie _Een artikel bewaart wie het veranderde en elke versie van de tekst_.
- **Gecontroleerd:** `articles.test.ts` en `articles-migration.test.ts` van `@fansite/db`, op een echte MariaDB: het adres, de lengtes, de unieke sleutel (ook met een spatie erachter), de foreign key, accenten en een emoji in de tekst, een tekst van een miljoen tekens, en dat de migratie de rijen van andere tabellen met rust laat.

### Het eerste artikel gaat met SQL de database in, en de seed zet geen artikel

- **Datum:** 25 oktober 2026
- **Besluit:** de seed zet geen artikel op acceptatie.
  De eigenaar zet het eerste artikel met de opdrachten uit `docs/artikelen.md`, eerst op acceptatie en dan op productie.
  Voor de controles en voor de screenshots staat een verzonnen artikel in `apps/site/e2e/articles.ts`, dat `pnpm --filter site test-data` ook in je eigen database zet.
- **Waarom:** de seed draait op acceptatie bij elke start.
  Een voorbeeldartikel daar zou na het echte artikel nog steeds staan, of het echte artikel verdringen als het nieuwste.
  Een artikel is bovendien tekst van onszelf en geen testbron: er is niets om op te testen dat de eigenaar niet met dezelfde opdracht zet.
- **Alternatieven:** een verzonnen artikel in de seed, alleen op acceptatie (laat de functie meteen zien, maar het mengt zich met het echte artikel en de eigenaar moet het weghalen).
- **Later:** de opdracht in `docs/artikelen.md` zet nu ook `updated_by`, want die kolom is verplicht, en een artikel dat met SQL is gemaakt heeft geen versie; zie _Een artikel bewaart wie het veranderde en elke versie van de tekst_.

### De sjablonen kennen `Strong` en `Emphasis`

- **Datum:** 25 oktober 2026
- **Besluit:** het designsysteem heeft de componenten `Strong` en `Emphasis`, voor een `strong` en een `em` in een tekst.
  Ze hebben geen eigen klasse: de stijl komt van de elementen zelf, zoals bij `Time`.
- **Waarom:** de sjablonen van de site bevatten geen HTML (zie _Sjablonen bevatten geen HTML, alleen componenten uit het designsysteem_), en de opmaak van een artikel heeft vet en cursief nodig.
- **Alternatieven:** de regel van ESLint voor één bestand uitzetten (dat maakt van een regel zonder uitzonderingen er een met); vet en cursief met `Text` maken (`Text` zet het gewicht van de tekst en maakt vet dus weg).

### Alleen een beheerder schrijft en publiceert artikelen

- **Datum:** 25 oktober 2026
- **Besluit:** alleen een beheerder schrijft en publiceert artikelen, op `/beheer/artikelen`.
  Een moderator verbergt berichten, maar schrijft niet.
  Elke pagina en elke actie van de artikelen vraagt `requireRole('beheerder')`, en voor een moderator is de pagina "niet gevonden".
  Het beheer verwijst een moderator ook niet naar de pagina: `/beheer` toont de link alleen aan een beheerder.
- **Waarom:** de redactie is nog klein, en een artikel staat onder onze naam.
  Een aparte rol voor vrijwilligers die schrijven, met een controlestap erbij, komt met #40.
- **Alternatieven:** ook moderators laten schrijven (een grotere groep zonder controlestap); een nieuwe rol `redacteur` nu al (meer werk dan de lancering vraagt).

### Een artikel wordt ingetrokken en niet verwijderd, en het adres van een gepubliceerd artikel staat vast

- **Datum:** 25 oktober 2026
- **Besluit:** een artikel wordt ingetrokken en niet verwijderd: er is geen knop om te verwijderen.
  Intrekken maakt `published_at` leeg, dus het is weer een concept.
  Het adres (`slug`) van een artikel dat een `published_at` heeft, verandert niet.
  De server weigert het met een fout bij het veld, en het formulier toont het adres dan alleen-lezen.
  Wie het adres toch wil veranderen, trekt het artikel eerst in.
- **Waarom:** een gedeelde link mag niet kapotgaan, en "niets stil weggooien" geldt ook voor onze eigen teksten.
  Intrekken is te herstellen.
- **Alternatieven:** verwijderen met een bevestiging (permanent, geen spoor); het adres vrij laten bewerken (gedeelde links breken).

### Een artikel schrijven geeft vier acties in het logboek, en schrijft alleen als er iets veranderde

- **Datum:** 25 oktober 2026
- **Besluit:** het logboek heeft vier acties erbij: `article.create`, `article.update`, `article.publish` en `article.unpublish` (migratie `0011_add_article_audit_actions`).
  `item_id` bevat bij deze acties het nummer van het artikel; de actie zegt of het een bericht of een artikel is.
  Er staat niets van de tekst in, ook geen titel.
  "Publiceren" slaat wat op het scherm staat op en publiceert het in één transactie, dus het geeft een `article.update` (als er iets veranderde) en een `article.publish`.
  Een artikel dat met SQL een `published_at` in de toekomst kreeg, wordt niet opnieuw gepubliceerd: de beheerder trekt het eerst in.
  Zoals bij het verbergen is een wijziging en haar regel één transactie, en een actie die niets verandert schrijft niets:
  - opslaan zonder verschil schrijft geen `article.update` en laat `updated_at` staan;
  - publiceren van wat al een `published_at` heeft, doet niets en schrijft geen tweede `article.publish`;
  - intrekken van een concept doet niets.
- **Waarom:** een tweede klik of een tweede tabblad mag het logboek niet laten liegen, en twee verzoeken tegelijk mogen niet allebei publiceren.
  Dat laatste is vergrendeld met `SELECT ... FOR UPDATE` in de transactie.
  Een artikel met een `published_at` in de toekomst opnieuw publiceren zou dat vergrendelen breken: twee verzoeken tegelijk vinden dan elk de tijd van de ander "later".
  De tijd van een publicatie komt uit één plek: het `now` van de functie, waar de actie niets in doorgeeft.
- **Alternatieven:** een regel bij elke opslag, ook zonder verschil (het logboek vermeldt dan wijzigingen die er niet zijn); de titel in het logboek (tekst van een artikel hoort er niet in, en een titel verandert); het nummer van het artikel in een eigen kolom (een migratie voor iets wat `item_id` met de actie al zegt).

### Het formulier voor een artikel stuurt een fout in een toestand terug, en niet via het adres

- **Datum:** 25 oktober 2026
- **Besluit:** het formulier van `/beheer/artikelen` is een client-component met `useActionState`, zoals het contactformulier (zie _Bij een fout gaat de focus naar het blok met fouten_).
  Een serveractie die een veld fout vindt, geeft de fouten en de ingevulde waarden terug.
  Het formulier toont ze in een `ErrorSummary` en bij het veld, en met JavaScript krijgt het blok de focus.
  Zonder JavaScript laadt de pagina opnieuw met dezelfde fouten en waarden.
  Een geslaagde actie stuurt door naar het formulier van het artikel, met `?gedaan=` en een melding uit de toestand van de database: die zegt alleen iets over wat waar is, net als `?verborgen=` bij de berichten.
  "Opgeslagen" en "Concept gemaakt" gelden vijf minuten, naar de tijd van het artikel zelf.
- **Waarom:** het verbergen van een bericht zet de fout in het adres, maar een tekst van 20.000 tekens past er niet in, en een beheerder mag niets kwijtraken wat hij schreef.
  Met de waarden in de toestand blijft alles staan.
- **Alternatieven:** de fout en de tekst in het adres of in een cookie (te groot, en de site zet maar één cookie, dat van de sessie); de tekst in `localStorage` bewaren (alleen met JavaScript, en een uitzondering op "geen opslag").
- **Hoe:** "Opslaan" is de eerste knop van het formulier, dus Enter bewaart en publiceert niet.
  Een knop met `pending` is uitgeschakeld, zodat een dubbele klik geen tweede verzoek geeft.
  Met JavaScript volgt het adres de titel tot de schrijver er zelf in typt; zonder JavaScript maakt de server hetzelfde voorstel (`suggestSlug`) van een leeg adres.

### De velden van een artikel worden altijd op de server gecontroleerd en schoongemaakt

- **Datum:** 25 oktober 2026
- **Besluit:** de server controleert alles wat het formulier stuurt (`apps/site/src/beheer/article-form.ts`), ook als de browser het al deed:
  - titel (120), intro (300), auteur (100) en adres (80) zijn één regel: besturingstekens en dubbele spaties worden één spatie;
  - de tekst (20.000 tekens, geteld in tekens zoals de kolom) houdt zijn regels en lege regels, krijgt `\n` als regeleinde en verliest besturingstekens en lege regels aan beide kanten, zodat opslaan en weer openen niets verandert;
  - het adres heeft alleen kleine letters, cijfers en enkele streepjes, is uniek (de unieke sleutel beslist, dus twee gelijktijdige opslagen geven één artikel en één fout) en is niet de eerste naam van een pagina van de site (`reservedSlugs`, met een test die faalt bij een nieuwe pagina);
  - een leeg adres wordt het voorstel uit de titel, en geeft een fout als de titel niets heeft om een adres van te maken.
- **Waarom:** de tabel wijst een te lange tekst af (zie _De tabel `articles`: een mediumtext, een sleutel naar het account en een controle op het adres_), maar de schrijver moet weten welk veld en hoe.
  De tekst is geen HTML en `ArticleText` maakt er elementen van, dus er is niets te escapen bij het opslaan.
  Een artikel staat op `/redactie/<adres>`, dus een adres als `bronnen` botst nu niet; de lijst voorkomt verwarring en houdt de weg open om artikelen later bovenaan de site te zetten.
- **Alternatieven:** de browser laten controleren met `maxLength` (die kapt een geplakte tekst stil af, en de schrijver ziet het niet); geen grens aan de tekst (de kolom houdt 16 MB, maar een tekst van die lengte is niet te lezen en niet te controleren).

### Het voorbeeld van een artikel is een pagina van het beheer, met dezelfde componenten

- **Datum:** 25 oktober 2026
- **Besluit:** `/beheer/artikelen/<nummer>/voorbeeld` toont het artikel met `Article` en `ArticleText`, dezelfde als de pagina van een bezoeker.
  Een concept heeft nog geen datum, dus het voorbeeld toont de dag van vandaag, met een kaart erboven die dat zegt.
  De pagina valt onder `/beheer`: alleen een ingelogde beheerder opent haar, en de proxy geeft haar `noindex` en `no-store`.
  De openbare pagina `/redactie/<adres>` zegt voor een concept "niet gevonden" en verraadt niets, ook niet via het nummer.
- **Waarom:** dezelfde componenten zorgen dat het voorbeeld laat zien wat een bezoeker straks ziet.
  Een voorbeeld op een openbaar adres zou een concept raadbaar maken.
- **Alternatieven:** een voorbeeld op `/redactie/<adres>?voorbeeld=1` voor een ingelogde beheerder (het cookie hoort alleen bij `/beheer`, dus de pagina kan niet weten wie kijkt); een eigen opmaak voor het voorbeeld (het kan dan afwijken).

### De browsertest die een artikel publiceert, draait als eigen project na de andere

- **Datum:** 25 oktober 2026
- **Besluit:** `e2e/writing.spec.ts` heeft een eigen Playwright-project, `chromium-writing`, dat pas begint als `chromium` helemaal klaar is.
  `e2e/admin.ts` maakt een beheerder naast de moderator, elk met een sessie, en `adminCookie(host, rol)` geeft het cookie.
  De teardown verwijdert ook de artikelen van die accounts, voor de logregels en de accounts.
- **Waarom:** een gepubliceerd artikel is het nieuwste en wordt de kaart op de homepage, en dan zou de test van de kaart in `articles.spec.ts` falen, afhankelijk van wie eerst kwam.
- **Alternatieven:** de test het artikel meteen laten intrekken (een korte tijd blijft het zichtbaar, en parallelle tests zien het dan soms); de test van de kaart minder streng maken (hij toetst dan minder).

### Het relevantiefilter kent de Friese schrijfwijze van de club en Friese voetbalwoorden

- **Datum:** 25 oktober 2026
- **Besluit:** het filter kent de Friese schrijfwijze van de club, "Hearrenfean", en een lijst Friese voetbalwoorden, naast de Nederlandse (besluit van de projecteigenaar, #270).
  - "sc Hearrenfean" (ook "s.c.", "SC" en in "sc Hearrenfean-fan") is `relevant`, zoals "sc Heerenveen".
  - "Hearrenfean" met een voetbalwoord (Nederlands of Fries), de achternaam van iemand van de club of een andere profclub is `relevant`; "Hearrenfean" alleen is `doubtful`.
    Een kop mag allebei de schrijfwijzen hebben.
  - Het bijvoeglijk naamwoord "Feanster" is de naam van de club niet, net als "Heerenveense": een kop met alleen "Feanster" is `irrelevant`, ook met een voetbalwoord.
    Staat "Hearrenfean" erbij, dan beslist die naam.
  - `relevance-terms.ts` heeft `clubNames` voor de twee namen en `frisianFootballWords` voor de Friese woorden.
    De regels uit #74 blijven: hoofdletters en accenten tellen niet (een "â", "û" of "ú" valt weg), alleen hele woorden, en het streepje splitst.
    De Friese "y" en "ij" hoeven niets: de lijst schrijft de woorden zoals het Fries ze schrijft ("kompetysje"), en het filter zet er niets om.
- **Waarom:** Omrop Fryslân, onze eerste regionale bron, schrijft veel in het Fries, en de grote meerderheid van de Friestalige koppen over de club (50 van de 53 bij Sportcast) noemt de club zo.
  Zonder de Friese woorden mist het filter juist de berichten die een supporter uit Friesland wil zien.
  Een gemist clubbericht is erger dan een bericht dat een moderator verbergt (zie _Een volledige naam is genoeg, en "wint" en "verliest" zijn voetbalwoorden_).
- **De Friese woorden:** 23 woorden, elk gevonden op de Friese Wikipedia (fy.wikipedia.org) op 25 oktober 2026, op de pagina's "SC Hearrenfean", "Fuotbal", "Earedifyzje" en "KNVB-beker".
  De feed van Omrop Fryslân had die dag geen enkele Friese voetbalkop (alle 50 koppen zijn Nederlands, op "Liwwadder" en "Fryslân" na), dus geen woord komt uit de feed.
  Een woord dat het Nederlands en het Fries hetzelfde schrijven (wint, doelpunt, supporters, stadion, trainer, kampioen), staat alleen in de Nederlandse lijst.
  De lijst is: alvetal, earedifyzje, ferdigener, ferdigeners, ferlear, fuotbal, fuotballer, fuotballers, haadtrainer, kompetysje, middenfjilder, middenfjilders, oerwinning, seleksje, skoarden, thusoerwinning, thuswedstriden, trener, utoerwinning, utwedstriid, wedstriden, wedstriid en wun ("wûn").
- **Wat we niet opnamen:** woorden die ook buiten het voetbal gewoon zijn, naar de les van "wint": "ploech" (ook elke groep of ploeg), "spiler" (speler van alles), "útslach" (uitslag, maar ook huiduitslag), "kampioenskip" (ook bij fierljeppen en skûtsjesilen), "ferlies" (ook verlies in geld), "promoasje", "beker" en "oanhing".
  Een kop met een van die woorden en "Hearrenfean" is `doubtful`.
  "ferliest", "winne" en "skoarje" vonden we niet op de pagina's, dus ze staan er niet; "wint" staat al in de Nederlandse lijst.
- **De afweging bij "wûn" en "ferlear":** zoals "wint" en "verliest" maken ze van "Frou wûn lotterij yn Hearrenfean" een `relevant` kop, die een moderator verbergt.
  Dat nemen we aan, want een weggelaten "Hearrenfean wûn fan Cambuur" is erger.
  De tests houden die twee valse treffers zichtbaar.
- **De telling van Omrop Fryslân:** de 50 koppen van 25 oktober 2026 geven met de Friese woorden dezelfde uitkomst als zonder: 4 `relevant`, 2 `doubtful` en 44 `irrelevant`, en geen kop veranderde.
  Dat klopt, want geen kop had een Friese schrijfwijze of een Fries voetbalwoord.
  De verandering werkt dus pas als de bron een Friestalige kop over de club schrijft, zoals Sportcast.
- **Alternatieven:** niets doen (de Friese koppen verdwijnen stil); het Fries volledig laten vertalen door een taalmodel (traag, duur, niet te testen, tegen _Het relevantiefilter kijkt alleen naar de kop, en bewaart wat het niet toont_); alleen de naam van de club toevoegen en geen voetbalwoorden (eenvoudiger, maar "Hearrenfean wint" blijft dan `doubtful`, en "Hearrenfean wûn" ook).

### Een artikel bewaart wie het veranderde en elke versie van de tekst

- **Datum:** 25 oktober 2026
- **Besluit:** een artikel bewaart elke opgeslagen versie van zijn inhoud in een eigen tabel, `article_versions`, en een kolom `updated_by` zegt wie het artikel het laatst veranderde (#274).
  - `updated_by` is het nummer van een account, met een foreign key naar `admin_users` zonder `cascade`.
    Elke wijziging van het artikel zet hem samen met `updated_at`: een bewerking, het publiceren en het intrekken.
  - Een versie bewaart de titel, het adres, de intro, de tekst en de auteur, met `saved_at` (UTC) en `saved_by` (het nummer van het account).
    Versie 1 is het artikel zoals het voor het eerst is opgeslagen.
  - Een versie komt in dezelfde transactie als de wijziging, via de ene functie `recordVersion` in `apps/site/src/beheer/article-versions.ts`.
    Alleen maken en bewerken geven een versie.
    Publiceren, intrekken en opslaan zonder verschil geven er geen.
  - Niets in de site wijzigt of verwijdert een versie, en `article-versions.test.ts` houdt dat zo, zoals `audit-log.test.ts` voor het logboek.
- **Waarom:** het logboek van beheeracties zegt wie wat deed, maar niet wat er stond.
  Een artikel staat onder onze naam, dus een fout of een omstreden wijziging moet na te gaan en terug te halen zijn.
  De tekst voor elke bewerking weggooien is het enige wat we niet kunnen herstellen.
- **Alternatieven:** alleen het logboek (zoals voorheen: wie en wanneer, niet wat); de oude tekst in het logboek zelf bewaren (dan staat tekst in een tabel die voor feiten is bedoeld, en het logboek wordt groot); een volledige geschiedenis met terugzetten en vergelijken (meer scherm, nog niet nodig).

### Een versie is een momentopname van de nieuwe inhoud, niet het verschil of de oude tekst

- **Datum:** 25 oktober 2026
- **Besluit:** de tabel bewaart bij elke keer opslaan een momentopname van de nieuwe inhoud (#274).
- **Waarom:** zo is de nieuwste versie altijd gelijk aan het artikel, begint de geschiedenis bij versie 1 en is er geen speciaal geval voor de eerste keer.
  Een artikel is kort, dus de opslag doet er niet toe, en een versie is één rij die je zo kunt lezen.
- **Alternatieven:** de oude tekst bewaren vlak voor een bewerking (kleiner, maar de huidige versie staat dan niet in de tabel en de eerste versie is een uitzondering); alleen het verschil bewaren (compact, maar niet leesbaar zonder de rest).
- **Wat de tabel niet bewaart:** de publicatiestand (`published_at`).
  Die verandert zonder dat de tekst verandert, en het logboek heeft `article.publish` en `article.unpublish` al.
  Een versie zegt dus welke tekst er stond, niet of hij toen op de site stond.

### De versies van een artikel krijgen aaneengesloten nummers, en de rij van het artikel regelt de volgorde

- **Datum:** 25 oktober 2026
- **Besluit:** het nummer van een nieuwe versie is één meer dan het hoogste nummer van dat artikel (1 voor de eerste), en komt uit dezelfde opdracht die de rij toevoegt (`INSERT ... SELECT COALESCE(MAX(version), 0) + 1`).
  Twee dingen houden dat recht.
  - Wie een versie schrijft, heeft de rij van het artikel al vergrendeld met `SELECT ... FOR UPDATE`, zoals bij het publiceren, dus twee bewerkingen tegelijk gaan om de beurt.
  - De unieke sleutel op `(article_id, version)` weigert een tweede versie met hetzelfde nummer, ook als een aanroeper de vergrendeling vergeet: de transactie mislukt dan, en er komt geen dubbel nummer.
- **Waarom:** een nummer dat in de code wordt uitgerekend en dan wordt ingevoegd, kan met twee gelijktijdige bewerkingen twee keer hetzelfde worden.
  Het testen daarvan gebeurt met acht bewerkingen tegelijk, die de nummers 1 tot en met 9 zonder gat geven.
- **Alternatieven:** een teller in de tabel `articles` (nog een kolom die bij elke wijziging in de pas moet blijven); het nummer uit het `id` van de versie halen (niet aaneengesloten per artikel); alleen op de unieke sleutel vertrouwen (de tweede bewerking krijgt dan een fout in plaats van te wachten).
- **Kolommen:** de tabel heeft een eigen `id` en een unieke sleutel op `(article_id, version)`, zoals `items` dat doet met `(source_id, item_key)`.
  Beide foreign keys (het artikel en het account) hebben geen `cascade`: een artikel en een account verdwijnen niet, dus een versie ook niet.

### De migratie van de versies kan opnieuw draaien, want MariaDB maakt DDL niet ongedaan

- **Datum:** 25 oktober 2026
- **Besluit:** migratie `0013_add_article_versions` is zo geschreven dat elke opdracht opnieuw kan draaien (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `FOREIGN KEY IF NOT EXISTS`, `UPDATE ... WHERE updated_by IS NULL` en een `INSERT ... WHERE NOT EXISTS` voor versie 1).
  De volgorde is: de tabel `article_versions`, de kolom `updated_by` leeg, die vullen uit `created_by`, de kolom verplicht maken, de foreign key, en dan versie 1 voor elk artikel zonder versie.
  Versie 1 krijgt de huidige inhoud, `saved_at` gelijk aan `updated_at` en `saved_by` gelijk aan `updated_by`.
- **Waarom:** de site draait de migraties als hij start (zie _De site draait de migraties als ze start_), en MariaDB kan `CREATE TABLE` en `ALTER TABLE` niet in een transactie terugdraaien.
  Een migratie die halverwege stopt, laat het schema half veranderd achter, en `drizzle` schrijft de migratie dan niet op als klaar.
  Zonder deze opzet zou de volgende start stranden op "kolom bestaat al", en moest de eigenaar met de hand herstellen.
  Nu is herstellen: de oorzaak oplossen (een volle schijf, een verbroken verbinding) en de site opnieuw starten.
- **Hoe een half uitgevoerde migratie eruitziet:** na opdracht 1 bestaat de lege tabel `article_versions`; na 2 heeft `articles` de kolom `updated_by` zonder waarden; na 3 en 4 is die gevuld en verplicht; na 5 heeft hij zijn foreign key; en na 6 zijn de versies er, alleen is de migratie niet als klaar opgeschreven.
  Een test (`article-versions-migration.test.ts`) zet de database op elk van die punten en draait de migratie dan, op artikelen die er al zijn.
  Zolang de migratie niet klaar is, blijven de pagina's voor bezoekers werken, want hun queries noemen de kolommen die ze nodig hebben; alleen het beheer van artikelen geeft een fout.
- **Wat de test niet bewijst:** de migratie is niet op de echte gegevens van acceptatie of productie gedraaid.
  Het back-up vóór een migratie op productie (#33) blijft het vangnet.
- **Later:** die back-up vóór een migratie op productie hoort sinds 26 oktober 2026 bij #347; zie _Back-ups zijn een dagelijkse dump op de host, 14 dagen bewaard, en een terugzetting die we één keer echt testen_.
- **Alternatieven:** de kolom meteen verplicht toevoegen met een standaardwaarde (MariaDB vult bestaande rijen dan met 0, en de foreign key faalt); een migratie in twee stappen, een release met de kolom leeg en een met de eis (twee releases voor iets wat in één opdrachtenrij past); alleen een tabel zonder `updated_by` (de kolom is een eis van het issue).

### De versies staan als lijst onder het formulier, zonder knop om terug te zetten

- **Datum:** 25 oktober 2026
- **Besluit:** onder het formulier van een artikel staat "Eerdere versies" als lijst, nieuwste bovenaan, met het nummer, de tijd en het e-mailadres van het account; de nieuwste staat erbij als "Huidige versie".
  `/beheer/artikelen/<nummer>/versies/<versienummer>` toont de versie met dezelfde `Article` en `ArticleText` als het voorbeeld, met de gegevens van de versie erboven.
  Beide zijn alleen voor een beheerder, krijgen `noindex` en `no-store` van de proxy, en geven "niet gevonden" voor een artikel of een versie die er niet is.
  Er is geen knop om terug te zetten, geen vergelijking en geen manier om een versie te verwijderen.
- **Waarom:** een lijst met een kop per versie leest op een telefoon beter dan een tabel van drie kolommen met een e-mailadres, en de lijst met artikelen heeft al dezelfde vorm.
  Wie een oude tekst wil hebben, kopieert hem uit de pagina van de versie; dat is genoeg zolang we er nog niet om vragen.
  Een versie toont de datum van het artikel zelf, of de dag van vandaag bij een concept, zoals het voorbeeld.
- **Alternatieven:** een tabel (past bij gegevens in kolommen, maar scrolt op een telefoon opzij); een terugzetknop (meer scherm en meer regels voor wat er met de publicatie gebeurt, nog niet nodig); de versies op een eigen pagina (een klik meer voor wie net iets heeft overschreven).
- **Een artikel dat alleen met SQL is gemaakt of veranderd** heeft geen versie van die wijziging, want SQL gaat om de site heen (zie `docs/artikelen.md`).
  De pagina zegt dat er nog geen versie is, en de eerstvolgende wijziging in het beheer geeft de eerste.

### /wedstrijden heeft een zijbalk van 32 rem met de stand en de uitslagen

- **Datum:** 26 oktober 2026
- **Besluit:** op `/wedstrijden` staat het programma in de hoofdkolom van 30 rem, en in de zijbalk van 32 rem de stand met daaronder de uitslagen.
  Alleen deze pagina wijkt af van de verdeling van 38, 2 en 24 rem.
- **Waarom:** de stand is een brede tabel met negen kolommen en past in 32 rem zonder te scrollen.
  Het programma is een lijst met korte regels en heeft aan 30 rem genoeg.
  De stand staat bovenaan de zijbalk, omdat dat is waar supporters het eerst naar kijken.
- **Hoe:** de pagina kiest de verdeling met `wide` op de `Page.Sidebar`, niet met een eigenschap van `Page.Body`, want de `Page.Body` staat in de layout van de site en is voor alle pagina's dezelfde.
  `Page.Body` ziet de brede zijbalk met `:has()`, zoals het ook een inleiding ziet.
  Vanaf 56 rem zijn de sporen `minmax(20rem, 30rem)` en `minmax(24rem, 32rem)`; samen met de 2 rem ertussen passen ze bij 56 rem in de 52 rem die er dan zijn.
  Tot 66 rem breed krimpen ze mee, de zijbalk dus het eerst tot 24 rem, en scrollt de tabel zo nodig in zijn eigen gebied.
  Onder 56 rem is er één spoor van hoogstens 38 rem, zoals op elke pagina.
  De cellen van een brede zijbalk staan altijd onder elkaar, ook onder de hoofdkolom, waar twee cellen van 16 rem naast elkaar zouden passen: de stand heeft de breedte van de kolom nodig.
  De volgorde in de bron is die op een telefoon: het programma, de stand, de uitslagen, zonder `order`.
  De bronvermelding staat onderaan de zijbalk, zodat ze op een telefoon na de uitslagen komt en niet tussen het programma en de stand.
- **Alternatieven:** alles in één kolom laten, zoals nu (de stand staat onderaan, onder een lange lijst); de verdeling voor alle pagina's wijzigen (raakt de homepage en de artikelen, die een smalle zijbalk nodig hebben).
- **Later:** zie _De stand toont geen doelpunten voor en tegen_.
  Zonder die twee kolommen past de tabel in de zijbalk van 32 rem; met ze was ze 23 pixels te breed.
- **Later:** zie _De kolommen van `/wedstrijden` zijn even breed_.
  Het programma staat in een hoofdkolom van 31 rem en de stand met de uitslagen in een zijbalk van 31 rem, met de bronvermelding als laatste.
- **Later:** zie _De kaarten van een zijbalk staan standaard onder elkaar, naast elkaar is een optie_.
  De cellen van een zijbalk staan nu standaard onder elkaar, dus `wide` hoeft ze niet meer onder elkaar te houden; het maakt alleen de zijbalk breder.
- **Later:** zie _De kaart Doelpunten per kwartier telt de doelpunten van de wedstrijden met bekende minuten_.
  De hoofdkolom heeft nu twee kaarten, het programma en daaronder de doelpunten per kwartier; op een telefoon is de volgorde het programma, de doelpunten per kwartier, de stand en de rest van de zijbalk.
- **Later:** zie _Op /wedstrijden hebben de kaarten met cijfers een zacht en een warm vlak, en de uitslagen staan in de hoofdkolom_.
  De uitslagen staan nu in de hoofdkolom na het programma, en de volgorde op een telefoon is Programma, Uitslagen, Stand, Doelpuntenmakers, De nul gehouden en Doelpunten per kwartier; de breedtes blijven.

### De stand toont geen doelpunten voor en tegen

- **Datum:** 26 oktober 2026
- **Besluit:** de stand toont de kolommen DV (doelpunten voor) en DT (doelpunten tegen) niet meer, op elke pagina.
  De tabel heeft positie, club, gespeeld, gewonnen, gelijk, verloren, doelsaldo en punten, met de koppen #, Club, G, W, G, V, D en P.
  `StandingsTable` heeft de kolommen en de eigenschappen `goalsFor` en `goalsAgainst` van een rij niet meer; het doelsaldo blijft, met de afkorting D in plaats van DS.
  De database en de importer veranderen niet: de importcontroles gebruiken de doelpunten voor en tegen, dus ze blijven bewaard.
- **Waarom:** de projecteigenaar koos dit.
  Zo past de tabel in de zijbalk van 32 rem van `/wedstrijden`, waar ze met alle kolommen 23 pixels te breed was voor haar gebied, en scrolt ze op een telefoon minder ver.
  Het doelsaldo zegt wat supporters het eerst willen weten van de doelpunten.
- **Alternatieven:** de naam van de club laten afbreken (de rij van een lange naam wordt hoger); een bredere zijbalk (dan wordt de hoofdkolom smaller dan het programma nodig heeft); de scroll laten staan.
- **Later:** zie _De punten staan voor het doelsaldo in de standtabel_.
  De volgorde van de kolommen is nu #, Club, G, W, G, V, P en D.
- **Later:** zie _De stand toont alleen gespeeld en punten, en de volledige stand heeft een balk voor de punten_.
  De kolommen W, G, V en D zijn vervallen: de kolommen zijn nu #, Club, G en P.

### De stand toont de dag niet

- **Datum:** 26 oktober 2026
- **Besluit:** de kaarten "Stand" op de homepage en op `/wedstrijden` tonen de regel "Stand op 18 oktober 2026" niet meer.
  Het bijschrift van de tabel blijft in de HTML, met dezelfde tekst, maar is alleen voor een schermlezer (`hf-visually-hidden`).
- **Waarom:** de projecteigenaar koos dit: de dag is bijna altijd vandaag, dus de regel zegt supporters niets.
  Een tabel heeft een naam nodig, en een schermlezer hoort de dag er zonder moeite bij.
- **Alternatieven:** het bijschrift weglaten (de tabel heeft dan geen naam); de dag alleen tonen als hij niet vandaag is (extra logica en een tweede toestand om te testen).

### Alle koppen en titels breken in balans

- **Datum:** 26 oktober 2026
- **Besluit:** niet alleen `h1` tot en met `h6`, maar ook de kop van een nieuwsbericht en andere titels die over meer regels kunnen lopen, krijgen `text-wrap: balance`.
  De regel staat één keer, in `heading.css`, bij de klasse `.hf-headline` in de typografielaag, binnen `@supports (text-wrap: balance)` zoals de koppen.
  Zo krijgen de kop in `NewsItem` en de titel in `DiscussionItem` hem, en elk component dat de klasse later gebruikt.
  De titel in `ArticleCard` is een `h3` en had hem al.
  Geen component heeft een eigen regel.
- **Aangevuld op 26 oktober 2026, op verzoek van de projecteigenaar:** ook de wedstrijdregel (`.hf-match-clubs`), de inleiding van een pagina (`.hf-intro`), de hulptekst en de foutmelding van een veld (`.hf-field-hint`, `.hf-field-error`) en de regels van `ErrorSummary` breken in balans.
  Elk heeft de regel één keer, in het bestand van zijn eigen stijl of component, binnen dezelfde `@supports`.
  Knoppen en de footer zijn niet aangepast.
  `text-wrap: pretty` blijft buiten beeld: Firefox heeft het nog niet.
- **Waarom:** een kop met één woord alleen op de tweede regel ziet er onrustig uit en leest slechter.
  Balance verdeelt de woorden over de regels van een korte tekst, zonder dat de kop breder of smaller wordt.
  Het hoort bij de koppen die we al zo zetten, ook al zijn ze geen `h`-element.
  `overflow-wrap: anywhere` van de componenten blijft werken: een heel lang woord breekt, en de pagina scrolt niet opzij.
- **Let op:** `text-wrap: balance` wordt op 13 november 2026 'widely available' (zie _Functies die nog niet zover zijn_).
  Meldt Stylelint de `@supports` dan als overbodig, dan gaat hij weg, zowel bij `.hf-headline` als bij de koppen.
  Een test (`heading-css.test.ts`) leest de CSS en controleert dat de regel er staat, op één plek, binnen die `@supports`.
- **Alternatieven:** het alleen op de `h`-elementen laten (de koppen van het nieuws, het meest gelezen deel van de site, houden dan het probleem); `text-wrap: pretty` op alle tekst (werkt nog niet in alle browsers, en het is bedoeld voor lange tekst); een eigen regel per component (meer plaatsen om bij te houden).

### Safari vergroot de tekst niet zelf in liggende stand

- **Datum:** 26 oktober 2026
- **Besluit:** `html` krijgt `text-size-adjust: 100%`, zodat Safari op iPhone en iPad de tekst niet vergroot als het toestel draait.
  De regel staat één keer, in de basislaag van het designsysteem (`root.css`), bij de andere regels voor `html`.
  Er staan twee vormen, elk binnen `@supports` (zie _Functies die nog niet zover zijn: `@supports`, of een tijdelijke uitzondering_):
  - `-webkit-text-size-adjust: 100%` binnen `@supports (-webkit-touch-callout: none)`, voor Safari op iOS en iPadOS.
    Stylelint meldt het voorvoegsel, dus er staat één `stylelint-disable-next-line property-no-vendor-prefix` met de reden bij.
  - `text-size-adjust: 100%` binnen `@supports (text-size-adjust: 100%)`, voor browsers die de regel zonder voorvoegsel kennen.
    `plugin/use-baseline` meldt de regel als niet 'widely available'; binnen `@supports` is dat goed.
- **Waarom:** Safari vergroot in liggende stand de tekst die het voor lopende tekst houdt, maar laat tabellen en gebieden die zijwaarts scrollen met rust.
  Daardoor staan op één pagina grote en kleine teksten naast elkaar.
  Met 100% bepaalt de pagina de grootte, en de bezoeker kan nog altijd inzoomen: knijpen in de pagina en de paginazoom in het menu van Safari veranderen de tekst nog (WCAG 1.4.4 en 1.4.10).
- **De vorm met voorvoegsel is nodig:** in de iOS Simulator (iOS 27.0, iPhone 18 Pro, liggend) bleef de tekst in liggende stand vergroot met alleen `text-size-adjust: 100%`: de kaarten van `/wedstrijden` tot anderhalf keer zo groot, de koppen op de homepage ruim een zesde groter.
  Met `-webkit-text-size-adjust: 100%` kwam de tekst terug op de grootte van staand, en de standtabel veranderde in geen van beide gevallen.
  Een echte iPhone is niet getest.
- **De bouw laat het voorvoegsel weg als het naast de vorm zonder voorvoegsel staat:** Next.js haalt `-webkit-text-size-adjust` uit dezelfde regel weg en zet er `-moz-text-size-adjust` voor in de plaats.
  Daarom staat het voorvoegsel in een eigen `@supports`-blok; dat blijft in de gebouwde CSS staan.
  Een test (`root-css.test.ts`) controleert dat beide vormen in de bron staan, maar niet wat de bouw ervan maakt; dat kijk je na in de gebouwde CSS.
- **Alternatieven:** niets doen (de verschillen blijven in liggende stand); een vaste waarde als 90% of 110% (verkeerd voor wie het teken groot nodig heeft); de tabel ook laten vergroten (kan niet, het is de beslissing van Safari); alleen de vorm zonder voorvoegsel (werkt niet in Safari op iPhone).

### Een onregelmatige test is een bug in de test of de pagina, geen reden om hem los te maken

- **Datum:** 26 oktober 2026
- **Besluit:** een e2e-test die af en toe faalt, wordt onderzocht en hersteld bij de oorzaak.
  We zetten hem niet uit, laten hem niet vaker proberen en maken hem niet losser.
- **Waarom:** een test die soms faalt, leert de Builders dat rood niets betekent.
  Hier was het niet zeker of het een wachtpunt in de test was of een echte pagina zonder titel.
- **Wat het was:** na een formulier dat doorstuurt, wisselt de site van pagina zonder een nieuw document te laden.
  Next.js zet dan eerst de nieuwe inhoud neer en een paar milliseconden later de `<title>`.
  Axe, dat meteen na de kop draaide, meldde `document-title` op een pagina die een titel heeft.
  Onder zware belasting op de eigen computer ging het één keer in twintig runs mis, in CI twee keer in twaalf runs.
  Een bezoeker merkt het nauwelijks, en elke pagina heeft een titel zodra de wissel klaar is.
- **De oplossing:** `checkPage` wacht, hoogstens twee seconden, tot de titel er is, en laat dan axe draaien.
  Heeft een pagina echt geen titel, dan meldt axe het nog steeds (de test `fails on a page without a title`).
  De wacht staat in `checkPage` en niet in elke test, omdat elke test die axe na een formulier laat draaien dit kan tegenkomen.
- **Alternatieven:** `retries` in Playwright aanzetten (verbergt de fout en verlengt elke run); de test overslaan tot het later beter uitkomt (een gat in de toegankelijkheidscontrole van het beheer); in `writing.spec.ts` alleen na de drie plaatsen waar het gebeurde op de titel wachten (de volgende test die axe na een formulier laat draaien heeft hetzelfde probleem).

### Een uitslag toont de uitkomst in kleur, zonder letter

- **Datum:** 26 oktober 2026
- **Besluit:** de uitslag van sc Heerenveen in `Match` is groen bij winst, rood bij verlies en neutraal bij gelijkspel.
  Er komt geen letter of woord bij: de doelpunten zelf zeggen genoeg.
  De uitkomst volgt uit de doelpunten van sc Heerenveen en niet uit die van de thuisclub: 0–2 uit is een winst en 2–0 uit een verlies.
  Een gelijke stand krijgt de kleur van gelijkspel, ook in de beker; die kleur zegt niets over wie er doorging, ook niet als een beker op strafschoppen is beslist.
- **Palet:** er komt een reeks groen bij (tint 150°, elf stappen, even licht als rood met hetzelfde nummer) en drie rollen: `outcome-win`, `outcome-loss` en `outcome-draw`.
  Winst is groen-700 in licht en groen-300 in donker.
  Verlies is rood-700 en rood-300, dezelfde stappen als `text-accent`, maar een eigen rol, zodat de uitkomst kan veranderen zonder het accent mee te nemen.
  Gelijkspel heeft de kleur van secundaire tekst, want gelijkspel is niet goed en niet slecht.
- **Waarom:** supporters zien zo in één oogopslag hoe het ging.
  Kleur is hier een aanvulling op de cijfers en niet het enige teken (WCAG 1.4.1), want wie kleuren niet ziet, leest de uitkomst in 2–0 of 0–2.
  Een letter erbij zou de regel drukker maken zonder iets te zeggen.
  De screenreader hoort wat hij hoorde ("2 tegen 0"), en in forced colours valt de kleur weg: de browser zet de eigen kleur van de gebruiker op de tekst.
- **Alternatieven:** een letter (W, G, V) of een woord erbij, voor wie kleuren niet uit elkaar houdt (de projecteigenaar vond de cijfers voldoende); gele of blauwe kleur voor gelijkspel (geel is een waarschuwing en blauw is de kleur van links); de beker apart behandelen (niet nodig: neutraal zegt niets over wie doorging).
- **Later:** zie _Verlenging en strafschoppen worden bewaard en getoond_.
  Bij strafschoppen volgt de kleur de strafschoppen, en een gelijke stand zonder bekende strafschoppen blijft neutraal.

### Verlenging en strafschoppen worden bewaard en getoond

- **Datum:** 26 oktober 2026
- **Besluit:** de import bewaart bij een bekerwedstrijd of er verlenging was en wat de strafschoppen waren, en `Match` toont dat met afkortingen ("n.v.", "(4–2 n.s.)"), met de volle woorden voor een schermlezer.
  De kleur van de uitkomst volgt de strafschoppen als die er zijn.
- **Opslag:** `matches` krijgt `extra_time` (standaard `false`), `penalties_for` en `penalties_against`, met een migratie (`0015_add_extra_time_and_penalties`).
  Drie CHECK-constraints houden ze heel: verlenging alleen bij een gespeelde bekerwedstrijd, strafschoppen in een paar, en strafschoppen alleen na verlenging en bij een gelijke stand.
  `goals_for` en `goals_against` blijven de stand uit `score`, zonder de strafschoppen.
- **Inlezen:** een gevuld `aet` is verlenging (op de pagina van de beker 2025/26 altijd `J`), en `penaltyscore` is "N – N" met team 1 eerst, omgezet naar de kant van sc Heerenveen.
  Een wedstrijd zonder score is nooit in verlenging, ook niet als `aet` er al staat.
- **Toon:** "n.v." en "(4–3 n.s.)" staan direct achter de uitslag, op de regel met de clubs: "sc Heerenveen 3–3 (5–3 n.s.) Proefstad SV".
  Ze horen bij de uitslag en zijn geen bijzaak, dus ze staan niet bij de competitie.
  De score van de strafschoppen staat in de volgorde van de clubs op de regel, tussen haakjes, en is lichter gedrukt dan de doelpunten.
  Beide zijn een `abbr` met een `title`, en voor de ogen alleen (`aria-hidden`).
  Een schermlezer hoort de volle woorden achter de uitslag: "1 tegen 1, na strafschoppen 4 tegen 3".
  Bij strafschoppen staat alleen "n.s.", want strafschoppen komen na verlenging.
  Onder een lijst met zulke wedstrijden staat wat de afkortingen betekenen ("n.v. na verlenging, n.s. na strafschoppen"), alleen van de afkortingen die in de lijst staan, voor wie geen muis heeft (WCAG 3.1.4).
- **Kleur:** bij strafschoppen is de uitkomst die van de strafschoppen, anders die van de stand.
  Een gelijke stand zonder strafschoppen blijft neutraal, ook als de strafschoppen nog niet op de pagina staan.
- **Waarom:** zonder dat staat een ronde die op strafschoppen is beslist, als een gelijkspel, en weet de supporter niet wie er doorging.
  Het staat op de pagina van de beker in aparte velden (`aet`, `penaltyscore`), dus inlezen is geen gokwerk, en de gewone `score` blijft zoals ze was.
- **Alternatieven:** het niet bewaren (dan blijft een gelijke stand in de beker vaag); de strafschoppen als gewone doelpunten bij de stand optellen (verkeerd: 1–1 wordt dan 5–3); de volle woorden "na verlenging" en "na strafschoppen" in beeld (de projecteigenaar koos op 26 oktober 2026 voor afkortingen, omdat de volle woorden de regel drukker maken).
  Daarom staan de volle woorden wel voor een schermlezer en in de `title`, want een schermlezer leest een afkorting slecht.

### Een strafschop die we niet kunnen lezen laat de import niet doorgaan

- **Datum:** 26 oktober 2026
- **Besluit:** een score van strafschoppen die niet als "N – N" te lezen is, laat de controle van de pagina falen, zoals een andere onverwachte opbouw.
  De laatste goede versie blijft staan en het logboek krijgt een waarschuwing.
  Hetzelfde geldt voor verlenging of strafschoppen bij een competitiewedstrijd, voor strafschoppen zonder verlenging en voor strafschoppen bij een stand die niet gelijk is.
- **Waarom:** de import hoort bij een onverwachte opbouw niets te raden.
  Een beker die op strafschoppen is beslist, mag niet als een gelijkspel blijven staan door een fout in de vorm.
- **Een nieuwe score van strafschoppen is geen verandering van de uitslag:** komen de strafschoppen er later bij, dan neemt de import ze over zonder waarschuwing.
  Verandert een score van strafschoppen die er al was, nadat de uitslag drie dagen of langer vaststond, dan waarschuwt hij, met de strafschoppen in de tekst.
- **Alternatieven:** de wedstrijd bewaren zonder strafschoppen en doorgaan (de fout gaat dan onopgemerkt).

### We tellen paginaweergaven en unieke bezoekers per dag, met een kenmerk dat elke dag wisselt

- **Datum:** 26 oktober 2026
- **Besluit:** de site telt zelf, op de eigen server, paginaweergaven per pagina en unieke bezoekers per dag.
  Een unieke bezoeker is een kenmerk van IP-adres en browsertekst met een zout dat voor die dag willekeurig is.
  Het zout en de kenmerken verdwijnen als de dag voorbij is; alleen de tellers blijven.
- **Waarom:** het antwoord op "hoeveel bezoekers" vraagt dat je dezelfde bezoeker binnen een dag herkent, maar niet over dagen.
  Een kenmerk dat elke dag verandert, doet dat.
  Zo volgen we niemand, en een eigen teller vraagt niets van een derde.
- **Alternatieven:** alleen paginaweergaven (nog privacyvriendelijker, maar "hoeveel bezoekers" blijft dan onbeantwoord); een dienst van derden zoals Google Analytics (breekt onze belofte); de logbestanden van de hosting lezen (we hebben ze niet in handen en ze bevatten IP-adressen).
- **Hoe:**
  - Vier tabellen (migratie `0014_add_visit_counters`): `page_views` (een teller per dag en pad), `daily_visitors` (een teller per dag), `visitor_salts` (het zout van de dag) en `visitor_hashes` (de kenmerken van de dag).
    Alleen de eerste twee blijven.
    De klikken op links (#292) en de cijfers in het beheer (#293) bouwen hierop: zij lezen de tellers en gebruiken het zout en de kenmerken van de dag opnieuw.
  - Het kenmerk is de HMAC-SHA-256 (hex) van het adres en de browsertekst, met het zout van de dag als sleutel.
    Het zout is 32 willekeurige bytes (hex) en staat in de database, omdat de host meer processen kan starten die hetzelfde zout moeten gebruiken.
    Het eerste verzoek van een dag in een proces maakt het zout (`INSERT IGNORE`, dan lezen: wie eerst is wint) en gooit de gegevens van eerdere dagen weg.
  - Een bezoeker telt als `INSERT IGNORE` in `visitor_hashes` een rij toevoegt; dan gaat `daily_visitors` met één omhoog.
  - Een dag is een dag in Nederland (Europe/Amsterdam), zoals een bezoeker hem kent, en niet in UTC.
  - Het weggooien van het zout en de kenmerken van alle dagen vóór vandaag gebeurt op twee plekken, door dezelfde functie (`removeVisitorData`): bij het eerste verzoek van een nieuwe dag, en bij elke run van de import, dus ook op een dag zonder bezoekers.
    Een verzoek dat vlak voor middernacht begon kan zijn kenmerk nog na het weggooien schrijven; de volgende run van de import (hoogstens een kwartier later) haalt het weg.
  - Het IP-adres en de browsertekst staan nergens: niet in een tabel, en niet in het logboek.
    Een fout bij het tellen logt alleen de reden (`reasonOf`), nooit het verzoek.
- **Let op:** zolang de dag duurt, staan het zout en de kenmerken samen in de database.
  Wie de database kan lezen, kan met het zout alle IPv4-adressen proberen en zo een kenmerk terugrekenen naar een adres.
  Dat vraagt toegang tot de database, en na de dag is het zout weg.
  De privacypagina zegt het ook: tot het einde van de dag staan het getal (het zout) en de codes (de kenmerken) in onze database.
- **Rechtsgrond:** de Builder nam gerechtvaardigd belang aan (we willen weten of de site gelezen wordt, en we houden geen persoonsgegevens langer dan de dag).
  Toestemming is niet nodig, omdat er niets op het apparaat van de bezoeker staat.
  Een jurist heeft dit niet bekeken.

### Bots, DNT en GPC worden niet geteld

- **Datum:** 26 oktober 2026
- **Besluit:** bekende bots, onze importer en de controles van de hosting tellen niet mee, en een verzoek met `DNT: 1` of `Sec-GPC: 1` ook niet.
- **Waarom:** de cijfers moeten bezoekers zijn, geen crawlers.
  Wie zegt niet gevolgd te willen worden, wordt niet geteld, ook al volgen we niemand.
  Dat past bij onze belofte.
- **Alternatieven:** alles tellen (opgeblazen cijfers); alleen bots uitsluiten (DNT en GPC kosten weinig en zeggen iets over ons).
- **Hoe:** de lijst met patronen voor de browsertekst staat op één plek, `notVisitors` in `apps/site/src/visits.ts`.
  Een verzoek zonder browsertekst telt ook niet.
  Een bot die zich als browser voordoet, telt wel mee; de lijst groeit als er een opduikt.

### De proxy telt, na het antwoord, alleen een aanvraag van een pagina

- **Datum:** 26 oktober 2026
- **Besluit:** het tellen draait in de proxy (`apps/site/src/proxy.ts`, het `proxy.ts` van Next.js 16, dat op Node.js draait), die al voor elk verzoek draait.
  De proxy geeft het tellen aan `event.waitUntil` en wacht er niet op, dus de pagina wacht niet op de database.
  Een fout bij het tellen komt in het logboek, hoogstens één keer per minuut, en de pagina merkt niets.
  Wacht de database niet (te langzaam of weg), dan laat het tellen na 5 seconden los, en neemt het hoogstens 20 tellingen tegelijk aan; de rest valt weg.
- **Wat telt:** een GET met `Accept: text/html` voor een pad uit `pages.ts`, `/contact/verstuurd` of `/redactie/<slug>` van een artikel dat de database kent.
  De zoekvraag telt niet mee: `/?nieuws=15` en `/podcasts?podcast=…` tellen voor `/` en `/podcasts`.
  Bestanden, `/_next`, `/beheer`, `robots.txt`, `sitemap.xml`, de feed en het manifest staan op geen lijst en tellen dus niet.
  Een pad dat niet bestaat telt ook niet, en ook geen verzoek met een prefetch-header (`Sec-Purpose`, `Purpose` of `X-Moz`).
  Een test loopt de `page.tsx`-bestanden na en laat falen als er een pagina bijkomt die op geen lijst staat.
- **Waarom:** de proxy ziet elk verzoek voordat de cache en de pagina erbij komen, dus een pagina uit een cache telt ook.
  Een teller in de pagina zelf telt niet als de pagina uit een cache komt, en vraagt dat elke pagina eraan denkt.
  Een eigen route die de browser aanroept, zou een script vragen; we willen geen script.
  Het kost per bezoek twee tot drie korte opdrachten voor de database, na het antwoord, en misschien een eigen verbinding naast die van de pagina's: de proxy is een eigen bundel van Next.js.
- **Let op:**
  - De proxy ziet de status van het antwoord niet.
    Een pad dat bestaat telt dus ook als de pagina een 404 geeft (`/podcasts?pagina=99`) of de foutpagina toont (de database is weg).
    Een artikel controleren we wel, met één opzoeking.
  - Next.js haalt zijn eigen headers (`RSC`, `Next-Router-Prefetch`) weg voordat de proxy het verzoek ziet, en zo'n verzoek vraagt geen HTML.
    Alleen een aanvraag van een hele pagina telt, en dat is elke klik, want de site heeft geen `next/link`.
    Een test controleert dat er geen `next/link` in de code staat; komt hij er toch, dan telt een klik niet meer en moet dit besluit opnieuw.
  - Een bezoeker die de pagina uit de cache van zijn browser haalt (terug in de geschiedenis), doet geen verzoek en telt niet.
- **Alternatieven:** tellen in `layout.tsx` (telt niet bij een pagina uit een cache; de pagina's zijn nu `force-dynamic`, maar dat verandert misschien); een eigen route met een afbeelding of script (vraagt een script of een extra verzoek); de logbestanden van de hosting lezen (zie hierboven).

### Het adres van de bezoeker is het laatste adres van `X-Forwarded-For`

- **Datum:** 26 oktober 2026
- **Besluit:** het adres komt uit de header `X-Forwarded-For`, het laatste adres erin, en alleen als het een openbaar IP-adres is.
  Een adres van de computer zelf of van een privé-netwerk (`127.0.0.0/8`, `::1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` en meer) telt niet als bezoeker; de paginaweergave telt wel.
  `::ffff:203.0.113.7` is `203.0.113.7`.
- **Waarom:** de host start de app met `lsnode.js` van LiteSpeed, en de verbinding komt van de host zelf.
  Next.js vult zelf `X-Forwarded-For` met het adres van de verbinding als de header er niet is, dus zonder de controle zou elke bezoeker `127.0.0.1` zijn.
  Wat een bezoeker zelf in de header zet, staat vóór het adres dat de host toevoegt; het laatste adres is dus het zijne, als de host toevoegt.
- **Nog niet gecontroleerd op de host:** we hebben bij het bouwen geen toegang tot de hosting.
  Stuurt de host de header niet, of een andere, dan telt de site de weergaven en geen bezoekers (`daily_visitors` blijft 0).
  `docs/acceptatieomgeving.md` (_Bezoekers tellen_) zegt hoe je dat op acceptatie ziet.
- **Alternatieven:** het eerste adres in de header (een bezoeker kan het zelf zetten); een andere header zoals `X-Real-IP` (we weten niet of de host hem stuurt); alleen de browsertekst (alle bezoekers met dezelfde browser tellen als één).

### Doelpuntenmakers staan in één regel op minuut, met groene en rode minuten

- **Datum:** 26 oktober 2026
- **Besluit:** `Match` toont onder de uitslag één regel met de doelpuntenmakers van beide clubs op volgorde van de minuut, zonder naam van de club ervoor, zoals "34’ Trenskow, 45’+1 Vente, 80’ Vennegoor of Hesselink".
  De minuut is groen bij een doelpunt van sc Heerenveen en rood bij een doelpunt van de tegenstander, en bij sc Heerenveen ook vet.
  Een schermlezer hoort de club erbij.
- **Waarom:** de projecteigenaar vindt het korter en rustiger, en supporters weten welke spelers van ons zijn.
  Kleur laat zien voor wie er werd gescoord, met dezelfde betekenis als de uitslag (_Een uitslag toont de uitkomst in kleur, zonder letter_: groen is goed voor ons, rood is slecht).
  Kleur is niet het enige teken: het vet voor onze eigen doelpunten volgt de vette club op de uitslagregel, en de naam van de club staat voor een schermlezer in de tekst (WCAG 1.4.1).
  De projecteigenaar wilde de minuten eerst niet vet en zette het vet op 26 oktober 2026 na de review weer terug, omdat kleur voor het oog anders het enige teken was.
- **Hoe:** de tekst is `<minuut>’<+blessuretijd>` en de naam, met een spatie die niet afbreekt ertussen.
  De apostrof en de plus zijn voor de ogen alleen (`aria-hidden`); een schermlezer hoort "minuut 45 plus 1, Vente, sc Heerenveen", met "; " tussen de doelpunten.
  De kleuren zijn de tokens `--hf-colour-outcome-win` en `--hf-colour-outcome-loss`, die al 4,5:1 halen op de vlakken (zie _Een uitslag toont de uitkomst in kleur, zonder letter_).
  In forced colours valt de kleur weg en blijft het vet over.
- **Alternatieven:** per club een eigen regel met de naam van de club ervoor (duidelijker, maar langer; dit was het eerste besluit); één regel zonder enig onderscheid (wie een speler van de tegenstander niet kent, kan niet zien voor wie hij scoorde); twee kolommen naast elkaar (te breed voor een smalle kaart).

### Eigen doelpunten staan bij de club die ervan profiteert

- **Datum:** 26 oktober 2026
- **Besluit:** een eigen doelpunt staat bij de club die erdoor scoort, met "e.d." erachter, zoals de Nederlandse Wikipedia het schrijft.
  Een penalty heeft "pen." erachter.
  Beide zijn een `abbr` met de volle woorden in een `title` en voor een schermlezer ("eigen doelpunt", "penalty"), en onder een lijst staat wat ze betekenen, zoals bij "n.v." en "n.s.".
- **Waarom:** de uitslag telt het zo, en de controle dat de doelpunten bij de uitslag passen, werkt dan zonder uitzonderingen.
  De afkorting zegt dat het geen doelpunt van die club was.
- **Opslag:** `match_goals` (migratie `0016_add_match_goals`) heeft een rij per doelpunt: `ours` (sc Heerenveen of de tegenstander), `minute`, `stoppage_minutes`, `player`, `own_goal` en `penalty`.
  De rijen gaan weg met hun wedstrijd (`ON DELETE CASCADE`).
  De import schrijft ze op volgorde van de klok, dus de volgorde van `id` is de volgorde in de regel.
- **Alternatieven:** het bij de club van de speler zetten (klopt dan niet met de uitslag naast de regel).

### Een doelpunt dat niet bij de uitslag past, wordt niet getoond

- **Datum:** 26 oktober 2026
- **Besluit:** klopt het aantal doelpunten van een club niet met haar goals in de uitslag, of is een regel niet te lezen, dan toont de site voor die wedstrijd geen doelpuntenmakers en schrijft de import een waarschuwing.
  De wedstrijd zelf blijft bewaard.
- **Waarom:** de doelpuntenmakers zijn een extra, en een fout in de lijst mag de pagina niet kapotmaken.
  Een lijst die niet bij de uitslag past, zegt iets onwaars, en dat is erger dan geen lijst.
- **Alternatieven:** de hele pagina laten falen, zoals bij een fout in de uitslag zelf (te streng voor een extra); de lijst tonen zoals ze is (kan een speler als scorer noemen die niet scoorde).

### Lege velden voor de doelpuntenmakers geven geen waarschuwing

- **Datum:** 26 oktober 2026
- **Besluit:** staan `goals1` en `goals2` van een gespeelde wedstrijd allebei leeg, dan zijn de doelpuntenmakers nog niet ingevuld.
  De import bewaart er dan geen en schrijft geen waarschuwing, ook als de uitslag doelpunten heeft.
  Staat er in één veld iets, dan klopt het aantal met de uitslag of niet, en bij een verschil volgt de waarschuwing.
- **Waarom:** Wikipedia vult de doelpuntenmakers vaak uren of dagen na de uitslag in.
  Een waarschuwing elk uur over iets wat nog moet komen, maakt het logboek onleesbaar en de echte waarschuwingen onzichtbaar.
- **Alternatieven:** altijd waarschuwen als de uitslag doelpunten heeft zonder doelpuntenmakers (te veel ruis); pas waarschuwen na een aantal dagen (meer code voor weinig winst).

### Wat in de velden van de doelpuntenmakers geen doelpunt is, valt weg

- **Datum:** 26 oktober 2026
- **Besluit:** de import leest in `goals1` en `goals2` het sjabloon `goal`, met zijn minuten en `e.d.` of `pen.` erachter, en een naam per regel.
  Een rode kaart (`{{rode kaart}}`) en een gemiste penalty (`{{penmis}}`) zijn bekend en geen doelpunt, dus ze vallen weg.
  Elke andere onbekende opbouw (een ander sjabloon, een doelpunt zonder naam, een minuut van 0) is een regel die we niet kunnen lezen: de wedstrijd krijgt dan geen doelpuntenmakers en de import waarschuwt.
- **Waarom:** de pagina's van de beker en de competitie van afgelopen seizoen hebben drie soorten sjablonen in deze velden (`goal`, `rode kaart` en `penmis`), en alleen `goal` is een doelpunt.
  Een ander sjabloon, zoals een gele kaart, hebben we niet gezien en we kennen zijn naam niet, en dan is de waarschuwing beter dan een gok.
- **Alternatieven:** elk onbekend sjabloon negeren (een doelpunt dat in een ander sjabloon staat, valt dan stil weg, en de controle met de uitslag vangt dat alleen als het aantal verschilt).

### De cijfers zijn alleen voor beheerders, en de tellers per dag blijven bewaard

- **Datum:** 26 oktober 2026
- **Besluit:** de cijfers over het bezoek staan in het beheer, alleen voor beheerders.
  De tellers per dag worden niet weggehaald.
- **Waarom:** de cijfers zijn voor het team, niet voor het publiek, en een teller per dag bevat geen persoonsgegevens en is klein.
  Er is dus geen reden om ze te wissen, en een lange reeks is juist nuttig.
- **Alternatieven:** de cijfers openbaar maken (past bij onze openheid, maar meer om te bouwen en onzorgvuldig als ze te ruw zijn); de tellers na een jaar weghalen (bespaart bijna niets).

### De pagina Bezoek toont de laatste 30 dagen, en de tabel is een component van het designsysteem

- **Datum:** 26 oktober 2026
- **Besluit:** `/beheer/bezoek` is alleen voor een beheerder; een moderator krijgt "niet gevonden", zoals bij de artikelen.
  De pagina toont de totalen van de laatste 7 en 30 dagen, elke dag van de laatste 30 dagen (een dag zonder teller als 0, de nieuwste bovenaan) en de 20 meest bekeken pagina's van die 30 dagen.
  Een totaal van bezoekers is de som van de dagen, want de teller kent een bezoeker alleen binnen een dag; de pagina zegt dat.
  Een dag is een dag in Nederland, zoals de teller hem bewaart.
  Zonder één geteld bezoek staat er een zin in plaats van de tabellen.
  De tabellen zijn een nieuw component, `DataTable`: een echte `table` met een bijschrift dat alleen een schermlezer krijgt, kolomkoppen en rijkoppen met `scope`, en getallen aan het eind uitgelijnd.
  De kolom met paginaweergaven heet "Weergaven": "Paginaweergaven" breekt niet af en maakte de pagina op 320 pixels te breed.
- **Waarom:** de sjablonen van de site hebben geen HTML (ESLint dwingt dat af), dus een tabel moet een component zijn.
  Een component met `caption`, `columns` en `rows` is klein en past op meer pagina's van het beheer, zonder dat elke pagina zelf een tabel met koppen en `scope` bouwt.
  Dagen zonder teller als 0 tonen houdt de tabel gelijk van lengte en laat zien dat er die dag niets was.
  De som van de dagen is het enige totaal dat we eerlijk kunnen geven zonder bezoekers langer dan een dag te onthouden.
- **Alternatieven:** een moderator de cijfers laten zien (de cijfers zijn voor wie de site beheert, en de issue vraagt om beheerders); een grafiek (staat buiten het issue, en een tabel werkt overal en met een schermlezer); alleen dagen met een teller tonen (de tabel verspringt en een gat valt niet op); `StandingsTable` hergebruiken (die is voor de stand, met afkortingen en een eigen gebied dat zijwaarts scrolt).

### De punten staan voor het doelsaldo in de standtabel

- **Datum:** 26 oktober 2026
- **Besluit:** de kolommen van de standtabel zijn # Club G W G V P D: de punten staan voor het doelsaldo.
  Dat geldt voor de volledige stand op `/wedstrijden`, voor de korte vorm van de homepage (# Club G P D) en voor elke andere plek waar `StandingsTable` staat.
  De punten blijven vet, de rij van sc Heerenveen houdt zijn balk en de getallen blijven rechts uitgelijnd.
- **Waarom:** de stand is op punten gesorteerd en het doelsaldo is alleen de tweede maatstaf.
  Wie de tabel van links naar rechts leest, komt dus eerst bij wat telt.
- **Alternatieven:** de punten achteraan laten, zoals veel sites (de projecteigenaar wilde ze eerder); de punten direct na de club zetten (verbreekt de rij gespeeld, gewonnen, gelijk, verloren).
- **Later:** zie _De stand toont alleen gespeeld en punten, en de volledige stand heeft een balk voor de punten_.
  De kolommen W, G, V en D zijn vervallen: de kolommen zijn nu # Club G P.

### De stand toont alleen gespeeld en punten, en de volledige stand heeft een balk voor de punten

- **Datum:** 26 oktober 2026
- **Besluit:** de standtabel verliest de kolommen gewonnen, gelijk, verloren en doelsaldo, in elke uitvoering.
  De kolommen zijn nu # Club G P, waarbij G de gespeelde wedstrijden zijn.
  De volledige stand heeft naast de punten, in dezelfde cel, een balk; de stand van drie clubs op de homepage heeft geen balk.
  De projecteigenaar koos dit op 26 oktober 2026.
  Het doelsaldo ging er later die dag ook uit: gespeeld en punten zijn genoeg, de rest vind je overal elders, en zo hoort de balk bij de punten.
  De balk is smal, ongeveer 3,5 rem.
- **Hoe:** de lengte is het aandeel van de punten van de koploper (de club met de meeste punten), in procenten tussen 0 en 100, met een schaal vanaf nul.
  Het component rekent dat uit de rijen en geeft het door als `--hf-points-share`, dus clubs met evenveel punten hebben even lange balken.
  Heeft niemand punten, dan zijn er geen balken.
  De balk is versiering: een `span` met `aria-hidden` in de cel van de punten, zonder eigen cel, kop, rol of naam, dus een schermlezer leest alleen de getallen.
  De kop van de punten heeft aan het eind evenveel ruimte als de balk, zodat hij boven de getallen staat.
  De balk is groen, het groen van een gewonnen wedstrijd (`--hf-colour-outcome-win`, #285), want punten komen uit winst.
  Dat vervangt de eis van het issue dat groen en rood niet voor de balken zijn; de projecteigenaar koos groen op 26 oktober 2026, na een eerste versie in staalblauw en een tweede in blauw.
  Bij de rij van sc Heerenveen is het hele groen, bij de andere rijen 70% ervan: 3,38:1 op wit in licht en 4,81:1 op de donkere kaart in donker (het hele groen haalt 6,45:1 en 8,43:1).
  Rood komt niet voor.
  In forced colours is de balk `CanvasText`.
- **Hoe:** de balk verdwijnt met een container query op de breedte van de plek van de tabel (`.hf-standings`), niet van het scherm, onder 19 rem.
  Zonder balk past de tabel op 320 pixels, ook bij 400% zoom, dus het gebied dat zijwaarts scrolt en de eigenschap `label` zijn vervallen.
  `columns` blijft: `all` is de volledige stand met balken en uitleg van de afkortingen, `compact` de korte vorm zonder beide.
  `won`, `drawn`, `lost` en `goalDifference` zijn geen eigenschappen van een rij meer; de database en de import houden die gegevens, want de controles gebruiken ze.
- **Waarom:** "1 punt uit elkaar" of "10 punten uit elkaar" zie je niet aan het getal, wel aan de lengte van een balk.
  De ruimte van drie smalle kolommen is genoeg voor een balk, en de stand past dan zonder scrollen in de zijbalk van 32 rem.
  In de stand van drie clubs helpt een balk weinig.
  Het verlies is het getal van gewonnen, gelijk, verloren en het doelsaldo, dat niet uit de rest van de tabel af te leiden is; de projecteigenaar vond dat het minder waard is dan de balk.
- **Alternatieven:** de balk als achtergrond van de rij (kost geen kolom, maar de tint staat achter de getallen en is moeilijker te vergelijken); alle kolommen houden en de balk er breder bij zetten (de tabel scrolt dan zijwaarts); een staafgrafiek naast de tabel (neemt veel ruimte en herhaalt de tabel); een stippendiagram zoals Zeit Online (goed voor verschillen, maar je leest de namen er moeilijker uit); een schaal vanaf het minimum (maakt verschillen groter, maar dan zegt de balk niets meer over de verhouding tot nul).
- **Later:** de balk, de container query en de opmaak van de tabel staan sinds 26 oktober 2026 in `bar/bar.css`, met de eigenschap `--hf-bar-share` en de klassen `hf-bar` en `hf-bar-place`, omdat de topscorers dezelfde balk gebruiken; zie _De topscorers komen uit onze eigen wedstrijdgegevens, met de balk van de stand_.

### We nemen NOS Voetbal, met het filter `club`

- **Datum:** 26 oktober 2026
- **Besluit:** het register krijgt de voetbalfeed van NOS (`https://feeds.nos.nl/nosvoetbal`) met het filter `club`.
  De bron toont alleen de kop, de link, de bronnaam en de tijd.
  De beschrijving en de afbeelding in de feed bewaart de importer niet en toont de site niet.
- **Waarom:** NOS is de grootste nieuwsbron over de Eredivisie en publiceert de feed zelf.
  De voetbalfeed gaat over precies ons onderwerp, en het filter laat alleen de berichten over sc Heerenveen door.
  De sportfeed is breder en heeft minder berichten over voetbal.
  Het voorbehoud van NOS tegen automatisch verzamelen is een risico, maar we nemen alleen een kop en een link en stoppen op verzoek, zoals bij #10 besloten.
- **Gemeten op de echte feed** (26 oktober 2026, één run van de importer): 20 berichten bewaard, waarvan 1 `relevant`, 0 `doubtful` en 19 `irrelevant`.
  Het ene `relevant` bericht is het wedstrijdverslag van de club, en geen bericht over de club staat bij de 19.
  De importer leest de feed dus zonder aanpassing.
- **Alternatieven:** de sportfeed van NOS (breder, met minder voetbal en een kortere periode); wachten op schriftelijke toestemming van NOS (voorzichtiger, maar NOS antwoordt zelden en we missen intussen de landelijke berichten over de club).
- **Daarna:** schriftelijk toestemming vragen aan NOS hoort bij #35; de projecteigenaar nam het voorbehoud van NOS aan bij het goedkeuren van het issue.

### De kolommen van `/wedstrijden` zijn even breed

- **Datum:** 26 oktober 2026
- **Besluit:** de hoofdkolom en de zijbalk van `/wedstrijden` zijn allebei 31 rem breed, met 2 rem ertussen.
- **Waarom:** de projecteigenaar vindt twee even brede kolommen rustiger dan 30 en 32 rem.
  De stand in de zijbalk heeft sinds het wegvallen van de kolommen voor de doelpunten minder breedte nodig, en met de balk (zie _De stand toont alleen gespeeld en punten, en de volledige stand heeft een balk voor de punten_) ook de kolom met gewonnen, gelijk en verloren niet meer.
- **Hoe:** `Page.Sidebar` met `wide` zet de sporen op twee keer `minmax(24rem, 31rem)`, zodat ze op elke breedte even breed zijn (eerst was het `minmax(20rem, 30rem)` en `minmax(24rem, 32rem)`); de rest van de regels uit _/wedstrijden heeft een zijbalk van 32 rem met de stand en de uitslagen_ blijft.
  Andere pagina's houden 38, 2 en 24 rem.
- **Alternatieven:** 30, 2 en 32 rem laten, zoals in #283 (de zijbalk is breder dan de hoofdkolom); 32 en 30 rem (de tabel past er met de balk beter in, maar het programma wordt breder dan nodig).
- **Later:** zie _De kaarten van een zijbalk staan standaard onder elkaar, naast elkaar is een optie_.
  `wide` zet alleen de sporen op twee keer 31 rem; de cellen onder elkaar zijn nu de standaard van elke zijbalk, en de regel `.hf-page-sidebar-wide` voor de kolommen van de cellen is vervallen.
- **Later:** zie _De tweede kolom begint bij 52 rem, voor alle pagina's met een zijbalk_.
  De twee kolommen staan naast elkaar vanaf 52 rem en niet meer vanaf 56 rem, en de sporen krimpen tot 20 rem in plaats van 24 rem, zodat ze ook passen naast de inkeping van een telefoon in liggende stand.

### We nemen het AD, met het filter `club` en het teken voor de betaalmuur

- **Datum:** 26 oktober 2026
- **Besluit:** het register krijgt de voetbalfeed van het Algemeen Dagblad (`https://www.ad.nl/voetbal/rss.xml`) met het filter `club`, en de importer leest `<dpp:paid>true</dpp:paid>` als de betaalmuur van die bron.
  De bron toont alleen de kop, de link, de bronnaam en de tijd, met "voor abonnees" bij een bericht achter de betaalmuur.
  De beschrijving, de auteur en de afbeeldingen in de feed bewaart de importer niet en toont de site niet.
- **Waarom:** het AD is een grote bron over de Eredivisie.
  De feed is door DPG zelf aangeboden, met een eigen merker voor de betaalmuur, en een lezer wil weten dat een bericht achter een betaalmuur staat voordat hij erop klikt.
  Het voorbehoud van DPG tegen scrapen is een risico, maar we nemen alleen een kop en een link en stoppen op verzoek, zoals bij #10 besloten.
- **Gemeten op de echte feed** (26 oktober 2026, één run van de importer): 30 berichten bewaard, waarvan 1 `relevant`, 0 `doubtful` en 29 `irrelevant`, en 11 herkend als betaalmuur.
  Het ene `relevant` bericht is het wedstrijdverslag van de club, en geen bericht over de club staat bij de 29.
- **Hoe de importer het teken leest:** per bron, op het domein, zoals bij Voetbal International en de Leeuwarder Courant (`paywallNamespaces` in `apps/importer/src/read-feed.ts`).
  De naamruimte is het adres `https://www.dpgmedia.cloud/paidrss` en niet het voorvoegsel `dpp`: een voorvoegsel is een keuze van de feed en kan veranderen.
  `feedsmith` kent het element niet, dus de tweede lezing met `fast-xml-parser` zoekt het, zoals het element `<premium>` van de Leeuwarder Courant.
- **Alternatieven:** wachten op schriftelijke toestemming van DPG Media (voorzichtiger, maar DPG antwoordt zelden); de bron nemen zonder het teken voor de betaalmuur (een lezer klikt dan op een bericht dat hij niet kan lezen, tegen onze eigen regel).
- **Daarna:** schriftelijk toestemming vragen aan DPG Media hoort bij #35; de projecteigenaar nam het voorbehoud van de bron aan bij het goedkeuren van het issue.
  De voorwaarden van DPG Media en van het AD zeggen niets over RSS-feeds, maar verbieden commercieel gebruik, het overnemen van content en het doorzoeken met robots (zie `docs/bronnen.md`).

### We nemen ESPN NL, met het filter `club` en een eigen regel voor de zone EST

- **Datum:** 26 oktober 2026
- **Besluit:** het register krijgt de voetbalfeed van ESPN NL (`https://www.espn.nl/espn/rss/soccer/news`) met het filter `club`.
  De bron toont alleen de kop, de link, de bronnaam en de tijd.
  De beschrijving en de auteur in de feed bewaart de importer niet en toont de site niet.
  Voor het domein `www.espn.nl` leest de importer de zone `EST` als `Europe/Amsterdam`; voor andere feeds verandert er niets.
- **Waarom:** ESPN NL is een grote bron over het Nederlandse voetbal, en de feed geeft geen betaalmuur.
  De tijden in de feed zijn de Nederlandse tijd met een verkeerd zonelabel.
  Dat bleek uit de pagina's van vijf berichten, uit het einde van de wedstrijd ADO – sc Heerenveen en uit het moment waarop de feed werd opgehaald (zie `docs/bronnen.md`).
  Letterlijk gelezen staat elk bericht vijf of zes uur te laat, en het nieuwste bericht zou dan uit de toekomst komen.
  Een regel per bron laat de lezing van `EST` bij andere feeds, waar het echt een zone is, ongemoeid.
  De regel leest de wandkloktijd van Nederland, dus ook de zomertijd en de overgangen.
  Een tijd die vaak twee keer op de klok staat (de nacht van het einde van de zomertijd) is de eerste, en een tijd die niet bestaat (het begin ervan) is de tijd na de sprong.
- **Voorwaarden:** de twee teksten van Disney zeggen niet hetzelfde.
  De Nederlandse gebruiksvoorwaarden, waar `www.espn.nl` naar linkt (2012), verbieden "geautomatiseerd gebruik met hoog volume" en hergebruik zonder schriftelijke toestemming.
  De Engelse voorwaarden voor de Verenigde Staten (2024) verbieden elke toegang met een robot, spider of script.
  Het blijft een risico dat geen jurist heeft getoetst.
  We nemen één feed, met hoogstens één verzoek per kwartier, alleen een kop en een link, en we stoppen op verzoek.
- **Gemeten op de echte feed** (26 oktober 2026, één run van de importer): 25 berichten bewaard, waarvan 1 `relevant`, 0 `doubtful` en 24 `irrelevant`.
  Het ene `relevant` bericht is het wedstrijdverslag van de club.
  Een bericht over dezelfde wedstrijd vanuit ADO noemt de club niet in de kop en is `irrelevant`; de lijsten blijven zoals ze zijn.
  Alle 25 tijden waren geldig.
- **Alternatieven:** wachten op schriftelijke toestemming van Disney (voorzichtiger, maar Disney antwoordt zelden); `EST` voor alle feeds als Nederlandse tijd lezen (verkeerd voor een feed waar het echt EST is); de tijd van deze bron negeren en alleen het moment van eerste zien gebruiken (de berichten staan dan niet op hun echte tijd).
- **Daarna:** schriftelijk toestemming vragen aan Disney hoort bij #35; de projecteigenaar nam het voorbehoud van Disney aan bij het goedkeuren van het issue.

### De echte bronnen komen op productie via de seed

- **Datum:** 23 oktober 2026
- **Besluit:** de echte bronnen komen op productie via een eigen lijst in de seed, `realSources`, die de site bij het opstarten toepast, tot het beheer (#31) bronnen kan toevoegen.
  De site werkt een bron die er al staat bij op haar domein, maar niet wat het beheer straks wijzigt: `enabled`, de velden `consent_*`, `attribution` en het beleid voor intro, foto en insluiten.
  `pnpm db:seed` blijft op productie weigeren.
  Zodra het beheer bronnen kan toevoegen, verdwijnt de lijst `realSources` uit de seed.
- **Waarom:** het is de kleinste wijziging die een gevulde site geeft, en het hergebruikt de weg die acceptatie al heeft.
  De velden die het beheer straks wijzigt, blijven staan.
- **Alternatieven:** een migratie die de bronnen invoegt (gegevens tussen het schema); een opdracht op de host via SSH (nog een stap die de eigenaar moet onthouden); wachten op het beheer (de site gaat leeg live).

### Testbronnen alleen lokaal; acceptatie en productie hebben alleen echte bronnen

- **Datum:** 26 oktober 2026
- **Besluit:** de testbronnen bestaan alleen lokaal en in de tests.
  Acceptatie en productie zetten alleen de echte bronnen in het register, en op acceptatie verdwijnen de testbronnen die er al staan.
  De homepage heeft geen alinea meer die naar de bronnen verwijst; `/bronnen` staat nog in de footer en bij Over ons.
- **Waarom:** acceptatie draait nu met echte bronnen en echte berichten, en de redactie bekijkt de site er.
  Een pagina `/bronnen` met "Testkrant" en een testforum laat zien dat het nog een proefomgeving is, en de acceptatieomgeving moet laten zien wat de bezoeker straks ziet.
- **Hoe:** de site haalt bij elke start op acceptatie de rijen weg met een domein uit `testSources`, met hun feeds en berichten (die gaan mee door `ON DELETE CASCADE`).
  Een echte bron, ook met een eigen feed en berichten, blijft staan, en een tweede start verandert niets.
  De controle na de deploy zoekt de Leeuwarder Courant op `/bronnen`, en faalt als er nog een testbron staat.
  De toegankelijkheidscontrole en de e2e-controles hebben testbronnen nodig voor hun verzonnen koppen.
  Zij draaien de site met `SITE_ENV=acceptance` en zetten de testbronnen zelf in het register, in `e2e/global-setup.ts` (`e2e/test-sources.ts`).
  Dat werkt alleen in een database op deze computer.
  De rooktest toetst acceptatie en productie met de echte bronnen.
- **Alternatieven:** de testbronnen op acceptatie laten staan, maar verborgen via `enabled` (de rijen blijven, en de controle na de deploy leunt dan nog op iets wat niemand ziet); de testbronnen alleen van `/bronnen` filteren (de homepage en de importer zien ze dan nog).
  Voor de e2e-controles: de site met `SITE_ENV=local` starten en de seed er laten draaien; dat verandert ook het adres van de site en de eisen aan de mailinstellingen, en de controles toetsen de site zoals hij op acceptatie draait.

### De topscorers komen uit onze eigen wedstrijdgegevens, met de balk van de stand

- **Datum:** 26 oktober 2026
- **Besluit:** `/wedstrijden` krijgt een kaart met de beste vijf (met gelijkstaanden) doelpuntenmakers van sc Heerenveen dit seizoen, uit `match_goals`, in alle wedstrijden, met dezelfde soort balk als in de stand.
  De kaart staat in de zijbalk direct onder de kaart "Stand", en de zijbalk heet nu "De stand, de ranglijsten en de uitslagen".
- **Waarom:** de gegevens staan al in de database, dus er is geen nieuwe bron en geen nieuw verzoek aan Wikipedia.
  Een balk laat het verschil tussen twee spelers beter zien dan een getal, zoals bij de punten in de stand.
  Alle wedstrijden in één lijst is eenvoudig en komt overeen met wat supporters bedoelen met "topscorer van het seizoen".
- **Hoe:** de pagina telt de doelpunten uit de wedstrijden die ze al heeft (`listSeasonMatches` geeft de doelpuntenmakers mee), dus er komt geen vraag bij.
  Een doelpunt telt voor een speler als `ours` waar is en `own_goal` niet: een penalty telt mee, een eigen doelpunt van een tegenstander niet, en een doelpunt van de tegenstander ook niet, ook niet bij een speler met dezelfde naam.
  Een speler is de naam zoals `match_goals` hem bewaart, dus twee spelers met dezelfde naam tellen samen.
  Gelijke aantallen delen een plaats (1, 2, 2, 4) en staan op alfabet; de kaart toont de eerste vijf en iedereen die met de vijfde gelijk staat, tot acht rijen.
  Onder de tabel staat "Gebaseerd op de doelpuntenmakers van X van Y gespeelde wedstrijden" als een gespeelde wedstrijd met een doelpunt van ons geen doelpuntenmakers heeft; zonder doelpunten staat er een zin in plaats van de tabel.
  De balk is een gedeeld stuk (`Bar` en `bar.css` in het designsysteem), gebruikt door de `StandingsTable` en de nieuwe `TopScorersTable`; de eigenschap heet `--hf-bar-share` en de container query staat op `hf-bar-place`, onder dezelfde 19 rem.
  Dat ook de rij van sc Heerenveen het hele groen houdt, blijft in `standings-table.css`.
  De kop van de doelpunten is de afkorting D, op verzoek van de projecteigenaar op 26 oktober 2026, zoals G en P in de stand: een schermlezer hoort "doelpunten" en onder de tabel staat "D doelpunten", in een gedeelde legenda (`hf-bar-legend`, eerst `hf-standings-legend`).
- **Alternatieven:** de Eredivisie en de beker apart tonen (nauwkeuriger, maar twee lijsten en veel lege rijen in het begin); alleen de beste drie (te weinig voor een selectie); een nieuwe bron met statistieken van spelers (#39); de CSS van de balk kopiëren naar het nieuwe component (twee plekken om gelijk te houden).
- **Later:** de kaart toont sinds 26 oktober 2026 alle doelpuntenmakers van het seizoen en niet meer de beste vijf met gelijkstaanden; zie _De kaart met topscorers toont alle doelpuntenmakers_.
- **Later:** de kaart heet sinds 26 oktober 2026 "Doelpuntenmakers" en niet meer "Topscorers", en het aantal spelers staat onder de kop en niet meer onder de tabel; zie _De kaart heet Doelpuntenmakers, met het aantal spelers onder de kop_.
- **Later:** de kaart telt sinds 27 oktober 2026 per speler (`player_id`) en toont zijn volledige naam, dus twee spelers met dezelfde achternaam zijn twee rijen; een doelpunt zonder speler telt per naam als een eigen rij; zie _Spelers hebben een vaste `id`, en doelpunten verwijzen ernaar_.

### De lijst met gehouden nullen is een lijst van korte wedstrijdregels

- **Datum:** 26 oktober 2026
- **Besluit:** `/wedstrijden` krijgt een kaart met de wedstrijden waarin we geen tegendoelpunt kregen, als korte regels (datum, tegenstander en uitslag), met het aantal erbij.
  Het zijn geen volledige wedstrijdregels.
- **Waarom:** de supporter wil zien in welke wedstrijden de verdediging de nul hield, niet alle details die de uitslagen al geven.
  Korte regels houden de zijbalk rustig, en de gegevens staan al in `matches`.
- **Hoe:** de regel is een eigen onderdeel van het designsysteem, `ShortMatch`, en geen uitvoering van `Match`.
  `Match` heeft een competitie, een ronde, een stadion, doelpuntenmakers en de kleur van de uitkomst, en heeft al veel props; een korte uitvoering zou die allemaal moeten uitzetten.
  `ShortMatch` heeft zes props en geen kleur, want in deze lijst hebben alle regels dezelfde soort uitslag.
  De selectie en het aantal komen uit dezelfde wedstrijden die de pagina al haalt (`cleanSheetsOf`), en de knop "Laad 5 meer" werkt zoals op de homepage, met `?nul=` in het adres.
- **Alternatieven:** de volledige wedstrijdregels (veel dubbele informatie naast de uitslagen); alleen een getal zonder lijst (zegt niet welke wedstrijden); een markering in de lijst met uitslagen (de nullen verdwijnen dan tussen de rest); een korte uitvoering van `Match` (maakt `Match` groter).

### De kaart met topscorers toont alle doelpuntenmakers

- **Datum:** 26 oktober 2026
- **Besluit:** de kaart "Topscorers" toont iedereen die dit seizoen voor sc Heerenveen scoorde, niet alleen de beste vijf.
- **Waarom:** een supporter wil zien wie er scoorde, ook als dat een speler met één doelpunt is.
  De selectie scoort in een seizoen met een tiental spelers, dus de lijst blijft overzichtelijk, en de balken laten het verschil tussen de eerste en de rest zien.
- **Hoe:** de grens van vijf rijen (met de gelijkstaanden tot hoogstens acht) en de code die haar toepast, `topScorersShown`, zijn vervallen: de kaart toont wat `topScorersOf` geeft.
  Het aantal spelers staat in een zichtbare regel onder de tabel ("11 spelers hebben gescoord"), en niet in het bijschrift, want alleen een schermlezer krijgt het bijschrift.
  De telling blijft op één plek, `topScorersOf`, want #333 laat haar later per speler in plaats van per naam tellen.
- **Alternatieven:** de beste vijf houden, met gelijkstaanden (korter, maar de rest blijft onzichtbaar); de beste vijf met een knop voor de rest (extra stap en meer code, terwijl de lijst kort genoeg is).
- **Later:** de kaart heet sinds 26 oktober 2026 "Doelpuntenmakers" en het aantal spelers staat sinds die dag onder de kop en niet meer onder de tabel; zie _De kaart heet Doelpuntenmakers, met het aantal spelers onder de kop_.
- **Later:** zie _Op /wedstrijden hebben de kaarten met cijfers een zacht en een warm vlak, en de uitslagen staan in de hoofdkolom_.
  De zijbalk heet nu "De stand, de ranglijsten en de doelpunten per kwartier".

### De kaart Doelpunten per kwartier telt de doelpunten van de wedstrijden met bekende minuten

- **Datum:** 26 oktober 2026
- **Besluit:** `/wedstrijden` krijgt in de hoofdkolom, onder het programma, een kaart "Doelpunten per kwartier" met twee diagrammen, voor en tegen, elk in zes plakken: de kwartieren van een wedstrijd.
  De cijfers staan ook als tabel, en onder de tabel staat op hoeveel van de gespeelde wedstrijden de telling is gebaseerd.
  Ging een wedstrijd in de telling naar de verlenging, dan staat daar ook dat de verlenging buiten de telling blijft; anders staat die zin er niet.
- **Waarom:** een taart toont maar één reeks, dus voor en tegen vragen twee taarten.
  De verlenging komt alleen in bekerwedstrijden voor en zou een kwartier erbij maken dat de meeste wedstrijden niet hebben.
  De tabel is er voor wie een diagram niet kan zien en voor wie liever getallen leest.
- **Hoe:** `goalsPerQuarter` in `src/matches.ts` telt de doelpunten uit de wedstrijden die de pagina al heeft, dus er komt geen vraag bij.
  - De kwartieren zijn de minuten 1 tot en met 15, 16 tot en met 30, 31 tot en met 45, 46 tot en met 60, 61 tot en met 75 en 76 tot en met 90.
  - Een doelpunt in blessuretijd heeft de minuut van het laatste volle kwartier (45+1 is minuut 45, 90+3 is minuut 90) en telt dus bij het kwartier ervoor: `stoppage_minutes` doet niet mee.
  - Een doelpunt na minuut 90 is een doelpunt in de verlenging en telt niet mee, ook niet in de blessuretijd van de verlenging.
    Een doelpunt met minuut 0 bestaat niet in een wedstrijd en telt ook niet mee.
  - Een doelpunt telt voor de club die ervan profiteert, zoals `ours` al regelt: een eigen doelpunt van een tegenstander is een doelpunt voor ons, en een eigen doelpunt van ons een tegendoelpunt.
  - Een gespeelde wedstrijd met een uitslag telt mee als hij minstens één doelpunt in `match_goals` heeft, of als hij eindigde in 0–0.
    Een wedstrijd met een uitslag en zonder doelpunten in de gegevens heeft geen minuten: de pagina noemde de doelpuntenmakers niet, of ze pasten niet bij de uitslag (zie _Een doelpunt dat niet bij de uitslag past, wordt niet getoond_).
    Die wedstrijd blijft erbuiten, en de tekst onder de tabel zegt het: "Gebaseerd op 8 van de 10 gespeelde wedstrijden", of "alle 10 gespeelde wedstrijden", of "1 gespeelde wedstrijd".
    Dat is dezelfde regel als de lijn onder de topscorers, met één verschil: de topscorers rekenen een wedstrijd zonder doelpunt van ons als compleet, maar een wedstrijd die we met 0–2 verloren heeft hier wel minuten nodig, want de tegendoelpunten zijn de helft van de kaart.
  - De kaart telt de competitie en de beker samen.
  - Zonder één doelpunt met een minuut staat er een zin in plaats van de diagrammen.
    De zin zegt dat we nog geen doelpunten met een minuut hebben, en vraagt de lezer later terug te komen.
  - De diagrammen zijn verborgen voor hulpsoftware en de tabel is het tekstalternatief, met een bijschrift dat alleen een schermlezer krijgt.
    De diagrammen zelf zijn `DonutChart` (zie _Een donutdiagram is een eigen onderdeel in SVG, met een positieve en een negatieve kleur_).
  - De kop heeft het anker `doelpunten-per-kwartier`, dat in `src/anchors.ts` staat.
- **Aangevuld op 26 oktober 2026, op verzoek van de projecteigenaar:** de zin "Doelpunten in de verlenging tellen niet mee." staat er alleen als ze iets zegt.
  `goalsPerQuarter` geeft daarvoor `extraTime`: waar als minstens één wedstrijd in de telling `extra_time` heeft.
  Een wedstrijd buiten de telling, zonder doelpunten of niet gespeeld, telt daarvoor niet mee.
- **Alternatieven:** één diagram met twee ringen (compact, maar moeilijker te lezen); staafjes in plaats van een taart (leesbaarder, maar de projecteigenaar vroeg om een taart); de verlenging als aparte plakken; de wedstrijden zonder bekende doelpunten meetellen met nul doelpunten (de telling lijkt dan completer dan ze is).
- **Later:** zie _Op /wedstrijden hebben de kaarten met cijfers een zacht en een warm vlak, en de uitslagen staan in de hoofdkolom_.
  De kaart staat in de zijbalk, na De nul gehouden, en heeft een warm vlak; de telling blijft.

### De kaart heet Doelpuntenmakers, met het aantal spelers onder de kop

- **Datum:** 26 oktober 2026
- **Besluit:** de kaart "Topscorers" op `/wedstrijden` heet "Doelpuntenmakers", en het aantal spelers staat direct onder de kop, boven de tabel.
- **Waarom:** de kaart toont alle spelers die scoorden, niet alleen de beste, en "Topscorers" belooft een top.
  Het aantal onder de kop is dezelfde plek en stijl als bij "De nul gehouden", zodat de kaarten op elkaar lijken.
- **Hoe:** de kop heeft het anker `doelpuntenmakers`, dat in `src/anchors.ts` staat.
  Het oude anker `topscorers` blijft staan als oud anker (`aliases`) op de kop, zoals `nul-gehouden` bij de nul gehouden, en staat ook nog in `src/anchors.ts`, zodat de rooktest het blijft toetsen.
  De regel met het aantal is gewone tekst en geen kleine tekst (`meta`) meer, net als bij de nul gehouden.
  Het bijschrift van de tabel zegt "Doelpuntenmakers van sc Heerenveen in het seizoen …".
  De namen in de code (`TopScorers`, `topScorersOf`, `TopScorersTable`) blijven, omdat bezoekers ze niet zien.
- **Alternatieven:** "Topscorers" houden (kort en bekend, maar niet meer waar); "Wie scoorde" (dichter bij de spreektaal, maar minder netjes als kop).

### De scheiding in een ring is een lichte omlijning, in licht en in donker

- **Datum:** 27 oktober 2026
- **Besluit:** de lijn tussen de plakken van een ring is wit in licht en `blue-50` in donker, en heeft een eigen rol in `colour.css`: `--hf-colour-border-chart-slice`, met een waarde voor licht en voor donker via `light-dark()`.
  Ze is een omlijning van de plakken, geen gat in de kleur van het vlak.
- **Waarom:** een doorzichtige lijn tekent niets en scheidt de plakken niet, en de plakken zijn zelf deels doorzichtig.
  De witte lijn op het warme vlak ziet er goed uit (gezien op een scherm door de projecteigenaar).
  In donker was de lijn de kleur van het blauwe vlak en zag er vreemd uit; een lichte lijn volgt hetzelfde beeld als in licht.
  In donker is het `blue-50` en niet puur wit, omdat dat de kleur van de koppen en van het totaal in de ring is: de lijn is dan even licht als de tekst, zonder harder wit.
  In donker heeft de lijn 14,5:1 tegen het vlak van de kaart, 1,7:1 (groen) en 1,9:1 (rood) tegen de volle plak, en 3,0:1 en 3,3:1 tegen de zwakste plak.
- **Hoe:** `.hf-donut-chart-slice` gebruikt de nieuwe rol als `stroke`, en niet meer `--hf-colour-background-surface`.
  In forced colors blijft de lijn `Canvas`.
  De story van `DonutChart` toont de ring op het witte, het zachte en het warme vlak, in licht en in donker; de test van `donut-chart-css.test.ts` eist de nieuwe rol en weigert een kleur van een vlak.
  De zwakste plak (70% van de kleur) haalt 3:1 tegen het warme vlak: in licht 3,05:1 (groen) en 3,75:1 (rood), in donker 4,02:1 en 3,68:1.
  Het verschil met het witte vlak is klein: in licht 3,39:1 en 4,22:1, in donker 4,81:1 en 4,43:1.
- **Alternatieven:** een doorzichtige lijn; die scheidt de plakken niet.
  De kleur van de kaart doorgeven aan de ring met een custom property; dan is de lijn in donker donker, wat de projecteigenaar vreemd vond.
  Een echte opening in de vorm van de ring; die is ingewikkelder (een gelijke breedte over de straal) en heeft nu geen voordeel.
  Puur wit in donker (harder dan de tekst eromheen).

### Op /wedstrijden hebben de kaarten met cijfers een zacht en een warm vlak, en de uitslagen staan in de hoofdkolom

- **Datum:** 27 oktober 2026
- **Besluit:** op `/wedstrijden` hebben Stand, Doelpuntenmakers en De nul gehouden een zacht vlak (`surface="soft"`) en Doelpunten per kwartier een warm vlak (`surface="warm"`); Programma en Uitslagen blijven wit.
  Uitslagen en Doelpunten per kwartier wisselen van plaats: de uitslagen staan in de hoofdkolom na het programma, en de kaart met de ringen in de zijbalk na De nul gehouden en voor de bronvermelding.
  Op een telefoon is de volgorde dan Programma, Uitslagen, Stand, Doelpuntenmakers, De nul gehouden en Doelpunten per kwartier.
  De homepage verandert niet.
- **Waarom:** bijna alle kaarten waren wit, en de projecteigenaar wil dat de kaarten met cijfers meer opvallen en elkaar onderscheiden.
  De kaarten met cijfers horen bij elkaar, dus ze staan nu bij elkaar in de zijbalk, en de lijst met uitslagen staat bij het programma, de andere lijst met wedstrijden.
  Op de homepage zijn de prioriteiten anders, dus `StandingsCard` blijft zoals hij is.
- **Hoe:** de ankers (`#uitslagen`, `#doelpunten-per-kwartier`) blijven, en de zijbalk heet nu "De stand, de ranglijsten en de doelpunten per kwartier".
- **Alternatieven:** alle kaarten wit laten (de cijfers vallen dan niet op); de homepage dezelfde vlakken geven (de projecteigenaar wil die niet veranderen).
- **Later:** zie _Het verloop van het seizoen staat onder de stand, in een warme kaart_.
  Er staat nu een kaart tussen Stand en Doelpuntenmakers, en op een telefoon is de volgorde Programma, Uitslagen, Stand, Verloop van het seizoen, Doelpuntenmakers, De nul gehouden en Doelpunten per kwartier.
- **Later:** zie _Reeksen staan in een eigen kaart na Verloop van het seizoen_.
  Op een telefoon staat Reeksen nu tussen Verloop van het seizoen en Doelpuntenmakers, in het zachte vlak.
- **Later:** zie _Thuis en uit staan naast elkaar in een tabel, met een kolom Totaal_.
  Thuis en uit staat nu na Reeksen en voor Doelpuntenmakers, in het warme vlak.

### Het verloop van het seizoen staat onder de stand, in een warme kaart

- **Datum:** 28 oktober 2026
- **Besluit:** `/wedstrijden` krijgt in de zijbalk direct onder Stand de kaart "Verloop van het seizoen", in het warme vlak, met de grafiek en de tabel van de Eredivisie.
  De bekerwedstrijden tellen niet mee.
- **Waarom:** de grafiek ligt qua inhoud het dichtst bij de stand, en de uitslagen komen uit dezelfde gegevens.
  Een warm vlak onder de zachte stand scheidt de twee.
  De Eredivisie heeft 34 wedstrijden die de grafiek vullen, een beker niet.
- **Alternatieven:** boven Doelpunten per kwartier in het zachte vlak (twee warme kaarten bij elkaar); op de homepage (de prioriteiten zijn daar anders); de bekerwedstrijden erbij (de plekken zijn dan niet meer de 34 van het seizoen).
- **Later:** zie _De plek in de competitie komt uit de stand, in punten per wedstrijd, zonder grenslijnen_.
  Er staat nu een kaart tussen Stand en Verloop van het seizoen: Onze plek in de competitie.

### De staafjes staan op volgorde van speeldatum, niet van speelronde

- **Datum:** 28 oktober 2026
- **Besluit:** de wedstrijden staan in de grafiek op volgorde van speeldatum.
  Een uitgestelde wedstrijd die nog niet gespeeld is, heeft geen staafje, en de wedstrijden erna schuiven een plek op tot hij gespeeld is.
- **Waarom:** de component krijgt een lijst van gespeelde uitslagen en tekent ze naast elkaar.
  De lijn is het gemiddelde over de laatste vijf wedstrijden die gespeeld zijn, en dat volgt de volgorde van het spelen.
- **Alternatieven:** een lege plek op de plaats van de speelronde van een uitgestelde wedstrijd (vraagt een lijst met gaten in de component en laat de lijn een gat zien).

### De plek in de competitie komt uit de stand, in punten per wedstrijd, zonder grenslijnen

- **Datum:** 29 oktober 2026
- **Besluit:** de kaart "Onze plek in de competitie" staat direct na de stand en geeft de plaats van sc Heerenveen in vijf onderdelen, met gedeelde plaatsen als "gedeeld".
  De vijf onderdelen zijn punten per wedstrijd, gewonnen wedstrijden, doelpunten voor (de beste aanval), doelpunten tegen (de beste verdediging, minder is beter) en doelsaldo.
  De punten achter de koploper en voor op de laatste staan in een zin.
  Er zijn geen lijnen voor Europa of degradatie.
  De kaart volgt de regels van _Statistieken komen als kaarten op Wedstrijden, voor de Eredivisie, met "Gebaseerd op"_ (#397).
- **Waarom:** de stand heeft de gegevens, dus de import verandert niet.
  Punten per wedstrijd vergelijkt clubs die niet evenveel hebben gespeeld.
  De lijnen voor Europa en degradatie veranderen per seizoen en zijn een mening over wat er komt.
- **Hoe:** `leaguePlaceOf` in `apps/site/src/matches.ts` rekent de plaatsen uit.
  Twee clubs zijn gelijk op punten per wedstrijd als hun punten en wedstrijden in dezelfde verhouding staan, zonder afronding.
  Een club die nog niets heeft gespeeld telt niet mee, ook niet als koploper of laatste.
  De koploper en de laatste zijn de clubs met de meeste en de minste punten, en de plaats in de stand beslist bij gelijke punten.
  De link in de balk "Op deze pagina:" heet "Plek in de competitie": met "Onze plek in de competitie" past hij op een telefoon van 390 pixels niet tussen de twee vervagingen van de balk.
  Het vlak van de kaart is wit: Stand heeft het zachte vlak en Verloop van het seizoen het warme, dus een zacht of warm vlak had dezelfde kleur als een buurkaart.
- **Alternatieven:** de plaatsen als extra kolommen in de stand (de stand wordt breed op een telefoon).
  De lijnen wel tonen (de projecteigenaar wil nu geen voorspellingen, zie #418).
  Een zacht of warm vlak (dezelfde kleur als een buurkaart).

### Tiptap is de teksteditor voor de artikelen van de redactie

- **Datum:** 27 oktober 2026
- **Besluit:** Tiptap is de teksteditor voor de artikelen van de redactie, als component van het designsysteem met alleen de opmaak die een artikel nu heeft.
- **Waarom:** wie een artikel schrijft, hoeft geen opmaaktekens te kennen.
  Tiptap is open (MIT), onderhouden en heeft een kleine kern; de opmaak blijft klein omdat we alleen laden wat we gebruiken.
- **Alternatieven:** de textarea met eigen opmaak houden (de schrijver moet de tekens leren kennen); een andere editor zoals Lexical of Slate (meer werk om toegankelijk te maken); `contenteditable` zelf bouwen (veel werk en veel fouten).

### De afbeelding van een kaart wordt in de browser gemaakt, met een bibliotheek die pas bij een klik laadt

- **Datum:** 28 oktober 2026
- **Besluit:** een kaart met de knop maakt zijn PNG in de browser van de bezoeker, met een kleine bibliotheek met een vrije licentie die pas bij de eerste klik wordt geladen (`import()`).
  Er gaat niets naar een server en niets naar een ander domein.
- **Waarom:** zo uploaden we niets en volgen we niemand, en de afbeelding is de kaart zoals de bezoeker hem ziet, in zijn thema.
  Een server zou hem opnieuw moeten tekenen, en een gedeelde hosting heeft geen browser om een pagina te fotograferen.
  Dynamisch laden houdt elke pagina even snel.
- **Alternatieven:** de kaart op de server opnieuw tekenen met `ImageResponse` (een tweede ontwerp per kaart, met minder CSS).
  Alles zelf op een canvas tekenen (de tabel, de donut en de staafjes opnieuw in code).
  Een dienst van een derde partij (we sturen dan gegevens weg).

### De bibliotheek is `modern-screenshot`, niet `html-to-image`

- **Datum:** 28 oktober 2026
- **Besluit:** de afbeelding wordt gemaakt met `modern-screenshot` 4.7.0 (MIT, geen dependencies, geen installatiescript dat meeloopt), zonder web worker.
- **Waarom:** we probeerden eerst `html-to-image` 1.11.13.
  Die zet de berekende stijlen niet op de onderdelen van een `svg`, dus de plakken van de donut kwamen er zwart op, zonder scheidingslijn.
  `modern-screenshot` tekent de donut, de staafjes, de kleuren (`light-dark()` en `color-mix()`), de lettertypes en het donkere thema goed.
  Hij is groter dan `html-to-image`, maar laadt pas bij een klik.
- **Alternatieven:** `html-to-image` (de donut klopt niet); `dom-to-image-more` (niet geprobeerd: bijna 1 MB uitgepakt); de donut als losse afbeelding tekenen (een omweg die de eigenaar zou moeten kiezen).

### De afbeelding volgt het thema van de bezoeker en draagt de bron mee

- **Datum:** 28 oktober 2026
- **Besluit:** de afbeelding heeft het thema dat de bezoeker nu heeft.
  De kaart is er 29 rem breed, een breedte die in de zijbalk van een breed scherm past, met een rand van 1,5 rem eromheen: de afbeelding is 32 rem breed, 1024 pixels op dubbele resolutie.
  Eronder staan het logo, het adres, de datum en de bronvermelding van de kaart.
  De datum staat als dd-mm-jj met nullen ervoor (`28-10-26`) en de bron als "Gegevens van Wikipedia", op verzoek van de projecteigenaar.
  Alleen de vijf kaarten met statistiek op `/wedstrijden` hebben de knop.
- **Waarom:** de bezoeker kiest zijn thema, en de afbeelding is zijn kaart.
  De vermelding van Wikipedia (CC BY-SA) moet meegaan zodra de gegevens het huis uit gaan.
  De nieuwskaarten bevatten werk van journalisten, en een afbeelding ervan gaat rond zonder de link naar hun werk.
  Een korte datum houdt de strook klein.
- **Alternatieven:** de datum voluit, "28 oktober 2026" (past minder goed in de strook, en de projecteigenaar koos de korte vorm).
  Altijd licht (dezelfde kaart ziet er voor elke deler hetzelfde uit, maar bezoekers in donker krijgen een andere kaart dan ze zien).
  Alleen logo en adres (de vermelding gaat dan niet mee).
  Alle kaarten van `/wedstrijden`.
- **Later:** de datum in de strook staat met de afgekorte maand en het jaar met vier cijfers, zoals "28 okt 2026", en niet meer als dd-mm-jj (29 oktober 2026).
  Zie _Een publicatiedatum van meer dan een week oud is de korte dag en de datum, zonder tijd_.

### Delen waar het kan, anders downloaden

- **Datum:** 28 oktober 2026
- **Besluit:** de knop opent het deelmenu van het apparaat als de browser bestanden kan delen (`navigator.canShare`), en downloadt anders de PNG.
  Kopiëren naar het klembord komt er niet.
  Vraagt de browser om een nieuwe tik voor het deelmenu, omdat het maken te lang duurde, dan downloadt hij ook.
- **Waarom:** op een telefoon wil de bezoeker de afbeelding naar een app sturen, en op een computer wil hij een bestand.
  Het klembord kent minder browsers en laat niets over om later terug te vinden.
- **Alternatieven:** altijd downloaden (op een telefoon staat de afbeelding dan in de bestanden, niet in het deelmenu).
  Het klembord.

### De knop komt van een eigenschap van `Card`, `shareable`, en staat er alleen met JavaScript

- **Datum:** 28 oktober 2026
- **Besluit:** `Card` heeft de optionele eigenschap `shareable={{ source }}`.
  `source` is de bronvermelding die onder de afbeelding komt, en is verplicht zodra de eigenschap er is.
  De knop krijgt zijn naam van de eerste kop van de kaart ("Maak een afbeelding van Stand") en staat in de code direct na die kop.
  De kaart doet pas na het laden in de browser mee: zonder JavaScript is er geen knop, en de kop houdt ruimte vrij zodat de pagina niet verspringt.
  Een pagina geeft de eigenschap niet mee als de kaart nog geen gegevens heeft.
- **Waarom:** een object dwingt af dat een kaart met een knop ook zijn bron noemt (principe 4 van de Redactie).
  De naam uit de kop houdt de tekst op één plek.
  Een knop zonder JavaScript doet niets, en een knop die er pas na het laden staat verschuift de kop niet.
- **Alternatieven:** een boolean `shareable` met de bron als aparte eigenschap (een kaart kan dan zonder bron delen); een aparte component `ShareButton` die de pagina zelf in de kaart zet (de pagina moet dan zelf de kaart vinden en kiezen waar de knop komt).

### Statistieken komen als kaarten op Wedstrijden, voor de Eredivisie, met "Gebaseerd op"

- **Datum:** 29 oktober 2026
- **Besluit:** nieuwe statistieken komen als kaart in de zijbalk van `/wedstrijden`.
  Een kaart telt alleen de Eredivisie, tenzij hij over de beker gaat.
  Een kaart blijft zichtbaar bij weinig wedstrijden en zegt waarop hij is gebaseerd.
  Voorspellingen en lijnen voor Europa of degradatie komen er niet in.
- **Waarom:** de pagina heeft al zeven kaarten en de navigatie is voorbereid op een splitsing in subpagina's, dus nu extra kaarten bouwen kost later weinig werk.
  Een regel voor de competitie maakt de cijfers vergelijkbaar, en een schakelaar volgt (#406).
  Vroeg in het seizoen zijn de aantallen klein, maar de zin "Gebaseerd op" zegt dat eerlijk.
  Een voorspelling is een mening, geen feit uit de bron.
- **Gevolg:** de bestaande kaarten Doelpuntenmakers, De nul gehouden en Doelpunten per kwartier tellen de beker nog mee, tot de schakelaar van #406 er is.
  De zin "Gebaseerd op" komt uit één stukje code, `BasedOn` in `MatchViews.tsx`.
- **Alternatieven:** een eigen pagina of tabbladen voor de statistieken (komt met #363).
  De beker meetellen (de bestaande kaarten verschillen al, één regel is duidelijker).
  Een statistiek verbergen tot er genoeg wedstrijden zijn (de pagina is dan lang leeg).

### Reeksen staan in een eigen kaart na Verloop van het seizoen

- **Datum:** 29 oktober 2026
- **Besluit:** de reeksen en de laatste vijf wedstrijden staan in een eigen kaart "Reeksen", direct na Verloop van het seizoen, in het zachte vlak.
  Er zijn zes reeksen, elk met de lengte van nu en de langste.
  Ze komen uit de score van de gespeelde wedstrijden van de Eredivisie.
  De laatste vijf wedstrijden staan met de oudste eerst, als letters (`MarkRow`) en als korte regels met de tegenstander en de uitslag (`ShortMatch`).
- **Waarom:** de reeksen gebruiken dezelfde uitslagen als Verloop van het seizoen, dus ze staan er het best naast.
  Een eigen kaart houdt Verloop van het seizoen kort.
  Een score is er voor elke gespeelde wedstrijd, dus de reeksen hebben geen last van wedstrijden zonder bekende doelpunten.
  De oudste eerst is de volgorde van de vorm in de kaart erboven, en de letters en de regels staan zo in dezelfde volgorde.
  Het zachte vlak laat de volgende kaart (Thuis en uit, #399) warm worden, zodat de kaarten daarna om en om wisselen.
- **Alternatieven:** de reeksen in de kaart Verloop van het seizoen zetten (een lange kaart met twee onderwerpen).
  Alleen de laatste vijf wedstrijden tonen (geen reeksen, en die zoeken supporters juist).
  De nieuwste eerst (past bij Uitslagen en De nul gehouden, maar dan loopt de volgorde tegen die van de letters in).
  Een warm vlak (komt naast Verloop van het seizoen, dat al warm is).
- **Later:** een eerder seizoen toont alleen de langste reeksen, zonder de lengte van nu en zonder de laatste vijf wedstrijden, zie _Een eerder seizoen toont bij de reeksen alleen de langste_ (30 oktober 2026).

### De toon en de schrijfwijzer staan in het hoofdstuk Redactie

- **Datum:** 29 oktober 2026
- **Besluit:** het hoofdstuk Redactie van Storybook heeft drie nieuwe delen in plaats van de lijst "Nog te schrijven": _Toon_ (met _Fries_), _Schrijfwijzer_ en _Bronnen en tijden_.
  `CONTRIBUTING.md` wijst naar dat hoofdstuk, en de checklist voor de reviewer heeft een punt voor de toon en een voor de schrijfwijzer.
- **Waarom:** de toon en de schrijfwijzer horen bij wat we over de redactie zeggen, en Storybook is het handboek voor wie schrijft.
  De delen schrijven op wat de site al doet (de besluiten over tijden, namen en bronnen), zodat een nieuwe pagina dezelfde vormen gebruikt.
  Een stijlgids in een eigen bestand zou een tweede plek zijn naast de principes.
- **Alternatieven:** een eigen stijlgids in `docs/`; dan staan de redactieregels op twee plekken.
  Of de toon in `CONTRIBUTING.md`; dat is voor wie meewerkt aan de code, niet voor wie voor bezoekers schrijft.

### Fries voor namen en een knipoog, nooit in wat een bezoeker nodig heeft

- **Datum:** 29 oktober 2026
- **Besluit:** we gebruiken Fries voor namen en een enkele knipoog (Pronkkeamer, It Hearrenfean) en voor koppen van Friese bronnen, die we laten zoals ze zijn gepubliceerd.
  Menu's, knoppen, formulieren, meldingen en uitleg zijn Nederlands.
  De site wordt niet tweetalig.
- **Waarom:** Fries past bij een club uit Friesland en geeft de site smaak.
  Een bezoeker die geen Fries kent, mag er niet op vastlopen.
  Een tweede taal voor de hele site kost bij elke tekst werk, en geen issue vraagt erom.
- **Alternatieven:** helemaal geen Fries; dat laat een deel van de club weg.
  Of Fries voor de hele site, of een keuze van taal; dat is groot en nu niet gevraagd.
- **Let op:** dit is een voorstel van de Builder bij #343, bedoeld voor de projecteigenaar om te corrigeren; het issue noemt alleen "wanneer we Fries gebruiken".

### Vóór een kop staat "wo 14:05" of "14 okt 14:05", en niet "wo 01/09"

- **Datum:** 29 oktober 2026
- **Besluit:** de schrijfwijzer noemt als korte datum vóór een kop de vormen die de site al heeft: de korte weekdag en de tijd binnen zeven dagen ("wo 14:05"), en de datum met een afgekorte maand en de tijd daarna ("14 okt 14:05").
  De schrijfwijze van de oude fansite, "wo 01/09", nemen we niet over.
- **Waarom:** de site schrijft dit sinds _De tijd van een bericht: een weekdag in de week, daarna de datum_ (24 oktober 2026), en de schrijfwijzer zegt wat is.
  Twee getallen met een schuine streep zeggen niet meteen welk de dag is en welk de maand, en de tijd is voor een nieuwsbericht meer waard dan het jaar.
- **Alternatieven:** "wo 01/09", zoals de oude fansite en het issue het noemen; dan moet de site anders gaan schrijven, wat dit issue niet vraagt.
  Of de datum voluit voor elke regel; dat is langer en past niet in de kolom.
- **Later:** de datum na een week is de korte weekdag en de datum, zonder tijd, zoals "wo 21 okt" (29 oktober 2026).
  Daarmee ligt de vorm dicht bij die van de oude fansite, die de weekdag en de datum ook samen schreef.
  Zie _Een publicatiedatum van meer dan een week oud is de korte dag en de datum, zonder tijd_.

### Geen "vandaag", "gisteren" of "2 uur geleden" in een lijst of in een tekst die blijft staan

- **Datum:** 29 oktober 2026
- **Besluit:** in een lijst met berichten staat de dag of de datum en de tijd, en nooit een woord als "vandaag", "gisteren" of "2 uur geleden".
  In een tekst die blijft staan, zoals een artikel, staat de datum voluit.
  Eén uitzondering volgt uit _De tijd van een discussie: vandaag alleen de tijd, daarna de dag, na een week de datum_: in de smalle zijbalk staat van vandaag alleen de tijd.
- **Waarom:** een pagina uit de cache en een tekst van vorig jaar kloppen niet meer met zo'n woord, en een vaste tijd blijft kloppen.
  Dit schrijft de bestaande besluiten op (22 en 24 oktober 2026) en verandert niets aan de site.
- **Alternatieven:** "vandaag" en "gisteren" in de lijst; dat is vriendelijker, maar klopt niet in een pagina uit de cache.
- **Hetzelfde bericht op meer plekken:** een bericht staat op elke plek met dezelfde kop, link, bronnaam en tijd.
  Schrijven twee bronnen over hetzelfde nieuws, dan zijn het twee berichten, die we niet samenvoegen.
  Zo noemt elk bericht zijn eigen bron (principe 4).

### Thuis en uit staan naast elkaar in een tabel, met een kolom Totaal

- **Datum:** 29 oktober 2026
- **Besluit:** de kaart "Thuis en uit" toont een tabel met drie kolommen, Thuis, Uit en Totaal, met de punten, de doelpunten en de punten per wedstrijd.
  Alles komt uit de score van de gespeelde wedstrijden van de Eredivisie, volgens de regels van _Statistieken komen als kaarten op Wedstrijden, voor de Eredivisie, met "Gebaseerd op"_.
- **Waarom:** twee reeksen naast elkaar vragen een nieuw component, en een tabel is voor iedereen te lezen, ook zonder het oog.
  De kolom Totaal laat zien dat de kaart klopt met Verloop van het seizoen.
- **Hoe:** de kaart staat direct na Reeksen, in het warme vlak, zodat de buurkaarten niet dezelfde kleur hebben.
  Een kant zonder gespeelde wedstrijd toont een streepje bij de gemiddelden en 0 bij de tellingen.
  De rij met de wedstrijden zonder tegendoelpunt heet "Zonder tegendoelpunt", zodat ze niet lijkt op de kaart De nul gehouden, die ook de beker telt.
- **Alternatieven:** een grafiek met twee staven per onderdeel (een nieuw component voor één kaart).
  Alleen de punten tonen (de doelpunten zeggen veel over de manier van spelen).

### Het eerste doelpunt en de stand bij de rust komen uit de doelpunten op minuut, met een regel voor gelijke minuten

- **Datum:** 29 oktober 2026
- **Besluit:** de kaart "Hoe de wedstrijden verlopen" telt de uitslagen na het eerste doelpunt en na de stand bij de rust, voor de gespeelde wedstrijden van de Eredivisie met bekende doelpunten.
  De doelpunten staan op minuut en toegevoegde tijd; twee doelpunten in dezelfde minuut laten het eerste doelpunt onbekend.
  De rust telt tot en met de toegevoegde tijd van de eerste helft.
- **Waarom:** de volgorde in de gegevens is die van de Wikipedia-pagina en niet altijd die van het spelen, dus de volgorde moet uit de minuut komen.
  Liever zeggen dat het onbekend is dan raden wie het eerst scoorde.
  De rust is het gewone moment om de stand te noemen.
- **Hoe:** `matchFlowOf` in `src/matches.ts` sorteert de doelpunten van elke wedstrijd op minuut en toegevoegde tijd, dus 45 komt voor 45+1.
  - Het eerste doelpunt is onbekend als beide clubs scoren in de eerste minuut met een doelpunt.
    Twee doelpunten van één club in die minuut maken het niet onbekend.
    Zo'n wedstrijd telt niet bij het eerste doelpunt, wel bij de rust, en onder de kaart staat hoeveel wedstrijden het zijn.
  - Een 0–0 heeft geen eerste doelpunt en staat bij de rust op "Gelijk".
  - Bij de rust telt een doelpunt in minuut 45 of in de toegevoegde tijd daarvan, en een doelpunt vanaf minuut 46 niet.
  - Een wedstrijd telt als gewonnen na een achterstand, of als zonder winst na een voorsprong, als de stand na een volle minuut dat zegt.
    Hangt het van de volgorde binnen een minuut af, dan telt hij niet mee, want we raden niet.
    De twee zinnen onder de tabellen kunnen dus een wedstrijd missen, maar nooit een te veel tellen.
  - De kolommen zijn afkortingen: G gespeeld, W winst, GL gelijk, V verlies en P punten, met een regel onder de tabellen die ze uitlegt.
    Vijf kolommen met hele woorden zijn 434 pixels breed: breder dan een telefoon, en breder dan de zijbalk bij 900 pixels (362 pixels), zodat de pagina opzij scrolt.
    Met afkortingen zijn ze 246 pixels breed en past de pagina bij 320 pixels.
    Een schermlezer hoort het hele woord ("gespeeld", "winst", …), zoals bij de stand.
    `DataTable` kan daarvoor een kolom als `{ abbreviation, name }` krijgen.
  - De uitslag is de score, want de Eredivisie kent geen verlenging.
  - De wedstrijden komen uit dezelfde regel als `goalsPerQuarter`: een uitslag met minstens één doelpunt, of een 0–0.
    De beker telt niet mee; zie _Statistieken komen als kaarten op Wedstrijden, voor de Eredivisie, met "Gebaseerd op"_.
  - De kaart staat in de zijbalk na Doelpunten per kwartier, in het zachte vlak: de buurkaart is warm.
  - De zin "Gebaseerd op" komt van `BasedOn` in `src/MatchViews.tsx`, het gedeelde stukje code voor die zin.
- **Alternatieven:** de volgorde van de gegevens aanhouden (kan het verkeerde doelpunt als eerste kiezen).
  Bij gelijke minuten de thuisclub eerst nemen (een gok).
  Alleen wedstrijden met een volledig bekende volgorde tellen (te weinig wedstrijden).
  De kolommen "Wedstrijden", "Winst", "Gelijk", "Verlies" en "Punten" voluit laten staan (past niet, zie hierboven).
  De tabel een eigen scrollvlak geven (ook op een bureaublad scrolt de tabel dan, en een scrollvlak is een nieuw onderdeel).
  De tabel omdraaien, met de uitkomsten als rijen en de situaties als kolommen (past op 320 pixels ook niet).
- **Later:** zie _Een inleiding of toelichting bestaat alleen als ze iets toevoegt, en ze staat op een vaste plek_.
  De regel met de afkortingen staat onder de tabellen en onder de twee zinnen, direct boven "Gebaseerd op".

### Een publicatiedatum van meer dan een week oud is de korte dag en de datum, zonder tijd

- **Datum:** 29 oktober 2026
- **Besluit:** een publicatiedatum van meer dan zeven dagen oud toont de korte dag en de datum, zonder tijd: "wo 21 okt", met het jaar bij een ander jaar: "di 14 okt 2025".
  Wat binnen de zeven dagen valt, blijft de korte dag en de tijd.
  Dit geldt voor het nieuws, de afleveringen, de discussies en de dag van een artikel in een lijst.
  Wedstrijden houden hun notatie en hun aanvangstijd.
  Het jaar heeft altijd vier cijfers, ook in de strook onder een kaart op een afbeelding ("28 okt 2026", zonder weekdag).
- **Waarom:** na een week is het uur van een bericht niet meer van belang, en de dag van de week zegt meer over wanneer het was dan de datum alleen.
  De oude fansite deed het zo.
  De reden om geen weekdag na een week te tonen was dat "wo" twee woensdagen kan zijn, maar met de datum erbij is dat niet meer dubbelzinnig.
- **Waarom vier cijfers:** "28 okt 26" is te lezen als een tijd of als twee dagnummers, en een apostrof ("’26") vraagt eigen code en een uitleg voor een schermlezer.
  Duidelijkheid gaat voor kortheid.
- **Hoe:** `news.ts` heeft één functie, `formatDayAndDate`, voor de korte dag en de datum; `formatNewsTime`, `formatEpisodeTime`, `formatDiscussionTime` en `formatArticleDay` gebruiken die.
  De kolom van `NewsItem` is 4,5 rem breed in plaats van 4 rem, want de breedste dag met datum, "ma 10 mei", is 68 pixels op de maat van Meta en de kolom van 4 rem is 64 pixels.
  Staat er een jaar bij, dan breekt de tekst na de datum en komt het jaar op een tweede regel.
  Het beheer van berichten gebruikt dezelfde functie, dus ook daar staat bij een oud bericht geen tijd meer.
  `formatVersionTime` en de lange datum van een artikel blijven zoals ze waren.
- **Alternatieven:** de datum en de tijd houden (de tijd is na een week ruis).
  Alleen de datum (zegt minder over wanneer het was).
  Een relatieve tijd als "3 weken geleden" (klopt niet meer in een pagina uit het geheugen en een schermlezer leest hem minder gemakkelijk).

### Een inleiding of toelichting bestaat alleen als ze iets toevoegt, en ze staat op een vaste plek

- **Datum:** 29 oktober 2026
- **Besluit:** een inleiding onder de kop van een pagina en een uitleg onder de kop van een kaart bestaan alleen als de kop en de inhoud zonder haar niet genoeg zijn.
  Een legenda of toelichting staat onder wat ze uitlegt.
  De volgorde in een kaart is vast: kop, uitleg, inhoud, legenda, "Gebaseerd op", link, bron.
  De regels staan in het hoofdstuk Redactie van Storybook, onder _Inleidingen en toelichtingen_.
- **Waarom:** een vaste tekst die herhaalt wat er al staat, kost de bezoeker een regel lezen en het scherm een regel hoogte, vooral op een telefoon.
  Een vaste plek maakt de pagina's voorspelbaar, en een schermlezer leest ze in dezelfde volgorde.
- **Hoe:**
  - De inleiding van `/wedstrijden` en van Onze bronnen vervalt, want ze herhalen de kop en de namen van de kaarten.
    Onze bronnen houdt alleen de zin voor de lege plek.
  - De inleidingen van `/zoeken`, Contact en Over ons zijn korter, in één zin.
    De rest van de vaste teksten blijft, met een reden per tekst in de pull request (#435).
  - Zinnen die zeggen wat de telling buiten beschouwing laat, zoals "Doelpunten in de verlenging tellen niet mee.", staan direct na "Gebaseerd op".
    De regel met de afkortingen van Hoe de wedstrijden verlopen staat onder de tabellen én onder de twee zinnen, boven "Gebaseerd op".
  - Een grafiek heeft haar legenda eronder, en de tabel met dezelfde cijfers volgt daarna (Verloop van het seizoen).
  - Tests controleren de volgorde van de onderdelen van de kaarten op `/wedstrijden` en van de blokken op de homepage.
- **Alternatieven:** alle inleidingen houden en alleen inkorten (de herhaling blijft).
  Alle toelichtingen boven de inhoud zetten (de bezoeker leest uitleg voor hij de inhoud heeft gezien).
  Een regel per pagina in plaats van één regel voor allemaal (elke pagina kiest zelf, zoals nu).

### Een seizoen heeft een eigen adres, `/wedstrijden/2025-26`, en een kiezer die zonder JavaScript werkt

- **Datum:** 29 oktober 2026
- **Besluit:** het lopende seizoen staat op `/wedstrijden`, een ander seizoen op `/wedstrijden/JJJJ-JJ`.
  Een keuzelijst rechts naast de titel van de pagina kiest het seizoen; met JavaScript verstuurt ze het formulier bij een keuze en verdwijnt de knop, zonder JavaScript blijft de knop "Toon" (een GET naar `/wedstrijden/kies`, die doorverwijst).
  De homepage blijft het lopende seizoen.
  Het lopende seizoen begint op 1 juli (zoals `seasonOf`).
  Eerdere seizoenen staan niet in de sitemap en de feeds.
- **Waarom:** een eigen adres per seizoen is te delen en te vinden, en een pad past bij de manier waarop de projecteigenaar de site opdeelt.
  Een keuzelijst schaalt naar de 36 seizoenen vanaf 1990 en werkt zonder JavaScript, zoals de rest van de site.
  De homepage is een nieuwspagina van nu, dus een oud seizoen hoort daar niet.
- **Verversen bij een keuze:** de projecteigenaar wil dat een keuze direct verstuurt.
  Dat is een wisseling van context (WCAG 3.2.2), dus de keuzelijst heeft een uitleg die een schermlezer voorleest, en een oplossing voor het toetsenbord.
- **Alternatieven:** een zoekopdracht (`?seizoen=`), die op elke pagina en bij de schakelaar van #406 werkt zonder omleidingen als #431 de pagina's verplaatst (de projecteigenaar koos het pad).
  Een rij met links (36 seizoenen passen niet).
  Een eigen pagina per seizoen met een lijst (een tik extra).

### Een eerder seizoen heeft geen Programma, een uur geheugen en een eigen canoniek adres

- **Datum:** 29 oktober 2026
- **Besluit:** de lijst met seizoenen heeft de seizoenen die wedstrijden in de database hebben, tot en met het lopende, het nieuwste bovenaan.
  Het lopende seizoen staat er altijd in, ook vóór zijn eerste wedstrijd, want de pagina van dat seizoen is `/wedstrijden` zelf.
  Heeft de lijst één seizoen, dan toont de pagina de kiezer niet: er valt niets te kiezen (de projecteigenaar, 29 oktober 2026).
  Een seizoen dat niet in de lijst staat, een seizoen in de toekomst en een adres dat niet de vorm `JJJJ-JJ` heeft (waarin het tweede getal bij het jaar past), geven "niet gevonden".
  Het lopende seizoen op zijn eigen adres (`/wedstrijden/2026-27`) verwijst door naar `/wedstrijden`, met een tijdelijke doorverwijzing, want vanaf 1 juli is dat seizoen een eigen adres.
  Een eerder seizoen heeft geen kaart Programma, want er valt niets meer te spelen, en de balk "Op deze pagina:" linkt er dan ook niet naar.
  De overige kaarten tonen hun gewone zin als ze voor dat seizoen niets hebben.
  De gegevens van een eerder seizoen blijven een uur in het geheugen, die van het lopende seizoen vijf minuten.
  De titel van de pagina noemt het seizoen ("Wedstrijden 2025/26"), een eerder seizoen heeft zijn eigen adres als canoniek adres, en alleen het lopende seizoen staat in de sitemap.
  De kop `h1` blijft "Wedstrijden", want de keuzelijst ernaast noemt het seizoen al en een kop met het jaar herhaalt haar (de projecteigenaar, 29 oktober 2026).
  Een bezoek aan een eerder seizoen telt als een bezoek aan `/wedstrijden`.
  De afbeelding van een kaart van een eerder seizoen noemt het seizoen onder de afbeelding ("Seizoen 2025/26") en in de naam van het bestand.
- **Waarom:** een afgelopen seizoen verandert niet meer, dus een uur geheugen is genoeg.
  De pagina vraagt eerst de lijst met seizoenen en daarna pas de gegevens, want het geheugen houdt een regel per gevraagd seizoen, en een bezoeker kan elk adres met de juiste vorm verzinnen.
  Een afbeelding die later wordt gedeeld, heeft geen adres meer bij zich, dus het seizoen staat erop.
  Een telling per seizoen zou een rij per adres met die vorm zijn, en het is dezelfde pagina.
- **Alternatieven:** het seizoen aan elk adres toevoegen ook voor het lopende seizoen (twee adressen voor één pagina).
  Een doorverwijzing met 308 (een browser bewaart die, en na 1 juli klopt hij niet meer).
  Een lege kaart Programma met een zin (de kaart zegt dan iets wat altijd waar is).

### Het toetsenbord kiest een seizoen met de pijltjes en bevestigt met Enter

- **Datum:** 29 oktober 2026
- **Besluit:** de `SeasonPicker` verstuurt het formulier zodra een seizoen is gekozen met de muis, een vinger of de open lijst, en wacht bij een keuze met een toets (de pijltjes, Home, End, Page up, Page down, een letter of cijfer) op Enter.
  Een keuze die niet is bevestigd, gaat terug naar het seizoen van de pagina zodra de lijst de focus verliest.
  Een regel zegt het vooraf, en de lijst noemt haar met `aria-describedby`.
  Er staat "De pagina wisselt direct van seizoen." en "Kies met de pijltjes en bevestig met Enter."
  Met JavaScript zijn die regel en het label "Seizoen" niet te zien (`hf-visually-hidden`), maar een schermlezer leest ze voor; de projecteigenaar wilde geen tekst om de lijst (29 oktober 2026).
  Zonder JavaScript staan het label en de knop "Toon" er wel, en de regel niet, want die knop is dan het antwoord.
- **Waarom:** een gesloten keuzelijst stuurt in sommige browsers `change` bij elke pijltoets.
  Dan verspringt de pagina bij de eerste pijl en komt een bezoeker met het toetsenbord nooit bij een seizoen verder weg.
  Op een Mac, bekeken in Chromium en WebKit, openen de pijltjes de lijst, en een letter of cijfer verandert de keuze zonder te versturen; Enter verstuurt dan.
  In de open lijst bevestigt Enter de keuze, dus daar werkt het zonder iets extra's.
- **Nadeel:** een bezoeker die met een toets kiest, moet Enter drukken, en een ziende bezoeker leest dat niet vooraf.
  De lijst naast de kop "Wedstrijden 2025/26" zegt zelf wat ze is, en Enter is wat een formulier altijd doet.
- **Alternatieven:** versturen bij het verlaten van het veld (de bezoeker verlaat het veld met Tab en de pagina verspringt, zonder dat hij dat vroeg).
  Alleen een knop "Toon" houden, ook met JavaScript (de projecteigenaar wil dat een keuze direct verstuurt).
  Een keuze met een pijl na een korte pauze versturen (een bezoeker met een motorische beperking haalt de pauze niet).

### De titelrij is `Page.Title`, en de kiezer is een onderdeel van het designsysteem

- **Datum:** 29 oktober 2026
- **Besluit:** `Page.Title` is een rij voor de kop van een pagina met één bediening ernaast, die aan het einde staat: rechts naast de kop, en onder de kop (nog steeds rechts) als ze er niet naast passen.
  Het einde is de rand van de hoofdkolom en niet van de pagina: de titelrij zit in `intro` van `Page.Main`, en de zijbalk begint eronder.
  `SeasonPicker` is een component van het designsysteem, met de adressen van een seizoen (`seasonAddress`, `seasonFromSlug`, `seasonChoices` en `pickedAddress` in `src/seasons.ts`) in de site.
  Een pagina met een ander basisadres, zoals `/statistieken` na #431, geeft die adressen aan het component en zet een route naast de pagina die `pickedAddress` aanroept.
- **Waarom:** de kiezer hoort bij elke pagina met een seizoen, en het formulier, de uitleg en het toetsenbord moeten overal gelijk werken.
  De titelrij is een indeling van de pagina en geen eigenschap van de kiezer, dus een andere bediening kan er ook staan.
- **Alternatieven:** de kiezer in de site laten, naast de kop (dan bouwt elke pagina hem opnieuw).
  Een eigenschap `actions` op `Page.Main` (de kop staat in `intro`, en een eigenschap erbij maakt twee manieren om dezelfde plek te vullen).

### Een eerder seizoen toont zijn uitslagen van oud naar nieuw, en zijn tabel heet Eindstand

- **Datum:** 29 oktober 2026
- **Besluit:** op de pagina van een afgelopen seizoen begint de kaart Uitslagen met de eerste wedstrijd en heet de kaart Stand "Eindstand".
  Het lopende seizoen houdt de nieuwste uitslag bovenaan en de naam Stand.
  De volgorde en de naam hangen af van het seizoen en niet van de pagina: `resultsOfSeason` in `src/matches.ts` en `standingsCardOf` in `src/matchShortcuts.ts`.
  De kop, het bijschrift voor een schermlezer, het label van de zijbalk, het anker en de link in de balk "Op deze pagina:" volgen de naam.
  Het anker van een eerder seizoen is `eindstand` en dat van het lopende seizoen blijft `stand`.
  De zin in de lege kaart en in de lege kaart "Onze plek in de competitie" zegt "de eindstand", en de beschrijving van de pagina ook.
  De zin "Gebaseerd op de stand na 34 wedstrijden" onder de kaart "Onze plek in de competitie" blijft, want ze telt de wedstrijden waarop de plek rust.
- **Waarom:** wie een afgelopen seizoen bekijkt, leest het van begin tot eind.
  De nieuwste uitslag bovenaan is voor het lopende seizoen bedoeld, waar het laatste nieuws het belangrijkst is.
  Een tabel van een afgelopen seizoen is de eindstand.
- **Alternatieven:** de volgorde laten zoals ze is (de lijst begint dan bij het einde van het seizoen).
  Een schakelaar voor de volgorde (meer bediening voor een kleine behoefte).
  Het anker `stand` houden voor alle seizoenen (de link in de balk en het anker zouden dan een andere naam hebben dan de kop).

### Zonder koppeling is de naam van een doelpuntenmaker de titel van zijn Wikipedia-pagina

- **Datum:** 30 oktober 2026
- **Besluit:** een doelpunt zonder speler in `players` toont de titel van de Wikipedia-pagina van de speler, zonder toevoeging tussen haakjes, als zijn volledige naam.
  Zonder pagina blijft de korte naam van de wedstrijdpagina.
- **Waarom:** eerdere seizoenen hebben geen selectie en dus geen koppeling, maar de wedstrijdpagina linkt de speler wel.
  De titel van die pagina is de volledige naam, zonder dat we iets hoeven te raden.
- **Hoe:** `listSeasonMatches` geeft de titel mee als `playerPage`, uit dezelfde vraag.
  `pageTitleName` haalt de toevoeging weg ("Pim Verbeek (voetballer, 1999)" wordt "Pim Verbeek").
  `splitPageName` splitst de naam met de korte naam als zoekterm, na de beginletters die de wedstrijdpagina erbij kan zetten ("D. Rots").
  Past de korte naam niet achter de titel, dan staat de hele naam in het gewone gewicht.
  `topScorersOf` telt een doelpunt zonder speler op de titel van de pagina, dus twee spelers met dezelfde achternaam blijven twee rijen.
  Heeft een gekoppeld doelpunt dezelfde pagina, dan telt het doelpunt zonder speler voor die speler en toont het zijn naam uit `players`.
  De uitslagen houden de naam van de wedstrijdpagina.
- **Alternatieven:** de korte naam houden (geen voornaam, zoals voorheen).
  De selectie van elk seizoen importeren (kan niet als de pagina op Wikipedia ontbreekt).

### Een eerder seizoen toont bij de reeksen alleen de langste

- **Datum:** 30 oktober 2026
- **Besluit:** de kaart Reeksen van een afgelopen seizoen heeft geen kolom "Nu", alleen "Langste".
  Het lopende seizoen houdt beide.
  Het bijschrift en de zin zonder wedstrijden noemen in een afgelopen seizoen het seizoen ("in 2025/26") en niet "dit seizoen".
  Een afgelopen seizoen heeft ook geen blok met de laatste vijf wedstrijden (de letters en de korte regels): ze zijn aan het eind van een seizoen niet bijzonderder dan vijf andere.
  Het lopende seizoen houdt dat blok, met iets meer ruimte onder de rij met letters: een lijst direct onder een `MarkRow` begint een rem lager (`mark-row.css`), zoals een alinea, en niet een halve rem.
  De kaart weet het uit `season`, dat alleen een afgelopen seizoen heeft; `streaksOf` verandert niet.
- **Waarom:** de reeks waarmee een afgelopen seizoen eindigde verandert niet meer en zegt weinig.
  De langste reeks is wat de moeite waard blijft.
- **Alternatieven:** de laatste vijf wedstrijden in een afgelopen seizoen laten staan (ze zeggen over dat seizoen niets bijzonders).
  De kolom hernoemen naar "Aan het eind" (houdt een getal dat nauwelijks informatie geeft).
  De kolom laten staan (verwarrend: "Nu" in een seizoen van vorig jaar).

### De staf staat in een tabel `staff` met een rol, en de hoofdtrainers zijn de eerste rijen

- **Datum:** 30 oktober 2026
- **Besluit:** de staf van sc Heerenveen staat in de tabel `staff`, met een rol per rij.
  De hoofdtrainers sinds 1 juli 1990 zijn de eerste rijen, met de rol `coach`, een begin en een einde en per datum de precisie (`day`, `month` of `year`).
  De rijen komen uit de seed, gevuld met wat Wikipedia geeft.
  Een vraag naar de trainer op een datum zegt dat het onzeker is als de datum in de onzekerheid van een grens valt.
- **Waarom:** Wikipedia geeft voor de recente trainers meestal een dag en voor de jaren negentig maanden of jaren.
  Een gok zou een wedstrijd bij de verkeerde trainer zetten.
  Met de precisie erbij kan een pagina eerlijk zijn over wat we weten.
  Een eigen tabel is eenvoudiger dan elke keer Wikipedia te lezen, want de lijst op Wikipedia heeft geen dagen en verandert zelden.
- **Een tabel met een rol:** assistent-trainers en andere functies hebben dezelfde vorm (naam, periode, precisie).
  Eén tabel met een rol voorkomt een nieuwe tabel per functie.
- **Alternatieven:** een tabel alleen voor hoofdtrainers (`coaches`; een nieuwe tabel voor elke volgende functie).
  De trainer per seizoen opslaan in plaats van per periode (kan niet bij twee trainers in één seizoen, of een wedstrijd).
  De trainer bij elke wedstrijd opslaan (veel dubbel werk, en onjuist als een datum verandert).
  De lijst van Wikipedia met de importer lezen (de lijst heeft geen dagen, en de pagina's van de trainers hebben een andere opbouw).
  Dagen verzinnen waar Wikipedia ze niet geeft (misleidend).

### Een maand of jaar telt als "ergens in", en een trainer staat alleen in een seizoen als hij er zeker een dag in dienst was

- **Datum:** 30 oktober 2026
- **Besluit:** een datum met de precisie `month` of `year` staat als de eerste dag van die maand of dat jaar, en betekent dat de echte dag ergens daarin ligt.
  De einddatum is de laatste dag van de periode.
  Een einde in een maand of jaar telt als "in die maand gestopt", dus de laatste dag die zeker is, is de dag ervoor.
  Daarop rekenen twee vragen in `packages/db/src/staff.ts` en `queries.ts`:
  - `findStaffOn` zegt `certain` met de persoon als de dag zeker in zijn periode ligt, `uncertain` met de mogelijke personen als de dag in de onzekerheid van een grens ligt, en `none` voor een dag in een gat of vóór de eerste rij.
    Op de dag dat een nieuwe trainer begint, is hij de trainer.
  - `listStaffInSeason` geeft de staf die zeker een dag van het seizoen in dienst was, op volgorde van begin en niet op aantal wedstrijden.
    Een trainer die "in 2024" begon, staat niet in 2023/24, en Van Basten, die volgens Wikipedia in juli 2014 stopte, niet in 2014/15.
- **Waarom:** de pagina mag geen naam bij een seizoen of wedstrijd zetten die we niet weten.
  Een seizoen met een trainer te veel is een fout die een bezoeker meteen ziet, een dag die `uncertain` heet doet niemand pijn.
  De volgorde op begin is wat de seizoenspagina toont ("op volgorde van begin"), en een telling per trainer hoort bij de pagina van een wedstrijd (#108), die de dagen toch al per wedstrijd vraagt.
- **Gevolg:** een seizoen waarin een datum vaag is, kan een trainer missen die er volgens Wikipedia maar een deel van was.
  Henk Brugge begon "in februari of maart 2025": we nemen februari, en hij staat in 2024/25.
  De trainers uit de jaren negentig en tot 2014 hebben vaak alleen een maand of jaar, dus bij hen zegt de vraag naar een dag vaker `uncertain`.
- **Alternatieven:** de eerste dag van een maand of jaar als de echte dag nemen (een gok, en een wedstrijd komt bij de verkeerde trainer).
  Een trainer in elk seizoen tonen dat zijn periode ook maar mogelijk raakt (twee trainers te veel bij Lodeweges en Van Persie).
  De trainer van een seizoen kiezen met de meeste wedstrijden (kan niet zonder de dag per wedstrijd en de onzekerheid ervan).

### De trainers van een seizoen staan in een kaart met het sterke blauwe vlak onder de stand, met een regel per trainer

- **Datum:** 30 oktober 2026
- **Besluit:** de seizoenspagina (`/wedstrijden` en `/wedstrijden/JJJJ-JJ`) toont de hoofdtrainer(s) in een kaart met het sterke vlak van het designsysteem (`surface="strong"`, licht blauw in licht en donker blauw in donker, zoals "Ben je zelf een bron?" op `/bronnen`) in de zijbalk, direct onder de stand.
  De tekst, de namen, de kolom met de dag en "(interim)" gebruiken de gewone tekstkleuren, die op dit vlak minstens 4,5:1 halen: 13,7:1 voor de tekst en 5,3:1 voor de dag en "(interim)" in licht, en 11,7:1 en 8,4:1 in donker.
  De kop is "Hoofdtrainer" bij één trainer en "Hoofdtrainers" bij meer, een `h2`, met altijd het anker `#hoofdtrainer`.
  Elke trainer is een regel van het nieuwe patroon `ShortStaff`, in dezelfde vorm als een `ShortMatch`.
  De naam staat als die van een speler (`PlayerName`): de voornaam in het normale gewicht, de achternaam in het sterkere, en "(interim)" erachter in het normale gewicht.
  De kaart staat ook als link in de balk "Op deze pagina:", na Stand of Eindstand.
  Een seizoen zonder trainer in de tabel heeft de kaart en de link niet.
- **Welke trainers en in welke volgorde:** alle trainers die zeker een dag van het seizoen in dienst waren (zie _Een maand of jaar telt als "ergens in"…_), op volgorde van begin.
  - Een seizoen met één trainer toont alleen zijn naam, zonder "hele seizoen".
  - Bij meer trainers heeft elke trainer behalve de laatste "tot 14 mrt 2026", de dag waarop hij stopte, en de laatste "vanaf 1 sep 2025", de dag waarop hij begon (`coachPeriods` in `src/match-format.ts`).
    Een trainer die in het midden begon en stopte, heeft dus alleen zijn "tot".
  - Een datum die alleen als maand of jaar bekend is, staat zo ("tot mrt 2026", "vanaf 2024").
    De dag staat in de Nederlandse korte notatie, "14 mrt 2026".
- **Bron:** de kaart heeft geen bronvermelding van zichzelf en de namen zijn geen links naar Wikipedia.
  De bron staat al onderaan de pagina, en een korte bronvermelding in elke kaart is te veel (de projecteigenaar, 30 oktober 2026).
  De kolom `wikipedia_page` blijft in de tabel, voor de pagina van een wedstrijd (#108) of een latere link.
- **Waarom:** de eerste versie, een regel boven de kaarten, viel te veel op voor een feit dat een bezoeker zelden zoekt.
  Een kaart onder de stand hoort bij de andere kaarten, en een lijst zegt per trainer wanneer hij begon of stopte zonder dat een zin de volgorde hoeft uit te leggen.
  De regel hergebruikt de klassen van `ShortMatch` (`ShortStaff` voegt alleen een bredere kolom toe voor de tekst vooraan), en de naam hergebruikt `PlayerName`, zodat de lijst er hetzelfde uitziet als bij de spelers.
  Het anker is voor één en meer trainers gelijk, zodat een link niet breekt als een seizoen er een tweede trainer bij krijgt.
  Het sterke vlak is de keuze van de projecteigenaar (30 oktober 2026): de kaart valt er tussen de witte en zachte kaarten op, zonder dat hij zwaarder weegt dan de stand.
  Er is geen eigen kleur voor het vlak nodig, want de tokens voor tekst en secundaire tekst zijn voor dit vlak gekozen.
- **Alternatieven:** een regel boven de kaarten (viel te veel op).
  "hele seizoen" bij de enige trainer (de naam zegt het al).
  Een "van … tot …" bij elke trainer (de regel wordt lang, en de dag van het begin van een trainer is de dag van het einde van de vorige).
  Een eigen lijstregel met eigen CSS (dubbel werk, en de twee lijsten gaan dan uit elkaar lopen).

### De hoofdtrainers staan in de seed met de laatste dag, en een afgeleide laatste dag is de dag voor de opvolger

- **Datum:** 30 oktober 2026
- **Besluit:** de seed (`headCoaches` in `packages/db/src/staff-seed.ts`) heeft de hoofdtrainers van 1 juli 1990 tot nu uit de Nederlandse Wikipedia (gelezen op 30 oktober 2026), elk met de precisie die Wikipedia geeft.
  Waar Wikipedia een einde afleidt uit het begin van de opvolger (Jan Everse en Henk Brugge), staat als laatste dag de dag ervoor, zodat twee periodes elkaar niet overlappen.
  Een "einde van het seizoen" is de laatste dag van dat seizoen, 30 juni.
  Eén datum komt niet van Wikipedia: Robin van Persie vertrok op 23 februari 2025, volgens de aankondiging van de club (de projecteigenaar, 30 oktober 2026).
  Wikipedia heeft daar "ongeveer 23 februari", dus de rij heeft de dag met de precisie `day`, en een opmerking in de seed en de toelichting zegt waar de datum vandaan komt.
  Zijn begin is alleen als jaar bekend, en dat blijft zo.
  De toelichting (`note`) schrijft op wat de bron openlaat of tegenspreekt, in onze woorden.
  De tabel is er vanaf nu voor een nieuwe trainer: die komt als rij in de seed.
- **Waarom:** acceptatie en productie krijgen de rijen zonder iets met de hand te doen, want de site zet ze bij het opstarten in de tabel, zoals de echte bronnen.
  Een seed die een rij vindt op rol, naam en begindatum werkt hem bij en maakt geen dubbele rijen.
  Een datum corrigeren in een bestaande rij vraagt een migratie, want een andere begindatum is een andere rij.
- **Keuzes bij een gat of een tegenspraak:** Johnny Jansen begon op 10 april 2019 als interim-trainer, en andere pagina's noemen 3 juni 2019 als begin.
  We nemen de eerste datum en tonen hem niet als interim, want hij werd daarna de vaste trainer en de rest van zijn periode zou anders onjuist "(interim)" dragen.
  Tussen Jansen (ontslagen op 24 januari 2022) en Ole Tobiassen (begon op 4 februari 2022) zit een gat van tien dagen: een vraag naar een dag daarin geeft geen trainer.
  Fritz Korbach begon in februari 1990, maar zijn periode begint op 1 juli 1990, de eerste Eredivisie-wedstrijd van de club, zoals de rij zegt.
- **Alternatieven:** de seed alle rijen van de rol `coach` laten vervangen (wist later wat het beheer toevoegt).
  Jansen in twee rijen splitsen, op 3 juni 2019 (de pagina's zeggen niet wat er die dag gebeurde).
  Het gat tussen Jansen en Tobiassen dichten (we zouden een datum verzinnen).
