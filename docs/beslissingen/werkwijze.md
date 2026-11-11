# Werkwijze

## Drie rollen voor AI-agents

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

## Bijdragegids voor mensen, AGENTS.md voor agents

- **Datum:** 21 oktober 2026
- **Besluit:** de regels voor mensen staan in `CONTRIBUTING.md`, in het Nederlands.
  `AGENTS.md` houdt de regels voor agents en verwijst naar de bijdragegids.
  `CLAUDE.md` laadt allebei.
- **Waarom:** de vrijwilligers zijn Nederlands, en wat zij lezen is Nederlands (zie _Nederlands voor bezoekers, Brits Engels voor code_).
  Eén plek per regel voorkomt dat de twee bestanden uit elkaar lopen.
- **Alternatieven:** alles in `AGENTS.md` houden en daar vanuit de bijdragegids naar verwijzen; maar dat bestand is Engels en voor agents geschreven.
  Of de regels in beide bestanden herhalen; dan lopen ze vroeg of laat uit elkaar.

## Gedragscode: de Contributor Covenant 2.0 in het Nederlands

- **Datum:** 21 oktober 2026
- **Besluit:** `CODE_OF_CONDUCT.md` is de officiële Nederlandse vertaling van de Contributor Covenant 2.0, met `fansite@heerenveen.org` als meldadres.
- **Waarom:** de Contributor Covenant heeft geen Nederlandse vertaling van 2.1 of 3.0, wel van 2.0.
  Een officiële vertaling hoeven we niet zelf te onderhouden of te verantwoorden.
- **Alternatieven:** zelf een Nederlandse vertaling van 2.1 maken; die zou onofficieel zijn.
  Of de Engelse tekst van 2.1 nemen, terwijl de vrijwilligers Nederlands lezen.

## Reviewer op Sonnet, en niet bij verhalen of documentatie

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

## Een model per rol

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
- **Later:** zie _Een Specifier voor een lang gesprek, en de Action List voor de status_ en _Zuinig werken is een regel, met harde grenzen_.
  Er is een rol bijgekomen, de Specifier, en de Coordinator start een verse sessie bij ongeveer 300.000 tokens in plaats van per taak.

## Bouwen in plakken, per release

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

## Eén zin per regel

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

## Een eigen reviewer in plaats van Copilot-reviews

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
  Sinds 1 november 2026 draait hij ook die niet meer zelf: de uitkomst komt uit CI (zie _De zware controles delen de machine_).

## De reviewer start direct na het openen van de pull request

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
- **Later:** sinds 1 november 2026 draait de reviewer de zware controles niet meer zelf maar neemt hij ze uit CI over (zie _De zware controles delen de machine_).
  Hij draait nog wel lint, typecontrole en de tests van de pakketten die de pull request raakt.

## Een agent start Storybook zelf, en werkt ook zonder

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
- **Later:** sinds 1 november 2026 draait Storybook in een worktree op een eigen poort, uit het blok van die worktree, dus twee worktrees kunnen er naast elkaar een starten (zie _Elke werkmap heeft een eigen database en eigen poorten_).
  De MCP-server in `.mcp.json` blijft op poort 6006, en toont dus alleen de Storybook van een checkout met de standaardpoorten.
- **Alternatieven:** de projecteigenaar houdt Storybook draaiend vanuit de hoofdmap, zodat de server er is als een sessie begint; dat is betrouwbaarder, maar een stap bij elke sessie, en de server toont dan de code van de hoofdmap in plaats van die van de worktree.
  Of in `AGENTS.md` alleen melden dat de server er is.
  Of de reviewer de hulpmiddelen voor documentatie geven; die lezen alleen.

## Een branch bekijk je met pnpm review, in één vaste map

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
- **Later:** een eigen paar poorten per branch, een van de alternatieven hieronder, hebben de worktrees van agents sinds 1 november 2026 wel (zie _Elke werkmap heeft een eigen database en eigen poorten_).
  `pnpm review` blijft op 3000 en 6006 en op de database `fansite`, want het is voor de projecteigenaar; de reviewmap krijgt met `WORKTREE_NAME` leeg de standaardwaarden.
- **Alternatieven:** `pnpm dev` in elke map, die zegt welke map een poort bezet; dan zoek je de worktree nog zelf.
  Of startconfiguraties voor de app van Claude; dan botsen de poorten tussen sessies.
  Of een eigen paar poorten per branch, zodat je branches naast elkaar ziet.
  Of bij elke start ook importeren.

## pnpm review neemt ook lokale branches en opent de pagina die de branch verandert

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

## Wekelijkse iteraties naast de mijlpalen

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

## Screenshots staan op een eigen branch, niet in de repository

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

## Alleen verzonnen gegevens in een screenshot

- **Datum:** 25 oktober 2026
- **Besluit:** een screenshot toont de gebouwde site met de verzonnen testgegevens van de e2e-tests of een story, nooit een echte forumdiscussie, een schermnaam of gegevens van de hosting.
  `pnpm screenshots` neemt daarom alleen een build op deze computer aan.
- **Waarom:** de repository is openbaar, en een plaatje blijft staan, ook als de pull request gesloten wordt.
  Wat we niet openbaar maken, zetten we niet in een plaatje (_geen persoonsgegevens in code, tests, testgegevens of logs_).
- **Alternatieven:** echte koppen en discussies tonen; die zijn herkenbaarder, maar bevatten namen van leden en kunnen later aanleiding geven tot een verwijderverzoek.

## Licht is genoeg, donker alleen met een reden

- **Datum:** 25 oktober 2026
- **Besluit:** een screenshot is standaard licht.
  Donker komt erbij als de wijziging over het thema of de kleuren gaat, of als iets in donker te zien is wat in licht niet te zien is.
  Er komen geen kopieën van hetzelfde plaatje waar alleen het thema verschilt.
- **Waarom:** in de meeste wijzigingen, zoals een nieuwe pagina, een lijst of een knop, is het thema niet wat verandert.
  Een tweede plaatje vertelt de eigenaar dan niets en kost bytes in de repository voor altijd.
  Wie het donkere thema wil nakijken, kan dat in Storybook en met axe, die beide thema's controleren.
- **Alternatieven:** altijd licht en donker, zoals het andere project vaak doet; dat verdubbelt de plaatjes.
  Nooit donker; dan mist een wijziging aan het thema precies wat ze wil laten zien.

## Een telefoon en een smal bureaublad, zo klein als kan

- **Datum:** 25 oktober 2026
- **Besluit:** de standaardbreedtes zijn 390 pixels (telefoon) en 900 pixels (bureaublad), zonder dubbele resolutie, als PNG zonder overbodige gegevens.
  Mappen van samengevoegde pull requests blijven op `pr-screenshots` staan, want ze staan in de beschrijvingen van gesloten pull requests.
  Is de branch groter dan 100 MB, dan kijken we opnieuw.
- **Waarom:** een kleinere breedte bespaart bytes, en wat in 900 pixels past, past in elke breedte daarboven.
  Een tablet voegt voor een eerste blik weinig toe; wie de opbouw tussen telefoon en bureaublad wil zien, vraagt er een.
- **Alternatieven:** 1200 pixels voor een bureaublad, zoals eerst voorgesteld; dat is een derde groter in elke richting.
  Een tablet erbij.

## Een klein script in plaats van een wegwerptest per Builder

- **Datum:** 25 oktober 2026
- **Besluit:** `pnpm screenshots` maakt de plaatjes met de Playwright die er al staat, voor een lijst met paden of stories.
  Het start geen server en voegt geen dependency toe.
- **Waarom:** anders schrijft elke Builder zijn eigen wegwerptest, met elk eigen breedtes en bestandsnamen, en vergeet hij de breedte of kiest hij donker zonder reden.
- **Alternatieven:** alleen beschrijven in `AGENTS.md`, zoals het andere project; dat is minder code, maar elke Builder bedenkt de test opnieuw.

## Een laatste controle van de Builder vóór de eerste push

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

## Skills voor de stappen van de rollen, regels blijven in AGENTS.md

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

## CI slaat de controles van de site over bij wijzigingen die ze niet raken

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
- **Later:** CI is sinds 31 oktober 2026 opgesplitst in jobs naast elkaar; zie _CI draait in parallelle jobs, met één afsluitende controle_.
  De stap _Check the site_ en de stories zijn nu jobs met een `if` op de uitvoer van _Decide which checks to run_, en de regels van het script zijn gelijk gebleven.

## CI toetst de stories alleen bij wijzigingen die ze raken

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

## CI draait in parallelle jobs, met één afsluitende controle

- **Datum:** 31 oktober 2026
- **Besluit:** CI is niet meer één lange job maar zes jobs naast elkaar, en een afsluitende controle die de regels voor `main` zien.
  - _Decide which checks to run_ draait `scripts/ci-changes.js`;
  - _Lint_;
  - _Typecheck and build_: de typecontrole, `pnpm build` en de map voor de host (`assemble`), die de jobs van de site als artifact krijgen;
  - _Migrate, seed and test_: de migraties en de seed op een lege database, en `pnpm test`;
  - _Check the stories with axe_;
  - _Check the site_ in vier delen, elk met een eigen MariaDB: de tests van het project `chromium` in drie delen (`--shard=1/3` tot `3/3`), en het deel met de tests die een artikel schrijven (`chromium-writing --no-deps`) samen met de rooktest;
  - _Lint, typecheck, test and build_ wacht op alle andere en is de controle die de regels voor `main` eisen.
    De naam blijft dezelfde, en ook _Build Storybook_ en _Conventional Commits title_ zijn niet veranderd.
- **De afsluitende controle:** hij draait altijd (`if: always()`) en `scripts/ci-gate.js` beslist.
  Elke job moet zijn geslaagd.
  Alleen de stories en de jobs van de site mogen zijn overgeslagen, en alleen als _Decide which checks to run_ dat zei.
  Een overgeslagen job die had moeten draaien, een afgebroken run en een job die ontbreekt maken hem rood.
  GitHub rekent een overgeslagen job als geslaagd en slaat een job over waarvan de voorganger faalde, dus de afsluitende controle kan niet gewoon op de andere wachten.
  Een deel van de e2e-tests dat faalt, maakt de job _Check the site_ en dus de afsluitende controle rood: [run 41244284495](https://github.com/VincentSmedinga/sc-heerenveen-fansite/actions/runs/41244284495) liet dat zien met een test die met opzet faalde.
- **Delen:** `--shard` over alle projecten werkt niet.
  `chromium-writing` hangt af van `chromium`, en Playwright zet dan alle 405 tests in het eerste deel.
  Deel 2 van 2 draaide nul tests en meldde een groene run met exitcode 0 (31 oktober 2026, runs 41240738753 en 41240746178).
  Daarom delen we alleen `chromium` en draait het schrijfproject apart, met een eigen database: geen andere test ziet het artikel dat het publiceert, net als voorheen.
  `scripts/ci-e2e-report.js` laat een deel falen dat geen test draaide of waarvan een test faalde of is overgeslagen.
  Een test in `scripts/ci-changes.test.js` controleert dat de delen 1/n tot n/n er allemaal staan en dat de afsluitende controle op elke job wacht.
- **Gemeten (31 oktober 2026, volle run, in seconden):** de klok van de eerste tot de laatste job, en de som van de seconden van alle jobs.

  | Indeling                                                      | Klok              | Som               |
  | ------------------------------------------------------------- | ----------------- | ----------------- |
  | Eén job (mediaan van 10 runs op `main`)                       | 632               | 632               |
  | Eén job (mediaan van 10 runs van pull requests)               | 571               | 571               |
  | Eén job (`main`, handmatig, hetzelfde uur als de nieuwe runs) | 707               | 707               |
  | Jobs naast elkaar, e2e in één job, twee workers (1 run)       | 480               | 791               |
  | Idem met vier workers (1 run)                                 | 452               | 819               |
  | Twee delen, rooktest los (mediaan van 7 groene runs)          | 314               | 923               |
  | Drie delen, rooktest bij het schrijfdeel (3 groene runs)      | 229 (223 tot 249) | 838 (818 tot 933) |

  De mediaan per stap van de oude job (seconden, laatste 10 geslaagde runs op `main` / van pull requests):

  | Stap                               | `main` | pull requests |
  | ---------------------------------- | ------ | ------------- |
  | Containers starten                 | 12     | 11            |
  | Checkout, pnpm en Node             | 10     | 9,5           |
  | Installeren                        | 3      | 3             |
  | `pnpm lint`                        | 35     | 33,5          |
  | `pnpm typecheck`                   | 21     | 21            |
  | Migreren en seeden                 | 2      | 2             |
  | `pnpm test`                        | 112,5  | 107           |
  | De stories met axe                 | 77,5   | 81            |
  | `pnpm build`                       | 18,5   | 18            |
  | De rooktest                        | 38     | 38            |
  | De toegankelijkheidscontrole (e2e) | 288,5  | 242           |

  Met drie delen is de klok 64% korter dan de mediaan op `main`, 60% korter dan die van pull requests en 68% korter dan de run van hetzelfde uur.
  De som is 33%, 47% en 19% hoger.
  De grens van 15% meer minuten halen we dus niet; het issue zegt dat de klok dan wint.
  De repository is openbaar, dus de minuten van de runners kosten voor zover bekend niets.
  Meer jobs betekent meer opstarttijd: elke job kost 13 seconden (zonder database) tot 27 seconden (met MariaDB) aan checkout, pnpm, Node, installatie en containers.
  Twee delen kosten niet minder minuten (863 en 897 seconden in twee runs) en maken de klok ongeveer 70 seconden langer, dus we nemen er drie.

- **Wat ook is geprobeerd:**
  - Vier workers per runner in plaats van twee: 7% sneller voor de e2e-job (373 tegen 401 seconden) en meer kans op wankele tests onder belasting; niet gehouden.
  - De cache van Next (`apps/site/.next/cache`): `pnpm build` duurde 15 in plaats van 19 seconden; niet gehouden.
  - De browsers van Playwright cachen: niet van toepassing, want CI gebruikt het Google Chrome van de runner (zie _CI gebruikt de Chrome van de runner_).
  - Elk deel zelf laten bouwen in plaats van de map als artifact te delen: de build kost 19 seconden en `assemble` 1 seconde per deel, tegen 4 seconden uploaden en 1 tot 3 seconden downloaden.
    Het artifact is goedkoper (19 MB).
  - Een stap die dubbel draait: `pnpm typecheck` en het begin van `pnpm build` deden allebei `tsc -b`.
    De typecontrole zit nu in dezelfde job als de build, die haar dan klaar vindt (ongeveer 20 seconden minder).
  - De rooktest in een eigen job: 70 seconden voor 39 seconden werk; nu een stap in het kleinste deel, wat 40 seconden scheelt.
- **Pull requests die alleen documentatie wijzigen:** de regels van `scripts/ci-changes.js` en zijn tests zijn niet veranderd.
  Zo'n run duurt 162 seconden (som 258) tegen 214 seconden (mediaan van 5 runs) in de oude indeling; de som is hoger door het opstarten van de jobs.
  [Pull request 521](https://github.com/VincentSmedinga/sc-heerenveen-fansite/pull/521) laat het zien: de stories en de jobs van de site zijn overgeslagen, en de afsluitende controle slaagt.
- **Waarom:** de eigenaar wacht op de klok, niet op de minuten.
  De e2e-tests (288 van de 632 seconden) bepaalden alles, en ze rekenen op de processor van de runner; meer workers op dezelfde runner helpen weinig, meer runners wel.
- **Gevolg:** de afsluitende controle is de enige naam die de regels voor `main` zien.
  Wie een job hernoemt, laat die naam staan.
  Een job die niet in de lijst `needs` van de afsluitende controle staat, kan falen zonder dat `main` het merkt; een test controleert dat.
- **Alternatieven:** de job laten zoals hij was (de wachttijd blijft elf minuten); alleen de stappen van de site naar een eigen job verplaatsen (de klok wordt 450 seconden); twee delen (even veel minuten, langere klok); de e2e-tests zelf sneller maken, wat buiten dit issue valt (#507).
- **Later:** de beslissingen _Controles: snel bij de commit, volledig in CI_, _De toegankelijkheidscontroles draaien op de gebouwde site, in de bestaande CI-job_ en _CI slaat de controles van de site over bij wijzigingen die ze niet raken_ spreken over één job met stappen.
  Dat zijn nu jobs; de keuzes zelf, wat CI draait en wat het overslaat, zijn gelijk gebleven.

## Elke werkmap heeft een eigen database en eigen poorten

- **Datum:** 1 november 2026
- **Besluit:** elke worktree krijgt een eigen database op de gedeelde MariaDB en een eigen blok poorten, afgeleid van de naam van de map.
  De database heet `fansite_<naam van de map>`, in kleine letters, cijfers en onderstrepingstekens.
  Het blok heeft zes poorten: de site, Storybook, de rooktest, de site van de toegankelijkheidscontroles, diezelfde site zonder database en de nepmailserver.
  Elke werkmap heeft een eigen blok van acht poorten tussen 24000 en 27999.
  Hetzelfde geldt voor de tests: hun tijdelijke databases heten `fansite_test_<naam van de map>_<hex>`, en die van de rooktest `fansite_smoke_<naam van de map>_<hex>`.
  Een gewone checkout, een map die geen worktree is en CI houden 3000, 6006, 3123, 3124, 3125, 2525 en `fansite`.
  Een variabele die je zelf zet, wint van de afgeleide waarde, en een databasenaam anders dan `fansite` in `DATABASE_URL` blijft zoals hij is.
  `WORKTREE_NAME` in de omgeving kiest een andere naam; een lege waarde zet het uit.
- **Hoe:** `scripts/worktree-env.js` rekent de waarden uit en start de opdracht ermee.
  De scripts `dev`, `storybook`, `smoke`, `test:a11y` en `test` van de site, het designsysteem, `@fansite/db` en de importer lopen erdoor.
  `--database` maakt de database de eerste keer aan en draait de migraties, en `--seed` zet er ook de seed in; `pnpm dev` doet dat, en `pnpm test:a11y` niet, want CI seedt voor die controles ook niets.
  `pnpm worktree:db:drop` haalt hem weg, en alleen een naam die met `fansite_` begint.
  Is een poort uit het blok bezet, dan stopt de opdracht met een melding die de poort en de worktree noemt, en kiest hij niet stilletjes een andere.
  De poorten hangen af van de naam van de map: twee mappen kunnen toevallig hetzelfde blok krijgen (zo'n 0,2 procent per paar).
  De melding zegt dan welke poort bezet is, en `SITE_PORT` en de andere variabelen zetten een andere.
- **Waarom:** sessies die naast elkaar werken, botsten op wat ze delen.
  De tests van `packages/db` faalden als twee sessies ze tegelijk draaiden, `pnpm test:a11y` faalde op de poort van de nepmailserver die een andere sessie vasthield, en Storybook, de site en de e2e-tests hebben vaste poorten.
  De lokale database `fansite` heeft bovendien de echte import, en liet daardoor e2e-tests falen die een lege database verwachten.
  Een naam uit de map is stabiel: dezelfde map geeft elke keer dezelfde waarden, zodat je ze kunt onthouden en een draaiende server terugvindt.
- **Let op:** de projecteigenaar besloot op 31 oktober 2026 ook dat er hoogstens twee Builders tegelijk werken.
  De laptop liep warm (belasting boven de 20 bij vijf sessies, plus de Docker-VM), en eigen poorten maken sessies niet zuiniger.
  Dat is het werk van de Coordinator en geen onderdeel van deze beslissing.
  De MCP-server van Storybook in `.mcp.json` blijft op poort 6006: die is van de checkout met de standaardpoorten.
  De Storybook van een worktree draait op zijn eigen poort, en `pnpm worktree:env` zegt welke.
  De database `fansite` en de databases die sessies al met de hand maakten, blijven ongemoeid.
- **Alternatieven:** een eigen MariaDB-server per werkmap; dat scheidt alles, maar kost een Docker-container en geheugen per sessie, op een computer die al warm loopt.
  Of een vaste lijst van werkmappen met nummers; dat botst niet, maar elke nieuwe werkmap moet erin, en dat vergeet een agent.
  Of de poort laten kiezen door het systeem (poort 0); dan weet niemand welke poort een server heeft, en `.mcp.json` en de afspraken in `AGENTS.md` kunnen er niet naar verwijzen.
  Of niets doen en sessies laten wachten; dat is wat misging.
- **Later:** een eigen server per werkmap, als de botsingen blijven; of de poorten laten kiezen door een bestand in de werkmap als twee namen vaak hetzelfde blok krijgen.
- **Later:** sinds 10 november 2026 weigert het script een werkmap die op `fansite_acc` zou uitkomen: die database heeft de kopie van acceptatie; zie _De kopie heet `fansite_acc`, en geen werkmap mag die naam krijgen_ in `hosting-en-data.md`.

## De zware controles delen de machine

- **Datum:** 1 november 2026
- **Besluit:** de zware controles gebruiken een vast, laag aantal processen en lopen om beurten, over alle worktrees heen.
  Het aantal processen is lokaal twee, in de configuratie en niet in een omgevingsvariabele:
  - `workers` in `apps/site/playwright.config.ts`;
  - `maxWorkers` in de zes `vitest.config.ts`-bestanden (de site, het designsysteem, de MCP-server, `@fansite/db`, de importer en `@fansite/shared`);
  - `--workspace-concurrency=2` voor `pnpm build` en `pnpm test` in de hoofdmap;
  - `--concurrent 2` voor `lint-staged` in `.husky/pre-commit`.

  In CI slaan de runs het slot over en houden Vitest en Playwright hun standaard aantal processen, want een runner heeft één taak: de caps van de configuraties gelden alleen als `CI` niet gezet is.
  `--workspace-concurrency=2` in `package.json` en de time-out van 30 seconden gelden ook in CI; de job _Migrate, seed and test_ duurde met deze wijziging ongeveer 2 minuten 40 tegen 2 minuten 46 op `main`, dus CI werd er niet trager van.
  `pnpm build`, `pnpm test:a11y`, `pnpm test:stories` en de Storybook-build nemen eerst een slot per computer (`scripts/heavy-lock.js`), een map in de temp-map van de gebruiker.
  Wie het slot niet krijgt, meldt wie het heeft en wacht.
  Een slot dat langer dan 30 minuten vastzit of waarvan het proces weg is, neemt de volgende over.
  Wacht een run langer dan 30 minuten, dan draait hij zonder slot.
  De time-out van de tests van `@fansite/db`, de importer en de site is 30 seconden, in plaats van de 5 van Vitest.

- **Reviewer:** de Reviewer draait de zware controles niet meer zelf.
  Hij draait `pnpm lint`, `pnpm typecheck` en de tests van de pakketten die de pull request raakt, en neemt `pnpm build`, `pnpm test:a11y`, `pnpm test:stories` en de build van Storybook over uit CI, vlak voordat hij zijn verslag schrijft.
  Heeft CI een controle overgeslagen die de wijziging wel kan raken, dan draait hij die zelf.
  De hook van de Reviewer laat daarvoor ook `gh run list` en `gh run view` door.
- **Waarom:** twee Builders en een Reviewer brachten de computer van de projecteigenaar (10 kernen) op een belasting van 15,9, en de tests van `packages/db` liepen dan op de time-out van 5 seconden.
  De eigen database en poorten per worktree (zie _Elke werkmap heeft een eigen database en eigen poorten_) haalden de botsingen weg, maar verdelen de processor niet.
  Elke zware controle nam een proces per kern, `pnpm -r` draaide er vier naast elkaar, en dezelfde controles liepen per pull request drie keer: bij de Builder, bij de Reviewer en in CI.
- **Nadeel:** een lokale run van `pnpm test` duurt langer, en een Builder die het slot niet krijgt, wacht.
  Dat kost minder dan een run die op een time-out faalt en opnieuw moet.
- **Alternatieven:** een omgevingsvariabele voor het aantal processen; dat moet iemand onthouden, en de configuratie laat het vanzelf gelden.
  Een snellere computer of een andere CI; dat staat buiten dit issue.
  Minder Builders; het aantal blijft twee.
  Het slot in de repository of in de database; het is een eigenschap van de computer en niet van een worktree, en de tests van de database zijn juist wat hier faalde.
- **Later:** de getallen (twee processen, 30 minuten, 30 seconden) volgen uit een meting op deze computer.
  Is de computer sneller of zijn er meer Builders, dan meten we opnieuw.
- **Later:** sinds 9 november 2026 draait een Builder bij een wijziging die alleen CSS of tokens raakt `pnpm build`, `pnpm test:a11y` en `pnpm test:stories` niet meer zelf (zie _Een wijziging die alleen CSS of tokens raakt, draait lokaal minder_).

## Issue-formulieren in YAML, met drie soorten en zonder lege issues

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

## Zuinig werken is een regel, met harde grenzen

- **Datum:** 2 november 2026
- **Besluit:** zuinig werken met tokens is een regel voor alle agents, met een eigen hoofdstuk in `AGENTS.md` (_Working efficiently_), een tabel met grenzen en een overzicht van de werkstroom.
  De grenzen: hooguit twee Builders tegelijk (een Builder telt mee terwijl hij bouwt of zijn Reviewer draait), twee reviewrondes per pull request, een nieuwe Coordinator-sessie bij ongeveer 300.000 tokens of na een reeks samenvoegingen, hooguit vier vragen per ronde bij het specificeren (de Coordinator één ronde, een Specifier twee), één bericht per gebeurtenis die om een besluit vraagt, Fable alleen waar `AGENTS.md` het noemt, en een tempo van ongeveer 14% van het weekplafond per dag (boven de 20%: één Builder en de rij wacht).
  Controles draaien op de voorgrond en één keer, zonder achtergrondmonitors, en een briefing is kort.
- **Waarom:** op 2 november 2026 waarschuwde de pagina met het gebruik dat het weekplafond donderdag op zou zijn, twee dagen voor de reset.
  Elke beurt van een sessie leest de hele context opnieuw, en elk bericht van een andere sessie start een beurt.
  Een Coordinator-sessie van zo'n 470.000 tokens, meldingen over niets ("een late regel van een monitor") en drie of vier Builders tegelijk maakten dat duur.
- **Alternatieven:** het bij richtlijnen houden zonder cijfers (een wachtrij of een vrije plek was elke keer een reden om ze te passeren).
  Een vast aantal Builders van één (te langzaam voor de week).
  Een Coordinator-sessie per dag (een natuurlijk breekpunt is beter dan een kloktijd).
- **Later:** zie _Elk nieuw issue start meteen een Specifier, die zichzelf archiveert_ (2 november 2026): de grens voor het specificeren is hooguit twee rondes, in de sessie van de Specifier.
- **Herzien:** als de grenzen te strak blijken voor de snelheid die we willen, of als het plafond niet meer knelt.

## Een Specifier voor een lang gesprek, en de Action List voor de status

- **Datum:** 2 november 2026
- **Besluit:** een gesprek over één issue dat meer dan één ronde vraagt, gaat naar een Specifier: een sessie die het issue specificeert met de projecteigenaar en dan eindigt.
  De Coordinator blijft dun (het bord, sessies starten, de status en wat op een samenvoeging volgt) en houdt de Action List bij: een privépagina met wat op de eigenaar wacht, wat gebouwd wordt en wat in de rij staat, in plaats van statusberichten in de chat.
- **Waarom:** een lang gesprek in de sessie van de Coordinator wordt bij elke volgende beurt in zijn volle omvang meegedragen.
  De projecteigenaar wil in de chat van de Coordinator alleen besluiten en vragen, en een rij op een pagina bijwerken kost veel minder dan een bericht.
- **Alternatieven:** geneste, kortlevende Coordinators (elk laadt dezelfde context opnieuw en het geeft meer sessies om bij te houden).
  Een aparte sessie voor projectbeheer of een persoonlijke assistent (die heeft dezelfde gegevens nodig, dus elke bijwerking wekt hem ook).
  Alles in de sessie van de Coordinator laten (de situatie van vandaag).
- **Later:** dit herziet het deel over de Coordinator in _Een model per rol_: de Specifier krijgt Sonnet, of een sterker model bij veel oordeel, en de Coordinator start een verse sessie bij ongeveer 300.000 tokens en niet per taak.
- **Later:** zie _Elk nieuw issue start meteen een Specifier, die zichzelf archiveert_ (2 november 2026): het gaat nu om elk nieuw issue en niet alleen om een gesprek van meer dan één ronde.
- **Herzien:** als de Specifier in de praktijk te veel van de Coordinator vraagt om over te dragen.

## Elk nieuw issue start meteen een Specifier, die zichzelf archiveert

- **Datum:** 2 november 2026
- **Besluit:** vraagt de projecteigenaar om een nieuw issue, of om een bestaand issue uit te werken, dan start de Coordinator meteen een Specifier in een eigen sessie, zonder keuzekaart.
  De Specifier maakt het issue aan, zet het op het bord als "Te doen", werkt het uit in hooguit twee rondes en archiveert zichzelf als het issue is goedgekeurd en er niets meer openstaat.
  De app meldt de Coordinator dat de beurt van de Specifier is afgelopen, en die werkt de Action List bij.
  De Coordinator schrijft alleen zelf een issue als de projecteigenaar zegt dat hij het gewoon moet opschrijven.
- **Waarom:** de projecteigenaar vroeg erom op 2 november 2026.
  Een issue schrijven vraagt code en beslissingen lezen, en die context draagt de Coordinator daarna bij elke beurt mee.
  Een sessie die klaar is, kost alleen nog ruimte in de lijst, dus ze archiveert zichzelf.
- **Nadeel:** elk issue kost een verse sessie die de regels van het project één keer leest.
- **Alternatieven:** de Coordinator specificeert een klein issue zelf in één ronde (de werkwijze van eerder die dag; ook een klein issue vult zijn context).
  De Coordinator archiveert de sessie van een Specifier (een extra beurt voor elk issue).
  Een app-instelling voor archiveren (die bestaat alleen voor een gesloten pull request en voor inactiviteit, en een Specifier heeft geen pull request).
- **Later:** dit herziet het besluit over de ronden in _Zuinig werken is een regel, met harde grenzen_ (één ronde voor de Coordinator, twee voor een Specifier): alleen een Specifier specificeert nog, in hooguit twee rondes.
  Het herziet ook _Een Specifier voor een lang gesprek, en de Action List voor de status_: elk nieuw issue gaat naar een Specifier, niet alleen een lang gesprek.

## De beslissingen staan in een map met een bestand per onderdeel

- **Datum:** 2 november 2026
- **Besluit:** `docs/beslissingen.md` wordt de map `docs/beslissingen/` met een `index.md` en een bestand per onderdeel (`project.md`, `werkwijze.md`, `hosting-en-data.md`, `werkruimte.md`, `designsysteem.md`, `site.md`, `importer.md` en `redactie.md`).
  De tekst van de beslissingen blijft gelijk; de koppen worden één niveau hoger.
- **Waarom:** een agent leest nu een bestand van bijna 10.000 regels (ongeveer 1 MB) om één beslissing te vinden, en elke Builder, Reviewer en Specifier doet dat.
  De map laat hen één onderdeel openen.
  De bestanden blijven in `docs/`: onderdelen sluiten niet aan op packages, beslissingen gaan over meer dan één package, en een pull request die alleen `docs/` wijzigt slaat de zware controles van CI over en heeft geen Reviewer nodig.
- **Alternatieven:** de beslissingen inkorten (verworpen: de regels _Later_ en de alternatieven zijn het punt); een bestand per package in de packages zelf (verworpen: beslissingen gaan over meer dan één package); alle titels in de index zetten (verworpen: ongeveer 25 KB extra voor elke lezer, en een lijst om bij te houden); de bestandsnaam in elke verwijzing tussen bestanden zetten (verworpen: ongeveer 160 regels veranderen, en een beslissing die verhuist breekt de verwijzing); een blijvende test voor titels en verwijzingen (verworpen: onderhoud voor weinig winst, en eerst moet de dubbele titel opgelost worden).

## We meten zelf, elke dag, met een vast budget voor wat kan en een melding voor tijd

- **Datum:** 7 november 2026
- **Besluit:** de workflow `.github/workflows/lighthouse.yml` meet elke dag en op verzoek de zes pagina's van de nulmeting (#798) op mobiel en bureaublad, met de Lighthouse-CLI en de mediaan van drie runs (#803).
  - **Eén bestand:** `.github/lighthouse.json` heeft het adres (acceptatie tot productie er is, #33), de versie van de CLI, de pagina's en de budgetten.
    Een ander adres is één regel.
  - **Zonder dependency:** de CLI komt met `npx` op een exacte versie, de acties staan vast op een commit-SHA, de rechten zijn `contents: read` en `actions: read`, en de workflow heeft geen geheim.
    `scripts/lighthouse.js` doet het werk en heeft tests.
  - **Vaste controles laten de run falen:** nul verzoeken naar derden, toegankelijkheid 100, best practices 100, en gewicht, JavaScript en lettertypes per pagina niet meer dan de nulmeting plus 5%.
    De nulmeting is die van `docs/prestaties.md`, dus 151,8 KiB JavaScript op de homepage en niet de 106 KiB uit de tekst van #802.
    Een pagina zonder basiswaarde laat de run falen.
  - **Tijdcontroles melden alleen:** prestaties, LCP, TBT, CLS en TTFB melden tot de eigenaar `enforce` zet, op zijn vroegst op 23 november 2026 (`decideOn`, twee weken na de eerste run).
    Dan wordt elk budget de slechtste waarde van die weken plus ongeveer 10%, met als doel 1 tot 5 foute runs per maand.
    De voorlopige waarden in het bestand zijn de nulmeting plus een ruime marge.
    Na elke verbetering uit deze mijlpaal gaat het budget omlaag, in dezelfde pull request.
  - **De samenvatting en de rapporten:** de samenvatting van de run toont de pagina's met de laatste zeven runs ernaast.
    Die komen uit `lighthouse-metrics`, een klein bestand dat elke run als artifact achterlaat, 30 dagen, naast de JSON-rapporten.
  - **De bezoeken tellen niet mee:** de nagebootste browsers van Lighthouse 13 hebben geen "Lighthouse" meer in hun tekst, dus `notVisitors` in `apps/site/src/visits.ts` houdt ze niet tegen.
    De runs sturen `DNT: 1` mee, dat `visitOf` al respecteert, en een test legt dat vast.
    Wijzigt een nieuwe versie dat, dan staat het in die test.
- **Waarom:** een runner meet elke keer anders, dus een vaste grens voor tijd geeft vals alarm.
  Het gewicht en het aantal verzoeken naar derden zijn precies, dus die falen meteen.
  Zelf draaien kost niets en geeft geen gegevens aan een dienst.
- **Alternatieven:** een dienst als SpeedCurve of Calibre (kosten en een derde partij); Lighthouse CI met een eigen server (te veel beheer voor deze site); alle controles meteen laten falen (te veel vals alarm); de runs herkenbaar maken met een eigen browsertekst in plaats van `DNT: 1` (verandert de meting, en de pagina's zien dan een andere browser dan Lighthouse zelf meet).

## De Coördinator coördineert alleen en zet werk strikt door naar een eigen sessie

- **Datum:** 8 november 2026
- **Besluit:** de Coördinator doet zelf alleen het bord, de issues en de Action List, statusberichten, sessies starten, samenvoegen op "klaar", opruimen en releasenotities schrijven na goedkeuring.
  Al het andere krijgt een eigen sessie, ook een vraag die onderzoek kost, een kleine wijziging, een issue schrijven, een controle en een pull request met releasenotities.
  Dat is een Specifier, een Builder, een Reviewer of een sessie voor onderzoek.
  Alleen als de projecteigenaar zegt dat hij het gewoon zelf moet doen, doet de Coördinator het zelf.
- **Waarom:** elke beurt in zijn sessie draagt de hele context mee (zie _Zuinig werken is een regel, met harde grenzen_), en een lange Coördinatorsessie maakt alles duurder.
- **Alternatieven:** een grens in regels of tokens (verworpen: lastiger na te gaan dan "kost het werk, dan krijgt het een sessie").
- **Later:** dit herziet het besluit _Elk nieuw issue start meteen een Specifier, die zichzelf archiveert_ niet; dat blijft gelden en is hier een voorbeeld van.

## De Coördinator is de enige bron van de stand

- **Datum:** 8 november 2026
- **Besluit:** de projecteigenaar moet via de Coördinator, dus via de Action List en een korte status, van alles op de hoogte kunnen zijn: wat er bouwt, wat op hem wacht en wat er is samengevoegd.
  De Coördinator vraagt sessies niet om tussenstanden.
  Hij zorgt dat elke gebeurtenis die ertoe doet bij hem terechtkomt (een bericht van een sessie, een samengevoegde pull request) en op de Action List staat.
- **Waarom:** de projecteigenaar kan de sessies zien en erin praten, maar hij hoeft ze niet af te lopen.
- **Alternatieven:** sessies om tussenstanden vragen (verworpen: elk bericht start een beurt, zie _Zuinig werken is een regel, met harde grenzen_).
- **Later:** dit sluit aan op _Een Specifier voor een lang gesprek, en de Action List voor de status_; de Action List blijft de plek.

## De overdracht aan een opvolger heeft vaste stappen

- **Datum:** 8 november 2026
- **Besluit:** de skill `weekly-coordination` beschrijft de overdracht in deze volgorde:
  1. De nieuwe Coördinator staat klaar.
     De oude zet een overdrachtsnotitie in het geheugen (de stand van de issues en pull requests, wat er bouwt en bij wie, de open beslissingen voor de projecteigenaar, de lessen) en controleert die tegen GitHub en `list_sessions`.
  2. De oude geeft elke sessie die hij startte en die moet blijven draaien los met `detach_session`.
     Dat werkt alleen voor sessies die hij zelf startte, die de projecteigenaar niet verplaatste en die niet de worktree van een andere sessie delen; een sessie die hij niet kan losmaken, noemt hij in de notitie en aan de projecteigenaar.
  3. De oude hernoemt zichzelf met `set_session_title`, bijvoorbeeld "Coördinator XXI (overgedragen)".
     De nieuwe krijgt de titel zonder achtervoegsel.
     Een verzoek dat de oude daarna nog krijgt, geeft hij door aan de opvolger met `SendMessage`.
  4. De oude archiveert zichzelf met `archive_session` en `session_id` "self", pas nadat de nieuwe de notitie heeft gelezen en de projecteigenaar het goed vindt.
     Dat is de laatste stap, want de conversatie eindigt daarna.
- **Waarom:** een sessie die nog onder de oude hangt, wordt samen met hem gearchiveerd en meldt het einde van haar beurten aan een sessie die er niet meer is.
  Bij de laatste overdrachten werden Builders zo mee gearchiveerd, en bleef onduidelijk wie de actieve Coördinator was.
- **Alternatieven:** de oude Coördinator laten doorlopen tot zijn context vol is (verworpen: dat maakt elke beurt duurder).
- **Later:** dit vult _Zuinig werken is een regel, met harde grenzen_ aan: de overdrachtsnotitie in het geheugen blijft, de stappen eromheen zijn nieuw.

## De Action List verschijnt vanzelf en de rijen volgen de sessies

- **Datum:** 8 november 2026
- **Besluit:** een nieuwe Coördinator toont de Action List aan het begin van zijn sessie in een paneel naast het gesprek, zonder dat de projecteigenaar erom vraagt.
  Omdat de Artifacts-pane alleen pagina's toont die de sessie zelf publiceerde, leest hij de live pagina en publiceert hij die opnieuw, zonder inhoudelijke wijziging en zonder de rijen aan te raken.
  Werkt dat niet, dan opent hij het adres met `preview_start` in de ingebouwde browser (de projecteigenaar logt eenmalig in bij claude.ai).
  Werkt ook dat niet, dan geeft hij het adres één keer in de chat.
  Het adres staat in de geheugennotitie `action-list`, niet in de repository, want die is openbaar.
- **Besluit:** de Coördinator laat de rijen de sessies volgen.
  Bij het begin van een sessie vergelijkt hij alle rijen met `list_sessions` (`linked: true`) en GitHub.
  Daarna past hij de rij van een sessie aan met één kleine schrijfactie wanneer die begint, van staat verandert of eindigt.
- **Waarom:** de projecteigenaar wil de status zien zonder erom te vragen.
  De pagina kan sessies zelf niet lezen, dus de rijen kloppen alleen als de Coördinator ze bijhoudt.
- **Alternatieven:** alleen op verzoek tonen (de projecteigenaar moet erom denken); het adres in de repository zetten (verworpen: de repository is openbaar); direct de browser gebruiken (werkt altijd, maar vraagt eenmalig om in te loggen); een script dat sessies naar rijen overzet (nieuw gereedschap, past niet bij "houd het licht").
- **Later:** dit vult _Een Specifier voor een lang gesprek, en de Action List voor de status_ en _De Coördinator is de enige bron van de stand_ aan.

## Een wijziging die alleen CSS of tokens raakt, draait lokaal minder

- **Datum:** 9 november 2026
- **Besluit:** raakt een wijziging alleen CSS of designtokens, dus geen TypeScript, markup, paginatekst of logregel, dan draait de Builder lokaal `pnpm lint`, `pnpm typecheck`, `pnpm test` en `pnpm --filter design-system build-storybook`.
  `pnpm build`, `pnpm test:a11y` en `pnpm test:stories` laat hij aan CI.
  Elke andere wijziging houdt de hele keten.
  Voor de Reviewer verandert niets: die neemt de zware controles al uit CI over.
- **Waarom:** CI draait dezelfde zware controles toch, in parallelle jobs.
  Lokaal wachten ze op één slot dat alle worktrees delen: twee Builders op tokenwijzigingen (#957 en #958) wachtten elk 15 tot 25 minuten.
  De Storybook-build blijft lokaal, want de screenshots komen eruit.
- **Nadeel:** een fout die alleen de zware controles zien, komt later boven, via Auto-fix of de Coördinator, en kost dan een extra push.
- **Alternatieven:** de hele keten lokaal houden; dat is trager en geeft dezelfde uitkomst.
  Alle controles aan CI laten; dan mist de Builder de snelle fouten en de screenshots.
- **Later:** dit beperkt _De zware controles delen de machine_ voor deze soort wijziging; de rest van die beslissing geldt nog.

## Een opdracht in een worktree weigert de gedeelde database fansite

- **Datum:** 10 november 2026
- **Besluit:** in een worktree weigeren de opdrachten die naar de database schrijven maar niet door `scripts/worktree-env.js run` lopen, te starten als `DATABASE_URL` uit `.env` de database `fansite` is.
  Het gaat om `pnpm db:migrate`, `db:seed`, `db:restore`, `pnpm import` met zijn varianten, `pnpm --filter site admin` en `test-data`.
  Ze lopen nu door `scripts/worktree-env.js guard`.
  De melding noemt de database van de map en de opdracht die je in plaats daarvan draait: `node scripts/worktree-env.js run --database -- <opdracht>`.
  Een gewone checkout, CI, een map met een lege `WORKTREE_NAME` (de reviewmap), en een `DATABASE_URL` die je zelf in de omgeving zet, houden hun opdracht zoals hij was.
  `pnpm db:pull-acceptance` en `pnpm db:backup` zijn niet bewaakt: de eerste schrijft `fansite_acc`, de tweede leest alleen.
- **Waarom:** op 10 november 2026 draaiden drie Builders zo'n opdracht in een worktree en schreven in de gedeelde database `fansite`: een losse `pnpm db:migrate` en `pnpm --filter site test-data`.
  Een afspraak in `AGENTS.md` bleek twee keer niet genoeg.
  De bewaking kiest zelf geen database en haalt niets weg: ze weigert alleen.
- **Alternatieven:** de afspraak scherper opschrijven; dat hielp niet.
  Die opdrachten stilletjes de database van de map geven; dat is wat de projecteigenaar niet wil, omdat een opdracht dan een andere database raakt dan `.env` zegt.
- **Later:** dit scherpt _Elke werkmap heeft een eigen database en eigen poorten_ aan: daar liepen deze opdrachten bewust niet door het script, en `.env` bleef gelden.

## Een Builder en een Reviewer kennen het ontwerp waar ze aan werken

- **Datum:** 11 november 2026
- **Besluit:** de skills zorgen dat het ontwerp bij de Builder en de Reviewer komt (#1135).
  - **`specify`:** komt een issue uit een ontwerp, dan schrijft de Specifier het uiterlijk precies in het issue: de opbouw, de vlakken en kaarten, wat groot of vet is, de volgorde en de indeling op een telefoon en een breed scherm.
    De Reviewer toetst aan de woorden van het issue en ziet het ontwerp nooit, dus wat er niet staat, wordt niet nagekeken.
    Het privécanvas wordt nergens in het issue gelinkt of genoemd.
  - **`weekly-coordination`:** de briefing van een Builder voor werk met een ontwerp noemt het canvas, het bord en de gekozen rij, en zegt dat het ontwerp wint van de woorden van het issue waar het om het uiterlijk gaat.
    Een briefing is niet openbaar, dus daar hoort het canvas; het issue en de pull request noemen het nooit.
    De Builder meldt het meteen als hij het ontwerp niet kan lezen.
  - **`builder-workflow` en `pr-screenshots`:** de Builder leest het ontwerp voordat hij bouwt, maakt schermafbeeldingen die naast het ontwerp te leggen zijn (de maten en de toestand van het bord), en meldt elk verschil met het ontwerp aan de Coördinator.
  - **Drie kleinere regels:** voeg `origin/main` nog één keer samen vlak voordat je de pull request opent, want een conflict houdt CI tegen en bijna elke pull request botste die dag in `docs/beslissingen/`.
    Stop je eigen server met zijn procesnummer, nooit met een opdracht die op naam of pad zoekt, zoals `pkill -f`, want die kan de server van een andere worktree stoppen.
    Verandert een Builder de opmaak na het verslag van de Reviewer, dan loopt de tweede ronde ook over die wijziging.
  - **`AGENTS.md`:** verwijst bij de rollen en bij de schermafbeeldingen naar de skills, zonder de regels te herhalen.
- **Waarom:** op 11 november 2026 bouwde een Builder `KeyFigures` (#1080) uit de woorden van het issue alleen, want het ontwerp stond op een privécanvas dat de briefing niet noemde.
  Het resultaat week zichtbaar af van het ontwerp (de gekozen opbouw had een kaart per getal) en moest opnieuw.
  Dezelfde dag vielen een conflict in `docs/beslissingen/`, een server van een andere worktree die met `pkill -f` werd gestopt en een wijziging van de opmaak na het verslag van de Reviewer op, die een regel in een skill had voorkomen.
- **Alternatieven:** het canvas in het issue linken (het issue is openbaar, en het canvas is privé); de Reviewer het ontwerp laten zien (hij leest de code en de woorden, en zijn verslag moet voor iedereen kloppen met het issue); de regels in `AGENTS.md` herhalen (een skill wijst naar de regels en voegt stappen toe).
