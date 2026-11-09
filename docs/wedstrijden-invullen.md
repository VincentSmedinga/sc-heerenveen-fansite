# Een wedstrijd invullen of verbeteren

Voor beheerders.
Soms heeft Wikipedia de uitslag nog niet, of staat er een fout in.
Een dag na een wedstrijd zeggen onze pagina's dan nog "Gegevens nog niet beschikbaar".
Op `/beheer/wedstrijden` vul je de wedstrijd zelf in, en iedereen ziet het binnen vijf minuten.
Bij een wedstrijd uit een eerder seizoen duurt dat hoogstens een uur, want de site bewaart die gegevens langer.

## Invullen

1. Open `/beheer/wedstrijden`.
   De lijst opent op "Zonder uitslag": de wedstrijden zonder uitslag, twee uur na de aftrap.
   Kies "Alles" voor alle wedstrijden van het seizoen, met die zonder uitslag bovenaan, of "Aangepast" voor wat de redactie aanpaste.
   Een ouder seizoen kies je naast de titel.
2. Kies de wedstrijd.
   De naam in de eerste kolom is de enige koppeling in een regel, en onder de naam staan de dag, de tijd en de competitie.
   Tijdens de wedstrijd opent de koppeling het scherm Bijhouden, bij een wedstrijd die een verslag kan hebben het verslag, en anders de pagina van de wedstrijd.
3. Vul in wat je weet.
   Je hoeft niet alles in te vullen:
   - de **aftrap**: de datum en de tijd, of de datum en een tekst als de tijd nog niet bekend is (zoals "12-14 februari 2027");
   - de **status**: gepland, gespeeld, uitgesteld of geannuleerd (een wedstrijd die niet meer wordt gespeeld);
   - de **uitslag**, bij een gespeelde wedstrijd.
     De clubs staan in de volgorde van de wedstrijd: bij een uitwedstrijd staat de tegenstander voorop.
     Bij de beker en de play-offs staat er een kaart met de verlenging, de stand na 90 minuten en de strafschoppen;
   - de **gegevens**: de toeschouwers (alleen bij een gespeelde wedstrijd), de scheidsrechter, het stadion en een opmerking.
     Laat een veld leeg als je het niet weet;
   - de **doelpunten**, in een tabel met twee regels per doelpunt: de minuut, de blessuretijd en de soort (gewoon, strafschop of eigen doelpunt), en daaronder het team dat het doelpunt krijgt en de speler.
     Vul je de uitslag in, dan krijg je zoveel doelpunten als de uitslag vraagt.
     Een doelpunt dat je niet invult, telt niet mee.
     Weet niemand de minuut van een doelpunt, dan laat je hem leeg.
     Met "Doelpunt toevoegen" komt er een rij bij, en de prullenbak bij een doelpunt haalt het weg.
     Wie het doelpunt maakte, volgt uit het team en de soort.
     Maakte een speler van sc Heerenveen het doelpunt, dan kies je hem uit de selectie.
     Maakte een speler van de tegenstander het doelpunt, dan schrijf je zijn naam zoals Wikipedia hem schrijft.
     Dat geldt ook bij een eigen doelpunt: dat maakte een speler van het andere team.
     Zonder JavaScript past het formulier zich pas aan als je een knop kiest.
4. Schrijf bij "Reden" waarom je dit invult.
   Dat is verplicht, en het komt in het logboek.
   Het veld staat in het blok "Opslaan" naast het formulier, en op een telefoon onder het formulier.
5. Kies "Opslaan", in hetzelfde blok.

De doelpunten moeten samen de uitslag geven.
Een uitslag zonder doelpunten mag: voeg ze toe als je ze weet.
De stand komt van Wikipedia en verandert niet mee, dus hij loopt achter tot Wikipedia de uitslag heeft.

## Een wedstrijd toevoegen

Soms bestaat een wedstrijd nergens als bron die de import kan lezen, zoals een bekerwedstrijd uit 2009.
Dan voeg je hem zelf toe.

1. Open `/beheer/wedstrijden` en kies "Wedstrijd toevoegen".
2. Vul het seizoen (zoals 2008/09), de competitie, de ronde, de tegenstander, thuis of uit, de datum, de status en de uitslag in.
   Is de tijd niet bekend, laat hem dan leeg.
   Staat de club er niet bij, kies dan "Een andere club" en schrijf de naam.
3. Vul de **bron** in, zoals "Leeuwarder Courant, 12 mei 2009".
   Je mag feiten overnemen uit een krantenarchief, zoals Delpher: de datum, de uitslag, de doelpuntenmakers en de opstelling.
   Neem nooit de tekst van een krant over.
4. Bewaar de wedstrijd.
   Staat dezelfde wedstrijd er al, ook uit een andere bron, dan weigert het formulier hem en zegt het welke.

De wedstrijd staat daarna op de pagina van de wedstrijd, en je vult er de doelpunten, de gegevens en het verslag in zoals bij elke andere wedstrijd.
Geen import wijzigt of verwijdert hem.
De site toont de bron bij de wedstrijd.
Het logboek heeft een regel `match.add` met de bron als reden.

Een wedstrijd die je toevoegde, kun je verwijderen met "Wedstrijd verwijderen" op de pagina van de wedstrijd.
Dat vraagt een reden, haalt de doelpunten en het verslag mee weg en kan niet terug.
Een wedstrijd uit een import kun je niet verwijderen.

## Wat de bezoeker ziet

De waarden die je invult, op de plekken waar de waarden van Wikipedia staan.
"Gegevens nog niet beschikbaar" verdwijnt bij een wedstrijd met uitslag.
Zolang minstens één wedstrijd van de redactie is, staat onder de bronvermelding van Wikipedia: "Enkele gegevens heeft onze redactie zelf ingevuld of aangepast."

## Wat de import doet

De import leest Wikipedia elk uur, en kijkt voor elk onderdeel dat jij invulde (de aftrap, de uitslag, de doelpunten en de gegevens, elk apart):

- **Wikipedia heeft nog niets:** jouw invoer blijft staan.
  Je hoeft niets te doen.
- **Wikipedia heeft hetzelfde:** de wedstrijd is niet meer van de redactie, en het onderdeel volgt Wikipedia.
  Het label "Aangepast" verdwijnt als alle onderdelen zo zijn overgenomen.
  Het logboek zegt dat Wikipedia is bijgekomen.
- **Wikipedia zegt iets anders:** jouw invoer blijft staan.
  De import schrijft het verschil één keer op, met beide waarden, in het logboek en in de waarschuwing van de import (`pnpm run import:status`).
  De beheerders krijgen een mail, en op `/beheer/wedstrijden` staat bij de wedstrijd het label "Wikipedia wijkt af".
  De kaart "Te doen" op de startpagina van het beheer zegt hoeveel afwijkingen op een besluit wachten, en de koppeling erbij opent de lijst "Aangepast" van het seizoen waar ze staan.

De uitslag en de doelpunten tellen apart.
Wikipedia zet meestal eerst de uitslag, en pas later de doelpuntenmakers.

## Een afwijking beslissen

Open de wedstrijd met het label "Wikipedia wijkt af".
Per onderdeel dat afwijkt, staan onze invoer en wat Wikipedia zegt naast elkaar.
Schrijf bij "Reden" waarom je beslist, en kies:

- **Neem Wikipedia over:** het onderdeel wordt wat Wikipedia zegt en volgt Wikipedia weer.
  Het label "Aangepast" verdwijnt als er geen onderdeel van jullie meer over is.
- **Houd onze invoer:** jullie invoer blijft staan.
  De import meldt dit verschil niet nog eens, tenzij Wikipedia iets anders gaat zeggen.

Het besluit komt in het logboek, met wie en waarom.
Beslist niemand, dan neemt de import het onderdeel over na zeven dagen, als Wikipedia dan nog hetzelfde zegt.
De beheerders krijgen daarover een mail.
Zet Wikipedia zelf de waarde van de redactie terug, dan vervalt de afwijking.

Wie op de server werkt, kan hetzelfde met `pnpm run import:changes`: `accept` neemt Wikipedia over, `reject` houdt de invoer.

## Een verschil tussen twee bronnen beslissen

Soms zeggen twee bronnen iets anders over dezelfde wedstrijd, zoals de oude fansite en Wikipedia over de uitslag.
De wedstrijd houdt dan de waarde van de bron waar hij van komt, en het verschil wacht op een besluit.
Je vindt zo'n wedstrijd op `/beheer/kwaliteit`, onder "wijzigingen wachten" bij het seizoen.

Op de pagina van de wedstrijd staat een kaart met de twee waarden en de namen van de bronnen.
Schrijf bij "Reden" waarom je beslist, en kies welke bron je overneemt of houdt.
De import neemt hier niets vanzelf over, en er gaat geen mail uit.
Een verschil dat je afwijst, komt niet terug zolang beide bronnen hetzelfde blijven zeggen.

## Spelerscijfers die verschillen

De selectietabel van Wikipedia heeft per speler het aantal doelpunten in een competitie.
Is dat een ander aantal dan in de wedstrijden of de verslagen, dan staat op `/beheer/kwaliteit` bij het seizoen "spelerscijfers verschillen".
De pagina erachter noemt de speler, de competitie en de twee aantallen.
Schrijf een reden, en kies:

- **Neem de wedstrijden over** of **Neem de verslagen over:** het andere aantal komt in de selectietabel.
  De import laat het staan zolang de tabel van Wikipedia hetzelfde zegt als nu.
- **Houd de selectietabel:** de tabel blijft zoals hij is.

Klopt een wedstrijd of een verslag niet, verbeter dan die: het verschil verdwijnt daarna vanzelf.

## Een vastgehouden wijziging beslissen

De import houdt soms een wijziging van Wikipedia vast, omdat hij verdacht lijkt.
Een voorbeeld is een uitslag die verandert nadat hij een dag stond, een doelpunt in een wedstrijd van een week geleden, of een wedstrijd die van de pagina verdwijnt.
Tot iemand beslist, blijven de wedstrijd en de doelpunten zoals ze zijn.
Een vastgehouden wijziging staat op de kaart "Te doen" van de startpagina.
Op `/beheer/wedstrijden` staat ze onder "Wikipedia wacht", met hetzelfde label bij de wedstrijd.
Dat werkt ook voor een seizoen dat voorbij is.

Open de wedstrijd.
De kaart "Wikipedia wacht" zegt wat er nu op de site staat en wat Wikipedia nu zegt.
Ze zegt ook waarom de wijziging wacht, sinds wanneer Wikipedia het zegt, en wat er zonder besluit gebeurt.
Een koppeling naar de pagina van het seizoen op Wikipedia laat je het zelf nakijken.
Schrijf bij "Reden" waarom je beslist, en kies:

- **Neem Wikipedia over:** de wedstrijd en de doelpunten worden wat Wikipedia nu zegt.
  Staat de wedstrijd niet meer op de pagina, dan gaat hij van de site.
- **Wijs af:** de wedstrijd blijft zoals hij is.
  De import meldt de wijziging niet nog eens, zolang Wikipedia dezelfde waarde toont.

Het besluit komt in het logboek, met wie en waarom.
In het lopende seizoen neemt de import de wijziging over na zeven dagen, als Wikipedia dan nog hetzelfde zegt.
In een seizoen dat voorbij is leest de import de pagina niet meer.
Daar blijft de huidige waarde staan tot iemand beslist.
Alleen een beheerder ziet deze schermen en kan beslissen.

Wie op de server werkt, kan hetzelfde met `pnpm run import:changes`: `accept` neemt Wikipedia over, `reject` laat de wedstrijd staan.

## Het verslag invullen

Van een gespeelde wedstrijd kun je ook het verslag invullen: wie speelde, wie er inviel, de doelpunten met wie de assist gaf, de kaarten, de gemiste strafschoppen en, bij een beslissing op strafschoppen, de schoten van de serie.
Kies de wedstrijd in de lijst: de koppeling opent het verslag.
Of open de wedstrijd en kies "Het verslag invullen".
De kolom Verslag zegt in één woord hoe het ervoor staat: "Geen", "Niet af", "Klaar" of "Live".
Het verslag heeft een eigen scherm, `/beheer/wedstrijden/<nummer>/verslag`.

1. Schrijf bij Bron de naam van wat je overtypt, zoals "wedstrijdformulier" of "uitzending".
   Schrijf nooit een tekst van een verslag, en neem geen hele tabellen over van een site met statistieken.
2. Kies voor sc Heerenveen de spelers uit de selectie, of kies "Andere speler" en schrijf zijn naam.
   Laat het rugnummer leeg als het hetzelfde is als in de selectie, of als de speler geen rugnummer had.
   Een speler staat in het verslag één keer, in de basis of op de bank (de rol).
   De lijst van een plek op de bank toont de spelers die niet in de basis staan, en kies je een speler van de bank voor de basis, dan wordt zijn plek op de bank leeg.
3. Vul de wissels, de doelpunten, de kaarten en de gemiste strafschoppen in.
   Bij 45+1 schrijf je 45 als minuut en 1 bij blessuretijd.
   De minuut van een doelpunt en van een gele kaart mag leeg blijven als niemand hem weet.
   Dat staat dan onder de andere gebeurtenissen, zonder minuut.
   Een rode of geel-rode kaart, een wissel en een gemiste strafschop hebben wel een minuut nodig.
4. Is de kant van de tegenstander ook af, kies dan bij "Is de kant van de tegenstander ook af?" voor Ja.
   Dan tellen elf spelers, de bank en wie scoorde ook voor hem mee.
5. Kies bij Opstelling en bank van elk team de formatie, zoals 4-3-3, als je hem weet.
   Zonder formatie kan het verslag ook klaar zijn.
6. Is de wedstrijd op strafschoppen beslist, vul dan eerst bij de wedstrijd de uitslag van de serie in (bij Strafschoppen, op de kaart Verlenging en strafschoppen).
   Dan staat op het scherm van het verslag voor elk team de lijst Strafschoppenserie.
   Zet in de volgorde van de rondes één rij per schot: de speler en de uitkomst (Raak, Naast of Gestopt).
   Bij een tegenstander wiens kant niet af is, mag je de speler leeg laten.
   Het aantal schoten dat raak is, moet de uitslag van de serie geven.
7. Kies "Opslaan".

De lijst bij de formatie heeft de gebruikelijke formaties.
Is jouw formatie er niet bij, kies dan Anders en schrijf hem in het veld eronder, zoals 4-1-2-1-2.
Een formatie is getallen met een koppelteken ertussen, zonder spaties, en de getallen zijn samen tien: de veldspelers, zonder de keeper.
Zonder JavaScript staat het veld altijd op het scherm en telt het alleen bij de keuze Anders.
De formatie komt op de pagina van de wedstrijd bij de naam van het team, en staat er niets als er geen is.

Je kunt een verslag in meerdere keren invullen.
Zolang de status "Bezig" is (de lijst zegt "Niet af"), mag er nog iets ontbreken.
Het verslag staat dan al op de pagina van de wedstrijd, binnen vijf minuten, met de melding "We vullen dit verslag nog in", en Wedstrijden en Uitslagen linken ernaar.
Kies "Klaar" als alles erin staat.
Dat lukt alleen als de regels niets vinden: elf spelers in de opstelling, een wissel van iemand die op het veld staat, doelpunten die samen de uitslag geven, en zo verder.
Vinden de regels nog iets, dan bewaart het scherm je gegevens als "Bezig" en zegt bij het veld wat er mis is.

Verandert de uitslag daarna, bijvoorbeeld omdat Wikipedia hem verbetert, dan blijft het verslag staan en zegt de lijst "Klopt niet" bij de wedstrijd.
Het scherm laat zien wat niet meer klopt.

De doelpunten van een wedstrijd met een verslag pas je alleen in het verslag aan.
Het formulier van de wedstrijd laat ze dan zien, met een link naar het verslag.

"Verslag weghalen" (in de zijbalk, met een reden) haalt het verslag weg en zet de doelpunten terug op wat Wikipedia zei.

### Een verslag tijdens de wedstrijd

Vanaf de dag van de wedstrijd kun je het verslag al invullen, terwijl de wedstrijd nog wordt gespeeld.
De wedstrijd blijft dan gepland, zonder uitslag, en op de pagina van de wedstrijd staat "Live" zodra de aftrap voorbij is, met de stand uit de doelpunten die je invult.
Voor de aftrap staan de aftrap en de opstelling erop.
De doelpunten van zo'n wedstrijd tellen nergens mee, tot hij is afgelopen.

Wil je het verslag bijhouden vanaf je telefoon, kies dan "Verslag bijhouden" in de zijbalk van het verslag, of de naam van de wedstrijd in de lijst, zolang de wedstrijd bezig is.
De opstelling maak je eerst in het volledige formulier.
Op het snelle scherm voeg je een doelpunt, een kaart of een wissel toe: kies bij "Voor wie" sc Heerenveen of de tegenstander, vul de minuut in en kies de speler.
Bij minuut 45, 90, 105 en 120 verschijnt het veld Blessuretijd naast de minuut.
Een tweede gele kaart voor dezelfde speler wordt vanzelf een geel-rode kaart.
Bovenaan staat de balk "Op deze pagina:" met sprongen naar Doelpunt, Kaart, Wissel en Gebeurtenissen.
Elke gebeurtenis is meteen opgeslagen en staat in de lijst eronder, de laatste bovenaan.
Zie je een fout, kies dan "Haal weg" bij de gebeurtenis en daarna "Ja, haal weg".
Slaat een collega tegelijk iets op, dan blijven allebei de gebeurtenissen staan.
Heb je het volledige formulier open terwijl iemand anders iets bewaart, dan weigert het formulier te bewaren en zegt het dat iemand anders het verslag heeft bewaard.
Wat je typte blijft staan.

Is de wedstrijd afgelopen, kies dan in de zijbalk van het verslag "Wedstrijd afgelopen".
Je ziet de stand uit de doelpunten van het bewaarde verslag, die je kunt aanpassen, en kiest dan nog eens "Wedstrijd afgelopen".
De wedstrijd heeft dan zijn uitslag en "Live" is weg.
Het verslag blijft bezig: maak het af (de bank, de minuten) en zet het dan op klaar.
Verlenging en strafschoppen vul je in met het formulier van de wedstrijd.

## Een verslag plakken

Typ je het verslag liever als tekst uit een bron die je naast je hebt?
Kies dan in de zijbalk van het verslag "Tekst plakken", of ga naar `/beheer/wedstrijden/<nummer>/verslag/plakken`.
Je plakt de tekst in een eenvoudig formaat en krijgt het formulier van het verslag terug, met alles ingevuld.
Plakken bewaart niets: pas "Opslaan" in het formulier doet dat, met dezelfde controle als bij een verslag dat je met de hand invulde.

Het scherm laat het formaat zien, met een voorbeeld dat je kunt kopiëren.
De tekst heeft kopjes, elk op een eigen regel, en daaronder een regel per speler of gebeurtenis:

- `Opstelling` en `Bank`: een rugnummer en een naam, zoals `4 Van Aken`.
  Zet `(a)` achter de aanvoerder.
  Voor sc Heerenveen volstaat het rugnummer van de selectie.
  Had een speler geen rugnummer, schrijf dan alleen zijn naam, zoals `Van Aken`.
- `Wissels`: de minuut, wie erin komt en voor wie, zoals `61 12 voor 8` of `90+2 Smit voor Jansen`.
- `Doelpunten`: de minuut en de speler die scoorde, met `assist Jansen`, `strafschop` of `eigen doelpunt` erachter.
  Weet niemand de minuut, zet dan een vraagteken: `? Smit`.
  Onder het kopje van een kant staan de doelpunten die die kant kreeg.
  Bij een eigen doelpunt is de naam een speler van de andere kant.
- `Kaarten`: de minuut, `geel`, `geel-rood` of `rood`, en de speler, zoals `34 geel Jansen`.
  Bij een gele kaart mag een vraagteken de minuut vervangen: `? geel Jansen`.
  Een rode of geel-rode kaart heeft een minuut nodig.
- `Strafschoppen`: de minuut, `gemist` of `gestopt`, en de nemer, zoals `55 gemist Jansen`.
- Na het kopje `Tegenstander` staan dezelfde kopjes voor de tegenstander.
- `Formatie: 4-3-3`: de formatie van een team, op een eigen regel bij het team.
  Boven het eerste kopje is het de formatie van sc Heerenveen, en onder `Tegenstander` die van de tegenstander.
  Een formatie die niet klopt, staat onder "Niet gelezen" met de reden.

Hoofdletters en de volgorde van de kopjes doen er niet toe, en een kopje dat ontbreekt is leeg.
Een regel die met `#` begint, is commentaar.
Een naam mag een rugnummer zijn.

Het scherm zoekt een speler van ons eerst op rugnummer in de selectie van het seizoen, dan op de volledige naam, en dan op de achternaam.
Vindt het niet precies één speler, dan staat de regel onder "Kies een speler" en moet je in het formulier kiezen.
Het zet nooit zelf een speler in de selectie.
Een regel die het niet kan lezen, staat onder "Niet gelezen", met het nummer van de regel en de reden, en verandert niets in het formulier.
Staat er al een verslag, dan vraagt het scherm eerst of het formulier vervangen mag.
De tekst komt niet in het logboek en is hoogstens 20.000 tekens.

## Invoer weghalen

Op de pagina van een wedstrijd met een invoer staat naast het formulier, onder "Laatste invoer", een blok "Invoer weghalen".
Klap het open, schrijf een reden en kies de rode knop.
Dat zet wat jij invulde terug naar wat er stond voor de eerste invoer.
Daarna leest de import weer wat Wikipedia zegt, zoals bij elke andere wedstrijd.
Een afwijking die nog wachtte, vervalt.

Heeft de wedstrijd een verslag, dan blijven de doelpunten staan: ze horen bij het verslag.
Die haal je weg met "Verslag weghalen".

Een onderdeel dat Wikipedia al had overgenomen, blijft zoals het is.

## Het logboek

Elke invoer, elk weghalen en elke keer dat de import iets doet met jouw invoer komt in het logboek (`audit_log`), met wie of "de import", wat en waarom.
Er is nog geen scherm om het te lezen; zie de [README van het databasepakket](../packages/db/README.md).
