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
- **Later:** zie _Elke tekststijl een stap groter_ en _Kleinere koppen_.
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
  Of een raster van 12 kolommen met `start` en `span`, zoals in het designsysteem van Amsterdam; flexibeler, maar meer API.
  Of rijen over beide kolommen met cellen die even hoog worden; dan stapelen de kolommen niet los.
  Of meer kaarten in één cel, met de ruimte in de kaart.
  Of de kolom in `Page.Body` laten zoals #73 deed, zonder plek voor een zijbalk.
  Of de tekst in de kolom van 48 rem toch beperken tot 36 rem, zodat de grens van 80 tekens blijft; dat is niet gekozen.

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

### Kleinere koppen

- **Datum:** 23 oktober 2026
- **Besluit:** kop 1 is 28 pixels (op een smal scherm 24) en kop 2 is 22 (op een smal scherm 20).
  Beide hebben gewicht 800, niet 900.
  Kop 1 blijft kleiner dan het woordmerk.
  De andere stijlen blijven gelijk.
- **Waarom:** koppen in kapitalen op breedte 125 en gewicht 900 vallen op, ook als ze kleiner zijn.
  Op 52 pixels schreeuwen ze en nemen ze de aandacht van het woordmerk en het nieuws.
  Het woordmerk is de grootste letter van de site; de koppen komen daaronder.
  De eerste stap (32 en 24 pixels, nog op gewicht 900) was de projecteigenaar nog te groot en te zwaar.
- **Alternatieven:** kop 1 op de maat van het woordmerk (36 pixels); dat is nog steeds groot in kapitalen.
  Alleen de gewichten of de breedte van de koppen verlagen en de maten laten staan; dat verandert het karakter van de letter.
  Of ook kop 3 kleiner maken; die is al 20 pixels, gelijk aan kop 4 en nieuwskop.

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
  De test maakt de koppen ook zo dat ze altijd in de week vallen, en zet er een bericht van ouder dan een week en een van een uitgezette bron tussen, om te zien dat de pagina die weglaat.
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
- **Later:** zie _Kleinere koppen_.
  Kop 1 en kop 2 worden daar kleiner.

### Het nieuws staat in één lijst, met dag en tijd in een eigen kolom

- **Datum:** 22 oktober 2026
- **Besluit:** de homepage toont het nieuws van de week in één lijst, het nieuwste bovenaan, zonder kop per dag.
  Elke regel heeft links de korte dag en de tijd in rood, zoals "wo 14:05", dan de kop en daaronder de bron, met een dunne lijn tussen de regels, zoals op de artboard.
- **Waarom:** zo ziet het blok eruit zoals ontworpen, en leest een bezoeker de koppen achter elkaar.
  De lijst beslaat vandaag en de zes dagen ervoor, dus een weekdag komt maar één keer voor en is altijd duidelijk.
  Dag en tijd blijven kloppen in een pagina uit de cache.
- **Alternatieven:** de kop per dag houden, zoals #73 deed.
  Of zoals op de artboard: dag en tijd voor vandaag en dag en datum voor oudere berichten, zoals "za 17/10"; dan toont een pagina uit de cache rond middernacht even een tijd zonder datum.

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
